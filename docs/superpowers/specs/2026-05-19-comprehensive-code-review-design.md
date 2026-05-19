# Comprehensive Code Review — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three-pass code review of the `scheduling-hardening` branch (311 files, ~38k line delta vs main) covering security, correctness, and code quality in priority order.

**Architecture:** Each pass is an isolated subagent that reads only the files relevant to its domain, produces a structured finding report (🔴/🟡/🟢), and fixes all Critical and Warning issues before the next pass begins.

**Tech Stack:** Expo / React Native (mobile), Next.js 14 (web), Supabase (Postgres + Edge Functions Deno), TypeScript, pnpm monorepo.

**Branch:** `scheduling-hardening` — main repo at `C:\Users\Emre\Berber randevu`

---

## Finding Severity Protocol

| Icon | Level | Action |
|------|-------|--------|
| 🔴 | CRITICAL | Fix in same pass, commit immediately |
| 🟡 | WARNING | Fix in same pass if small; create task if large |
| 🟢 | MINOR | Document only; fix in a separate cleanup commit |

Finding format:
```
🔴 CRITICAL [path/to/file.ts:42] — description of issue + recommended fix
```

---

## Pass 1 — Security Review

**Scope:** Edge function authorization, RLS policies, auth/register flow, admin client usage, public API exposure.

**Files to read:**

```
supabase/functions/delete-account/index.ts
supabase/functions/app-book-appointment/index.ts
supabase/functions/app-cancel-appointment/index.ts
supabase/functions/create-widget-token/index.ts
supabase/functions/widget-book-appointment/index.ts
supabase/functions/widget-get-availability/index.ts
supabase/functions/block-walkin/index.ts
supabase/functions/create-manual-block/index.ts
supabase/functions/_shared/supabase-admin.ts
supabase/functions/_shared/cors.ts
apps/mobile/app/(auth)/register.tsx
apps/mobile/app/(auth)/login.tsx
apps/mobile/app/_layout.tsx
apps/mobile/lib/user-context.tsx
supabase/migrations/20260513074317_backend_scheduling_hardening.sql
supabase/migrations/20260514080010_scheduling_rls_policy_consolidation.sql
supabase/migrations/20260515081251_restrict_scheduling_rpc_execute.sql
supabase/migrations/20260517100000_manual_block_edge_only.sql
supabase/migrations/20260518110000_block_direct_appointment_scheduling_writes.sql
supabase/migrations/20260518130000_non_scheduling_rls_advisor_cleanup.sql
supabase/migrations/20260518140000_scheduling_rpc_authorization_hardening.sql
supabase/migrations/20260518160000_customer_cancel_authorization.sql
supabase/migrations/20260518190000_phone_booking_rate_limit.sql
supabase/config.toml
```

**Security checklist:**

- [ ] Every edge fn that modifies data verifies JWT and extracts `user.id` from the token (not from request body)
- [ ] `delete-account`: can caller delete a different user's shop? (IDOR check)
- [ ] `delete-account`: what if both shop and staff queries return data? (ownership ambiguity)
- [ ] `create-widget-token`: scoped to calling user's shop only?
- [ ] `widget-book-appointment` / `widget-get-availability`: public — are they open to abuse without rate limiting?
- [ ] `block-walkin` / `create-manual-block`: who can call these? RLS or fn-level check?
- [ ] `register.tsx`: slug injection — is `toSlug()` output safely sanitized before DB insert?
- [ ] `register.tsx`: can one user create multiple shops? No server-side uniqueness guard?
- [ ] `user-context.tsx`: role resolution — can a user claim owner role by inserting into shops table directly?
- [ ] RLS migration audit: are all new tables (staff, appointments, blocks) covered with SELECT/INSERT/UPDATE/DELETE policies?
- [ ] Admin client (`SUPABASE_SERVICE_ROLE_KEY`): never exposed to mobile/web client bundles?
- [ ] CORS headers: wildcard `*` on all functions — acceptable for this app?
- [ ] `app-cancel-appointment`: authorization check — can a user cancel another customer's appointment?

---

## Pass 2 — Correctness Review

**Scope:** Scheduling logic, DB cascade integrity, race conditions, registration transaction atomicity, commission math, route guard edge cases.

**Files to read:**

```
packages/shared/src/slot-utils.ts
packages/shared/src/constants.ts
packages/shared/src/types.ts
supabase/functions/widget-book-appointment/index.ts
supabase/functions/app-book-appointment/index.ts
supabase/functions/app-cancel-appointment/index.ts
supabase/functions/block-walkin/index.ts
supabase/functions/create-manual-block/index.ts
supabase/migrations/20260512080000_atomic_scheduling.sql
supabase/migrations/20260518180000_any_staff_advisory_lock.sql
supabase/migrations/20260519100000_schedule_has_conflict_single_scan.sql
supabase/migrations/20260519110000_appointments_no_overlap_strengthen.sql
supabase/migrations/20260519120000_advisory_lock_bigint_key.sql
supabase/migrations/20260518150000_commission_snapshot_integrity.sql
supabase/migrations/20260518170000_past_slot_guard.sql
supabase/migrations/20260520100000_drop_customer_profiles.sql
supabase/migrations/20260520110000_retire_barbers_table.sql
apps/mobile/app/(auth)/register.tsx
apps/mobile/app/(owner)/team.tsx
apps/mobile/app/_layout.tsx
apps/mobile/lib/user-context.tsx
apps/web/src/app/[slug]/BookingFlow.tsx
```

