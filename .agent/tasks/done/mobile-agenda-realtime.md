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

## TASK-016

```md
id: TASK-016
depends_on:
  - TASK-014
  - TASK-015
priority: medium
status: completed
```

## Completed

- `TASK-014`: mobile agenda timezone and staff grouping fixes completed.
- `TASK-015`: appointment realtime sync refreshed from server state and passed type-check.
- `TASK-016`: owner agenda drag/drop optimization implemented locally; manual product smoke skipped because this screen is out of planned use.
- Shared day-bound helper added for Istanbul-aware agenda queries.

## Validation

- `pnpm --filter @berber/mobile type-check` passed.
- `git diff --check -- apps/mobile/app/(owner)/agenda.tsx` passed with CRLF warning only.
- `pnpm turbo type-check` passed.
