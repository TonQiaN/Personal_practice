# Session Handoff

## Last Session

Date: 2026-03-11

## What Was Done

- implemented backend MVP in `backend/`
- implemented frontend MVP in `frontend/`
- verified backend tests pass
- verified frontend production build passes
- aligned docs to the runnable MVP state
- implemented hourly JSONL runtime logs under `backend/data/logs/`

## Files To Read First Next Session

- `README.md`
- `AGENTS.md`
- `docs/current-state.md`
- `docs/backlog.md`
- `docs/requirements.md`
- `docs/codex_error.md`

## Recommended Next Action

- tune the scoring contract with manual regression examples before adding more features

## Warnings

- current PDF support is text-only
- adjacent roles can still score too closely without extra tuning
- live LLM explanations are wrapped with a local fallback, so wording may differ run to run
- runtime logs can grow over time because retention is currently unbounded

## Notes For Next Agent

- keep the MVP narrow
- do not jump straight to a fully autonomous agent
- start with structure, scoring, and evaluation
- when implementing `LangChain` or `LangGraph`, query `Context7` first for latest syntax
- update `docs/codex_error.md` when the same class of error appears more than once or is likely to recur