**Correctness checklist:**

- [ ] Advisory lock scope: does `pg_advisory_xact_lock` use unique keys per staff member? No collision between different staff?
- [ ] Slot overlap detection: does `schedule_has_conflict()` correctly handle appointments that start exactly when another ends?
- [ ] Past slot guard: server-side time check — uses `now()` or `CURRENT_TIMESTAMP`? Timezone correct?
- [ ] `register.tsx`: shop + staff creation are two separate DB calls — if staff insert fails after shop is created, is the orphan shop cleaned up?
- [ ] `register.tsx`: slug fallback uses `Math.random()` — can produce duplicates under concurrent registration. Is there a retry loop or UNIQUE constraint fallback?
- [ ] Commission math: `commission_rate_bps / 100` = percentage. Is this conversion consistent across mobile display and DB storage?
- [ ] Route guard (`_layout.tsx`): what happens when `role === null` after session is established? User is stuck in loading?
- [ ] `user-context.tsx`: if both shop query and staff query fail (network), `role` stays `null` — infinite loading spinner?
- [ ] `app-cancel-appointment`: minimum notice enforcement — is `MIN_CANCEL_NOTICE_MINUTES` constant applied server-side only or also client-side?
- [ ] `retire_barbers_table` migration: are all FK references to `barbers` removed before table is dropped? No silent data loss?
- [ ] `drop_customer_profiles` migration: cascade or explicit delete of referencing rows?
- [ ] Web `BookingFlow.tsx`: if `selectedStaff = "any"`, does backend correctly pick an available staff member?

---

## Pass 3 — Code Quality Review

**Scope:** Design system API consistency, TypeScript type safety, dead code, component sizing, error handling completeness, DS token usage.

**Files to read:**

```
apps/mobile/components/ds/index.ts
apps/mobile/components/ds/Button.tsx
apps/mobile/components/ds/TextField.tsx
apps/mobile/components/ds/Sheet.tsx
apps/mobile/components/ds/Card.tsx
apps/mobile/components/ds/StaffRow.tsx
apps/mobile/components/ds/OverlineHeader.tsx
apps/mobile/components/ds/DayPicker.tsx
apps/mobile/components/ds/AppointmentCard.tsx
apps/mobile/components/ds/TabBar.tsx
apps/web/src/components/ds/index.ts
apps/web/src/components/ds/Button.tsx
apps/web/src/components/ds/BookingModalShell.tsx
apps/web/src/components/ds/StaffPicker.tsx
apps/web/src/components/ds/DateRail.tsx
apps/mobile/app/(owner)/index.tsx
apps/mobile/app/(owner)/agenda.tsx
apps/mobile/app/(owner)/team.tsx
apps/mobile/app/(owner)/settings.tsx
apps/mobile/app/(staff)/index.tsx
apps/mobile/app/(staff)/block.tsx
apps/mobile/app/(staff)/settings.tsx
apps/mobile/app/(auth)/register.tsx
apps/mobile/lib/theme.ts
apps/web/src/app/[slug]/page.tsx
apps/web/src/app/[slug]/BookingFlow.tsx
apps/web/tailwind.config.ts
```

**Quality checklist:**

- [ ] DS Button: does `variant` prop accept exactly `"accent"|"secondary"|"ghost"|"danger"` — no undocumented values used in screens?
- [ ] DS TextField: `onChange: (v: string) => void` — no screen passes `onChangeText` by mistake?
- [ ] DS Sheet: does every usage supply `onClose`? No sheet stuck open on Android back button?
- [ ] Unused imports in any migrated file (Feather icons, old token aliases, `Switch`, `R.input` etc.)?
- [ ] `any` casts — are they necessary or can they be properly typed? Flag each one.
- [ ] Files >300 lines — does each have a single clear responsibility? Flag candidates for splitting.
- [ ] Error handling: every `supabase.*` call in screens — is error state surfaced to user or silently swallowed?
- [ ] Loading states: every async action — is the UI correctly disabled/showing spinner during load?
- [ ] `register.tsx`: no optimistic UI — user gets no feedback between "Hesabı Oluştur" press and success. Is ActivityIndicator shown?
- [ ] `theme.ts`: after P5 removal, are there any remaining `ThemeTokens` type references anywhere?
- [ ] `tailwind.config.ts`: any CSS variable references that no longer exist in `globals.css` after P5 cleanup?
- [ ] DS token audit: grep for hardcoded hex colors (`#1E3A8A`, `#DC2626`, etc.) in migrated files — should use tokens.
