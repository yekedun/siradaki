-- Tighten exposed RPC permissions without breaking current app flows.
-- Edge functions call these through the service role; mobile owner flows still
-- call the mutation RPCs as authenticated users.

REVOKE EXECUTE ON FUNCTION public.sync_appointment_slots() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_block_slots() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_any_staff(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.schedule_has_conflict(uuid, timestamptz, timestamptz, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.staff_is_inside_work_window(uuid, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_appointment_atomic(text, uuid, uuid, uuid, timestamptz, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_appointment_atomic(uuid, uuid, uuid, timestamptz, text, text, text) FROM PUBLIC, anon;

-- Availability remains publicly callable because public booking flows use it.
GRANT EXECUTE ON FUNCTION public.get_occupied_ranges(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_day_hours(uuid, date) TO anon, authenticated;

-- Current mobile owner flows use these directly with authenticated sessions.
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(text, uuid, uuid, uuid, timestamptz, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_appointment_atomic(uuid, uuid, uuid, timestamptz, text, text, text) TO authenticated;
