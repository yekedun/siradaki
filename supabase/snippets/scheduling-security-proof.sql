-- Proof cases for scheduling RPC authorization hardening.
-- Run against a disposable local database after `supabase db reset`.

begin;

do $$
declare
  owner_a uuid := '11111111-1111-4111-8111-111111111111';
  owner_b uuid := '22222222-2222-4222-8222-222222222222';
  attacker uuid := '33333333-3333-4333-8333-333333333333';
  shop_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  shop_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  staff_a uuid := 'aaaaaaaa-0001-4000-8000-000000000001';
  staff_b uuid := 'bbbbbbbb-0001-4000-8000-000000000001';
  service_a uuid := 'aaaaaaaa-0002-4000-8000-000000000002';
  service_b uuid := 'bbbbbbbb-0002-4000-8000-000000000002';
  appt_a uuid := 'aaaaaaaa-0003-4000-8000-000000000003';
  cancelled_appt uuid := 'aaaaaaaa-0004-4000-8000-000000000004';
  completed_appt uuid := 'aaaaaaaa-0005-4000-8000-000000000005';
  confirmed_appt uuid := 'aaaaaaaa-0006-4000-8000-000000000006';
begin
  insert into auth.users (id, aud, role, email, email_confirmed_at, created_at, updated_at)
  values
    (owner_a, 'authenticated', 'authenticated', 'owner-a@example.test', now(), now(), now()),
    (owner_b, 'authenticated', 'authenticated', 'owner-b@example.test', now(), now(), now()),
    (attacker, 'authenticated', 'authenticated', 'attacker@example.test', now(), now(), now());

  insert into public.shops (id, owner_user_id, slug, display_name, timezone, working_hours, commission_enabled)
  values
    (shop_a, owner_a, 'proof-shop-a', 'Proof Shop A', 'Europe/Istanbul', '{}'::jsonb, true),
    (shop_b, owner_b, 'proof-shop-b', 'Proof Shop B', 'Europe/Istanbul', '{}'::jsonb, true);

  insert into public.staff (id, shop_id, user_id, name, role, is_active, commission_type, commission_rate_bps)
  values
    (staff_a, shop_a, owner_a, 'Owner A', 'admin', true, 'percentage', 1000),
    (staff_b, shop_b, owner_b, 'Owner B', 'admin', true, 'percentage', 1000);

  insert into public.services (id, shop_id, name, duration_min, price_cents, display_order, is_active)
  values
    (service_a, shop_a, 'Proof Service A', 30, 10000, 1, true),
    (service_b, shop_b, 'Proof Service B', 30, 10000, 1, true);

  insert into public.appointments (
    id, staff_id, service_id, customer_name, starts_at, ends_at, status,
    completed_price_cents, completed_commission_type, completed_commission_rate_bps,
    completed_commission_cents, completed_shop_share_cents
  )
  values
    (appt_a, staff_a, service_a, 'Proof Customer', '2026-06-01 09:00+03', '2026-06-01 09:30+03', 'confirmed', null, null, null, null, null),
    (cancelled_appt, staff_a, service_a, 'Cancelled Customer', '2026-06-01 10:00+03', '2026-06-01 10:30+03', 'cancelled', null, null, null, null, null),
    (completed_appt, staff_a, service_a, 'Completed Customer', '2026-05-01 09:00+03', '2026-05-01 09:30+03', 'completed', 10000, 'percentage', 1000, 1000, 9000),
    (confirmed_appt, staff_a, service_a, 'Complete Bypass Customer', '2026-06-01 11:00+03', '2026-06-01 11:30+03', 'confirmed', null, null, null, null, null);

  insert into public.blocks (staff_id, starts_at, ends_at, reason, created_via)
  values (staff_a, '2026-06-01 10:00+03', '2026-06-01 10:30+03', 'walkin', 'app');
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

do $$
begin
  begin
    perform public.create_appointment_atomic(
      p_shop_id := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_service_id := 'aaaaaaaa-0002-4000-8000-000000000002',
      p_staff_id := 'aaaaaaaa-0001-4000-8000-000000000001',
      p_starts_at := '2026-06-01 12:00+03',
      p_customer_name := 'Attacker'
    );
    raise exception 'attacker create_appointment_atomic unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.update_appointment_atomic(
      'aaaaaaaa-0003-4000-8000-000000000003',
      'aaaaaaaa-0001-4000-8000-000000000001',
      'aaaaaaaa-0002-4000-8000-000000000002',
      '2026-06-01 12:30+03',
      'Attacker'
    );
    raise exception 'attacker update_appointment_atomic unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.create_block_atomic(
      'aaaaaaaa-0001-4000-8000-000000000001',
      '2026-06-01 13:00+03',
      '2026-06-01 13:30+03',
      'walkin',
      'app'
    );
    raise exception 'attacker create_block_atomic unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.complete_appointment_with_revenue('aaaaaaaa-0005-4000-8000-000000000005', null);
    raise exception 'attacker complete_appointment_with_revenue unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

do $$
begin
  begin
    update public.appointments
       set status = 'confirmed'
     where id = 'aaaaaaaa-0004-4000-8000-000000000004';
    raise exception 'direct cancelled restore unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.appointments
       set status = 'completed'
     where id = 'aaaaaaaa-0006-4000-8000-000000000006';
    raise exception 'direct completed status update unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end $$;

reset role;

rollback;
