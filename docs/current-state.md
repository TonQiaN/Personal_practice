# Current State

## Summary

The repository now has a runnable multi-agent scaffold with FastAPI, LangGraph, PostgreSQL-backed JD persistence, a JD PDF Agent, and a Next.js frontend.

## Completed

- drafted the end-to-end system design
- defined the target architecture and main agent roles
- created project maintenance and handoff templates
- captured the filled questionnaire into a formal requirements document
- narrowed the MVP to a Chinese PDF resume to multi-JD matching web demo
- implemented the FastAPI backend and `/health`, `/api/presets`, `/api/match` endpoints
- implemented a LangGraph-based matching workflow
- added 10 preset JDs for common internet roles
- implemented a Next.js multi-page frontend with landing, JD intake, matching workspace, and agent overview pages
- added backend tests and verified them passing
- verified frontend production build succeeds
- implemented runtime logging to `backend/data/logs/` with request, node, and model-call events
- added PostgreSQL-backed JD persistence
- added an independent JD PDF Agent workflow
- split the old single flow into Resume Parser, Matching, Ranking, and Explanation stages
- parallelized JD scoring and explanation generation within the match flow
- added an animated multi-step loading state on the match page
- rebuilt the frontend visual system with Tailwind CSS, MUI, light/dark mode, and a product-home plus dashboard-internal-page structure
- added manual JD creation and deletion support in the JD management page
- allowed preset JDs to be deleted from the management page as well
- changed the match page to compare against all current jobs by default instead of manual job selection
- expanded match results to include detailed fit reasons, risk reasons, follow-up questions, and action recommendations
- reduced the initial `/match` route payload by lazy-loading the chart and workspace content
- normalized dark-mode surface and accent tokens to remove harsh gray or washed-out panels
- added client-side JD list caching plus dynamic loading skeletons to reduce first-open and first-switch waiting on heavy pages
- restored optional manual JD selection on `/match` while keeping default all-job matching, with search and source-type filtering
- implemented asynchronous batch matching for multiple resumes against multiple jobs, with resume-level and job-level result views
- added `fast` and `full` match modes so explanation generation can trade off speed against completeness
- added resume-level concurrency inside batch tasks so multiple resumes can be parsed and matched in parallel
- deduplicated fit, risk, and follow-up explanation generation so repeated missing skills do not appear multiple times across sections
- switched fit reasons, risk reasons, and follow-up questions to LLM-generated structured output while keeping rule-based scoring
- added structured next-action recommendations back into the explanation layer and results UI

## In Progress

- tuning scoring quality so adjacent roles are separated more clearly
- improving demo realism for manual verification
- refining the multi-agent flow after the first working persistence integration
- improving the front-end information architecture after moving away from the single-page layout
- tuning ranking quality so the faster execution path still produces convincing ordering
- polishing the new design system with stronger empty states and lighter result-page payloads if needed
- keeping JD library quality clean after allowing persisted uploaded and manual roles
- refining the JD management form so manual creation is easier to understand and use
- refining result-page summary layout so score charts and ranking context are easier to scan
- refining how actionable the post-match explanation feels for HR reviewers
- improving first-open and first-navigation responsiveness for heavy frontend routes
- polishing dark-mode contrast so cards, chips, and overlays stay readable without turning chalky
- reducing repeated backend waits when switching between `/jds` and `/match`
- refining the new manual-selection interaction so batch and single-match flows can share the same JD filtering mental model
- validating the first usable batch-matching workflow before adding richer filtering, export, or matrix views
- tuning the new fast/full modes so quick screening stays useful without making later detail review confusing
- tuning the new batch resume concurrency so speed improves without overwhelming model calls
- refining explanation quality so repeated keywords do not create noisy HR-facing summaries
- refining the new structured LLM explanation prompt so JSON output remains stable and non-repetitive
- refining action recommendation quality so next steps stay concrete without becoming repetitive

## Next Highest Priority

- improve scoring quality and add manual regression samples for the faster multi-agent flow

## Known Gaps

- no OCR support for scanned PDFs
- no E2E browser tests
- no curated sample PDF regression set in repository
- no frontend log viewer
- no migration system yet; schema is created directly from SQLAlchemy models
- batch tasks run in-process via FastAPI background tasks and are suitable for demo use, not durable job workers

## Risks

- rule-based scoring still allows some adjacent roles to score too closely
- text-only PDF support is strict and will reject scanned resumes
- live model responses may vary slightly across runs
- current DB schema is sufficient for development but not yet production-grade
- batch task execution is tied to the app process, so a server restart can interrupt an in-flight batch run
- fast mode intentionally leaves non-Top-3 results with rule summaries instead of full explanation output
- batch speed now depends on both `MATCH_PARALLELISM` and `BATCH_RESUME_PARALLELISM`, so over-tuning both can still saturate the app or model API
- explanation quality now depends on structured JSON output from the model, with fallback to rule-based text when parsing fails

## Last Updated

- 2026-03-12: multi-agent scaffold with JD persistence and JD PDF Agent implemented
- 2026-03-12: frontend reorganized into multiple routed pages and verified with production build
- 2026-03-12: matching flow parallelized and match page updated with animated loading states
- 2026-03-12: frontend rebuilt with Tailwind CSS + MUI and dual-theme support
- 2026-03-12: JD manager gained manual add/delete controls and a stray uploaded resume-like JD was removed from the local DB
- 2026-03-12: match page switched to default all-job matching and moved the summary chart to a more readable layout
- 2026-03-12: match results upgraded from plain reasons to actionable explanation plus follow-up guidance
- 2026-03-12: duplicate-key bug on repeated follow-up questions fixed and `/match` route bundle reduced via dynamic loading
- 2026-03-12: dark-mode palette reviewed and several harsh gray/white surfaces replaced with theme tokens
- 2026-03-12: first-open and first-switch UX improved with JD cache reuse and page-level lazy loading on heavy routes
- 2026-03-12: preset JD deletion enabled and manual JD form redesigned with clearer grouped inputs
- 2026-03-12: `/match` regained optional manual JD selection without giving up the default all-job matching flow
- 2026-03-13: `/batch-match` added for async multi-resume and multi-job matching with dual result views
- 2026-03-13: `fast` and `full` modes added so explanation calls can be reduced for quicker screening
- 2026-03-13: batch tasks switched from sequential resume processing to controlled resume-level concurrency
- 2026-03-13: explanation generation deduplicated repeated skill gaps and repeated matched terms across sections
- 2026-03-13: fit reasons, risk reasons, and follow-up questions moved to structured LLM generation
- 2026-03-13: next-step action recommendations added back as structured explanation output and UI section
