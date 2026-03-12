from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db_models import JobDescriptionRecord
from app.models import JobDescriptionInput, JobDescriptionPersisted, JobDescriptionPersistPayload


def _record_to_schema(record: JobDescriptionRecord) -> JobDescriptionPersisted:
    corrected = record.user_corrected_json or record.normalized_json or {}
    job_input = JobDescriptionInput.model_validate(
        {
            "id": record.id,
            "title": corrected.get("title", record.title),
            "summary": corrected.get("summary", record.summary),
            "must_have": corrected.get("must_have", []),
            "nice_to_have": corrected.get("nice_to_have", []),
            "min_years": corrected.get("min_years", 0),
            "industry_keywords": corrected.get("industry_keywords", []),
            "education_keywords": corrected.get("education_keywords", []),
            "project_keywords": corrected.get("project_keywords", []),
        }
    )
    return JobDescriptionPersisted(
        job=job_input,
        source_type=record.source_type,
        status=record.status,
        raw_pdf_path=record.raw_pdf_path,
        raw_text=record.raw_text,
        normalized_json=record.normalized_json or {},
        user_corrected_json=record.user_corrected_json or {},
    )


def list_jds(db: Session) -> list[JobDescriptionPersisted]:
    rows = db.execute(select(JobDescriptionRecord).order_by(JobDescriptionRecord.created_at.desc())).scalars()
    return [_record_to_schema(row) for row in rows]


def get_jd(db: Session, job_id: str) -> JobDescriptionPersisted | None:
    record = db.get(JobDescriptionRecord, job_id)
    if not record:
        return None
    return _record_to_schema(record)


def delete_jd(db: Session, job_id: str) -> bool:
    record = db.get(JobDescriptionRecord, job_id)
    if record is None:
        return False

    db.delete(record)
    db.commit()
    return True


def upsert_jd(db: Session, payload: JobDescriptionPersistPayload) -> JobDescriptionPersisted:
    job_id = payload.job.id or uuid4().hex
    record = db.get(JobDescriptionRecord, job_id)
    if record is None:
        record = JobDescriptionRecord(
            id=job_id,
            title=payload.job.title,
            source_type=payload.source_type,
            status=payload.status,
            raw_pdf_path=payload.raw_pdf_path,
            raw_text=payload.raw_text,
            summary=payload.job.summary,
            normalized_json=payload.normalized_json,
            user_corrected_json=payload.user_corrected_json,
        )
        db.add(record)
    else:
        record.title = payload.job.title
        record.source_type = payload.source_type
        record.status = payload.status
        record.raw_pdf_path = payload.raw_pdf_path
        record.raw_text = payload.raw_text
        record.summary = payload.job.summary
        record.normalized_json = payload.normalized_json
        record.user_corrected_json = payload.user_corrected_json

    db.commit()
    db.refresh(record)
    return _record_to_schema(record)
