# Agent Rules

## Context Rules

Read ONLY:

- `.agent/state/current.md`
- `.agent/state/next.md`
- `.agent/tasks/in-progress.md`
- latest summary file
- `AGENT_RULES.md`
- `.agent/START_HERE.md`
- `CONTEXT_BUDGETS.md`

DO NOT:

- scan old summaries
- scan entire repository
- load all markdown files
- read backlog unless required

## Repository Access Rules

Do NOT scan:

- `node_modules`
- build outputs
- generated files
- old summaries
- archives

Read files only when directly relevant to current task.

Priority order:

- `critical`
- `high`
- `normal`
- `low`
- `archive`

## Memory Rules

Scratchpads are temporary.
Do not store long-term knowledge there.

Architectural decisions belong in:
`.agent/decisions/`

Read ADRs only when relevant to current task.

Research and references belong in:
`.agent/retrieval/`

## Summary Rules

At session end:

- create concise summary
- avoid duplication
- max 200 lines
- include only important decisions
- include metadata header

Mandatory Session Shutdown:

1. Update `current.md`
2. Update `next.md`
3. Move completed tasks
4. Create session summary
5. Save architectural decisions
6. Remove temporary debug notes
7. Verify context budgets
8. Update system health if structure changed

## Task Rules

Move completed work into:
`.agent/tasks/done/`

Keep in-progress short.

Allowed task statuses:

- `planned`
- `ready`
- `in_progress`
- `blocked`
- `review`
- `completed`
- `archived`

Tasks must transition sequentially.
Do not skip states.

## Rotation Rules

If `current.md` exceeds 80 lines:

- move historical content to summaries
- keep only active execution context

If `next.md` exceeds 40 lines:

- prune low-priority items
- move longer planning into summaries or backlog

If `in-progress.md` exceeds 30 tasks:

- move completed work into done
- move future work into backlog

## Role Routing

`Planner`:

- allowed: tasks, ADRs, summaries
- forbidden: code implementation

`Builder`:

- focus: implementation only
- do not redesign architecture
- do not modify ADRs

`Reviewer`:

- focus: performance, duplication, drift detection, context violations
