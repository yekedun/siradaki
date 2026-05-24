-- Backfill default working schedules for staff that have none.
--
-- staff_is_inside_work_window falls back to shops.working_hours when
-- staff_schedules has no row for a given day. Most shops have working_hours='{}'
-- (the old column default), so every slot was rejected with P0001 / 409.
--
-- Default: Mon-Sat (dow 1-6) 09:00-19:00 working; Sun (dow 0) closed.
-- Only inserts for staff_id+day_of_week combos that don't already exist.

INSERT INTO public.staff_schedules (staff_id, day_of_week, is_working, work_start, work_end)
SELECT
  s.id AS staff_id,
  d.day_of_week,
  d.day_of_week <> 0 AS is_working,
  '09:00'::time AS work_start,
  '19:00'::time AS work_end
FROM public.staff s
CROSS JOIN (
  VALUES (0),(1),(2),(3),(4),(5),(6)
) AS d(day_of_week)
WHERE s.is_active = true
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff_schedules ss
    WHERE ss.staff_id = s.id
      AND ss.day_of_week = d.day_of_week
  )
ON CONFLICT (staff_id, day_of_week) DO NOTHING;
