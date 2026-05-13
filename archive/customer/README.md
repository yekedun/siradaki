# Archived Customer Mobile App

`archive/customer` is preserved historical code for the former native customer mobile app.

This app is intentionally archived:

- It is not an active product surface.
- It is not part of the pnpm workspace or Turbo workflows.
- It is not an implementation target for customer booking work.
- Do not add features, booking flows, scheduling logic, realtime architecture, auth architecture, migrations, RLS policies, RPCs, edge functions, or shared package changes for this app.

Canonical product surfaces:

- `apps/web`: customer booking and acquisition.
- `apps/mobile`: owner/staff operations.

Allowed archive changes are limited to documentation corrections or reversible restoration work. Backend pieces that were used only by this app, such as `customer-book-appointment`, `customer-cancel-appointment`, and `customer_profiles`, are retained for now and must not be removed as part of this archive.

## Restore Steps

To reactivate the app intentionally:

1. Move `archive/customer` back to `apps/customer`.
2. Run `pnpm install` from the repo root.
3. Confirm `pnpm --filter @berber/customer type-check` resolves and passes.
4. Run `pnpm turbo type-check`.
5. Re-review product ownership before making any feature or backend changes.

Reactivation requires an explicit product and architecture decision. Customer mobile may consume shared scheduling logic, but it must not drive it.
