-- ── Müşteri uygulaması — gerçek remote şemasına uyumlu ────────────────────────
-- Remote şeması: barbers.slug = dükkan kimliği, shops tablosu YOK
-- Bu migration mevcut veriyi bozmadan sadece ekleme yapar.

-- 1. Berber gruplama: aynı fiziksel dükkanı paylaşan ustalar aynı shop_slug alır.
--    Mevcut her berber başlangıçta kendi slug'ını shop_slug olarak kullanır.
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS shop_slug TEXT;

UPDATE public.barbers SET shop_slug = slug WHERE shop_slug IS NULL;

-- is_active kolonu ekle (yoksa)
ALTER TABLE public.barbers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Müşteri auth bağlantısı
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_customer
  ON public.appointments(customer_user_id);

-- 3. Müşteri profil tablosu
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  user_id    UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL DEFAULT '',
  phone      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_profiles_own_read"   ON public.customer_profiles
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "customer_profiles_own_insert" ON public.customer_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "customer_profiles_own_update" ON public.customer_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- 4. Randevu RLS: müşteri sadece kendi randevularını okuyabilir
CREATE POLICY "appointments_customer_select" ON public.appointments
  FOR SELECT USING (customer_user_id = auth.uid());

-- 5. Randevu RLS: müşteri onaylı+gelecekteki randevusunu iptal edebilir
CREATE POLICY "appointments_customer_cancel" ON public.appointments
  FOR UPDATE
  USING (
    customer_user_id = auth.uid()
    AND status = 'confirmed'
    AND starts_at > now()
  )
  WITH CHECK (status = 'cancelled');

-- 6. Barbers public read (müşteri usta listesi için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'barbers' AND policyname = 'barbers_public_read'
  ) THEN
    CREATE POLICY "barbers_public_read" ON public.barbers
      FOR SELECT USING (true);
  END IF;
END $$;

-- Services public read (müşteri hizmet listesi için)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'services' AND policyname = 'services_public_read_active'
  ) THEN
    CREATE POLICY "services_public_read_active" ON public.services
      FOR SELECT USING (is_active = true);
  END IF;
END $$;
