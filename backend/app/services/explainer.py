import json
from time import perf_counter

from openai import OpenAI

from app.config import get_settings
from app.models import ExplanationDetails, JobDescriptionInput, MatchResult, ResumeProfile
from app.services.runtime_logger import runtime_logger


def _normalize_term(term: str) -> str:
    return term.strip().lower()


def _parse_warning_terms(warning: str) -> list[str]:
    if "：" not in warning:
        return []
    _, tail = warning.split("：", 1)
    return [item.strip() for item in tail.split("、") if item.strip()]


def _build_fit_reasons(result: MatchResult, jd: JobDescriptionInput) -> list[str]:
    reasons: list[str] = []
    seen_terms: set[str] = set()
    for dimension in sorted(result.dimension_scores, key=lambda item: item.score, reverse=True):
        if not dimension.matched:
            continue
        fresh_terms = [
            item for item in dimension.matched if _normalize_term(item) not in seen_terms
        ]
        if not fresh_terms:
            continue
        matched = "、".join(fresh_terms[:3])
        seen_terms.update(_normalize_term(item) for item in fresh_terms[:3])
        reasons.append(
            f"{dimension.name}表现较强，已命中 {matched}，这和“{jd.title}”当前最需要的能力直接相关。"
        )
        if len(reasons) == 2:
            break
    return reasons


def _build_risk_reasons(result: MatchResult, jd: JobDescriptionInput) -> list[str]:
    reasons: list[str] = []
    covered_terms: set[str] = set()
    for warning in result.hard_requirement_warnings[:2]:
        covered_terms.update(_normalize_term(item) for item in _parse_warning_terms(warning))
        reasons.append(f"{warning} 这会直接影响“{jd.title}”的上手速度或岗位稳定性判断。")

    for dimension in result.dimension_scores:
        if not dimension.missing:
            continue
        fresh_missing = [
            item for item in dimension.missing if _normalize_term(item) not in covered_terms
        ]
        if not fresh_missing:
            continue
        missing = "、".join(fresh_missing[:3])
        covered_terms.update(_normalize_term(item) for item in fresh_missing[:3])
        reasons.append(
            f"{dimension.name}还缺少 {missing} 的明确信息，目前更像信息不足或能力证据不够，而不是已确认具备。"
        )
        if len(reasons) == 3:
            break
    return reasons


def _build_follow_up_questions(result: MatchResult, jd: JobDescriptionInput) -> list[str]:
    questions: list[str] = []
    asked_terms: set[str] = set()
    for dimension in result.dimension_scores:
        if dimension.missing:
            fresh_missing = [
                item for item in dimension.missing if _normalize_term(item) not in asked_terms
            ]
            if not fresh_missing:
                continue
            missing = "、".join(fresh_missing[:2])
            asked_terms.update(_normalize_term(item) for item in fresh_missing[:2])
            questions.append(f"请追问候选人在 {missing} 方面是否有实际项目经验，以及项目里的具体职责。")
        if len(questions) == 2:
            break

    if jd.min_years > 0 and "工作年限" not in asked_terms:
        questions.append(f"请确认候选人与“{jd.title}”相关的连续工作年限，以及是否真正独立负责过核心模块。")

    return questions[:3]


def _build_action_recommendation(result: MatchResult) -> str:
    if result.recommendation == "推荐":
        return "建议推进到下一轮面试，并优先核实高分维度是否对应真实项目深度。"
    if result.recommendation == "可考虑":
        return "建议作为备选推进，先补关键缺口信息，再决定是否进入正式面试。"
    return "当前不建议直接推进，可保留记录；若岗位供给不足，建议围绕主要风险做定向追问后再判断。"


def _parse_llm_explanation_json(output_text: str) -> dict[str, object]:
    cleaned = output_text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].strip().startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    payload = json.loads(cleaned)
    return {
        "fit_reasons": [str(item).strip() for item in payload.get("fit_reasons", []) if str(item).strip()],
        "risk_reasons": [str(item).strip() for item in payload.get("risk_reasons", []) if str(item).strip()],
        "follow_up_questions": [
            str(item).strip() for item in payload.get("follow_up_questions", []) if str(item).strip()
        ],
        "action_recommendation": str(payload.get("action_recommendation", "")).strip(),
    }


def _fallback_summary(result: MatchResult, resume: ResumeProfile, jd: JobDescriptionInput) -> ExplanationDetails:
    top_dimension = max(result.dimension_scores, key=lambda item: item.score)
    risk = result.hard_requirement_warnings[0] if result.hard_requirement_warnings else "没有明显硬门槛风险。"
    skills = "、".join(resume.skills[:5]) or "简历中可识别技能较少"
    return ExplanationDetails(
        summary=(
            f"该候选人与“{jd.title}”的匹配度为 {result.total_score} 分，结论为“{result.recommendation}”。"
            f" 优势主要体现在{top_dimension.name}，当前识别到的关键能力包括 {skills}。"
            f" 需要重点关注的是：{risk}"
        ),
        fit_reasons=_build_fit_reasons(result, jd),
        risk_reasons=_build_risk_reasons(result, jd),
        follow_up_questions=_build_follow_up_questions(result, jd),
        action_recommendation=_build_action_recommendation(result),
        evidence={
            "skills": resume.skills[:6],
            "education": resume.education[:3],
            "highlights": resume.highlights[:3],
        },
    )


def build_explanation(
    result: MatchResult,
    resume: ResumeProfile,
    jd: JobDescriptionInput,
    request_id: str,
) -> ExplanationDetails:
    settings = get_settings()
    fallback = _fallback_summary(result, resume, jd)
    if not settings.openai_api_key:
        return fallback

    client = OpenAI(api_key=settings.openai_api_key)
    prompt = f"""
你是招聘匹配分析助手。请基于以下信息，为 HR 输出结构化 JSON。
要求：
1. 只输出 JSON，不要输出 markdown，不要输出额外解释
2. JSON 结构必须是：
{{
  "fit_reasons": ["..."],
  "risk_reasons": ["..."],
  "follow_up_questions": ["..."],
  "action_recommendation": "..."
}}
3. 每个字段输出 2 到 3 条中文句子
4. 不要重复同一关键词，不要把同一缺口在不同字段里复读
5. 不要编造简历中不存在的信息
6. 风格适合给 HR 看，要具体，不要空泛
7. 如果硬性要求未满足，必须在 risk_reasons 中明确指出

岗位：{jd.title}
岗位摘要：{jd.summary}
总分：{result.total_score}
结论：{result.recommendation}
维度得分：{[(item.name, item.score, item.max_score) for item in result.dimension_scores]}
硬性风险：{result.hard_requirement_warnings}
规则生成的优势候选：{fallback.fit_reasons}
规则生成的风险候选：{fallback.risk_reasons}
规则生成的追问候选：{fallback.follow_up_questions}
规则生成的动作建议：{fallback.action_recommendation}
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
            agent_name="explanation_agent",
            graph_name="match_graph",
        )
        parsed = _parse_llm_explanation_json(output_text)
        return ExplanationDetails(
            summary=fallback.summary,
            fit_reasons=parsed["fit_reasons"][:3] or fallback.fit_reasons,
            risk_reasons=parsed["risk_reasons"][:3] or fallback.risk_reasons,
            follow_up_questions=parsed["follow_up_questions"][:3] or fallback.follow_up_questions,
            action_recommendation=str(parsed["action_recommendation"]) or fallback.action_recommendation,
            evidence=fallback.evidence,
        )
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
            agent_name="explanation_agent",
            graph_name="match_graph",
        )
        return _fallback_summary(result, resume, jd)
