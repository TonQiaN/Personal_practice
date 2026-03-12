from app.models import JobDescriptionInput, ResumeProfile
from app.services.normalizer import normalize_resume
from app.services.scoring import score_resume_against_jd


def test_scoring_returns_recommendation_and_dimension_scores():
    resume = ResumeProfile(
        raw_text="5年 Python FastAPI PostgreSQL 企业服务经验，本科，负责 API 项目。",
        years_of_experience=5,
        skills=["python", "fastapi", "postgresql", "sql"],
        industries=["企业服务", "saas"],
        education=["本科", "计算机"],
        project_terms=["api", "python", "postgresql"],
        highlights=["5年后端经验"],
        uncertainties=[],
    )
    jd = JobDescriptionInput(
        id="python-backend",
        title="Python 后端工程师",
        summary="后端开发",
        must_have=["python", "fastapi", "sql"],
        nice_to_have=["postgresql"],
        min_years=3,
        industry_keywords=["企业服务"],
        education_keywords=["本科"],
        project_keywords=["api", "python"],
    )

    result = score_resume_against_jd(resume, jd)

    assert result.total_score >= 75
    assert result.recommendation == "推荐"
    assert len(result.dimension_scores) == 6


def test_scoring_marks_missing_core_requirements():
    resume = ResumeProfile(
        raw_text="1年 React 实习经验",
        years_of_experience=1,
        skills=["react", "typescript"],
        industries=["消费互联网"],
        education=["本科"],
        project_terms=["react"],
        highlights=["前端经验"],
        uncertainties=[],
    )
    jd = JobDescriptionInput(
        id="python-backend",
        title="Python 后端工程师",
        summary="后端开发",
        must_have=["python", "fastapi"],
        nice_to_have=[],
        min_years=3,
        industry_keywords=[],
        education_keywords=[],
        project_keywords=["api"],
    )

    result = score_resume_against_jd(resume, jd)

    assert result.recommendation == "不推荐"
    assert result.hard_requirement_warnings


def test_normalizer_extracts_generic_year_pattern():
    profile = normalize_resume("5年 Python FastAPI SQL 企业服务经验，本科，负责 API 开发。")

    assert profile.years_of_experience == 5
    assert "api" in profile.skills
