# Pass 1 — Security Review Findings

**Date:** 2026-05-19
**Branch:** scheduling-hardening
**Reviewer:** Subagent

## Summary
- CRITICAL: 0
- WARNING: 2 (2 fixed, 0 deferred)
- MINOR: 1 (documented only)

## Findings

### S1 — JWT extraction in data-mutating edge functions
PASS. `app-book-appointment`, `app-cancel-appointment`, `create-widget-token`,
`delete-account`, and `create-manual-block` all extract the user via
`supabase.auth.getUser()` from the `Authorization` header and use `user.id`
for ownership decisions. None of them reads `user_id` from the request body.

### S2 — delete-account IDOR
PASS. `delete-account/index.ts:26-30` looks up the shop with
`owner_user_id.eq.${user.id}` (derived from JWT) and deletes by the
returned `shop.id`. The request body is not consulted for shop identity.

### S3 — delete-account ownership ambiguity
PASS. The owner path (shop found by `owner_user_id = user.id`) runs first;
the staff path is reached only when no owned shop is found
(`delete-account/index.ts:32-46`). Cross-cascade is not possible.

### S4 — create-widget-token scope
PASS. `create-widget-token/index.ts:29-35` resolves shop by
`owner_user_id = user.id`. The token is inserted with `shop_id: shop.id`;
the request body only carries an optional `label`.

### S5 — Public widget functions rate limiting
PASS. `widget-book-appointment` enforces two layers:
1. IP-based Upstash Redis token bucket (5 req / 10 min) at the top of the
   handler (`widget-book-appointment/index.ts:62-72`). When the env vars are
   absent (local dev) the check is a no-op.
2. Per-phone cooldown inside `create_appointment_atomic` (P0004 → HTTP 429)
   from migration `20260518190000_phone_booking_rate_limit.sql` — 5 bookings
   per 10-minute window keyed on `customer_phone`. The edge function's
   `mapRpcErrorStatus` (`widget-book-appointment/index.ts:54-60`) translates
   P0004 to HTTP 429.

### S6 — block-walkin and create-manual-block authorization
WARNING (fixed). 
- `block-walkin` validates a widget token via `sha256(rawToken)` against
  `widget_tokens.token_hash`, checks `expires_at`, enforces a 2-second
  per-token cooldown, and confirms the supplied/derived `staff_id` belongs
  to the token's shop (`block-walkin/index.ts:24-77`). Solid.
- `create-manual-block` was selecting only `shops.owner_id` for the owner
  check (`create-manual-block/index.ts:60-64`). The `shops` table has both
  `owner_id` (legacy column from `20260508_multi_seat_and_admin.sql`) and
  `owner_user_id` (modern column used by register flow). Modern owners
  would fall through to `isSelf`-only authorization, blocking legitimate
  owners. The atomic RPC itself re-checks both columns, so this was a
  defense-in-depth gap rather than an exploit. Fixed by selecting both
  columns and checking either match (commit 06e8fa1).

### S7 — register.tsx slug injection
PASS. `toSlug()` in `apps/mobile/app/(auth)/register.tsx:18-25`:
1. Lowercases input.
2. Maps Turkish chars (ç,ğ,ı,ö,ş,ü both cases) to ASCII.
3. Replaces `/[^a-z0-9]+/` with `-`.
4. Trims leading/trailing `-` with `/^-|-$/g`.

The output character set is `[a-z0-9-]` only — no quotes, semicolons, or
SQL-meta characters can survive. Edge case: a 2-char input made entirely
of unsupported chars (e.g. `"~~"`) yields an empty string, which the caller
replaces with `"dukkan"` (line 107). Safe.

### S8 — One-shop-per-user server-side guard
WARNING (fixed). The `shops` table (`20240101000001_initial.sql:7-18`) had
no uniqueness constraint on `owner_user_id`. RLS allows
`INSERT WITH CHECK (owner_user_id = auth.uid())`, so a user could insert
arbitrarily many shops for themselves. `lib/user-context.tsx:46-50` uses
`.single()` on the owner lookup and would error if multiple rows existed.
register.tsx already handles error code 23505 on slug collisions.

