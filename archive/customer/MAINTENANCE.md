# Customer Mobile Maintenance Mode

## Status

`apps/customer` is in maintenance mode.

Canonical product surfaces:

- `apps/web`: canonical customer booking and acquisition surface.
- `apps/mobile`: canonical owner/staff operational app.
- `apps/customer`: maintained only to avoid breakage; not an active product roadmap surface.

The customer app is not deleted now, but it is not protected at the cost of scheduling stability, web booking, or owner/staff development velocity. If it keeps creating drag, controlled archive/decommission is allowed.

## Maintenance Mode Rules

- Do not add new customer mobile product features.
- Do not make `apps/customer` the driver for scheduling, booking, realtime, auth, schema, RLS, RPC, edge function, or shared package decisions.
- Treat customer booking work as `apps/web` work by default.
- Treat operational workflow work as `apps/mobile` work by default.
- Keep changes small, isolated, and maintenance-oriented.
- If a requested change creates a new customer capability, it is out of scope for maintenance mode.

## Forbidden Changes

Do not add or expand:

- New booking flows or customer workflows.
- Duplicate service/staff/date/slot state machines.
- Scheduling, availability, timezone, or conflict-prevention logic inside the app.
- Realtime architecture for customer mobile.
- Customer-specific backend endpoints, migrations, RLS policies, RPCs, or edge functions.
- Customer-specific branches or fallbacks in `@berber/shared`.
- New customer auth/account/profile features.
- Push notifications, loyalty, favorites, reviews, marketplace, social, or AI features.

## Allowed Changes

Allowed maintenance work:

- Security fixes for auth, session, storage, dependencies, and Supabase client usage.
- Type-check and build compatibility fixes.
- Expo/Supabase/runtime compatibility fixes.
- Env/config fixes.
- Small adaptations to shared type or package changes.
- Production-breaking bug fixes for existing behavior.
- Deprecated API updates with no product behavior expansion.

## Architecture Guardrails

- `packages/shared/src/slot-utils.ts` remains the single scheduling source of truth.
- Booking correctness remains in database constraints and Supabase edge functions.
- `apps/customer` must not directly influence migrations, RLS, RPCs, or edge function contracts.
- Realtime reliability work should focus on `apps/mobile` owner/staff operations and `apps/web` booking needs.
- Shared package changes are designed for scheduling correctness, edge functions, web booking, and owner/staff operations first. Customer app compatibility is handled as a small consumer adaptation.

## Testing Policy

Minimum gate:

- `pnpm turbo type-check` must not be left broken by customer app drift.
- `pnpm --filter @berber/customer type-check` should pass when customer app files are touched.
- Security/auth/session fixes need a focused smoke test of the affected path.
- Booking-critical maintenance fixes need a smoke test that the existing flow still works.

Do not create a new customer app feature test matrix while the app is in maintenance mode.

## Decommission Triggers

Re-evaluate the app's repo role if it:

- Slows owner/staff app development.
- Breaks or constrains web booking.
- Creates unnecessary shared package compatibility burden.
- Repeatedly breaks type-check or build.
- Complicates scheduling, realtime, or auth architecture.
- Causes AI agents or developers to add features in the wrong surface.
- Influences migration, RLS, RPC, or edge function decisions without a web/owner/staff need.

Default escalation path:

1. Keep frozen with documented guardrails.
2. Move to controlled archive outside active workspace if guardrails fail.
3. Fully delete only after archive proves there is no remaining reactivation value.

## Safe Removal Outline

If controlled removal is needed:

- Move or remove `apps/customer` without touching `packages/shared`, `packages/db`, scheduling migrations, or owner/staff code.
- Update `pnpm-workspace.yaml`, root scripts, Turbo task expectations, and lockfile only as needed.
- Verify `apps/web` remains the canonical public customer booking flow.
- Verify `apps/mobile` owner/staff flows, widget, agenda, quick block, and scheduling operations are unaffected.
- Inventory Supabase functions, RPCs, env vars, and policies before deleting anything. Do not remove backend pieces used by web booking or owner/staff operations.

## Future Reactivation

Reactivate customer mobile development only if:

- Web booking is stable and measured in production.
- Owner/staff operational core workflows are stable.
- Real customer or barber demand repeatedly requires native mobile and cannot be solved by web booking.
- The expected impact on acquisition, retention, or operational load is measurable.
- A separate product brief and architecture review approve the work.

Even after reactivation, customer mobile consumes shared scheduling logic; it does not drive the architecture.
