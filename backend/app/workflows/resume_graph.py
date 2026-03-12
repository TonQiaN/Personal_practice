from time import perf_counter
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.models import ResumeProfile
from app.services.normalizer import normalize_resume
from app.services.runtime_logger import runtime_logger


class ResumeState(TypedDict):
    request_id: str
    raw_resume_text: str
    trace: list[str]
    resume_profile: ResumeProfile | None


def parse_resume_node(state: ResumeState) -> dict:
    started_at = perf_counter()
    profile = normalize_resume(state["raw_resume_text"])
    runtime_logger.log(
        "node_completed",
        state["request_id"],
        {
            "node": "resume_parse",
            "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            "input_summary": {"resume_text_length": len(state["raw_resume_text"])},
            "output_summary": {
                "years_of_experience": profile.years_of_experience,
                "skills_count": len(profile.skills),
            },
        },
        agent_name="resume_parser_agent",
        graph_name="resume_graph",
    )
    return {
        "resume_profile": profile,
        "trace": state["trace"] + ["Resume Parser Agent 已完成简历结构化。"],
    }


def build_resume_graph():
    builder = StateGraph(ResumeState)
    builder.add_node("parse_resume", parse_resume_node)
    builder.add_edge(START, "parse_resume")
    builder.add_edge("parse_resume", END)
    return builder.compile()


resume_graph = build_resume_graph()


def run_resume_agent(raw_resume_text: str, request_id: str) -> tuple[ResumeProfile, list[str]]:
    state = resume_graph.invoke(
        {
            "request_id": request_id,
            "raw_resume_text": raw_resume_text,
            "trace": ["开始执行 Resume Parser Agent。"],
            "resume_profile": None,
        }
    )
    return state["resume_profile"], state["trace"]
