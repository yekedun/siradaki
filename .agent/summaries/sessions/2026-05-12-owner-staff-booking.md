---
date: 2026-05-12
mode: implementation
scope: owner-staff booking visibility, commission gate validation
---

# Summary

- Customer booking/staff visibility was aligned to the current staff-based backend model.
- Owner lookup now accepts both `shops.owner_user_id` and legacy `shops.owner_id`.
- Added `20260518090000_ensure_owner_staff_bookable.sql` to guarantee an active admin staff row for each shop owner without changing scheduling logic.
- Confirmed commission remains personel/usta based through `staff.commission_type` and `staff.commission_rate_bps`; shop flag only gates the optional module.
- Removed stale Android-unsafe `Alert.prompt` path from owner team add-staff flow.
- Fixed local Supabase config duplicate `[functions.create-manual-block]` table and made early manual-block revoke migration idempotent.
- Updated scheduling proof race fixture for the new owner-staff pool.

# Validation

- `pnpm turbo type-check` passed.
- `supabase db reset` passed.
- `pnpm backend:proof` passed.
- Local RLS-style shop insert test confirmed owner staff row is created.
- Staging `test-berber` already has one active owner/admin staff row plus one active staff row.

# Notes

- Remote migration was not bulk-pushed because `supabase migration list --linked --dns-resolver https` shows unrelated local/remote drift around older `20260512*` migrations and `20260517100000`.
- TASK-016 drag/drop remains parked.
