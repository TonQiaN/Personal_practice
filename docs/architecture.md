# Architecture

## System Goal

Build a multi-agent web demo that matches one uploaded Chinese PDF resume against persisted job descriptions, including user-uploaded JD PDFs, and returns structured, explainable results for HR.

## High-Level Flow

```text
upload JD PDF
  -> JD PDF Agent
  -> JD draft confirmation
  -> PostgreSQL persistence

upload Chinese PDF resume
  -> Resume Parser Agent
  -> Matching Agent
  -> Ranking Agent
  -> Explanation Agent
  -> show ranked results in web UI
```

## Main Components

### Frontend

- upload resume
- upload JD PDF
- confirm and edit parsed JD drafts
- choose from persisted JDs
- view match report
- compare multiple JD results

### Backend API

- resume ingestion
- JD persistence and update
- JD PDF parsing
- match request execution
- result retrieval

### Agents / Workflow

- Resume Parser Agent
- JD PDF Agent
- Matching Agent
- Ranking Agent
- Explanation Agent

Normalization currently remains a shared service layer instead of a standalone agent.

## Data Model

Core entities:

- persisted job_description
- job_description draft
- runtime logs
- match result response

## Design Principles

- deterministic rules for hard constraints
- LLMs only where semantic reasoning adds value
- lightweight step traceability for each major step
- agents communicate through structured JSON contracts
- low coupling between extraction and scoring
- optimize for demo speed over full production completeness

## Open Architecture Questions

- whether JD persistence should evolve from local PostgreSQL to managed Postgres
- whether resume data should also be persisted in a later phase
- whether JD PDF Agent should support OCR after the text-PDF phase stabilizes
