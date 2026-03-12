# Decision Checklists

This folder stores structured checklists for items that require user confirmation before implementation details are locked in.

## Purpose

Use this folder when:

- the user asks what needs to be decided before implementing a feature
- a subsystem has multiple valid implementation options
- the choices should be preserved across sessions

## Usage

Each checklist should:

- focus on one feature area
- list the concrete decisions that need to be made
- include recommended defaults when helpful
- be written so the user can answer directly in the file

## Current Checklists

- `logging-requirements.md`: decisions needed before implementing a fuller runtime logging system
- `jd-pdf-agent-requirements.md`: decisions needed before implementing a JD PDF parsing agent
- `multi-agent-framework-requirements.md`: decisions needed before evolving the demo into a multi-agent system
