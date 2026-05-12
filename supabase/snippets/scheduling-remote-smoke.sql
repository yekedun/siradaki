begin;

create temp table scheduling_remote_smoke_ids (
  owner_id uuid not null,
  customer_id uuid not null,
  shop_id uuid not null,
  staff_id uuid not null,
  service_id uuid not null
) on commit drop;

insert into scheduling_remote_smoke_ids values (
  '00000000-0000-4000-8000-200000000001',
  '00000000-0000-4000-8000-200000000002',
  '00000000-0000-4000-8000-200000000101',
  '00000000-0000-4000-8000-200000000201',
  '00000000-0000-4000-8000-200000000301'
);

do $$
declare
  ids scheduling_remote_smoke_ids%rowtype;
  v_original_id uuid;
  v_rebook_id uuid;
  v_conflict boolean;
  v_count int;
begin
  select * into ids from scheduling_remote_smoke_ids;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    ids.owner_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'remote-smoke-owner@example.test',
    crypt('remote-smoke', gen_salt('bf')),
    now(), now(), now(),
    '{}'::jsonb,
    '{}'::jsonb
  ) on conflict (id) do nothing;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
  ) values (
    ids.customer_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'remote-smoke-customer@example.test',
    crypt('remote-smoke', gen_salt('bf')),
    now(), now(), now(),
    '{}'::jsonb,
    '{}'::jsonb
  ) on conflict (id) do nothing;

  insert into public.shops (
    id, owner_user_id, owner_id, slug, display_name, name, timezone, working_hours
  ) values (
    ids.shop_id,
    ids.owner_id,
    ids.owner_id,
    'test-berber-smoke',
    'Test Berber Smoke',
    'Test Berber Smoke',
    'Europe/Istanbul',
    '{
      "mon": {"open": "09:00", "close": "19:00", "enabled": true},
      "tue": {"open": "09:00", "close": "19:00", "enabled": true},
      "wed": {"open": "09:00", "close": "19:00", "enabled": true},
      "thu": {"open": "09:00", "close": "19:00", "enabled": true},
      "fri": {"open": "09:00", "close": "19:00", "enabled": true},
      "sat": {"open": "09:00", "close": "17:00", "enabled": true},
      "sun": {"open": null, "close": null, "enabled": false}
    }'::jsonb
  )
  on conflict (id) do update set
    working_hours = excluded.working_hours,
    slug = excluded.slug,
    display_name = excluded.display_name,
    name = excluded.name;

  insert into public.staff (id, shop_id, user_id, name, role, is_active)
  values (
    ids.staff_id,
    ids.shop_id,
    null,
    'Remote Smoke Staff',
    'staff'::public.staff_role,
    true
  )
  on conflict (id) do update set
    shop_id = excluded.shop_id,
    is_active = true;

  insert into public.services (id, shop_id, name, duration_min, price_cents, display_order, is_active)
  values (
    ids.service_id,
    ids.shop_id,
    'Remote Smoke 30',
    30,
    3000,
    1,
    true
  )
  on conflict (id) do update set
    shop_id = excluded.shop_id,
    duration_min = excluded.duration_min,
    is_active = true;

  insert into public.staff_schedules (
    staff_id, day_of_week, is_working, work_start, work_end, break_start, break_end
  ) values (
    ids.staff_id,
    1,
    true,
    '09:00',
    '18:00',
    '12:00',
    '12:30'
  )
  on conflict (staff_id, day_of_week) do update set
    is_working = excluded.is_working,
    work_start = excluded.work_start,
    work_end = excluded.work_end,
    break_start = excluded.break_start,
    break_end = excluded.break_end;

  delete from public.appointments where staff_id = ids.staff_id;
  delete from public.blocks where staff_id = ids.staff_id;

  perform public.create_appointment_atomic(
    'test-berber-smoke',
    null,
    ids.service_id,
    ids.staff_id,
    '2026-05-18 10:00 Europe/Istanbul',
    'Remote Smoke Original',
    null,
    null,
    ids.customer_id
  );

  select id into v_original_id
  from public.appointments
  where staff_id = ids.staff_id
    and customer_name = 'Remote Smoke Original'
  order by created_at desc
  limit 1;

  perform public.update_appointment_atomic(
    v_original_id,
    ids.staff_id,
    ids.service_id,
    '2026-05-18 10:15 Europe/Istanbul',
    'Remote Smoke Updated',
    null,
    null
  );

  if not exists (
    select 1
    from public.appointments
    where id = v_original_id
      and starts_at = '2026-05-18 10:15 Europe/Istanbul'
      and customer_name = 'Remote Smoke Updated'
      and status = 'confirmed'
  ) then
    raise exception 'remote smoke update_appointment_atomic did not update its own row';
  end if;

  perform public.create_appointment_atomic(
    'test-berber-smoke',
    null,
    ids.service_id,
    ids.staff_id,
    '2026-05-18 11:00 Europe/Istanbul',
    'Remote Smoke Cancelled',
    null,
    null,
    ids.customer_id
  );

  update public.appointments
     set status = 'cancelled'
   where staff_id = ids.staff_id
     and customer_name = 'Remote Smoke Cancelled';

  perform public.create_appointment_atomic(
    'test-berber-smoke',
    null,
    ids.service_id,
    ids.staff_id,
    '2026-05-18 11:00 Europe/Istanbul',
    'Remote Smoke Rebooked',
    null,
    null,
    ids.customer_id
  );

  select id into v_rebook_id
  from public.appointments
  where staff_id = ids.staff_id
    and customer_name = 'Remote Smoke Rebooked'
  order by created_at desc
  limit 1;

  begin
    perform public.create_appointment_atomic(
      'test-berber-smoke',
      null,
      ids.service_id,
      ids.staff_id,
      '2026-05-18 10:15 Europe/Istanbul',
      'Remote Smoke Conflict',
      null,
      null,
      ids.customer_id
    );
    raise exception 'remote smoke overlapping booking unexpectedly succeeded';
  exception
    when sqlstate 'P0001' then null;
  end;

  select public.schedule_has_conflict(
    ids.staff_id,
    '2026-05-18 10:15 Europe/Istanbul',
    '2026-05-18 10:45 Europe/Istanbul',
    v_original_id,
    null
  ) into v_conflict;

  if v_conflict then
    raise exception 'remote smoke ignore appointment id still reported a self-conflict';
  end if;

  select count(*) into v_count
  from public.appointment_slots aps
  join public.appointments a on a.id = aps.appointment_id
  where a.staff_id = ids.staff_id
    and a.status = 'confirmed';

  if v_count <> 2 then
    raise exception 'remote smoke expected two confirmed mirror rows, got %', v_count;
  end if;

  if exists (
    select 1
    from public.appointment_slots aps
    join public.appointments a on a.id = aps.appointment_id
    where a.staff_id = ids.staff_id
      and a.status <> 'confirmed'
  ) then
    raise exception 'remote smoke mirror retained a non-confirmed appointment';
  end if;

  delete from public.appointments where id in (v_original_id, v_rebook_id);

  if exists (
    select 1
    from public.appointment_slots
    where appointment_id in (v_original_id, v_rebook_id)
  ) then
    raise exception 'remote smoke cleanup left appointment_slots rows behind';
  end if;

  delete from public.appointments where staff_id = ids.staff_id;
  delete from public.blocks where staff_id = ids.staff_id;
  delete from public.staff_schedules where staff_id = ids.staff_id;
  delete from public.services where id = ids.service_id;
  delete from public.staff where id = ids.staff_id;
  delete from public.shops where id = ids.shop_id;
end
$$;

rollback;

select 'scheduling-remote-smoke-ok' as result;
