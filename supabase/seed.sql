-- Test seed data for local development and audit probes
-- Creates a test shop with owner + one staff member

-- Insert dummy auth users (bypassing normal signup for seed purposes)
INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, encrypted_password)
VALUES
  ('00000000-0000-0000-0000-000000000099', 'owner@test.local', 'authenticated', 'authenticated', now(), now(), ''),
  ('00000000-0000-0000-0000-000000000098', 'staff@test.local',  'authenticated', 'authenticated', now(), now(), '')
ON CONFLICT (id) DO NOTHING;

-- Test shop
INSERT INTO public.shops (id, name, display_name, slug, owner_user_id)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Berber',
  'Test Berber',
  'test-berber',
  '00000000-0000-0000-0000-000000000099'
) ON CONFLICT (id) DO NOTHING;

-- Test staff (bookable barber)
INSERT INTO public.staff (id, shop_id, name, slug, is_active, user_id)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Test Usta',
  'test-usta',
  true,
  '00000000-0000-0000-0000-000000000098'
) ON CONFLICT (id) DO NOTHING;

-- Test service
INSERT INTO public.services (id, shop_id, name, duration_min, price_cents, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Test Hizmet',
  30,
  5000,
  true
) ON CONFLICT (id) DO NOTHING;

-- Default staff schedule (Mon-Sat 09:00-18:00)
INSERT INTO public.staff_schedules (staff_id, day_of_week, is_working, work_start, work_end)
SELECT
  '00000000-0000-0000-0000-000000000002',
  d,
  true,
  '09:00',
  '18:00'
FROM generate_series(1, 6) AS d
ON CONFLICT (staff_id, day_of_week) DO NOTHING;
