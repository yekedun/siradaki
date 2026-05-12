# Project Foundation

## Completed

- Root pnpm workspace, Turbo, TypeScript base config, env example, gitignore, Supabase config, and mobile EAS config.
- Shared package with constants, shared types, and DST-safe slot utilities.
- Database migrations for core tables, RLS, RPC functions, trigger sync, optimizations, multi-seat support, and staff schedules.
- Supabase edge functions for availability, booking, walk-in blocking, and widget token creation.
- Web booking flow with service selection, slot grid, booking modal, ISR, caching, and Realtime-driven updates.
- Mobile app shell, auth flow, agenda, block screen, settings, team screen, staff schedule modal, and appointment detail sheet.
- iOS and Android widget bridge, native files, Android resources, and Expo config plugin.

## Notes

- `pnpm turbo type-check` previously passed.
- Supabase migrations were previously applied with `supabase db push`.
- `OPTIMIZATIONS.md` findings `F-01` through `F-12` were addressed.
