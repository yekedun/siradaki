---
source: internal-project
topic: durable-notes
updated: 2026-05-11
relevance: high
priority: normal
---

# Project Notes

- Barber registration in v1 is manual through Supabase Dashboard: create `auth.users` and the matching `barbers` row.
- Expo Go cannot run the widget. Use `expo run:ios`, `expo run:android`, or an EAS dev build.
- `NativeWidgetModule.ts` has a graceful fallback.
- `book-appointment` runs with `verify_jwt = false`; the edge function does slot revalidation and relies on the gist constraint.
- `OPTIMIZATIONS.md` findings `F-02` and `F-03` were resolved through `D-01`: Deno `import_map.json` points at the shared source files.
- `database.types.ts` exists in two generated copies and must be manually synced after schema changes.
- iOS WidgetKit extension target still requires manual Xcode setup.
- Supabase project credentials must be filled in `.env.local`.
