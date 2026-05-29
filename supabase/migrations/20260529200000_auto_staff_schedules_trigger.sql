-- Auto-create staff_schedules rows when a staff member is added.
-- Previously only a one-time backfill (20260524120000) existed, so staff
-- added via accept-invite or onboarding received no schedule rows and
-- fell back to shop working_hours without per-day closed status — meaning
-- new staff appeared bookable on Sundays even if the shop is closed.
--
-- Mon–Sat 09:00–19:00 open, Sun closed — same default as the backfill.
-- ON CONFLICT DO NOTHING keeps the trigger idempotent on re-runs.

CREATE OR REPLACE FUNCTION public.auto_create_staff_schedules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_schedules
    (staff_id, day_of_week, is_working, work_start, work_end)
  VALUES
    (NEW.id, 0, false, '09:00', '19:00'),  -- Pazar  — kapalı
    (NEW.id, 1, true,  '09:00', '19:00'),  -- Pazartesi
    (NEW.id, 2, true,  '09:00', '19:00'),  -- Salı
    (NEW.id, 3, true,  '09:00', '19:00'),  -- Çarşamba
    (NEW.id, 4, true,  '09:00', '19:00'),  -- Perşembe
    (NEW.id, 5, true,  '09:00', '19:00'),  -- Cuma
    (NEW.id, 6, true,  '09:00', '19:00')   -- Cumartesi
  ON CONFLICT (staff_id, day_of_week) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_staff_schedules
  AFTER INSERT ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_staff_schedules();
