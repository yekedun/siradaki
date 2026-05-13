# Next Tasks

1. review/deploy `20260518130000_non_scheduling_rls_advisor_cleanup.sql` to linked Supabase when ready
2. decide whether `btree_gist` public extension warning should stay documented or move extension schema in a separate ADR-backed migration

# Completed Recently

- TASK-016 moved to completed; manual drag/drop smoke was skipped because the owner agenda/randevular screen is not planned to be used.
- TASK-016 owner agenda drag/drop optimization implemented locally and mobile type-check passed.
- Android owner app was reconnected to mobile Metro on port 8083 after cache clear.
- non-scheduling RLS advisor cleanup added locally; initplan and multiple permissive warnings are gone after `supabase db reset`.
- raw availability helper RPCs (`get_occupied_ranges`, `get_staff_day_hours`) are no longer executable by `anon`/`authenticated`; `service_role` remains allowed for Edge Functions.
- customer success screen -> appointments was verified on Android emulator after real manual CTA click; appointments tab selected and list rendered.

# Rotation Rule

If `next.md` exceeds 40 lines:

- prune low-priority items
- move longer planning into summaries or backlog
