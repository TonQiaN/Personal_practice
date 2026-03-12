import json
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import JobDescriptionInput
from app.presets import load_preset_jds
from app.services.pdf_parser import extract_pdf_text
from app.services.runtime_logger import runtime_logger
from app.workflows.match_graph import run_match_flow


app = FastAPI(title=get_settings().app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/presets")
def get_presets() -> list[JobDescriptionInput]:
    return load_preset_jds()


@app.post("/api/match")
async def match_resume(
    resume: UploadFile = File(...),
    jobs: str = Form(...),
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
        jobs_payload = json.loads(jobs)
        job_inputs = [JobDescriptionInput.model_validate(item) for item in jobs_payload]
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
        )
        raw_text = extract_pdf_text(file_bytes)
        result = run_match_flow(
            raw_resume_text=raw_text,
            jobs=job_inputs,
            request_id=request_id,
        )
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
        )
        raise HTTPException(status_code=500, detail="匹配流程执行失败。") from exc
