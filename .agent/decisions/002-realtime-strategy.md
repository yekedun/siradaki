# Status

ACCEPTED

# Context

The booking UI needs near-live visibility into appointment changes, but Supabase Realtime with RLS does not behave correctly when relying on a view for public subscriptions.

# Decision

Use `appointment_slots` as a mirror table maintained by `sync_appointment_slots` triggers instead of using a view. Treat the `gist exclude` constraint on confirmed appointments as the final anti-conflict guard, and return `409` from `book-appointment` on PostgreSQL `23P01`.

# Consequences

- Realtime subscriptions can stay on a real table with predictable RLS behavior.
- Trigger logic and mirror schema must stay aligned with appointment schema changes.
- Conflict handling is explicit and consistent across clients.
