-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

-- ─────────────────────────────────────────────
-- BARBERS
-- ─────────────────────────────────────────────
create table public.barbers (
  id           uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  slug         text unique not null,
  display_name text not null,
  bio          text,
  avatar_url   text,
  timezone     text not null default 'Europe/Istanbul',
  working_hours jsonb not null default '{
    "mon": {"open": "09:00", "close": "19:00", "enabled": true},
    "tue": {"open": "09:00", "close": "19:00", "enabled": true},
    "wed": {"open": "09:00", "close": "19:00", "enabled": true},
    "thu": {"open": "09:00", "close": "19:00", "enabled": true},
    "fri": {"open": "09:00", "close": "19:00", "enabled": true},
    "sat": {"open": "09:00", "close": "17:00", "enabled": true},
    "sun": {"open": null, "close": null, "enabled": false}
  }'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- SERVICES
-- ─────────────────────────────────────────────
create table public.services (
  id            uuid primary key default uuid_generate_v4(),
  barber_id     uuid not null references public.barbers(id) on delete cascade,
  name          text not null,
  duration_min  integer not null check (duration_min > 0),
  price_cents   integer check (price_cents >= 0),
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index on public.services (barber_id, display_order);

-- ─────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────
create table public.appointments (
  id             uuid primary key default uuid_generate_v4(),
  barber_id      uuid not null references public.barbers(id) on delete cascade,
  service_id     uuid not null references public.services(id),
  customer_name  text not null,
  customer_phone text,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         text not null default 'confirmed'
                   check (status in ('confirmed', 'cancelled', 'completed')),
  notes          text,
  created_at     timestamptz not null default now(),
  constraint appointments_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);

create index on public.appointments (barber_id, starts_at);

-- ─────────────────────────────────────────────
-- BLOCKS  (walk-in / manual blocks)
-- ─────────────────────────────────────────────
create table public.blocks (
  id          uuid primary key default uuid_generate_v4(),
  barber_id   uuid not null references public.barbers(id) on delete cascade,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  reason      text not null default 'walkin'
                check (reason in ('walkin', 'break', 'personal')),
  created_via text not null default 'widget'
                check (created_via in ('widget', 'app', 'web')),
  created_at  timestamptz not null default now(),
  constraint blocks_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

create index on public.blocks (barber_id, starts_at);

-- ─────────────────────────────────────────────
-- WIDGET TOKENS
-- ─────────────────────────────────────────────
create table public.widget_tokens (
  id           uuid primary key default uuid_generate_v4(),
  barber_id    uuid not null references public.barbers(id) on delete cascade,
  token_hash   text unique not null,
  label        text not null default 'Telefon Widget',
  last_used_at timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- appointment_slots TABLE  (anon-safe mirror, for realtime subscriptions)
--
-- VIEW kullanılamaz: Realtime postgres_changes RLS'i altındaki tablodan
-- değerlendirir; appointments tablosunda "barber-only" RLS olduğundan
-- anon client'lar event almazdı. Bu yüzden ayrı bir mirror tablo + trigger.
--
-- Sadece (barber_id, starts_at, ends_at) sızdırır — müşteri isim/telefon görmez.
-- ─────────────────────────────────────────────
create table public.appointment_slots (
  appointment_id uuid primary key references public.appointments(id) on delete cascade,
  barber_id      uuid not null references public.barbers(id) on delete cascade,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null
);

create index on public.appointment_slots (barber_id, starts_at);

-- Enable Realtime on tables that need it
alter publication supabase_realtime add table public.blocks;
alter publication supabase_realtime add table public.appointment_slots;
