from io import BytesIO
import json
from unittest.mock import patch

from fastapi.testclient import TestClient
from pypdf import PdfWriter

from app.config import get_settings
from app.main import app


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
    jobs = [
        {
            "id": "python-backend",
            "title": "Python 后端工程师",
            "summary": "后端开发",
            "must_have": ["python"],
            "nice_to_have": [],
            "min_years": 2,
            "industry_keywords": [],
            "education_keywords": [],
            "project_keywords": ["api"],
        }
    ]

    with patch(
        "app.main.extract_pdf_text",
        return_value="3年 Python FastAPI SQL 经验，本科，负责 API 开发。",
    ), patch(
        "app.workflows.match_graph.build_explanation",
        return_value="测试说明",
    ):
        response = client.post(
            "/api/match",
            files={"resume": ("resume.pdf", _make_pdf_bytes(), "application/pdf")},
            data={"jobs": str(jobs).replace("'", '"')},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["request_id"]
    assert payload["ranked_results"][0]["job_title"] == "Python 后端工程师"
    assert payload["ranked_results"][0]["recommendation"] in {"推荐", "可考虑", "不推荐"}


def test_match_endpoint_writes_runtime_logs(tmp_path):
    settings = get_settings()
    original_log_dir = settings.runtime_log_dir
    settings.runtime_log_dir = tmp_path
    jobs = [
        {
            "id": "python-backend",
            "title": "Python 后端工程师",
            "summary": "后端开发",
            "must_have": ["python"],
            "nice_to_have": [],
            "min_years": 2,
            "industry_keywords": [],
            "education_keywords": [],
            "project_keywords": ["api"],
        }
    ]

    try:
        with patch(
            "app.main.extract_pdf_text",
            return_value="3年 Python FastAPI SQL 经验，本科，负责 API 开发。",
        ), patch(
            "app.workflows.match_graph.build_explanation",
            return_value="测试说明",
        ):
            response = client.post(
                "/api/match",
                files={"resume": ("resume.pdf", _make_pdf_bytes(), "application/pdf")},
                data={"jobs": str(jobs).replace("'", '"')},
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
