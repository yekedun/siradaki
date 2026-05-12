# Status

ACCEPTED

# Context

Multi-seat scheduling needs a database-backed source of truth. Separate appointment and block tables had independent overlap constraints, leaving appointment-vs-block conflicts dependent on pre-insert reads.

# Decision

Use Postgres RPCs as the scheduling write layer: `create_appointment_atomic`, `update_appointment_atomic`, and `create_block_atomic`. Each write takes a staff-scoped advisory transaction lock, checks derived availability and cross-table overlaps, then mutates appointments or blocks.

The scheduling proof gate is part of this decision: `pnpm backend:proof` must remain the local regression check for atomic booking, staff schedule rules, break/closed-day handling, RLS/RPC exposure, mirror sync, and parallel booking races.

# Consequences

- Frontends must treat server/RPC responses as authoritative.
- Direct writes to `appointments` and `blocks` should be avoided for scheduling mutations.
- `block_slots` and `appointment_slots` remain realtime invalidation mirrors, not availability truth.
- Changes to scheduling RPCs or slot rules should update the proof harness in the same work.
