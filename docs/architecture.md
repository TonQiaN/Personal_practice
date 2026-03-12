# Architecture

## System Goal

Build a web demo that matches one uploaded Chinese PDF resume against multiple job descriptions and returns structured, explainable results for HR.

## High-Level Flow

```text
upload Chinese PDF resume
  -> choose preset JDs or input JDs
  -> parse PDF
  -> normalize resume and JDs
  -> rule-based scoring
  -> semantic matching enhancement
  -> aggregate score per JD
  -> generate explanation
  -> show ranked results in web UI
```

## Main Components

### Frontend

- upload resume
- create or paste JD
- choose from preset JDs
- view match report
- compare multiple JD results

### Backend API

- resume ingestion
- JD creation or preset selection
- match task creation
- task status query
- match result retrieval

### Agents / Workflow

- parser agent
- structuring agent
- matching agent
- explanation agent

The workflow should be stateful and resumable.

## Data Model

Core entities:

- resume
- job_description
- match_result
- task_status

## Design Principles

- deterministic rules for hard constraints
- LLMs only where semantic reasoning adds value
- lightweight step traceability for each major step
- low coupling between extraction and scoring
- optimize for demo speed over full production completeness

## Open Architecture Questions

- whether parsing and scoring should be fully synchronous in the MVP
- whether preset JDs should be hardcoded JSON or editable through the UI
- whether the first frontend should be built in Next.js or delivered as a lightweight single-page interface
