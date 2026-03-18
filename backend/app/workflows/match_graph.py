import asyncio
from time import perf_counter
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.config import get_settings
from app.models import JobDescriptionInput, MatchResponse, MatchResult, ResumeProfile
from app.services.explainer import build_explanation
from app.services.runtime_logger import runtime_logger
from app.services.scoring import score_resume_against_jd


class MatchState(TypedDict):
    request_id: str
    match_mode: str
    resume_profile: ResumeProfile
    jobs: list[JobDescriptionInput]
    trace: list[str]
    scored_results: list[MatchResult]
    ranked_results: list[MatchResult]


async def match_jobs_node(state: MatchState) -> dict:
    started_at = perf_counter()
    resume_profile = state["resume_profile"]
    parallelism = max(get_settings().match_parallelism, 1)
    semaphore = asyncio.Semaphore(parallelism)

    async def score_job(job: JobDescriptionInput) -> MatchResult:
        async with semaphore:
            return await asyncio.to_thread(score_resume_against_jd, resume_profile, job)

    scored = await asyncio.gather(*(score_job(job) for job in state["jobs"]))
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "matching_agent",
            "duration_ms": duration_ms,
            "input_summary": {
                "job_count": len(state["jobs"]),
                "resume_skills_count": len(resume_profile.skills),
                "parallelism": parallelism,
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
        agent_name="matching_agent",
        graph_name="match_graph",
    )

    return {
        "scored_results": scored,
        "trace": state["trace"] + [f"Matching Agent 已完成 {len(scored)} 条 JD 的规则打分。"],
    }


def rank_jobs_node(state: MatchState) -> dict:
    started_at = perf_counter()
    ranked = sorted(state["scored_results"], key=lambda item: item.total_score, reverse=True)
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "ranking_agent",
            "duration_ms": duration_ms,
            "output_summary": {
                "top_3": [
                    {
                        "job_id": item.job_id,
                        "job_title": item.job_title,
                        "total_score": item.total_score,
                        "recommendation": item.recommendation,
                    }
                    for item in ranked[:3]
                ]
            },
        },
        agent_name="ranking_agent",
        graph_name="match_graph",
    )
    return {
        "ranked_results": ranked,
        "trace": state["trace"] + ["Ranking Agent 已完成排序、分档和 Top 3 高亮计算。"],
    }


async def explain_jobs_node(state: MatchState) -> dict:
    started_at = perf_counter()
    resume_profile = state["resume_profile"]
    parallelism = max(get_settings().match_parallelism, 1)
    semaphore = asyncio.Semaphore(parallelism)
    jobs_by_id = {job.id: job for job in state["jobs"]}
    explain_limit = 3 if state["match_mode"] == "fast" else len(state["ranked_results"])
    explain_targets = state["ranked_results"][:explain_limit]
    untouched_results = state["ranked_results"][explain_limit:]

    async def explain_result(result: MatchResult) -> MatchResult:
        job = jobs_by_id[result.job_id]
        async with semaphore:
            explanation = await asyncio.to_thread(
                build_explanation,
                result,
                resume_profile,
                job,
                state["request_id"],
            )
        return result.model_copy(
            update={
                "summary": explanation.summary,
                "explanation_details": explanation,
            }
        )

    explained_results = await asyncio.gather(*(explain_result(result) for result in explain_targets))
    final_results = explained_results + untouched_results
    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "explain_jobs",
            "duration_ms": duration_ms,
            "input_summary": {
                "result_count": len(state["ranked_results"]),
                "parallelism": parallelism,
                "match_mode": state["match_mode"],
                "explain_limit": explain_limit,
            },
            "output_summary": {
                "explained_count": len(explained_results),
            },
        },
        agent_name="explanation_agent",
        graph_name="match_graph",
    )

    return {
        "ranked_results": final_results,
        "trace": state["trace"]
        + [
            "Explanation Agent 已完成详细说明生成。"
            if state["match_mode"] == "full"
            else f"Explanation Agent 已完成 Top {len(explained_results)} 详细说明生成，其余岗位保留快速摘要。"
        ],
    }


def build_match_graph():
    builder = StateGraph(MatchState)
    builder.add_node("match_jobs", match_jobs_node)
    builder.add_node("rank_jobs", rank_jobs_node)
    builder.add_node("explain_jobs", explain_jobs_node)
    builder.add_edge(START, "match_jobs")
    builder.add_edge("match_jobs", "rank_jobs")
    builder.add_edge("rank_jobs", "explain_jobs")
    builder.add_edge("explain_jobs", END)
    return builder.compile()


graph = build_match_graph()


async def run_match_flow(
    resume_profile: ResumeProfile,
    jobs: list[JobDescriptionInput],
    request_id: str,
    match_mode: str = "full",
) -> MatchResponse:
    state = await graph.ainvoke(
        {
            "request_id": request_id,
            "match_mode": match_mode,
            "resume_profile": resume_profile,
            "jobs": jobs,
            "trace": [
                "开始执行 Matching / Ranking / Explanation 主流程。"
                if match_mode == "full"
                else "开始执行快速匹配主流程，详细 explanation 只保留 Top 3。"
            ],
            "scored_results": [],
            "ranked_results": [],
        }
    )
    return MatchResponse(
        request_id=request_id,
        match_mode=match_mode,
        resume_summary=state["resume_profile"],
        ranked_results=state["ranked_results"],
        trace=state["trace"],
    )
