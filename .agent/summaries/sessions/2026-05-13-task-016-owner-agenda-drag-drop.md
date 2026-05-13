# TASK-016 Owner Agenda Drag/Drop

- Implemented in `apps/mobile/app/(owner)/agenda.tsx`.
- Appointment cards use `PanResponder` on a small move handle for horizontal drag gestures.
- Dropping over another staff column preserves time/service and calls `update_appointment_atomic`.
- UI updates optimistically, then reloads from server; RPC conflicts reload and show an alert.
- Query includes required appointment fields so moves preserve customer and service data.
- Validation passed: `pnpm --filter @berber/mobile type-check`; `git diff --check -- apps/mobile/app/(owner)/agenda.tsx` passed with CRLF warning only.
- Manual emulator drag/drop smoke was skipped after the user stated this screen is not planned to be used.
