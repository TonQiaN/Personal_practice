from pathlib import Path
from time import perf_counter
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.config import get_settings
from app.models import JDParseResponse, JobDescriptionPersistPayload
from app.repositories.jd_repository import upsert_jd
from app.services.jd_normalizer import normalize_jd_text
from app.services.runtime_logger import runtime_logger


class JDState(TypedDict):
    request_id: str
    pdf_path: str
    raw_text: str
    trace: list[str]
    parsed_job: dict | None
    warnings: list[dict]
    persisted: dict | None
    db: object


def extract_jd_node(state: JDState) -> dict:
    started_at = perf_counter()
    runtime_logger.log(
        "jd_pdf_node_completed",
        state["request_id"],
        {
            "node": "extract_jd_text",
            "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            "pdf_path": state["pdf_path"],
            "text_length": len(state["raw_text"]),
        },
        agent_name="jd_pdf_agent",
        graph_name="jd_pdf_graph",
    )
    return {"trace": state["trace"] + ["JD PDF Agent 已提取原始文本。"]}


def normalize_jd_node(state: JDState) -> dict:
    started_at = perf_counter()
    parsed_job, warnings = normalize_jd_text(state["raw_text"])
    runtime_logger.log(
        "jd_pdf_node_completed",
        state["request_id"],
        {
            "node": "normalize_jd",
            "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            "output_summary": {
                "title": parsed_job.title,
                "must_have_count": len(parsed_job.must_have),
                "nice_to_have_count": len(parsed_job.nice_to_have),
                "warning_count": len(warnings),
            },
        },
        agent_name="jd_pdf_agent",
        graph_name="jd_pdf_graph",
    )
    return {
        "parsed_job": parsed_job.model_dump(),
        "warnings": [item.model_dump() for item in warnings],
        "trace": state["trace"] + ["JD PDF Agent 已完成结构化抽取。"],
    }


def persist_jd_node(state: JDState) -> dict:
    started_at = perf_counter()
    parsed_job = state["parsed_job"]
    assert parsed_job is not None
    db = state["db"]
    payload = JobDescriptionPersistPayload(
        job=parsed_job,
        source_type="jd_pdf",
        status="draft",
        raw_pdf_path=state["pdf_path"],
        raw_text=state["raw_text"],
        normalized_json=parsed_job,
        user_corrected_json=parsed_job,
    )
    persisted = upsert_jd(db, payload)
    runtime_logger.log(
        "jd_pdf_node_completed",
        state["request_id"],
        {
            "node": "persist_jd",
            "duration_ms": round((perf_counter() - started_at) * 1000, 2),
            "persisted_job_id": persisted.job.id,
            "status": persisted.status,
        },
        agent_name="jd_pdf_agent",
        graph_name="jd_pdf_graph",
    )
    return {
        "persisted": persisted.model_dump(),
        "trace": state["trace"] + ["JD PDF Agent 已保存解析结果。"],
    }


def build_jd_pdf_graph():
    builder = StateGraph(JDState)
    builder.add_node("extract_jd_text", extract_jd_node)
    builder.add_node("normalize_jd", normalize_jd_node)
    builder.add_node("persist_jd", persist_jd_node)
    builder.add_edge(START, "extract_jd_text")
    builder.add_edge("extract_jd_text", "normalize_jd")
    builder.add_edge("normalize_jd", "persist_jd")
    builder.add_edge("persist_jd", END)
    return builder.compile()


jd_pdf_graph = build_jd_pdf_graph()


def run_jd_pdf_agent(pdf_path: str, raw_text: str, request_id: str, db) -> JDParseResponse:
    state = jd_pdf_graph.invoke(
        {
            "request_id": request_id,
            "pdf_path": pdf_path,
            "raw_text": raw_text,
            "trace": ["开始执行 JD PDF Agent。"],
            "parsed_job": None,
            "warnings": [],
            "persisted": None,
            "db": db,
        }
    )
    return JDParseResponse(
        request_id=request_id,
        parsed_job=state["parsed_job"],
        raw_text=state["raw_text"],
        warnings=state["warnings"],
        trace=state["trace"],
        persisted=state["persisted"],
    )