Fixed by adding a partial unique index in migration
`20260521090000_shops_unique_owner_user_id.sql` (commit c8156d1).
register.tsx's existing 23505 handling will surface the same error path
if a user tries to create a second shop.

### S9 — Role escalation via direct table insert
PASS. The `shops_owner_insert` policy
(`20260518130000_non_scheduling_rls_advisor_cleanup.sql:14-16`) has
`TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()))`. A
user can only insert a shop owned by themselves — they cannot forge a row
with someone else's `owner_user_id`. The `user-context.tsx` "owner" role
is derived from `owner_user_id = user.id` (or legacy `owner_id`), which
is identity-bound. No escalation surface.

### S10 — RLS policy completeness
PASS for the four required tables:
- **staff** — RLS enabled (`20260513074317_backend_scheduling_hardening.sql:6`);
  SELECT/INSERT/UPDATE/DELETE policies in
  `20260514080010_scheduling_rls_policy_consolidation.sql:175-225`.
- **appointments** — RLS enabled (`20240101000002_rls_policies.sql:5`);
  SELECT/UPDATE policies in `20260514080010`; INSERT/DELETE are
  intentionally blocked by the `prevent_direct_appointment_scheduling_writes`
  trigger (`20260518110000`) — by-design, RPC-only writes.
- **blocks** — RLS enabled (`20240101000002_rls_policies.sql:6`); SELECT
  policy in `20260517100000_manual_block_edge_only.sql:18-28`; writes are
  service_role-only via `create_block_atomic` (intentional after
  `20260517100000`).
- **widget_tokens** — RLS enabled (`20240101000002_rls_policies.sql:7`);
  SELECT/INSERT/DELETE policies in
  `20260518130000_non_scheduling_rls_advisor_cleanup.sql:165-196`. No
  UPDATE policy, but `last_used_at` updates run through the admin client
  in `block-walkin/index.ts:102-105` — acceptable.

### S11 — Admin client not in client bundles
PASS. `grep -rn "supabase-admin" apps/mobile apps/web packages` returns no
matches. `grep -rn "SERVICE_ROLE" apps/mobile apps/web packages` returns
no matches. The admin client is correctly quarantined to
`supabase/functions/_shared/supabase-admin.ts`.

### S12 — CORS wildcard + credentials
MINOR. `supabase/functions/_shared/cors.ts:1-6` sets
`Access-Control-Allow-Origin: *` with no `Access-Control-Allow-Credentials`
header. Widget embeds need the wildcard, and the absence of the credentials
header means browsers will not attach cookies/Authorization on cross-origin
fetches via this CORS contract. The `Authorization` header is still
accepted via `Access-Control-Allow-Headers` (used by app-* functions whose
clients explicitly pass JWTs from their own auth state, not from cookies).
Acceptable as-is.

### S13 — app-cancel-appointment authorization
PASS. The edge function does a pre-flight read with both
`.eq("id", appointment_id)` and `.eq("customer_user_id", user.id)`
(`app-cancel-appointment/index.ts:35-40`) so another customer's
appointment returns null. The cancel itself runs through
`cancel_appointment_atomic` as the authenticated user (not service role —
`userClient.rpc(...)` on line 56), so the RPC's SECURITY DEFINER ownership
check in `20260518160000_customer_cancel_authorization.sql:44-66`
re-enforces ownership server-side (`customer_user_id = v_uid` is one of
the allowed paths). Defense-in-depth confirmed.

## Fixes shipped this pass

| Commit  | Severity | Summary                                                            |
|---------|----------|--------------------------------------------------------------------|
| 06e8fa1 | WARNING  | create-manual-block owner check includes both owner_id columns     |
| c8156d1 | WARNING  | shops.owner_user_id unique partial index — one-shop-per-owner      |
