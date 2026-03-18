import asyncio
from time import perf_counter

from app.config import get_settings
from app.db import SessionLocal
from app.models import BatchJobRanking, BatchJobTopCandidate, BatchResumeMatchResult
from app.repositories.batch_repository import update_batch_task_state, update_resume_record
from app.repositories.jd_repository import list_jds
from app.services.pdf_parser import extract_pdf_text
from app.services.runtime_logger import runtime_logger
from app.workflows.match_graph import run_match_flow
from app.workflows.resume_graph import run_resume_agent


async def _process_single_resume(
    *,
    resume_index: int,
    task_id: str,
    resume_meta: dict,
    jobs: list,
    match_mode: str,
    semaphore: asyncio.Semaphore,
) -> dict:
    async with semaphore:
        try:
            with open(resume_meta["raw_pdf_path"], "rb") as file_handle:
                file_bytes = file_handle.read()
            raw_text = await asyncio.to_thread(extract_pdf_text, file_bytes)
            resume_profile, resume_trace = await asyncio.to_thread(
                run_resume_agent,
                raw_resume_text=raw_text,
                request_id=task_id,
            )
            match_result = await run_match_flow(
                resume_profile=resume_profile,
                jobs=jobs,
                request_id=f"{task_id}-{resume_meta['resume_id']}",
                match_mode=match_mode,
            )
            match_result.trace = resume_trace + match_result.trace
            return {
                "resume_index": resume_index,
                "resume_id": resume_meta["resume_id"],
                "filename": resume_meta["filename"],
                "raw_text": raw_text,
                "profile_json": resume_profile.model_dump(),
                "error": None,
                "result": BatchResumeMatchResult(
                    resume_id=resume_meta["resume_id"],
                    filename=resume_meta["filename"],
                    status="completed",
                    top_matches=match_result.ranked_results[:3],
                    full_result=match_result,
                ),
            }
        except Exception as exc:
            return {
                "resume_index": resume_index,
                "resume_id": resume_meta["resume_id"],
                "filename": resume_meta["filename"],
                "raw_text": "",
                "profile_json": {},
                "error": str(exc),
                "result": BatchResumeMatchResult(
                    resume_id=resume_meta["resume_id"],
                    filename=resume_meta["filename"],
                    status="failed",
                    error=str(exc),
                ),
            }


async def process_batch_match_task(
    *,
    task_id: str,
    selected_job_ids: list[str],
    resumes: list[dict],
    match_mode: str,
) -> None:
    started_at = perf_counter()
    db = SessionLocal()
    try:
        update_batch_task_state(
            db,
            task_id,
            status="processing",
            trace=["批量匹配任务已进入 processing。", "开始逐份解析简历并执行匹配。"],
        )
        persisted_map = {item.job.id: item for item in list_jds(db)}
        jobs = [persisted_map[job_id].job for job_id in selected_job_ids if job_id in persisted_map]
        if not jobs:
            update_batch_task_state(
                db,
                task_id,
                status="failed",
                errors=["当前没有可用于批量匹配的岗位。"],
                trace=["批量匹配失败：没有找到有效 JD。"],
            )
            return

        parallelism = max(get_settings().batch_resume_parallelism, 1)
        semaphore = asyncio.Semaphore(parallelism)
        ordered_results: dict[int, BatchResumeMatchResult] = {}
        errors: list[str] = []
        tasks = [
            asyncio.create_task(
                _process_single_resume(
                    resume_index=index,
                    task_id=task_id,
                    resume_meta=resume_meta,
                    jobs=jobs,
                    match_mode=match_mode,
                    semaphore=semaphore,
                )
            )
            for index, resume_meta in enumerate(resumes, start=1)
        ]

        for completed_count, task in enumerate(asyncio.as_completed(tasks), start=1):
            payload = await task
            resume_index = payload["resume_index"]
            resume_meta = resumes[resume_index - 1]
            if payload["error"] is None:
                update_resume_record(
                    db,
                    resume_meta["resume_id"],
                    raw_text=payload["raw_text"],
                    profile_json=payload["profile_json"],
                )
                ordered_results[resume_index] = payload["result"]
            else:
                error_message = payload["error"]
                errors.append(f"{resume_meta['filename']}: {error_message}")
                ordered_results[resume_index] = payload["result"]
                runtime_logger.log(
                    "batch_resume_failed",
                    task_id,
                    {
                        "resume_id": resume_meta["resume_id"],
                        "filename": resume_meta["filename"],
                        "error": error_message,
                    },
                    agent_name="batch_orchestrator",
                    graph_name="batch_match_task",
                )
            current_results = [ordered_results[index] for index in sorted(ordered_results)]
            update_batch_task_state(
                db,
                task_id,
                completed_resumes=completed_count,
                result_json={
                    "resume_results": [item.model_dump() for item in current_results],
                    "job_rankings": [],
                },
                errors=errors,
                trace=[
                    "批量匹配任务已进入 processing。",
                    f"开始并发解析简历并执行匹配，当前简历并发上限为 {parallelism}。",
                    f"当前已完成 {completed_count}/{len(resumes)} 份简历。",
                ],
            )

        resume_results = [ordered_results[index] for index in sorted(ordered_results)]

        job_rankings: list[BatchJobRanking] = []
        for job in jobs:
            candidates = []
            for resume_result in resume_results:
                if resume_result.status != "completed" or resume_result.full_result is None:
                    continue
                matched = next(
                    (item for item in resume_result.full_result.ranked_results if item.job_id == job.id),
                    None,
                )
                if matched is None:
                    continue
                candidates.append(
                    BatchJobTopCandidate(
                        resume_id=resume_result.resume_id,
                        filename=resume_result.filename,
                        total_score=matched.total_score,
                        recommendation=matched.recommendation,
                        summary=matched.summary,
                    )
                )
            candidates.sort(key=lambda item: item.total_score, reverse=True)
            job_rankings.append(
                BatchJobRanking(
                    job_id=job.id,
                    job_title=job.title,
                    top_candidates=candidates[:3],
                )
            )

        update_batch_task_state(
            db,
            task_id,
            status="completed" if resume_results else "failed",
            completed_resumes=len(resumes),
            result_json={
                "resume_results": [item.model_dump() for item in resume_results],
                "job_rankings": [item.model_dump() for item in job_rankings],
            },
            errors=errors,
            trace=[
                "批量匹配任务已进入 processing。",
                f"开始并发解析简历并执行匹配，当前简历并发上限为 {parallelism}。",
                f"批量匹配已完成，共处理 {len(resumes)} 份简历。",
            ],
        )
        runtime_logger.log(
            "batch_request_completed",
            task_id,
            {
                "duration_ms": round((perf_counter() - started_at) * 1000, 2),
                "resume_count": len(resumes),
                "job_count": len(jobs),
                "error_count": len(errors),
                "resume_parallelism": parallelism,
            },
            agent_name="batch_orchestrator",
            graph_name="batch_match_task",
        )
    except Exception:
        update_batch_task_state(
            db,
            task_id,
            status="failed",
            errors=["批量任务执行失败。"],
            trace=["批量匹配任务执行失败。"],
        )
        runtime_logger.log(
            "batch_request_failed",
            task_id,
            {
                "error": "批量任务执行失败。",
                "traceback": runtime_logger.format_exception(),
            },
            agent_name="batch_orchestrator",
            graph_name="batch_match_task",
        )
    finally:
        db.close()
