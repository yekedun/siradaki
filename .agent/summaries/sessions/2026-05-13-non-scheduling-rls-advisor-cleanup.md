# Non-Scheduling RLS Advisor Cleanup

- Added `supabase/migrations/20260518130000_non_scheduling_rls_advisor_cleanup.sql`.
- Migration consolidates non-scheduling RLS policies for `shops`, `barbers`, `customer_profiles`, `services`, and `widget_tokens`.
- Wrapped remaining policy `auth.uid()` calls as `(SELECT auth.uid())` and merged duplicate permissive SELECT/UPDATE policies where advisor reported warnings.
- Hardened availability helper RPC surface: `get_occupied_ranges(uuid, date)` and `get_staff_day_hours(uuid, date)` are revoked from `PUBLIC`, `anon`, and `authenticated`; `service_role` remains granted for Edge Functions.
- Validation:
  - `supabase db reset` passed.
  - `supabase db advisors --local --output json` now reports only `extension_in_public` for `btree_gist`.
  - privilege query confirmed anon/auth cannot execute the raw availability helper RPCs, while service_role can.
  - `supabase db push --dry-run --linked --dns-resolver https` would push only this migration; no remote push was performed.
