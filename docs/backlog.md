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

## P0

- Improve rule-based ranking quality.
  Acceptance criteria: clearly relevant roles rank ahead of adjacent but less suitable roles in manual regression samples.

- Add a curated manual regression sample set.
  Acceptance criteria: repository includes several representative resume texts or PDFs plus expected top matches.

- Add log querying utilities.
  Acceptance criteria: developer can quickly inspect recent request logs by request ID or latest hour file.

## P1

- Add embedding-based semantic similarity layer for synonym-aware skill matching.
  Acceptance criteria: similar or synonymous skills can improve matching beyond exact keyword overlap.

- Add richer result detail.
  Acceptance criteria: results can expose risk items, uncertainty markers, and machine-readable JSON export.

- Add lightweight E2E coverage for the upload-to-result flow.
  Acceptance criteria: one browser-level test validates the core demo path.

- Add optional frontend debug surfacing for request IDs only.
  Acceptance criteria: results UI shows request ID so developers can cross-reference backend logs.

## P2

- Improve frontend presentation for demo quality.
  Acceptance criteria: results page is visually polished and clearly compares multiple JD matches.

- Add optional persistence for custom JD editing.
  Acceptance criteria: user-created JD entries can survive page refresh when persistence is intentionally enabled.

## Deferred

- login and permissions
- historical result persistence
- human review and result override
- local model deployment
- multi-tenant support
- model A/B experimentation framework
