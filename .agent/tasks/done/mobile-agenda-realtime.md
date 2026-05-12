# Mobile Agenda And Realtime

## TASK-014

```md
id: TASK-014
depends_on:
  - TASK-010
  - TASK-011
priority: high
status: completed
```

## TASK-015

```md
id: TASK-015
depends_on:
  - TASK-014
priority: high
status: completed
```

## Completed

- `TASK-014`: mobile agenda timezone and staff grouping fixes completed.
- `TASK-015`: appointment realtime sync refreshed from server state and passed type-check.
- Shared day-bound helper added for Istanbul-aware agenda queries.

## Validation

- `pnpm --filter @berber/mobile type-check` passed.
- `pnpm turbo type-check` passed.
