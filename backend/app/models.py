from typing import Literal

from pydantic import BaseModel, Field


class JobDescriptionInput(BaseModel):
    id: str = ""
    title: str
    summary: str
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    min_years: int = 0
    industry_keywords: list[str] = Field(default_factory=list)
    education_keywords: list[str] = Field(default_factory=list)
    project_keywords: list[str] = Field(default_factory=list)


class JDParseWarning(BaseModel):
    message: str
    severity: Literal["low", "medium", "high"] = "medium"


class JobDescriptionPersistPayload(BaseModel):
    job: JobDescriptionInput
    source_type: Literal["preset", "manual", "jd_pdf"] = "manual"
    status: Literal["draft", "confirmed"] = "confirmed"
    raw_pdf_path: str | None = None
    raw_text: str = ""
    normalized_json: dict = Field(default_factory=dict)
    user_corrected_json: dict = Field(default_factory=dict)


class JobDescriptionPersisted(BaseModel):
    job: JobDescriptionInput
    source_type: str
    status: str
    raw_pdf_path: str | None
    raw_text: str
    normalized_json: dict
    user_corrected_json: dict


class JDParseResponse(BaseModel):
    request_id: str
    parsed_job: JobDescriptionInput
    raw_text: str
    warnings: list[JDParseWarning] = Field(default_factory=list)
    trace: list[str] = Field(default_factory=list)
    persisted: JobDescriptionPersisted


class ResumeProfile(BaseModel):
    raw_text: str
    years_of_experience: int
    skills: list[str]
    industries: list[str]
    education: list[str]
    project_terms: list[str]
    highlights: list[str]
    uncertainties: list[str] = Field(default_factory=list)


class DimensionScore(BaseModel):
    name: str
    score: int
    max_score: int
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    note: str


class ExplanationDetails(BaseModel):
    summary: str
    fit_reasons: list[str] = Field(default_factory=list)
    risk_reasons: list[str] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    action_recommendation: str = ""
    evidence: dict = Field(default_factory=dict)


class MatchResult(BaseModel):
    job_id: str
    job_title: str
    total_score: int
    recommendation: Literal["推荐", "可考虑", "不推荐"]
    summary: str
    explanation_details: ExplanationDetails = Field(
        default_factory=lambda: ExplanationDetails(summary="")
    )
    dimension_scores: list[DimensionScore]
    hard_requirement_warnings: list[str] = Field(default_factory=list)


class MatchResponse(BaseModel):
    request_id: str
    match_mode: Literal["fast", "full"] = "full"
    resume_summary: ResumeProfile
    ranked_results: list[MatchResult]
    trace: list[str]


class ResumePersisted(BaseModel):
    id: str
    filename: str
    raw_pdf_path: str
    raw_text: str = ""
    profile_json: dict = Field(default_factory=dict)


class BatchResumeMatchResult(BaseModel):
    resume_id: str
    filename: str
    status: Literal["completed", "failed"]
    error: str | None = None
    top_matches: list[MatchResult] = Field(default_factory=list)
    full_result: MatchResponse | None = None


class BatchJobTopCandidate(BaseModel):
    resume_id: str
    filename: str
    total_score: int
    recommendation: Literal["推荐", "可考虑", "不推荐"]
    summary: str


class BatchJobRanking(BaseModel):
    job_id: str
    job_title: str
    top_candidates: list[BatchJobTopCandidate] = Field(default_factory=list)


class BatchMatchResponse(BaseModel):
    task_id: str
    status: Literal["queued", "processing", "completed", "failed"]
    match_mode: Literal["fast", "full"] = "full"
    total_resumes: int
    completed_resumes: int
    selected_job_ids: list[str] = Field(default_factory=list)
    resume_results: list[BatchResumeMatchResult] = Field(default_factory=list)
    job_rankings: list[BatchJobRanking] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    trace: list[str] = Field(default_factory=list)
