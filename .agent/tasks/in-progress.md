---
board: in-progress
updated: 2026-05-11
priority: critical
allowed_statuses:
  - planned
  - ready
  - in_progress
  - blocked
  - review
  - completed
  - archived
---

# In Progress

## TASK-017

```md
id: TASK-017
depends_on: []
priority: critical
status: completed
```

- [x] verify customer app emulator + Metro state
- [x] complete customer login to booking flow
- [x] select an available slot and confirm appointment
- [x] verify created appointment in app/backend
- [x] run customer type-check

## TASK-018

```md
id: TASK-018
depends_on:
  - TASK-017
priority: critical
status: completed
```

- [x] add deterministic scheduling SQL proof harness
- [x] add local `pnpm backend:proof` runner with reset + race proof
- [x] verify staff schedule, break, closed day, cancelled rebook, any-staff, mirror sync, RLS/RPC exposure
- [x] fix `schedule_has_conflict` false conflict when update ignores its own appointment
- [x] run local backend proof gate

## TASK-016

```md
id: TASK-016
depends_on:
  - TASK-014
  - TASK-015
priority: medium
status: blocked
```

- [ ] drag/drop optimization

## TASK-019

```md
id: TASK-019
depends_on: []
priority: medium
status: completed
```

- [x] add optional shop-level commission feature flag
- [x] add per-staff `none | percentage` commission config
- [x] snapshot completed appointment revenue and commission values
- [x] add authenticated completion/report RPCs isolated from scheduling
- [x] gate owner UI for settings, staff commission config, and earnings report
- [x] replace Android-unsafe commission prompt with a modal
- [x] run `pnpm turbo type-check`, `supabase db reset`, and `pnpm backend:proof`
- [x] apply migration to staging
- [x] run staging SQL smoke for scheduling self-ignore, real conflict, cancelled rebook, mirror sync, and commission snapshots
- [x] run web booking smoke through public `book-appointment` edge path and clean test appointment
- [x] run Android owner smoke for settings toggle, team commission gate, and commission modal

# Rotation Rule

If `in-progress.md` exceeds 30 tasks:

- move completed work into done
- move future work into backlog

# State Machine Rule

Tasks must move in order:

`planned` -> `ready` -> `in_progress` -> `review` -> `completed` -> `archived`

Use `blocked` only as a temporary state from `ready`, `in_progress`, or `review`.
