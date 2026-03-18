# Backlog

## Completed

- Create a web demo scaffold with frontend and backend.
  Status: done

- Create backend project scaffold with `FastAPI`.
  Status: done

- Define resume normalization schema for Chinese PDF resumes.
  Status: done

- Define JD normalization schema for hand-entered and preset JDs.
  Status: done

- Implement PDF resume parsing flow.
  Status: done

- Implement deterministic scoring service for multi-JD comparison.
  Status: done

- Implement explanation generation.
  Status: done

- Add preset JD library for demo scenarios.
  Status: done

- Add core tests for parser, normalization, and scoring.
  Status: done

- Implement runtime logging for request, node, and model-call details.
  Status: done

- Implement PostgreSQL persistence for JD data.
  Status: done

- Implement JD PDF Agent as an independent LangGraph workflow.
  Status: done

- Split the frontend into multiple routed pages and add an animated matching state.
  Status: done

- Expose request IDs in the result UI for log cross-reference.
  Status: done

- Rebuild the frontend with `Tailwind CSS + MUI` and a unified dual-theme design system.
  Status: done

- Add manual JD creation and non-preset JD deletion in the management page.
  Status: done

- Upgrade match results with follow-up questions and action recommendations.
  Status: done

- Improve `/match` first-load responsiveness and remove duplicate-key rendering warnings.
  Status: done

- Allow preset JD deletion and redesign the manual JD creation form.
  Status: done

- Review and fix dark-mode surface colors across major frontend modules.
  Status: done

- Reduce first-open and route-switch waiting by caching JD data and adding page-level loading fallbacks.
  Status: done

- Restore optional manual JD selection on `/match` while keeping all-job matching as the default path.
  Status: done

- Add async batch matching for multiple resumes against multiple jobs with a dedicated page and task polling.
  Status: done

- Add `fast` and `full` match modes to trade off explanation completeness against runtime.
  Status: done

- Add resume-level concurrency inside batch matching.
  Status: done

- Deduplicate repeated terms in fit, risk, and follow-up explanations.
  Status: done

- Generate fit reasons, risk reasons, and follow-up questions via structured LLM output.
  Status: done

- Add structured next-step action recommendations to explanation output and UI.
  Status: done

## P0

- Improve rule-based ranking quality.
  Acceptance criteria: clearly relevant roles rank ahead of adjacent but less suitable roles in manual regression samples.

- Add a curated manual regression sample set.
  Acceptance criteria: repository includes several representative resume texts or PDFs plus expected top matches.

- Add log querying utilities.
  Acceptance criteria: developer can quickly inspect recent request logs by request ID or latest hour file.

- Strengthen batch-match resilience.
  Acceptance criteria: batch tasks can survive app restarts or move to a dedicated worker when the demo needs longer-running jobs.

- Add richer quick-mode labeling and export.
  Acceptance criteria: users can clearly distinguish which results contain full explanation versus fast summary, including in exported results.

- Add queue-backed execution for batch tasks.
  Acceptance criteria: batch jobs no longer depend on the web process and can keep running across app restarts.

## P1

- Add embedding-based semantic similarity layer for synonym-aware skill matching.
  Acceptance criteria: similar or synonymous skills can improve matching beyond exact keyword overlap.

- Add richer result detail.
  Acceptance criteria: results can expose risk items, uncertainty markers, and machine-readable JSON export.

- Add lightweight E2E coverage for the upload-to-result flow.
  Acceptance criteria: one browser-level test validates the core demo path.

## P2

- Improve frontend presentation for demo quality.
  Acceptance criteria: results page continues to improve visual polish, information density, and performance while keeping the new design system coherent.

- Add optional persistence for custom JD editing.
  Acceptance criteria: user-created JD entries can survive page refresh when persistence is intentionally enabled.

## Deferred

- login and permissions
- historical result persistence
- human review and result override
- local model deployment
- multi-tenant support
- model A/B experimentation framework
