# 007 Customer App Archived Outside Workspace

## Decision

`apps/web` is the canonical customer booking and acquisition surface.

`apps/mobile` is the canonical owner/staff operational app.

The former customer mobile app is archived at `archive/customer`. It remains in the repo for possible future reactivation, but it is outside the active pnpm/turbo workspace and is not an active product roadmap surface.

`archive/customer` must not drive scheduling, realtime, booking, auth, schema, RLS, RPC, edge function, shared package, or product decisions.

## Allowed Archive Work

- Documentation corrections.
- Explicit, reversible restoration work after a product/architecture decision.
- No routine maintenance fixes while it is outside the active workspace.

## Forbidden Archive Work

- New customer mobile features.
- New booking workflows.
- Scheduling, availability, timezone, or conflict-prevention logic.
- Realtime architecture.
- Customer-specific backend contracts.
- Shared package changes whose main reason is customer app compatibility.
- Duplicate business logic.

## Decommission Option

Archive outside the active workspace is the current decision. Full deletion is still not the first step.

To reactivate intentionally, move `archive/customer` back to `apps/customer`, run `pnpm install`, and validate `pnpm --filter @berber/customer type-check` plus `pnpm turbo type-check`.

Backend pieces used only by the archived native customer app are retained for now and require a separate backend cleanup review before removal.
