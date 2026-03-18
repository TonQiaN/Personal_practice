import asyncio
import json
from time import perf_counter
from uuid import uuid4

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import Base, engine, get_db
from app.models import (
    JobDescriptionInput,
    JobDescriptionPersistPayload,
)
from app.presets import load_preset_jds
from app.repositories.batch_repository import create_batch_task, create_resume_record, get_batch_task
from app.services.pdf_parser import extract_pdf_text
from app.services.batch_match_service import process_batch_match_task
from app.services.runtime_logger import runtime_logger
from app.workflows.jd_pdf_graph import run_jd_pdf_agent
from app.workflows.resume_graph import run_resume_agent
from app.workflows.match_graph import run_match_flow
from app.repositories.jd_repository import delete_jd, get_jd, list_jds, upsert_jd


app = FastAPI(title=get_settings().app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def initialize_app_state() -> None:
    Base.metadata.create_all(bind=engine)
    get_settings().jd_upload_dir.mkdir(parents=True, exist_ok=True)
    get_settings().resume_upload_dir.mkdir(parents=True, exist_ok=True)
    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE IF EXISTS batch_match_tasks "
                "ADD COLUMN IF NOT EXISTS match_mode VARCHAR(16) NOT NULL DEFAULT 'full'"
            )
        )
    db = next(get_db())
    try:
        if not list_jds(db):
            for preset in load_preset_jds():
                upsert_jd(
                    db,
                    JobDescriptionPersistPayload(
                        job=preset,
                        source_type="preset",
                        status="confirmed",
                        raw_text=preset.summary,
                        normalized_json=preset.model_dump(),
                        user_corrected_json=preset.model_dump(),
                    ),
                )
    finally:
        db.close()


initialize_app_state()


def _resolve_job_inputs(db: Session, selected_ids: list[str], custom_jobs: str | None = None) -> list[JobDescriptionInput]:
    persisted_map = {item.job.id: item for item in list_jds(db)}
    job_inputs = [persisted_map[job_id].job for job_id in selected_ids if job_id in persisted_map]
    if custom_jobs:
        custom_payload = json.loads(custom_jobs)
        job_inputs.extend([JobDescriptionInput.model_validate(item) for item in custom_payload])
    return job_inputs


def _run_batch_task(task_id: str, selected_job_ids: list[str], resumes: list[dict], match_mode: str) -> None:
    asyncio.run(
        process_batch_match_task(
            task_id=task_id,
            selected_job_ids=selected_job_ids,
            resumes=resumes,
            match_mode=match_mode,
        )
    )


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/presets")
def get_presets(db: Session = Depends(get_db)) -> list[dict]:
    return [item.model_dump() for item in list_jds(db)]


@app.post("/api/jds")
def create_or_update_jd(
    payload: JobDescriptionPersistPayload,
    db: Session = Depends(get_db),
) -> dict:
    persisted = upsert_jd(db, payload)
    return persisted.model_dump()


@app.delete("/api/jds/{job_id}")
def remove_jd(job_id: str, db: Session = Depends(get_db)) -> dict:
    existing = get_jd(db, job_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="JD 不存在。")

    deleted = delete_jd(db, job_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="JD 不存在。")
    return {"deleted": True, "job_id": job_id}


@app.post("/api/jds/upload-pdf")
async def upload_jd_pdf(
    jd_pdf: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict:
    request_id = uuid4().hex
    settings = get_settings()

    if jd_pdf.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=400, detail="当前只支持 JD PDF 上传。")

    file_bytes = await jd_pdf.read()
    raw_text = extract_pdf_text(file_bytes)
    target_path = settings.jd_upload_dir / f"{request_id}.pdf"
    target_path.write_bytes(file_bytes)
    parsed = run_jd_pdf_agent(
        pdf_path=str(target_path),
        raw_text=raw_text,
        request_id=request_id,
        db=db,
    )
    return parsed.model_dump()


