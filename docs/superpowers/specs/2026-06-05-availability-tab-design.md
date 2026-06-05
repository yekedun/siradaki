# Availability Tab Design

## Goal

Add a mobile "Musaitlik" tab for owner and staff users so a barber can answer phone availability questions quickly, such as "Is Saturday 13:00 available?" or "Who can take the next customer soonest?"

The feature is optimized for speed during a phone call. It should avoid full booking flow choices and keep the UI aligned with the existing mobile design system.

## Scope

- Owner users get a new "Musaitlik" tab.
- Staff users get a new "Musaitlik" tab.
- Owner can view availability for all active staff or a specific staff member.
- Staff can view only their own availability.
- Availability is calculated for quick duration choices: 30, 45, and 60 minutes.
- 30 minutes is selected by default.
- The screen shows the earliest available options at the top.
- The screen supports day selection and refreshes availability when date, duration, or staff filter changes.

## Non-Goals

- This sprint does not add appointment creation from the availability slot.
- This sprint does not change the booking conflict model.
- This sprint does not change staff schedule editing.
- This sprint does not add custom arbitrary duration input.

## Backend Architecture

Extend the existing `widget-get-availability` edge function so it accepts either:

- `service_id`, preserving the current public booking behavior.
- `duration_min`, for internal mobile availability lookups.

When `duration_min` is present, the function validates it as one of `30`, `45`, or `60` and uses that value directly for `computeAvailableSlots()`. When `service_id` is present, existing service lookup behavior remains unchanged.

The function keeps the existing two modes:

- `staff_id=<uuid>` returns availability for one active staff member in the shop.
- `staff_id=any` or missing staff id returns union availability where a slot is available if at least one active staff member is available.

This keeps slot calculation in the same backend path as public booking availability and preserves these existing rules:

- shop working hours
- per-staff schedules
- appointment and block occupied ranges
- booking grace period and past-slot filtering from `@berber/shared/slot-utils`
- timezone handling

No new database tables or migrations are required.

## Mobile Data Flow

Owner screen:

1. Load shop context from `ShopProvider`: `shopSlug`, active staff list.
2. Keep local state for selected date, selected duration, and selected staff filter.
3. Call `widget-get-availability` with `shop_slug`, `date`, `duration_min`, and `staff_id`.
4. For the "Tumu" filter, request union availability with `staff_id=any`.
5. For a specific staff chip, request that staff id.
6. To show staff names in the "earliest available" card for owner, fetch per-staff availability for active staff in parallel for the selected date and duration, then derive the first available slots.

Staff screen:

1. Resolve the authenticated user's active staff row.
2. Keep local state for selected date and selected duration.
3. Call `widget-get-availability` with `shop_slug`, `date`, `duration_min`, and the user's own `staff_id`.
4. Do not expose an all-staff or other-staff selector.

## UI Design

The new screens follow the existing mobile style:

- tab bar style remains unchanged.
- typography, colors, chips, cards, and spacing follow the current `apps/mobile/components/ds` patterns.
- no marketing-style hero or unrelated decorative UI.

Owner layout:

- Header: existing overline/header pattern with title "Musaitlik".
- Day picker near the top.
- Duration segmented control: `30 dk`, `45 dk`, `60 dk`.
- Top card: "En erken bos saatler", showing the next 3 to 5 available staff/time combinations.
- Staff filter chips: `Tumu` plus active staff names.
- Availability list:
  - For `Tumu`, show time rows with a concise available signal.
  - For one staff member, show that staff member's available times for the selected duration.

Staff layout:

- Header: existing overline/header pattern with title "Musaitlik".
- Day picker.
- Duration segmented control.
- Top card: next available slots for the staff member.
- Availability list for the selected day and duration.

## Empty, Loading, and Error States

- Loading: show a compact in-screen loading state while availability is fetched.
- Closed day: show that the shop or staff member is closed for the selected date.
- No availability: show that no slot is available for the selected duration.
- Network/function error: show a retryable error message.

Error copy should be short and useful during a phone call.

## Testing

Backend:

- Add tests for `duration_min` validation in `widget-get-availability` if the existing edge test setup supports it.
- Preserve existing `service_id` behavior.
- Verify both `staff_id=any` and specific staff paths use `duration_min`.

Mobile:

- Add focused tests for any pure availability mapping helpers.
- Typecheck the mobile app.
- Smoke-test owner and staff route/tab registration.

Manual validation:

- Owner can switch between `Tumu` and a staff member.
- Staff sees only their own availability.
- 30/45/60 duration changes alter available slots.
- Earliest availability card updates with date, duration, and staff data.

## Open Decisions Resolved

- Use text-only design flow, no visual companion.
- Use duration choices instead of service selection.
- Default duration is 30 minutes.
- Owner sees both all-staff and staff-specific views.
- Staff sees only self availability.
- Reuse and extend `widget-get-availability` instead of duplicating availability logic in mobile.
