# Decisions

## 2026-03-11

### Decision

Use a multi-step agent workflow instead of a single general-purpose LLM call.

### Why

- easier to debug
- easier to evaluate
- easier to enforce evidence-backed outputs
- better fit for production review processes

### Consequence

The system will separate parsing, structuring, matching, and explanation concerns.

## 2026-03-11

### Decision

Prefer a Python-first stack: `FastAPI + LangGraph + PostgreSQL + pgvector`.

### Why

- strong LLM ecosystem
- good document processing support
- straightforward experimentation and evaluation

### Consequence

Initial implementation should avoid splitting effort across multiple backend stacks.

## 2026-03-11

### Decision

Use `Context7` as the default documentation source before implementing `LangChain` or `LangGraph` code.

### Why

- those libraries evolve quickly
- API details and recommended patterns can drift
- this reduces syntax mistakes and outdated usage

### Consequence

Future implementation work on orchestration code should check current docs first instead of relying on memory alone.

## 2026-03-11

### Decision

Use `gpt-5-codex` as the default OpenAI coding model name in project configuration.

### Why

- `Context7` lookup against OpenAI official docs indicates `gpt-5-codex` is the documented GPT-5 Codex model name
- the previously discussed `gpt5.3codex` format is not the documented API model identifier

### Consequence

Environment defaults should use `gpt-5-codex`, and any later model-name change should be recorded in docs.