@app.post("/api/match")
async def match_resume(
    resume: UploadFile = File(...),
    job_ids: str = Form(...),
    match_mode: str = Form(default="full"),
    custom_jobs: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> dict:
    request_id = uuid4().hex
    request_started_at = perf_counter()

    if resume.content_type not in {"application/pdf", "application/octet-stream"}:
        runtime_logger.log(
            "request_failed",
            request_id,
            {
                "stage": "validation",
                "error": "当前只支持 PDF 文件上传。",
                "status_code": 400,
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                },
            },
        )
        raise HTTPException(status_code=400, detail="当前只支持 PDF 文件上传。")

    try:
        selected_ids = json.loads(job_ids)
        if not isinstance(selected_ids, list):
            raise ValueError("job_ids 必须是数组。")
        job_inputs = _resolve_job_inputs(db, selected_ids, custom_jobs)
    except Exception as exc:
        runtime_logger.log(
            "request_failed",
            request_id,
            {
                "stage": "validation",
                "error": "JD 数据格式不正确。",
                "status_code": 400,
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                },
                "traceback": runtime_logger.format_exception(),
            },
        )
        raise HTTPException(status_code=400, detail="JD 数据格式不正确。") from exc

    if not job_inputs:
        runtime_logger.log(
            "request_failed",
            request_id,
            {
                "stage": "validation",
                "error": "至少需要传入一条 JD。",
                "status_code": 400,
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                },
            },
        )
        raise HTTPException(status_code=400, detail="至少需要传入一条 JD。")

    if match_mode not in {"fast", "full"}:
        raise HTTPException(status_code=400, detail="match_mode 只支持 fast 或 full。")

    try:
        file_bytes = await resume.read()
        runtime_logger.log(
            "request_started",
            request_id,
            {
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                    "file_size_bytes": len(file_bytes),
                    "job_count": len(job_inputs),
                    "job_titles": [job.title for job in job_inputs],
                },
            },
            agent_name="match_orchestrator",
            graph_name="match_request",
        )
        raw_text = extract_pdf_text(file_bytes)
        resume_profile, resume_trace = run_resume_agent(raw_resume_text=raw_text, request_id=request_id)
        result = await run_match_flow(
            resume_profile=resume_profile,
            jobs=job_inputs,
            request_id=request_id,
            match_mode=match_mode,
        )
        result.trace = resume_trace + result.trace
        runtime_logger.log(
            "request_completed",
            request_id,
            {
                "duration_ms": round((perf_counter() - request_started_at) * 1000, 2),
                "request_context": {
                    "filename": resume.filename,
                    "file_size_bytes": len(file_bytes),
                    "job_count": len(job_inputs),
                },
                "result_summary": {
                    "top_job_title": result.ranked_results[0].job_title if result.ranked_results else None,
                    "top_score": result.ranked_results[0].total_score if result.ranked_results else None,
                    "result_count": len(result.ranked_results),
                },
            },
            agent_name="match_orchestrator",
            graph_name="match_request",
        )
        return result.model_dump()
    except ValueError as exc:
        runtime_logger.log(
            "request_failed",
            request_id,
            {
                "stage": "processing",
                "error": str(exc),
                "status_code": 400,
                "duration_ms": round((perf_counter() - request_started_at) * 1000, 2),
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                    "job_count": len(job_inputs),
                },
            },
            agent_name="match_orchestrator",
            graph_name="match_request",
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        runtime_logger.log(
            "request_failed",
            request_id,
            {
                "stage": "processing",
                "error": str(exc),
                "status_code": 500,
                "duration_ms": round((perf_counter() - request_started_at) * 1000, 2),
                "request_context": {
                    "filename": resume.filename,
                    "content_type": resume.content_type,
                    "job_count": len(job_inputs),
                },
                "traceback": runtime_logger.format_exception(),
            },
            agent_name="match_orchestrator",
            graph_name="match_request",
        )
        raise HTTPException(status_code=500, detail="匹配流程执行失败。") from exc


@app.post("/api/batch-match")
async def create_batch_match(
    background_tasks: BackgroundTasks,
    resumes: list[UploadFile] = File(...),
    job_ids: str = Form(...),
    match_mode: str = Form(default="full"),
    db: Session = Depends(get_db),
) -> dict:
    request_id = uuid4().hex
    settings = get_settings()

    try:
        selected_ids = json.loads(job_ids)
        if not isinstance(selected_ids, list):
            raise ValueError("job_ids 必须是数组。")
        job_inputs = _resolve_job_inputs(db, selected_ids)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="JD 数据格式不正确。") from exc

    if not job_inputs:
        raise HTTPException(status_code=400, detail="至少需要传入一条 JD。")

    if not resumes:
        raise HTTPException(status_code=400, detail="至少需要上传一份简历。")

    if match_mode not in {"fast", "full"}:
        raise HTTPException(status_code=400, detail="match_mode 只支持 fast 或 full。")

    saved_resumes: list[dict] = []
    for resume in resumes:
        if resume.content_type not in {"application/pdf", "application/octet-stream"}:
            raise HTTPException(status_code=400, detail="批量匹配当前只支持 PDF 文件。")
        file_bytes = await resume.read()
        filename = resume.filename or f"resume-{uuid4().hex}.pdf"
        target_path = settings.resume_upload_dir / f"{uuid4().hex}.pdf"
        target_path.write_bytes(file_bytes)
        persisted = create_resume_record(
            db,
            filename=filename,
            raw_pdf_path=str(target_path),
        )
        saved_resumes.append(
            {
                "resume_id": persisted.id,
                "filename": persisted.filename,
                "raw_pdf_path": persisted.raw_pdf_path,
            }
        )

    task = create_batch_task(
        db,
        selected_job_ids=[item.id for item in job_inputs],
        total_resumes=len(saved_resumes),
        match_mode=match_mode,
    )
    runtime_logger.log(
        "batch_request_started",
        task.task_id,
        {
            "request_context": {
                "resume_count": len(saved_resumes),
                "job_count": len(job_inputs),
                "job_titles": [job.title for job in job_inputs],
                "filenames": [item["filename"] for item in saved_resumes],
                "match_mode": match_mode,
            },
        },
        agent_name="batch_orchestrator",
        graph_name="batch_match_task",
    )
    background_tasks.add_task(_run_batch_task, task.task_id, task.selected_job_ids, saved_resumes, match_mode)
    return task.model_dump()


@app.get("/api/batch-match/{task_id}")
def get_batch_match_status(task_id: str, db: Session = Depends(get_db)) -> dict:
    task = get_batch_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="批量匹配任务不存在。")
    return task.model_dump()
