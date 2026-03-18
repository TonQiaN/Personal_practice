from uuid import uuid4

from sqlalchemy.orm import Session

from app.db_models import BatchMatchTaskRecord, ResumeRecord
from app.models import BatchMatchResponse, ResumePersisted


def _resume_record_to_schema(record: ResumeRecord) -> ResumePersisted:
    return ResumePersisted(
        id=record.id,
        filename=record.filename,
        raw_pdf_path=record.raw_pdf_path,
        raw_text=record.raw_text,
        profile_json=record.profile_json or {},
    )


def create_resume_record(
    db: Session,
    *,
    filename: str,
    raw_pdf_path: str,
) -> ResumePersisted:
    record = ResumeRecord(
        id=uuid4().hex,
        filename=filename,
        raw_pdf_path=raw_pdf_path,
        raw_text="",
        profile_json={},
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _resume_record_to_schema(record)


def update_resume_record(
    db: Session,
    resume_id: str,
    *,
    raw_text: str,
    profile_json: dict,
) -> ResumePersisted | None:
    record = db.get(ResumeRecord, resume_id)
    if record is None:
        return None
    record.raw_text = raw_text
    record.profile_json = profile_json
    db.commit()
    db.refresh(record)
    return _resume_record_to_schema(record)


def create_batch_task(
    db: Session,
    *,
    selected_job_ids: list[str],
    total_resumes: int,
    match_mode: str,
) -> BatchMatchResponse:
    record = BatchMatchTaskRecord(
        id=uuid4().hex,
        status="queued",
        match_mode=match_mode,
        total_resumes=total_resumes,
        completed_resumes=0,
        selected_job_ids=selected_job_ids,
        result_json={},
        error_summary=[],
        trace=["批量匹配任务已创建。"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return batch_task_to_schema(record)


def batch_task_to_schema(record: BatchMatchTaskRecord) -> BatchMatchResponse:
    payload = record.result_json or {}
    return BatchMatchResponse(
        task_id=record.id,
        status=record.status,
        match_mode=record.match_mode,
        total_resumes=record.total_resumes,
        completed_resumes=record.completed_resumes,
        selected_job_ids=record.selected_job_ids or [],
        resume_results=payload.get("resume_results", []),
        job_rankings=payload.get("job_rankings", []),
        errors=record.error_summary or [],
        trace=record.trace or [],
    )


def get_batch_task(db: Session, task_id: str) -> BatchMatchResponse | None:
    record = db.get(BatchMatchTaskRecord, task_id)
    if record is None:
        return None
    return batch_task_to_schema(record)


def update_batch_task_state(
    db: Session,
    task_id: str,
    *,
    status: str | None = None,
    completed_resumes: int | None = None,
    result_json: dict | None = None,
    errors: list[str] | None = None,
    trace: list[str] | None = None,
) -> BatchMatchResponse | None:
    record = db.get(BatchMatchTaskRecord, task_id)
    if record is None:
        return None

    if status is not None:
        record.status = status
    if completed_resumes is not None:
        record.completed_resumes = completed_resumes
    if result_json is not None:
        record.result_json = result_json
    if errors is not None:
        record.error_summary = errors
    if trace is not None:
        record.trace = trace

    db.commit()
    db.refresh(record)
    return batch_task_to_schema(record)
