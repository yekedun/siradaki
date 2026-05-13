---
board: in-progress
updated: 2026-05-13
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

| ID       | Title                                       | Status      | Updated    |
|----------|---------------------------------------------|-------------|------------|
| TASK-001 | Fix H-3 + C-1 (customer cancel TOCTOU)      | archived    | 2026-05-13 |
| TASK-002 | Fix C-2 (past-slot guard)                   | archived    | 2026-05-13 |
| TASK-003 | Fix H-1 (any-staff advisory lock + recheck) | archived    | 2026-05-13 |
| TASK-004 | Fix H-2 (rate limiting on booking endpoints)| archived    | 2026-05-13 |
| TASK-005 | Fix M-1 (N+1 availability sorguları)         | archived    | 2026-05-13 |
| TASK-006 | Fix M-2 (agenda realtime debounce + tarih filtresi) | archived    | 2026-05-13 |
| TASK-007 | Fix M-3 (schedule_has_conflict tek scan)            | archived    | 2026-05-13 |
| TASK-008 | Fix M-4 (appointments_no_overlap WHERE güçlendir)   | archived    | 2026-05-13 |
| TASK-009 | Fix M-5 (stale cache 409 mesaj iyileştirmesi)       | archived    | 2026-05-13 |
| TASK-010 | Fix L-1 (BOOKING_GRACE_PERIOD_MIN unused import)    | archived    | 2026-05-13 |
| TASK-011 | Fix L-2 (advisory lock 64-bit MD5 key)              | archived    | 2026-05-13 |
| TASK-012 | Fix L-3 (staff referans stabilitesi)                | archived    | 2026-05-13 |
| TASK-013 | Fix L-4 (block-walkin drift yorum)                  | archived    | 2026-05-13 |
| TASK-014 | H-2 IP rate limiting via Upstash (phoneless)        | archived    | 2026-05-13 |

# Rotation Rule

If `in-progress.md` exceeds 30 tasks:

- move completed work into done
- move future work into backlog

# State Machine Rule

Tasks must move in order:

`planned` -> `ready` -> `in_progress` -> `review` -> `completed` -> `archived`

Use `blocked` only as a temporary state from `ready`, `in_progress`, or `review`.
