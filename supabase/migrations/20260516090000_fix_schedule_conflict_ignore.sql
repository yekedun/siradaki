-- Fix update_appointment_atomic false conflicts.
--
-- schedule_has_conflict already checks appointments and blocks directly with
-- ignore ids. Its previous final branch called get_occupied_ranges(), which
-- also returns appointments/blocks but without ids, so an update could conflict
-- with the same appointment it was supposed to ignore. Keep the direct table
-- checks for appointments/blocks, and check staff schedule closures/breaks
-- directly.

CREATE OR REPLACE FUNCTION public.schedule_has_conflict(
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ignore_appointment_id uuid DEFAULT NULL,
  p_ignore_block_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH staff_ctx AS (
    SELECT
      s.id AS staff_id,
      sh.timezone,
      (p_starts_at AT TIME ZONE sh.timezone)::date AS local_date
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE s.id = p_staff_id
  ),
  schedule_ranges AS (
    SELECT
      b.starts_at,
      b.ends_at
    FROM public.staff_schedules ss
    JOIN staff_ctx sc ON sc.staff_id = ss.staff_id
    CROSS JOIN LATERAL public.schedule_day_bounds(sc.local_date, sc.timezone) b
    WHERE ss.day_of_week = EXTRACT(DOW FROM sc.local_date)::int
      AND ss.is_working = false

    UNION ALL

    SELECT
      (sc.local_date + ss.break_start)::timestamp AT TIME ZONE sc.timezone,
      (sc.local_date + ss.break_end)::timestamp AT TIME ZONE sc.timezone
    FROM public.staff_schedules ss
    JOIN staff_ctx sc ON sc.staff_id = ss.staff_id
    WHERE ss.day_of_week = EXTRACT(DOW FROM sc.local_date)::int
      AND ss.is_working = true
      AND ss.break_start IS NOT NULL
      AND ss.break_end IS NOT NULL
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.staff_id = p_staff_id
      AND a.status <> 'cancelled'
      AND (p_ignore_appointment_id IS NULL OR a.id <> p_ignore_appointment_id)
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  )
  OR EXISTS (
    SELECT 1
    FROM public.blocks b
    WHERE b.staff_id = p_staff_id
      AND (p_ignore_block_id IS NULL OR b.id <> p_ignore_block_id)
      AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  )
  OR EXISTS (
    SELECT 1
    FROM schedule_ranges r
    WHERE tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.schedule_has_conflict(uuid, timestamptz, timestamptz, uuid, uuid)
FROM PUBLIC, anon, authenticated;
