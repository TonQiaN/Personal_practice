from time import perf_counter
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.models import JobDescriptionInput, MatchResponse, MatchResult, ResumeProfile
from app.services.explainer import build_explanation
from app.services.normalizer import normalize_resume
from app.services.runtime_logger import runtime_logger
from app.services.scoring import score_resume_against_jd


class MatchState(TypedDict):
    request_id: str
    raw_resume_text: str
    jobs: list[JobDescriptionInput]
    trace: list[str]
    resume_profile: ResumeProfile | None
    ranked_results: list[MatchResult]
    node_timings: list[dict]


def parse_resume_node(state: MatchState) -> dict:
    started_at = perf_counter()
    profile = normalize_resume(state["raw_resume_text"])
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "parse_resume",
            "duration_ms": duration_ms,
            "input_summary": {
                "resume_text_length": len(state["raw_resume_text"]),
                "job_count": len(state["jobs"]),
            },
            "output_summary": {
                "years_of_experience": profile.years_of_experience,
                "skills_count": len(profile.skills),
                "industry_count": len(profile.industries),
            },
        },
    )
    return {
        "resume_profile": profile,
        "trace": state["trace"] + ["已完成简历解析与结构化抽取。"],
        "node_timings": state["node_timings"] + [{"node": "parse_resume", "duration_ms": duration_ms}],
    }


def match_jobs_node(state: MatchState) -> dict:
    started_at = perf_counter()
    resume_profile = state["resume_profile"]
    assert resume_profile is not None

    scored = [score_resume_against_jd(resume_profile, job) for job in state["jobs"]]
    scored.sort(key=lambda item: item.total_score, reverse=True)
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "match_jobs",
            "duration_ms": duration_ms,
            "input_summary": {
                "job_count": len(state["jobs"]),
                "resume_skills_count": len(resume_profile.skills),
            },
            "output_summary": {
                "top_results": [
                    {
                        "job_id": item.job_id,
                        "job_title": item.job_title,
                        "total_score": item.total_score,
                        "recommendation": item.recommendation,
                    }
                    for item in scored[:3]
                ],
            },
        },
    )

    return {
        "ranked_results": scored,
        "trace": state["trace"] + [f"已完成 {len(scored)} 条 JD 的规则打分。"],
        "node_timings": state["node_timings"] + [{"node": "match_jobs", "duration_ms": duration_ms}],
    }


def explain_jobs_node(state: MatchState) -> dict:
    started_at = perf_counter()
    resume_profile = state["resume_profile"]
    assert resume_profile is not None

    explained_results: list[MatchResult] = []
    for result in state["ranked_results"]:
        job = next(job for job in state["jobs"] if job.id == result.job_id)
        explained_results.append(
            result.model_copy(
                update={
                    "summary": build_explanation(
                        result=result,
                        resume=resume_profile,
                        jd=job,
                        request_id=state["request_id"],
                    )
                }
            )
        )
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "explain_jobs",
            "duration_ms": duration_ms,
            "input_summary": {
                "result_count": len(state["ranked_results"]),
            },
            "output_summary": {
                "explained_count": len(explained_results),
            },
        },
    )

    return {
        "ranked_results": explained_results,
        "trace": state["trace"] + ["已完成结果解释生成。"],
        "node_timings": state["node_timings"] + [{"node": "explain_jobs", "duration_ms": duration_ms}],
    }


def build_match_graph():
    builder = StateGraph(MatchState)
    builder.add_node("parse_resume", parse_resume_node)
    builder.add_node("match_jobs", match_jobs_node)
    builder.add_node("explain_jobs", explain_jobs_node)
    builder.add_edge(START, "parse_resume")
    builder.add_edge("parse_resume", "match_jobs")
    builder.add_edge("match_jobs", "explain_jobs")
    builder.add_edge("explain_jobs", END)
    return builder.compile()


graph = build_match_graph()


def run_match_flow(
    raw_resume_text: str,
    jobs: list[JobDescriptionInput],
    request_id: str,
) -> MatchResponse:
    state = graph.invoke(
        {
            "request_id": request_id,
            "raw_resume_text": raw_resume_text,
            "jobs": jobs,
            "trace": ["开始执行 LangGraph 匹配工作流。"],
            "resume_profile": None,
            "ranked_results": [],
            "node_timings": [],
        }
    )
    return MatchResponse(
        request_id=request_id,
        resume_summary=state["resume_profile"],
        ranked_results=state["ranked_results"],
        trace=state["trace"],
    )
