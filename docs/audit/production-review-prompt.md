# Production Architecture Review Prompt

Bu prompt'u baska bir AI review aracina veya yeni bir Codex/ChatGPT oturumuna ver. Amac, `docs/audit/integration-map.md` diyagramini ve repo kodunu uctan uca production-readiness bakisiyla inceletmektir.

## Context

Repository: `C:\Users\Emre\Berber randevu`

This is a berber/kuafor appointment platform with:

- Mobile app: `apps/mobile`
- Public/admin web app: `apps/web`
- Shared scheduling/domain package: `packages/shared`
- Supabase database migrations: `supabase/migrations`
- Supabase Edge Functions: `supabase/functions`
- Audit artifacts:
  - `docs/audit/integration-map.md`
  - `docs/audit/gaps.md`
  - `docs/audit/probe-summary.md`
  - `docs/audit/probe-results.json`

## Must-Follow Project Constraints

- Use `pnpm` only. Do not use `npm` or `yarn`.
- `@berber/shared` is the single source of truth for shared scheduling/domain logic.
- Edge functions import shared files through `supabase/functions/import_map.json`.
- Relative imports inside `packages/shared/src/*` must include `.ts` extensions because Deno consumes them.
- `packages/db/src/database.types.ts` and `supabase/functions/_shared/database.types.ts` must stay byte-for-byte synchronized.
- Do not write raw widget tokens to `widget_tokens.token_hash`; only SHA256 hashes are allowed.
- Do not directly insert into `appointments`; booking must go through edge functions/RPC/service-role flows.
- Do not manually insert into `appointment_slots`; it is a trigger-maintained realtime mirror.
- `btree_gist` must remain enabled before exclusion constraints.
- Duplicate migration timestamp `20260519130000_*` is intentional and must not be renamed.

## Review Goal

Perform a production-grade, architecture-level code review. Treat this as a release gate. Do not only summarize. Find concrete bugs, security issues, data consistency risks, performance problems, broken abstractions, missing tests, and clean architecture violations.

## Inputs To Read First

1. `AGENTS.md` or the project instructions if present.
2. `docs/audit/integration-map.md`
3. `docs/audit/gaps.md`
4. `docs/audit/probe-summary.md`
5. `package.json`, `pnpm-workspace.yaml`, all app/package `package.json` files.
6. Supabase entrypoints:
   - `supabase/migrations`
   - `supabase/config.toml`
   - `supabase/functions/import_map.json`
   - `supabase/functions/_shared`
7. Shared scheduling/domain files:
   - `packages/shared/src/slot-utils.ts`
   - `packages/shared/src/types.ts`
   - `packages/shared/src/constants.ts`
8. Main booking and availability flows:
   - `supabase/functions/widget-get-availability/index.ts`
   - `supabase/functions/widget-book-appointment/index.ts`
   - `supabase/functions/app-book-appointment/index.ts`
   - `supabase/functions/block-walkin/index.ts`
   - `apps/web/src/app/[slug]`
   - `apps/mobile/app`

## Review Method

Use the integration map as the system diagram. Trace every critical user flow from UI to database and back:

1. Customer books from public web/widget.
2. App owner/staff books manually.
3. Availability is calculated.
4. Appointment cancellation and blocking happen.
5. Realtime mirrors update.
6. Invite/register/shop approval flows run.
7. Push notifications and daily summary flows run.
8. RLS policies protect every table.

For each flow, inspect:

- UI entrypoint
- Client-side validation
- Edge function/RPC boundary
- Authentication/authorization model
- Rate limiting and abuse controls
- Database transaction boundaries
- Constraints/triggers/RLS
- Error handling and user-facing errors
- Idempotency/concurrency behavior
- Realtime side effects
- Test coverage

## Required Output Format

Start with findings, ordered by severity.

Use this severity model:

- `P0`: production data loss, auth bypass, direct revenue/security incident, booking double-write, deployment blocker.
- `P1`: likely production bug, privacy leak, serious race condition, broken critical flow, missing required validation.
- `P2`: reliability/performance/maintainability problem that should be fixed before scale.
- `P3`: cleanup, tech debt, DX improvement.

For every finding include:

- Severity
- File path and line number
- Exact issue
- Why it matters in production
- Reproduction or reasoning path
- Suggested fix
- Suggested test

After findings, include:

1. Architecture layer map:
   - Presentation
   - Application/use-case
   - Domain/shared
   - Infrastructure/edge
   - Persistence/database
   - External services
2. Clean Architecture violations:
   - Dependency direction problems
   - Duplicated domain logic
   - UI knowing persistence details
   - Edge function/business logic coupling
3. Security checklist:
   - RLS
   - service role usage
   - public anon access
   - token handling
   - invite/widget auth
   - rate limiting
   - PII exposure
4. Performance checklist:
   - queries
   - indexes
   - RPC scans
   - realtime fanout
   - frontend bundle/build risks
5. Migration/database integrity checklist:
   - exclusion constraints
   - triggers
   - generated types sync
   - migration ordering
   - rollback risk
6. Test gap list:
   - unit
   - integration
   - database/RLS
   - edge function
   - e2e
7. Prioritized remediation plan:
   - now
   - before production
   - after production

## Commands To Run

Run these where possible and include results:

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm lint
pnpm build
pnpm --filter @berber/mobile exec jest --runInBand
pnpm db:check
pnpm run audit:map
pnpm run audit:probe
pnpm audit --prod
supabase db reset
supabase functions serve block-walkin --env-file supabase/functions/.env
```

If a command cannot be run, explain exactly why.

## Special Focus Areas

Pay extra attention to:

- `computeAvailableSlots()` correctness, timezone/DST, grace period, booking notice.
- Exclusion constraints and `23P01` conflict handling.
- Direct `appointments` or `appointment_slots` writes.
- Public staff/shop/service column exposure.
- `staff_schedules` visibility and availability flow.
- Widget token hashing and token prevalidation.
- Service role use in web/admin and edge functions.
- Hardcoded secrets or local fallback keys.
- Next.js and Expo dependency audit risks.
- Generated `.next` / `.expo` type artifacts leaking into typecheck.
- Supabase function JWT settings in `supabase/config.toml`.

## Important Instruction

Do not give generic advice. Every issue must be grounded in a concrete file, code path, SQL policy, migration, or command output. If no issue is found in an area, explicitly say what was checked and why it appears safe.
