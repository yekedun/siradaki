# Active Feature

Scheduling engine hardening

# Current Task

- Scheduling engine hardening local proof is complete.
- `pnpm backend:proof` resets local Supabase, runs deterministic SQL assertions, and verifies parallel booking race behavior.
- `schedule_has_conflict` false conflict during appointment update/reschedule ignore flow is fixed in `20260516090000_fix_schedule_conflict_ignore.sql`.
- Customer Android booking E2E is complete and remote appointment was verified for `2026-05-18 09:00 Europe/Istanbul`, status `confirmed`.
- Optional commission tracking implementation is in review: local migration reset, type-check, backend proof, staging SQL smoke, web booking smoke, and Android owner smoke pass.

# Current Problems

- Supabase advisors still report non-scheduling warnings: RLS performance, multiple permissive policies outside scheduling, `btree_gist` public extension, and intentional public availability RPC warnings
- test data exists on remote for slug `test-berber`
- Supabase CLI remote query may need `--dns-resolver https`; native DNS timed out during staging smoke.

# Active Files

- `supabase/snippets/scheduling-proof.sql`
- `scripts/scheduling-proof.ps1`
- `supabase/migrations/20260516090000_fix_schedule_conflict_ignore.sql`
- `apps/customer/app/(auth)/login.tsx`
- `apps/customer/app/booking/step3-slot.tsx`
- `supabase/migrations/20260517090000_optional_commission_tracking.sql`
- `apps/mobile/app/(owner)/earnings.tsx`
- `apps/mobile/app/(owner)/team.tsx`

# Rotation Rule

If `current.md` exceeds 80 lines:

- move historical content to summaries
- keep only active execution context
