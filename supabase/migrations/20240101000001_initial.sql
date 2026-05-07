-- btree_gist: appointment exclusion constraint için gerekli
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- barbers
CREATE TABLE public.barbers (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT        NOT NULL UNIQUE,
  display_name  TEXT        NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  timezone      TEXT        NOT NULL DEFAULT 'Europe/Istanbul',
  working_hours JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- services
CREATE TABLE public.services (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id     UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  duration_min  INTEGER     NOT NULL CHECK (duration_min > 0 AND duration_min <= 480),
  price_cents   INTEGER                CHECK (price_cents >= 0),
  display_order INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- appointments (exclusion constraint: aynı berber için çakışan randevu yok)
CREATE TABLE public.appointments (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id      UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id     UUID        NOT NULL REFERENCES public.services(id),
  customer_name  TEXT        NOT NULL CHECK (char_length(customer_name) >= 2),
  customer_phone TEXT,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  status         TEXT        NOT NULL DEFAULT 'confirmed'
                               CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  EXCLUDE USING gist (
    barber_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

-- blocks (walk-in / manuel bloklar)
CREATE TABLE public.blocks (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id   UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL CHECK (ends_at > starts_at),
  reason      TEXT        NOT NULL DEFAULT 'walkin'
                            CHECK (reason IN ('walkin', 'break', 'personal')),
  created_via TEXT        NOT NULL DEFAULT 'app'
                            CHECK (created_via IN ('widget', 'app', 'web')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- widget_tokens
CREATE TABLE public.widget_tokens (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id    UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  label        TEXT        NOT NULL DEFAULT 'Widget',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- appointment_slots: Realtime için mirror tablo (trigger tarafından yönetilir, doğrudan yazılmaz)
CREATE TABLE public.appointment_slots (
  appointment_id UUID        NOT NULL PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  barber_id      UUID        NOT NULL,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL
);
