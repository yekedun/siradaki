# Scheduling Verification

Automated gates:

- `pnpm backend:proof`
  Verifies overlap rules, timezone/day-boundary behavior, scheduling permissions, appointment/block mirror consistency, and concurrent races:
  - booking vs booking on same staff/time
  - booking vs manual block on same staff/time
  - block vs block on same staff/time
  - `any staff` booking under concurrent requests

- `pnpm backend:remote-smoke`
  Runs linked-environment smoke checks for update/cancel/rebook flows and mirror cleanup.

Manual checks still recommended:

- Realtime web booking UI:
  1. Open [BookingFlow.tsx](/c:/Users/Emre/Berber%20randevu/apps/web/src/app/[slug]/BookingFlow.tsx:82) flow for one shop/staff/day in two browsers.
  2. Book or block from one client.
  3. Confirm the other client refetches slots after the `appointment_slots` or `block_slots` event and the stale slot disappears.
  4. Try submitting the now-stale slot anyway and confirm the backend returns `409`.

- Realtime mobile owner agenda:
  1. Open [agenda.tsx](/c:/Users/Emre/Berber%20randevu/apps/mobile/app/(owner)/agenda.tsx:85) for the same day.
  2. Create or cancel an appointment/block from another client.
  3. Confirm the agenda reloads after the `appointment_slots` change and reflects the new state.

Why manual:

- The realtime guarantees depend on Supabase websocket delivery and client subscription lifecycle, which are not exercised by the SQL proof alone.
