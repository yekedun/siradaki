-- btree_gist: exclusion constraint için gerekli
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── shops ─────────────────────────────────────────────────────────────────────
-- Dükkan: sisteme giren en üst seviye varlık.
-- owner_user_id = dükkan sahibinin auth.users.id'si
CREATE TABLE public.shops (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT        NOT NULL UNIQUE,
  display_name  TEXT        NOT NULL,
  bio           TEXT,
  avatar_url    TEXT,
  timezone      TEXT        NOT NULL DEFAULT 'Europe/Istanbul',
  working_hours JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── barbers ───────────────────────────────────────────────────────────────────
-- Usta: dükkana bağlı çalışan.
-- user_id = NULL iken davet gönderilmiş ama kabul edilmemiş.
-- user_id SET = Supabase auth invite kabul edilmiş, usta giriş yapabilir.
CREATE TABLE public.barbers (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id       UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id       UUID        UNIQUE   REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name  TEXT        NOT NULL,
  avatar_url    TEXT,
  invite_email  TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── services (dükkan düzeyinde) ───────────────────────────────────────────────
-- Hizmetler dükkana aittir; tüm ustalar sunabilir.
CREATE TABLE public.services (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id       UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  duration_min  INTEGER     NOT NULL CHECK (duration_min > 0 AND duration_min <= 480),
  price_cents   INTEGER                CHECK (price_cents >= 0),
  display_order INTEGER     NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── appointments ──────────────────────────────────────────────────────────────
-- Randevu ustaya bağlıdır.
-- Exclusion constraint: AYNI USTA için çakışan randevu engellenir.
-- Farklı ustalar aynı saatte randevu alabilir.
CREATE TABLE public.appointments (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id      UUID        NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  service_id     UUID        REFERENCES public.services(id),
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

-- ── blocks ────────────────────────────────────────────────────────────────────
-- Walk-in / mola / kişisel bloklama — usta bazlı.
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

-- ── widget_tokens (dükkan düzeyinde) ──────────────────────────────────────────
CREATE TABLE public.widget_tokens (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id      UUID        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  token_hash   TEXT        NOT NULL UNIQUE,
  label        TEXT        NOT NULL DEFAULT 'Widget',
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── appointment_slots ─────────────────────────────────────────────────────────
-- Realtime için public-readable mirror; trigger tarafından yönetilir.
CREATE TABLE public.appointment_slots (
  appointment_id UUID        NOT NULL PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  barber_id      UUID        NOT NULL,
  starts_at      TIMESTAMPTZ NOT NULL,
  ends_at        TIMESTAMPTZ NOT NULL
);

-- ── block_slots ───────────────────────────────────────────────────────────────
-- Realtime için public-readable mirror; trigger tarafından yönetilir.
CREATE TABLE public.block_slots (
  block_id  UUID        NOT NULL PRIMARY KEY REFERENCES public.blocks(id) ON DELETE CASCADE,
  barber_id UUID        NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at   TIMESTAMPTZ NOT NULL
);
