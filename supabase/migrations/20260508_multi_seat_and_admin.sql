-- 1. Yeni Tablo Hiyerarşisini Kur

-- shops (Dükkanlar) tablosu
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS address text;

-- staff_role enum oluşturma
DO $$ BEGIN
    CREATE TYPE public.staff_role AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- staff (Personel/Koltuk) tablosu
CREATE TABLE IF NOT EXISTS public.staff (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  role public.staff_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 1.5. Veri Kaybını Önleme (Data Migration)
-- ALTER işlemlerinden önce mevcut barber_id'leri staff tablosuna taşıyarak veri bütünlüğünü sağlama
DO $$
DECLARE
  v_default_shop_id uuid;
  v_owner_id uuid;
BEGIN
  -- Mevcut sistemden (varsa) ilk kullanıcıyı admin/owner olarak seç
  SELECT id INTO v_owner_id FROM auth.users ORDER BY created_at LIMIT 1;
  
  IF v_owner_id IS NOT NULL THEN
    -- Varsayılan dükkanı oluştur
    INSERT INTO public.shops (owner_id, name, address)
    VALUES (v_owner_id, 'Varsayılan Dükkan', 'Mevcut Adres')
    RETURNING id INTO v_default_shop_id;
    
    -- Appointments tablosundaki mevcut barber_id'leri staff olarak ekle
    INSERT INTO public.staff (id, shop_id, user_id, name, role)
    SELECT DISTINCT barber_id, v_default_shop_id, NULL, 'Geçiş Personeli', 'staff'::public.staff_role
    FROM public.appointments
    ON CONFLICT (id) DO NOTHING;

    -- Blocks tablosundaki mevcut barber_id'leri (eğer appointments'da yoksa) staff olarak ekle
    INSERT INTO public.staff (id, shop_id, user_id, name, role)
    SELECT DISTINCT barber_id, v_default_shop_id, NULL, 'Geçiş Personeli', 'staff'::public.staff_role
    FROM public.blocks
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 2. Mevcut appointments ve blocks tablolarındaki referansları kaldırma
-- Appointments
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE public.appointments RENAME COLUMN barber_id TO staff_id;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_barber_id_fkey;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_staff_id_fkey 
  FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- Blocks
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_no_overlap;
ALTER TABLE public.blocks RENAME COLUMN barber_id TO staff_id;
ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_barber_id_fkey;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_staff_id_fkey 
  FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- Appointment_slots (Ayna Tablo)
ALTER TABLE public.appointment_slots RENAME COLUMN barber_id TO staff_id;
ALTER TABLE public.appointment_slots DROP CONSTRAINT IF EXISTS appointment_slots_barber_id_fkey;
ALTER TABLE public.appointment_slots ADD CONSTRAINT appointment_slots_staff_id_fkey 
  FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

-- Trigger'ın staff_id kullanacak şekilde güncellenmesi
CREATE OR REPLACE FUNCTION public.sync_appointment_slots()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.appointment_slots WHERE appointment_id = OLD.id;
    RETURN OLD;
  END IF;

  IF (NEW.status = 'confirmed') THEN
    INSERT INTO public.appointment_slots (appointment_id, staff_id, starts_at, ends_at)
    VALUES (NEW.id, NEW.staff_id, NEW.starts_at, NEW.ends_at)
    ON CONFLICT (appointment_id) DO UPDATE
      SET staff_id  = EXCLUDED.staff_id,
          starts_at = EXCLUDED.starts_at,
          ends_at   = EXCLUDED.ends_at;
  ELSE
    DELETE FROM public.appointment_slots WHERE appointment_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Eksik Trigger Bağlantısı (appointments_sync_slots)
DROP TRIGGER IF EXISTS appointments_sync_slots ON public.appointments;
CREATE TRIGGER appointments_sync_slots
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_slots();

-- Fonksiyonun da barber_id yerine staff_id kullanması için güncellenmesi
DROP FUNCTION IF EXISTS public.get_occupied_ranges(uuid, date);
DROP FUNCTION IF EXISTS public.get_occupied_ranges(text, date);
DROP FUNCTION IF EXISTS public.get_occupied_ranges(uuid, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_occupied_ranges(
  p_staff_id uuid,
  p_date      date
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT starts_at, ends_at
  FROM public.appointments
  WHERE staff_id = p_staff_id
    AND status = 'confirmed'
    AND starts_at >= p_date::timestamptz
    AND starts_at <  (p_date + 1)::timestamptz
  UNION ALL
  SELECT starts_at, ends_at
  FROM public.blocks
  WHERE staff_id = p_staff_id
    AND starts_at >= p_date::timestamptz
    AND starts_at <  (p_date + 1)::timestamptz
  ORDER BY starts_at;
$$;
GRANT EXECUTE ON FUNCTION public.get_occupied_ranges(uuid, date) TO anon, authenticated;


-- 3. GIST Kısıtlamasını Güncelle (Yeni Kurallar)
-- Sadece aynı personele aynı saatte çakışan randevu/blok oluşturulmasını engeller.
ALTER TABLE public.appointments ADD CONSTRAINT appointments_no_overlap 
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed');

ALTER TABLE public.blocks ADD CONSTRAINT blocks_no_overlap 
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
);


-- 4. RLS (Row Level Security) Politikalarını Ayarla

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Eski barber_id bazlı politikaların temizlenmesi (Önlem amaçlı)
DROP POLICY IF EXISTS "barber_own_appointments_select" ON public.appointments;
DROP POLICY IF EXISTS "barber_own_appointments_insert" ON public.appointments;
DROP POLICY IF EXISTS "barber_own_appointments_update" ON public.appointments;
DROP POLICY IF EXISTS "barber_own_appointments_delete" ON public.appointments;
DROP POLICY IF EXISTS "barber_own_blocks_select" ON public.blocks;
DROP POLICY IF EXISTS "barber_own_blocks_insert" ON public.blocks;
DROP POLICY IF EXISTS "barber_own_blocks_update" ON public.blocks;
DROP POLICY IF EXISTS "barber_own_blocks_delete" ON public.blocks;

-- Admin Policy: shops.owner_id ile eşleşen kullanıcı, dükkana ait tüm randevuları okuyabilir/yazabilir
CREATE POLICY "admin_all_appointments" ON public.appointments
FOR ALL USING (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = auth.uid()
  )
);

-- Staff Policy: Yalnızca kendi user_id'sine eşit olan staff_id'nin randevularını okuyabilir/yazabilir
CREATE POLICY "staff_own_appointments" ON public.appointments
FOR ALL USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- Admin Policy: shops.owner_id ile eşleşen kullanıcı, dükkana ait tüm blokları okuyabilir/yazabilir
CREATE POLICY "admin_all_blocks" ON public.blocks
FOR ALL USING (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = auth.uid()
  )
);

-- Staff Policy: Yalnızca kendi user_id'sine eşit olan staff_id'nin bloklarını okuyabilir/yazabilir
CREATE POLICY "staff_own_blocks" ON public.blocks
FOR ALL USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);
