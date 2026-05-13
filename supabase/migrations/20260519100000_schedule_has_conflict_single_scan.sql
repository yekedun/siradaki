-- M-3: schedule_has_conflict — staff_schedules çift taramasını tek scan'e indir.
--
-- 20260516090000 get_occupied_ranges() çağrısını (appointments + blocks tekrar
-- sorgulayan) kaldırdı; schedule_ranges CTE staff_schedules'a doğrudan baktı.
-- Ama CTE içinde iki ayrı UNION ALL kolu olduğundan staff_schedules iki kez
-- taranıyordu (is_working=false kolu + break kolu). Advisory lock tutulurken
-- gereksiz ek IO. Bu migration iki kolu tek scan'e indirger.

CREATE OR REPLACE FUNCTION public.schedule_has_conflict(
  p_staff_id              uuid,
  p_starts_at             timestamptz,
  p_ends_at               timestamptz,
  p_ignore_appointment_id uuid DEFAULT NULL,
  p_ignore_block_id       uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH staff_ctx AS (
    SELECT
      s.id                                                      AS staff_id,
      sh.timezone,
      (p_starts_at AT TIME ZONE sh.timezone)::date             AS local_date
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE s.id = p_staff_id
  ),
  -- Tek staff_schedules taraması: kapalı gün ve mola aralıklarını birlikte üretir.
  schedule_ranges AS (
    SELECT
      CASE
        WHEN ss.is_working = false THEN b.starts_at
        ELSE (sc.local_date + ss.break_start)::timestamp AT TIME ZONE sc.timezone
      END AS starts_at,
      CASE
        WHEN ss.is_working = false THEN b.ends_at
        ELSE (sc.local_date + ss.break_end)::timestamp AT TIME ZONE sc.timezone
      END AS ends_at
    FROM public.staff_schedules ss
    JOIN  staff_ctx sc ON sc.staff_id = ss.staff_id
    LEFT JOIN LATERAL public.schedule_day_bounds(sc.local_date, sc.timezone) b ON true
    WHERE ss.day_of_week = EXTRACT(DOW FROM sc.local_date)::int
      AND (
        ss.is_working = false
        OR (
          ss.is_working = true
          AND ss.break_start IS NOT NULL
          AND ss.break_end   IS NOT NULL
        )
      )
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.staff_id = p_staff_id
      AND a.status  <> 'cancelled'
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
