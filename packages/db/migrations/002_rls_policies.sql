alter table public.barbers           enable row level security;
alter table public.services          enable row level security;
alter table public.appointments      enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.blocks            enable row level security;
alter table public.widget_tokens     enable row level security;

-- ── BARBERS ──────────────────────────────────
create policy "public can read barbers"
  on public.barbers for select using (true);

create policy "barber can update own profile"
  on public.barbers for update
  using (auth.uid() = auth_user_id);

create policy "barber can insert own profile"
  on public.barbers for insert
  with check (auth.uid() = auth_user_id);

-- ── SERVICES ─────────────────────────────────
create policy "public can read active services"
  on public.services for select using (is_active = true);

create policy "barber manages own services"
  on public.services for all
  using (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  )
  with check (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  );

-- ── APPOINTMENTS ─────────────────────────────
-- Barber reads/updates own appointments; customers insert via edge function (service role)
create policy "barber reads own appointments"
  on public.appointments for select
  using (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  );

create policy "barber updates own appointments"
  on public.appointments for update
  using (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  );

-- ── APPOINTMENT_SLOTS (anon-readable mirror) ─────────────
-- Public read for availability + realtime; trigger-only inserts (no direct write policy)
create policy "public can read appointment slots"
  on public.appointment_slots for select using (true);

-- ── BLOCKS ───────────────────────────────────
create policy "public can read block times"
  on public.blocks for select using (true);

create policy "barber manages own blocks"
  on public.blocks for all
  using (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  )
  with check (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  );

-- ── WIDGET TOKENS ─────────────────────────────
create policy "barber manages own widget tokens"
  on public.widget_tokens for all
  using (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  )
  with check (
    barber_id = (select id from public.barbers where auth_user_id = auth.uid())
  );
