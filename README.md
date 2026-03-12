# Resume JD Matching Agent

An agent system for matching resumes against job descriptions with structured extraction, multi-dimensional scoring, and explainable outputs.

## Status

This repository now has a runnable MVP:

- FastAPI backend
- LangGraph matching workflow
- Next.js frontend
- 10 preset JDs
- core backend tests

Primary design doc:

- [docs/resume-jd-agent-system.md](/Users/fangyuanfu/Desktop/agent/Personal_practice/docs/resume-jd-agent-system.md)

## Intended Stack

- Frontend: Next.js
- Backend: FastAPI
- Workflow orchestration: LangGraph
- Database: PostgreSQL
- Vector search: pgvector
- Cache / queue: Redis

## Repository Layout

```text
backend/     FastAPI app, LangGraph workflow, tests, preset JDs
frontend/    Next.js UI
docs/        architecture, status, decisions, backlog, handoff, error log
tests/       reserved root-level test space
```

Decision checklists live in `docs/decision-checklists/`.

## Run Locally

### Backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:3000`.

If needed, set `NEXT_PUBLIC_API_BASE_URL` to point at the backend.

## Verification

Backend tests:

```bash
PYTHONPATH=backend .venv/bin/pytest backend/tests -q
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Runtime Logs

Detailed runtime logs are written to `backend/data/logs/` as hourly `JSONL` files.

They include:

- request start and completion
- LangGraph node-level execution logs
- model call logs
- error and traceback details when failures occur

## Working Agreement

- Keep business logic structured and explainable.
- Use rules for hard constraints and LLMs for semantic reasoning and explanations.
- Track project status in `docs/current-state.md`.
- Track next tasks in `docs/backlog.md`.
- Track decisions in `docs/decisions.md`.
- Track recurring implementation and runtime issues in `docs/codex_error.md`.

## Recommended Next Steps

1. Improve semantic skill matching so adjacent roles do not score too closely.
2. Add a real PDF sample set for manual regression verification.
3. Add optional result JSON export and richer uncertainty display.
4. Consider persistent JD storage only after the demo is stable.

## Environment Variables

See `.env.example`.
