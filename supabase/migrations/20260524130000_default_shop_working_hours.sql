-- New owner shops were created with shops.working_hours = '{}', which makes
-- staff_is_inside_work_window() reject every booking slot. Give existing empty
-- rows and future inserts the same sane default used by mobile onboarding.

ALTER TABLE public.shops
  ALTER COLUMN working_hours SET DEFAULT jsonb_build_object(
    'mon', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'tue', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'wed', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'thu', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'fri', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'sat', jsonb_build_object('open', '10:00', 'close', '17:00', 'enabled', true),
    'sun', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', false)
  );

UPDATE public.shops
SET working_hours = jsonb_build_object(
    'mon', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'tue', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'wed', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'thu', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'fri', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', true),
    'sat', jsonb_build_object('open', '10:00', 'close', '17:00', 'enabled', true),
    'sun', jsonb_build_object('open', '09:00', 'close', '19:00', 'enabled', false)
  )
WHERE working_hours = '{}'::jsonb;
