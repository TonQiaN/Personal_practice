# Codex Error Log

This file records recurring implementation and runtime issues so future sessions can avoid repeating the same mistakes.

## How To Use

Add an entry when:

- the same error happens more than once
- a fix is non-obvious and worth preserving
- an API, library, or environment issue is easy to forget

For each entry, keep it short and actionable.

## Template

### [YYYY-MM-DD] Short Error Title

- Symptom:
- Trigger:
- Root cause:
- Fix:
- Prevention:
- Affected files:
- Status: open / mitigated / resolved

---

## Entries

### [2026-03-11] OpenAI Model Name Drift

- Symptom: a configured coding model name may not match the current official API identifier.
- Trigger: relying on memory or informal naming for OpenAI model IDs.
- Root cause: model naming can change and unofficial names are easy to invent.
- Fix: verify model names with `Context7` against OpenAI docs before coding; default project model updated to `gpt-5-codex`.
- Prevention: check official docs before changing `OPENAI_MODEL` and record changes in `docs/decisions.md`.
- Affected files: `.env`, `.env.example`, `docs/requirements.md`, `docs/decisions.md`
- Status: mitigated

### [2026-03-11] Missing Runtime Dependency For Settings

- Symptom: backend import path is correct, but app startup fails when loading settings.
- Trigger: `config.py` imports `pydantic_settings`, but the package is absent from `backend/requirements.txt`.
- Root cause: code and dependency list drifted out of sync during scaffold creation.
- Fix: add `pydantic-settings` to backend requirements and reinstall dependencies.
- Prevention: after adding any new top-level import, re-run backend tests or startup verification immediately.
- Affected files: `backend/app/config.py`, `backend/requirements.txt`
- Status: resolved

### [2026-03-11] Frontend Build Failed On Path Alias

- Symptom: Next.js build fails with `Module not found: Can't resolve '@/components/match-app'`.
- Trigger: using `@/` imports before configuring TypeScript path aliases.
- Root cause: `tsconfig.json` lacked `baseUrl` and `paths`.
- Fix: add `baseUrl` and `paths` mapping for `@/*`.
- Prevention: either use relative imports or define alias mapping before the first build.
- Affected files: `frontend/tsconfig.json`, `frontend/app/page.tsx`, `frontend/components/match-app.tsx`
- Status: resolved

### [2026-03-11] Year Extraction Under-Scored Strong Candidates

- Symptom: a resume with `5年 Python ... 经验` was scored too low and ranked below less relevant jobs.
- Trigger: the normalizer only matched a narrow set of year-expression patterns.
- Root cause: generic `X年` format was not captured.
- Fix: extend year extraction to include generic `(\d+)年` and add a regression test.
- Prevention: when ranking looks off, inspect normalized resume fields before adjusting score weights.
- Affected files: `backend/app/services/normalizer.py`, `backend/tests/test_scoring.py`
- Status: resolved

### [2026-03-11] API Tests Accidentally Risked Live Model Calls

- Symptom: backend API tests could hit the real OpenAI API because `.env` contains a working key.
- Trigger: workflow-level explanation generation runs during endpoint tests unless explicitly patched.
- Root cause: tests mocked PDF extraction but not the explanation step.
- Fix: patch `app.workflows.match_graph.build_explanation` in API tests.
- Prevention: any integration test that touches the workflow should explicitly stub external model calls.
- Affected files: `backend/tests/test_api.py`
- Status: resolved

### [2026-03-12] Startup Hook Was Not Reliable Enough For Database-Seeding Tests

- Symptom: API tests failed because persisted JD tables and seed data were missing.
- Trigger: relying on application startup hooks for DB init inside test execution.
- Root cause: test client lifecycle did not guarantee the desired initialization timing for seeded persistence.
- Fix: move app initialization into an explicit `initialize_app_state()` function and call it during module import.
- Prevention: critical local initialization such as schema creation and seed data should not depend only on startup hooks when tests use the app directly.
- Affected files: `backend/app/main.py`
- Status: resolved

### [2026-03-12] JD Confirmation Flow Could Overwrite Parsed Metadata

- Symptom: confirming a parsed JD from the frontend could replace extracted text and file path with incomplete values.
- Trigger: frontend sent only the edited job body back to the persistence endpoint.
- Root cause: the draft confirmation state did not preserve the original persisted payload.
- Fix: keep the parsed persisted JD in frontend state and send its `raw_text`, `raw_pdf_path`, and normalized payload during confirmation.
- Prevention: when a confirmation step edits only part of a persisted object, preserve the untouched source fields explicitly.
- Affected files: `frontend/components/match-app.tsx`
- Status: resolved

### [2026-03-12] Hydration Mismatch From Theme And Media Query Drift

- Symptom: first page load showed `Hydration failed because the server rendered HTML didn't match the client`.
- Trigger: rendering theme-dependent icons and media-query-dependent layout during SSR.
- Root cause: server render did not know the real `resolvedTheme` or viewport width, so the first client render differed.
- Fix: gate theme-dependent and `useMediaQuery`-dependent UI behind a mounted check in `frontend/components/providers.tsx` and `frontend/components/app-shell.tsx`.
- Prevention: any UI that depends on `next-themes` or viewport width should render a stable fallback before mount.
- Affected files: `frontend/components/providers.tsx`, `frontend/components/app-shell.tsx`
- Status: resolved
