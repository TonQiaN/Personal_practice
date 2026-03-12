from time import perf_counter

from openai import OpenAI

from app.config import get_settings
from app.models import JobDescriptionInput, MatchResult, ResumeProfile
from app.services.runtime_logger import runtime_logger


def _fallback_summary(result: MatchResult, resume: ResumeProfile, jd: JobDescriptionInput) -> str:
    top_dimension = max(result.dimension_scores, key=lambda item: item.score)
    risk = result.hard_requirement_warnings[0] if result.hard_requirement_warnings else "没有明显硬门槛风险。"
    skills = "、".join(resume.skills[:5]) or "简历中可识别技能较少"
    return (
        f"该候选人与“{jd.title}”的匹配度为 {result.total_score} 分，结论为“{result.recommendation}”。"
        f" 优势主要体现在{top_dimension.name}，当前识别到的关键能力包括 {skills}。"
        f" 需要重点关注的是：{risk}"
    )


def build_explanation(
    result: MatchResult,
    resume: ResumeProfile,
    jd: JobDescriptionInput,
    request_id: str,
) -> str:
    settings = get_settings()
    if not settings.openai_api_key:
        return _fallback_summary(result, resume, jd)

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""
你是招聘匹配分析助手。请基于以下信息写一段 90 到 140 字的中文说明。
要求：
1. 只写一段
2. 说明匹配优势和主要风险
3. 不要编造简历中不存在的信息
4. 风格适合给 HR 看

岗位：{jd.title}
岗位摘要：{jd.summary}
总分：{result.total_score}
结论：{result.recommendation}
维度得分：{[(item.name, item.score) for item in result.dimension_scores]}
硬性风险：{result.hard_requirement_warnings}
    简历亮点：{resume.highlights[:3]}
""".strip()
    started_at = perf_counter()
    try:
        response = client.responses.create(
            model=settings.openai_model,
            input=prompt,
        )
        output_text = response.output_text.strip()
        runtime_logger.log(
            "model_call_completed",
            request_id,
            {
                "job_id": jd.id,
                "job_title": jd.title,
                "model": settings.openai_model,
                "duration_ms": round((perf_counter() - started_at) * 1000, 2),
                "prompt": prompt,
                "response_text": output_text,
            },
        )
        return output_text
    except Exception:
        runtime_logger.log(
            "model_call_failed",
            request_id,
            {
                "job_id": jd.id,
                "job_title": jd.title,
                "model": settings.openai_model,
                "duration_ms": round((perf_counter() - started_at) * 1000, 2),
                "prompt": prompt,
                "error": runtime_logger.format_exception(),
            },
        )
        return _fallback_summary(result, resume, jd)
