# Active Feature

No active implementation task.

# Current Task

- Session closeout completed after TASK-016.
- User stated the owner agenda/randevular screen will not be used, so TASK-016 manual drag/drop smoke is no longer a blocking validation item.

# Current Problems

- `20260518130000_non_scheduling_rls_advisor_cleanup.sql` is local only; review/deploy to linked Supabase when ready.
- Supabase advisor intentionally still reports `btree_gist` in public; moving it would need a separate ADR-backed migration.
- Supabase CLI remote query may need `--dns-resolver https`; native DNS timed out during staging smoke.

# Latest Check

- TASK-016 implementation remains in `apps/mobile/app/(owner)/agenda.tsx`; `pnpm --filter @berber/mobile type-check` passed and `git diff --check -- apps/mobile/app/(owner)/agenda.tsx` passed with CRLF warning only.
- Android owner app was reconnected to mobile Metro on port 8083 after clearing cache; app opened to owner UI.
- TASK-016 moved to completed because the target screen is out of scope for manual product validation.
- Non-scheduling RLS advisor cleanup migration passed `supabase db reset`; local advisors now only report the intentional `btree_gist` public extension warning.

# Active Files

- `supabase/migrations/20260518130000_non_scheduling_rls_advisor_cleanup.sql`
- `apps/mobile/app/(owner)/agenda.tsx`

# Rotation Rule

If `current.md` exceeds 80 lines:

- move historical content to summaries
- keep only active execution context
