-- Auto-update updated_at on barbers
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger barbers_updated_at
  before update on public.barbers
  for each row execute function public.handle_updated_at();

-- ─────────────────────────────────────────────
-- get_occupied_ranges: returns all occupied time ranges for a barber on a date
-- Used by edge functions to calculate availability
-- ─────────────────────────────────────────────
create or replace function public.get_occupied_ranges(
  p_barber_id uuid,
  p_date      date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer as $$
  select starts_at, ends_at
  from public.appointments
  where barber_id = p_barber_id
    and status = 'confirmed'
    and starts_at::date = p_date
  union all
  select starts_at, ends_at
  from public.blocks
  where barber_id = p_barber_id
    and starts_at::date = p_date
  order by starts_at;
$$;

-- Allow anon to call this function (needed for availability check on booking page)
grant execute on function public.get_occupied_ranges to anon, authenticated;

-- ─────────────────────────────────────────────
-- appointment_slots sync trigger
-- appointments INSERT/UPDATE/DELETE → appointment_slots'a yansıt
-- Sadece status='confirmed' satırlar gösterilir
-- ─────────────────────────────────────────────
create or replace function public.sync_appointment_slots()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.appointment_slots where appointment_id = old.id;
    return old;
  end if;

  -- INSERT veya UPDATE
  if (new.status = 'confirmed') then
    insert into public.appointment_slots (appointment_id, barber_id, starts_at, ends_at)
    values (new.id, new.barber_id, new.starts_at, new.ends_at)
    on conflict (appointment_id) do update
      set barber_id = excluded.barber_id,
          starts_at = excluded.starts_at,
          ends_at   = excluded.ends_at;
  else
    -- cancelled/completed → mirror'dan kaldır (artık dolu sayılmaz)
    delete from public.appointment_slots where appointment_id = new.id;
  end if;

  return new;
end;
$$;

create trigger appointments_sync_slots
  after insert or update or delete on public.appointments
  for each row execute function public.sync_appointment_slots();
