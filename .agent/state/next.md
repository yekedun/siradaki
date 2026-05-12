# Next Tasks

1. review customer app local/dev-only login helper before production build
2. harden remaining non-scheduling database warnings: RLS policy performance, multiple permissive policies, and exposed availability RPC design
3. keep TASK-016 drag/drop UI optimization parked until backend work is stable

# Completed Recently

- remote backend smoke for `20260516090000_fix_schedule_conflict_ignore.sql` and commission migration passed on staging
- web booking flow at `http://localhost:3000/test-berber` completed via public `book-appointment` edge path and cleanup was verified
- Android owner/mobile smoke passed in Pixel_7 after starting mobile Metro on port 8083 with cache clear
   - note: customer app success CTA verification via `adb` synthetic input is unreliable on emulator; one attempt produced ANR (`Application does not have a focused window`)
   - note: missing Android deep link schemes in `apps/customer/android/app/src/main/AndroidManifest.xml` were fixed and app was reinstalled; keep one manual success-screen-to-appointments check in scope

# Rotation Rule

If `next.md` exceeds 40 lines:

- prune low-priority items
- move longer planning into summaries or backlog
