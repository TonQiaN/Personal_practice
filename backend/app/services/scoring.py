from app.models import DimensionScore, JobDescriptionInput, MatchResult, ResumeProfile


SKILL_SYNONYMS: dict[str, set[str]] = {
    "next.js": {"react", "typescript", "javascript"},
    "langgraph": {"langchain", "llm", "prompt"},
    "fastapi": {"python", "api"},
    "postgresql": {"sql"},
    "机器学习": {"深度学习", "llm", "大模型"},
    "数据分析": {"sql", "python"},
}


def _matched_terms(candidates: list[str], requirements: list[str]) -> tuple[list[str], list[str]]:
    candidate_set = {item.lower() for item in candidates}
    matched: list[str] = []
    missing: list[str] = []

    for requirement in requirements:
        key = requirement.lower()
        synonyms = SKILL_SYNONYMS.get(key, set())
        if key in candidate_set or any(synonym in candidate_set for synonym in synonyms):
            matched.append(requirement)
        else:
            missing.append(requirement)

    return matched, missing


def _score_bucket(ratio: float, weight: int) -> int:
    return int(round(ratio * weight))


def _build_dimension_scores(
    resume: ResumeProfile,
    jd: JobDescriptionInput,
) -> tuple[list[DimensionScore], list[str]]:
    scores: list[DimensionScore] = []
    warnings: list[str] = []

    skill_matched, skill_missing = _matched_terms(resume.skills, jd.must_have)
    nice_matched, nice_missing = _matched_terms(resume.skills, jd.nice_to_have)
    project_matched, project_missing = _matched_terms(resume.project_terms, jd.project_keywords)
    industry_matched, industry_missing = _matched_terms(resume.industries, jd.industry_keywords)
    edu_matched, edu_missing = _matched_terms(resume.education, jd.education_keywords)

    must_ratio = len(skill_matched) / len(jd.must_have) if jd.must_have else 1
    nice_ratio = len(nice_matched) / len(jd.nice_to_have) if jd.nice_to_have else 1
    project_ratio = len(project_matched) / len(jd.project_keywords) if jd.project_keywords else 1
    industry_ratio = len(industry_matched) / len(jd.industry_keywords) if jd.industry_keywords else 1
    edu_ratio = len(edu_matched) / len(jd.education_keywords) if jd.education_keywords else 1
    years_ratio = (
        min(resume.years_of_experience / jd.min_years, 1) if jd.min_years > 0 else 1
    )

    scores.append(
        DimensionScore(
            name="技能匹配",
            score=_score_bucket((must_ratio * 0.8) + (nice_ratio * 0.2), 35),
            matched=skill_matched + nice_matched,
            missing=skill_missing,
            note="核心技能优先，加分项次之。",
        )
    )
    scores.append(
        DimensionScore(
            name="工作年限",
            score=_score_bucket(years_ratio, 20),
            matched=[f"{resume.years_of_experience} 年经验"],
            missing=[f"要求至少 {jd.min_years} 年"] if years_ratio < 1 else [],
            note="按简历中明确可识别的年限估算。",
        )
    )
    scores.append(
        DimensionScore(
            name="项目经历",
            score=_score_bucket(project_ratio, 20),
            matched=project_matched,
            missing=project_missing,
            note="根据项目关键词和技能交叉判断。",
        )
    )
    scores.append(
        DimensionScore(
            name="行业经验",
            score=_score_bucket(industry_ratio, 10),
            matched=industry_matched,
            missing=industry_missing,
            note="只做弱匹配，不做强制迁移判断。",
        )
    )
    scores.append(
        DimensionScore(
            name="教育背景",
            score=_score_bucket(edu_ratio, 5),
            matched=edu_matched,
            missing=edu_missing,
            note="当前只识别粗粒度教育关键词。",
        )
    )
    scores.append(
        DimensionScore(
            name="加分项匹配",
            score=_score_bucket(nice_ratio, 10),
            matched=nice_matched,
            missing=nice_missing,
            note="体现可拓展能力和岗位贴合度。",
        )
    )

    if skill_missing:
        warnings.append(f"缺少核心技能：{'、'.join(skill_missing)}")
    if jd.min_years > 0 and resume.years_of_experience < jd.min_years:
        warnings.append("工作年限低于岗位最低要求。")

    return scores, warnings


def _recommendation(total_score: int) -> str:
    if total_score >= 75:
        return "推荐"
    if total_score >= 60:
        return "可考虑"
    return "不推荐"


def score_resume_against_jd(resume: ResumeProfile, jd: JobDescriptionInput) -> MatchResult:
    dimension_scores, warnings = _build_dimension_scores(resume, jd)
    total_score = sum(item.score for item in dimension_scores)
    summary = (
        f"{jd.title} 综合得分 {total_score}。"
        f" 主要亮点在 {dimension_scores[0].name} 与 {dimension_scores[2].name}，"
        f" 需要关注 {warnings[0] if warnings else '硬性要求基本满足'}。"
    )
    return MatchResult(
        job_id=jd.id,
        job_title=jd.title,
        total_score=total_score,
        recommendation=_recommendation(total_score),
        summary=summary,
        dimension_scores=dimension_scores,
        hard_requirement_warnings=warnings,
    )
