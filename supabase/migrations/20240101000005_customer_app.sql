-- ── Customer app: müşteri kimliği + profil tablosu ──────────────────────────

-- 1. Randevulara müşteri auth bağlantısı (nullable → mevcut kayıtlar etkilenmez)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_customer
  ON public.appointments(customer_user_id);

-- 2. Müşteri profil tablosu
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL DEFAULT '',
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_profiles_own_read" ON public.customer_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "customer_profiles_own_insert" ON public.customer_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_profiles_own_update" ON public.customer_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- 3. Randevu RLS: müşteri kendi randevularını görebilir
CREATE POLICY "appointments_customer_select" ON public.appointments
  FOR SELECT USING (customer_user_id = auth.uid());

-- 4. Randevu RLS: müşteri sadece onaylı + gelecekteki randevusunu iptal edebilir
CREATE POLICY "appointments_customer_cancel" ON public.appointments
  FOR UPDATE
  USING (
    customer_user_id = auth.uid()
    AND status = 'confirmed'
    AND starts_at > now()
  )
  WITH CHECK (status = 'cancelled');
