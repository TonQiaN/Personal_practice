from typing import Literal

from pydantic import BaseModel, Field


class JobDescriptionInput(BaseModel):
    id: str
    title: str
    summary: str
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    min_years: int = 0
    industry_keywords: list[str] = Field(default_factory=list)
    education_keywords: list[str] = Field(default_factory=list)
    project_keywords: list[str] = Field(default_factory=list)


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
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    note: str


class MatchResult(BaseModel):
    job_id: str
    job_title: str
    total_score: int
    recommendation: Literal["推荐", "可考虑", "不推荐"]
    summary: str
    dimension_scores: list[DimensionScore]
    hard_requirement_warnings: list[str] = Field(default_factory=list)


class MatchResponse(BaseModel):
    request_id: str
    resume_summary: ResumeProfile
    ranked_results: list[MatchResult]
    trace: list[str]
