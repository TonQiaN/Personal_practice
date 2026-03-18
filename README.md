# Resume JD Matching Agent

An agent system for matching resumes against job descriptions with structured extraction, multi-dimensional scoring, and explainable outputs.

## Status

This repository now has a runnable multi-agent MVP:

- FastAPI backend
- LangGraph multi-agent workflow
- Next.js frontend with Tailwind CSS and MUI
- PostgreSQL-backed JD persistence
- JD PDF Agent
- 10 persisted default JDs
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
frontend/    Next.js multi-page UI
docs/        architecture, status, decisions, backlog, handoff, error log
tests/       reserved root-level test space
```

Decision checklists live in `docs/decision-checklists/`.

## Frontend Pages

The frontend is no longer a single all-in-one page. It is split into:

- `/`: landing page and product overview
- `/jds`: JD intake, PDF parsing, manual JD creation, draft confirmation, and JD library maintenance, including deleting persisted or preset jobs
- `/match`: resume upload, automatic matching against all current JDs by default, optional manual JD selection with search and source filters, ranked results, and trace display
- `/batch-match`: multi-resume upload, asynchronous batch matching, optional manual JD selection, per-resume Top 3, and per-job Top 3 candidate views
- `/agents`: current multi-agent responsibilities and flow summary

Both `/match` and `/batch-match` now support two execution modes:

- `fast`: explain only Top 3 results and keep the rest as fast rule summaries
- `full`: explain every matched job

The visual system now uses:

- Tailwind CSS for layout and utility styling
- MUI for heavyweight UI primitives
- light/dark mode support
- a product-style homepage plus dashboard-style internal pages

## Run Locally

### Backend

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
PYTHONPATH=backend .venv/bin/uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

The backend expects a working local PostgreSQL connection in `.env`.

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
- agent and graph identifiers
- error and traceback details when failures occur

## Matching Flow Notes

- Resume parsing still runs first as a dedicated agent stage.
- JD scoring now runs in parallel across selected jobs.
- Explanation generation also runs in parallel across ranked jobs.
- `fast` mode limits detailed explanation generation to Top 3 results.
- The frontend match page shows an animated multi-stage loading state while matching is in progress.

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
4. Add a migration toolchain for PostgreSQL schema evolution.

## Environment Variables

See `.env.example`.

Useful runtime tuning:

- `MATCH_PARALLELISM`: limits concurrent job scoring and explanation generation per match request
- `BATCH_RESUME_PARALLELISM`: limits how many resumes a batch task processes concurrently
