from io import BytesIO
import json
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.config import get_settings
from app.db import SessionLocal
from app.db_models import JobDescriptionRecord
from app.main import app
from app.models import ExplanationDetails


client = TestClient(app)


def _make_pdf_bytes() -> bytes:
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_match_endpoint_returns_ranked_results():
    with patch(
        "app.main.extract_pdf_text",
        return_value="3年 Python FastAPI SQL 经验，本科，负责 API 开发。",
    ), patch(
        "app.workflows.match_graph.build_explanation",
        return_value=ExplanationDetails(
            summary="测试说明",
            fit_reasons=["具备岗位需要的 Python 和 FastAPI 经验，能直接承接 API 开发工作。"],
            risk_reasons=["简历里没有明确写出 Redis 的实战深度，属于待确认信息。"],
            follow_up_questions=["请追问候选人在 API 性能优化中的具体职责。"],
            action_recommendation="建议推进到技术初面，并优先核实数据库与缓存的实战深度。",
            evidence={},
        ),
    ):
        response = client.post(
            "/api/match",
            files={"resume": ("resume.pdf", _make_pdf_bytes(), "application/pdf")},
            data={"job_ids": json.dumps(["python-backend"])},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["request_id"]
    assert payload["ranked_results"][0]["job_title"] == "Python 后端工程师"
    assert payload["ranked_results"][0]["recommendation"] in {"推荐", "可考虑", "不推荐"}
    assert payload["ranked_results"][0]["explanation_details"]["follow_up_questions"]
    assert payload["ranked_results"][0]["explanation_details"]["action_recommendation"]


def test_match_endpoint_fast_mode_only_explains_top_three():
    with patch(
        "app.main.extract_pdf_text",
        return_value="5年 Python FastAPI SQL React 数据分析 产品协作经验，本科。",
    ), patch(
        "app.workflows.match_graph.build_explanation",
        return_value=ExplanationDetails(
            summary="测试说明",
            fit_reasons=["具备关键经验。"],
            risk_reasons=["仍需核实细节。"],
            follow_up_questions=["请追问候选人在关键项目里的职责。"],
            action_recommendation="建议继续推进。",
            evidence={},
        ),
    ) as mocked_explainer:
        response = client.post(
            "/api/match",
            files={"resume": ("resume.pdf", _make_pdf_bytes(), "application/pdf")},
            data={
                "job_ids": json.dumps(
                    ["python-backend", "frontend-react", "data-analyst", "product-manager"]
                ),
                "match_mode": "fast",
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["match_mode"] == "fast"
    assert len(payload["ranked_results"]) == 4
    assert mocked_explainer.call_count == 3


def test_match_endpoint_writes_runtime_logs(tmp_path):
    settings = get_settings()
    original_log_dir = settings.runtime_log_dir
    settings.runtime_log_dir = tmp_path

    try:
        with patch(
            "app.main.extract_pdf_text",
            return_value="3年 Python FastAPI SQL 经验，本科，负责 API 开发。",
        ), patch(
            "app.workflows.match_graph.build_explanation",
            return_value=ExplanationDetails(
                summary="测试说明",
                fit_reasons=[],
                risk_reasons=[],
                follow_up_questions=[],
                action_recommendation="建议继续评估。",
                evidence={},
            ),
        ):
            response = client.post(
                "/api/match",
                files={"resume": ("resume.pdf", _make_pdf_bytes(), "application/pdf")},
                data={"job_ids": json.dumps(["python-backend"])},
            )
    finally:
        settings.runtime_log_dir = original_log_dir

    assert response.status_code == 200
    log_files = list(tmp_path.glob("*.jsonl"))
    assert len(log_files) == 1

    lines = log_files[0].read_text(encoding="utf-8").strip().splitlines()
    entries = [json.loads(line) for line in lines]
    event_types = {entry["event_type"] for entry in entries}

    assert "request_started" in event_types
    assert "node_completed" in event_types
    assert "request_completed" in event_types


def test_jd_pdf_upload_persists_draft_record(tmp_path):
    settings = get_settings()
    original_upload_dir = settings.jd_upload_dir
    settings.jd_upload_dir = tmp_path
    try:
        with patch(
            "app.main.extract_pdf_text",
            return_value="Python 后端工程师\n负责 API 开发\n必须熟练 Python 和 FastAPI\n3年以上经验\n本科及以上",
        ):
            response = client.post(
                "/api/jds/upload-pdf",
                files={"jd_pdf": ("jd.pdf", _make_pdf_bytes(), "application/pdf")},
            )
    finally:
        settings.jd_upload_dir = original_upload_dir

    assert response.status_code == 200
    payload = response.json()
    assert payload["persisted"]["status"] == "draft"
    assert payload["persisted"]["raw_pdf_path"].endswith(".pdf")

    db = SessionLocal()
    try:
        record = db.get(JobDescriptionRecord, payload["persisted"]["job"]["id"])
        if record is not None:
            db.delete(record)
            db.commit()
    finally:
        db.close()


def test_delete_uploaded_jd_endpoint():
    create_response = client.post(
        "/api/jds",
        json={
            "job": {
                "id": "manual-delete-target",
                "title": "临时岗位",
                "summary": "用于测试删除接口。",
                "must_have": ["python"],
                "nice_to_have": [],
                "min_years": 1,
                "industry_keywords": [],
                "education_keywords": [],
                "project_keywords": [],
            },
            "source_type": "manual",
            "status": "confirmed",
            "raw_text": "用于测试删除接口。",
            "normalized_json": {},
            "user_corrected_json": {},
        },
    )
    assert create_response.status_code == 200

    delete_response = client.delete("/api/jds/manual-delete-target")
    assert delete_response.status_code == 200
    assert delete_response.json() == {"deleted": True, "job_id": "manual-delete-target"}


def test_delete_preset_jd_allowed_and_restore():
    response = client.delete("/api/jds/python-backend")
    assert response.status_code == 200

    restore_response = client.post(
        "/api/jds",
        json={
            "job": {
                "id": "python-backend",
                "title": "Python 后端工程师",
                "summary": "负责 API 服务、数据处理和后端架构优化。",
                "must_have": ["python", "fastapi", "sql"],
                "nice_to_have": ["redis", "docker", "postgresql"],
                "min_years": 3,
                "industry_keywords": ["企业服务", "saas"],
                "education_keywords": ["本科", "计算机"],
                "project_keywords": ["api", "python", "postgresql"],
            },
            "source_type": "preset",
            "status": "confirmed",
            "raw_text": "负责 API 服务、数据处理和后端架构优化。",
            "normalized_json": {
                "id": "python-backend",
                "title": "Python 后端工程师",
                "summary": "负责 API 服务、数据处理和后端架构优化。",
                "must_have": ["python", "fastapi", "sql"],
                "nice_to_have": ["redis", "docker", "postgresql"],
                "min_years": 3,
                "industry_keywords": ["企业服务", "saas"],
                "education_keywords": ["本科", "计算机"],
                "project_keywords": ["api", "python", "postgresql"],
            },
            "user_corrected_json": {
                "id": "python-backend",
                "title": "Python 后端工程师",
                "summary": "负责 API 服务、数据处理和后端架构优化。",
                "must_have": ["python", "fastapi", "sql"],
                "nice_to_have": ["redis", "docker", "postgresql"],
                "min_years": 3,
                "industry_keywords": ["企业服务", "saas"],
                "education_keywords": ["本科", "计算机"],
                "project_keywords": ["api", "python", "postgresql"],
            },
        },
    )
    assert restore_response.status_code == 200


def test_batch_match_creates_completed_task():
    with patch(
        "app.services.batch_match_service.extract_pdf_text",
        side_effect=[
            "3年 Python FastAPI SQL 经验，本科，负责 API 开发。",
            "5年 产品设计 用户研究 数据分析 经验，本科，负责 B 端产品规划。",
        ],
    ), patch(
        "app.workflows.match_graph.build_explanation",
        return_value=ExplanationDetails(
            summary="测试说明",
            fit_reasons=["具备关键经验。"],
            risk_reasons=["仍需核实细节。"],
            follow_up_questions=["请追问候选人在核心项目里的实际职责。"],
            action_recommendation="建议进入下一轮评估。",
            evidence={},
        ),
    ):
        response = client.post(
            "/api/batch-match",
            files=[
                ("resumes", ("resume-a.pdf", _make_pdf_bytes(), "application/pdf")),
                ("resumes", ("resume-b.pdf", _make_pdf_bytes(), "application/pdf")),
            ],
            data={"job_ids": json.dumps(["python-backend", "product-manager"])},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["task_id"]
    assert payload["total_resumes"] == 2

    status_response = client.get(f"/api/batch-match/{payload['task_id']}")
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["status"] == "completed"
    assert status_payload["match_mode"] == "full"
    assert status_payload["completed_resumes"] == 2
    assert len(status_payload["resume_results"]) == 2
    assert status_payload["job_rankings"]
