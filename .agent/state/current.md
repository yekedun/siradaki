# Active Feature

Scheduling engine hardening

# Current Task

- Optional commission tracking remains per staff member; shop-level toggle only gates the module UI/reporting.
- Customer booking now reads active `staff` rows instead of legacy `barbers`, so owner/admin staff can appear in the booking picker.
- Owner role lookup now accepts both `shops.owner_user_id` and legacy `shops.owner_id`.
- New owner-staff invariant migration is local-validated: new shops create/maintain an active admin staff row for the owner.
- `pnpm turbo type-check`, `supabase db reset`, and `pnpm backend:proof` pass after proof fixture updates.

# Current Problems

- Supabase advisors still report non-scheduling warnings: RLS performance, multiple permissive policies outside scheduling, `btree_gist` public extension, and intentional public availability RPC warnings
- test data exists on remote for slug `test-berber`
- Supabase CLI remote query may need `--dns-resolver https`; native DNS timed out during staging smoke.
- remote/local migration history has unrelated drift around older `20260512*` and `20260517100000` local migrations; do not bulk push without reviewing migration history.

# Active Files

- `supabase/snippets/scheduling-proof.sql`
- `scripts/scheduling-proof.ps1`
- `supabase/migrations/20260516090000_fix_schedule_conflict_ignore.sql`
- `apps/customer/app/(auth)/login.tsx`
- `apps/customer/app/booking/step2-barber.tsx`
- `supabase/migrations/20260517090000_optional_commission_tracking.sql`
- `supabase/migrations/20260518090000_ensure_owner_staff_bookable.sql`
- `apps/mobile/app/(owner)/earnings.tsx`
- `apps/mobile/app/(owner)/team.tsx`

# Rotation Rule

If `current.md` exceeds 80 lines:

- move historical content to summaries
- keep only active execution context
