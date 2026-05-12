---
board: backlog
updated: 2026-05-11
priority: high
---

# Backlog

## Supabase Deploy

```md
id: TASK-010
depends_on: []
priority: medium
status: ready
```

- [ ] Create Supabase account and project.
- [ ] Fill `.env.local` credentials at root, `apps/web`, and `apps/mobile`.
- [ ] Run `supabase db push` to apply migrations.
- [ ] Enable `pg_cron` before migration `004` if needed.
- [ ] Regenerate and sync database types.
- [ ] Deploy Supabase functions.

## Mobile Native Build

```md
id: TASK-011
depends_on:
  - TASK-010
priority: medium
status: planned
```

- [ ] Run `cd apps/mobile && pnpm expo prebuild`.
- [ ] Add the WidgetKit target manually in Xcode for iOS.
- [ ] Configure the BarberWidget extension and App Group entitlement in Xcode.
- [ ] Run `eas build --profile development --platform all`.

## Manual Validation

```md
id: TASK-012
depends_on:
  - TASK-010
  - TASK-011
  - TASK-015
priority: high
status: planned
```

- [ ] Widget tap should gray out the web slot in under 500 ms.
- [ ] Concurrent booking of the same slot should return one `409`.
- [ ] Test slot computation during a DST transition week.
