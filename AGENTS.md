# Project Agent Guide

## Purpose

This repository is for building a resume-to-job-description matching agent system.

The system goal is to:

- parse resumes and JDs
- extract structured information
- score candidate-job fit across multiple dimensions
- generate explainable matching reports
- support iterative evaluation and review

## Default Working Rules

- Prefer small, reviewable changes.
- Preserve explainability over raw model cleverness.
- Do not replace deterministic scoring with pure LLM judgment.
- Add or update tests for behavior changes when code exists.
- When writing `LangChain` or `LangGraph` code, verify current syntax and APIs with `Context7` before implementation.
- Record non-obvious architectural choices in `docs/decisions.md`.
- Update `docs/current-state.md` and `docs/session-handoff.md` at the end of substantial work.

## Project Priorities

1. Get a working MVP pipeline end to end.
2. Keep inputs and outputs structured.
3. Make matching results auditable.
4. Keep sensitive resume data protected.

## Current Target Architecture

- Frontend: Next.js
- Backend: FastAPI
- Workflow: LangGraph
- Database: PostgreSQL
- Vector store: pgvector
- Queue/cache: Redis

If the codebase diverges from this target, document the reason before changing direction.

## File Ownership Expectations

Safe to modify:

- `app/`
- `docs/`
- `tests/`
- `README.md`
- `.env.example`

Be cautious with:

- database migrations
- deployment config
- security-sensitive settings

## Required Documentation Updates

For substantial work, update:

- `docs/current-state.md`
- `docs/backlog.md`
- `docs/session-handoff.md`
- `docs/codex_error.md` when recurring implementation or runtime issues are discovered
- `docs/session-records/YYYY-MM-DD-HHMM.md` with a concise end-of-session summary; for the same ongoing conversation, append to the existing session record instead of creating a new file

When the user asks what needs to be decided before implementing a feature, record that checklist under `docs/decision-checklists/`.

For architectural changes, also update:

- `docs/decisions.md`
- `docs/architecture.md`

## Review Standard

When reviewing changes, prioritize:

- correctness
- regression risk
- prompt/schema drift
- security of resume and candidate data
- missing tests

## Environment

Keep secrets out of source control. Use `.env` locally and maintain `.env.example`.
