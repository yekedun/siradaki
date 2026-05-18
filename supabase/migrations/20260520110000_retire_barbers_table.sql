-- Migration 20260508 (multi_seat_and_admin) barbers tablosundaki UUID'leri staff'a
-- kopyaladı ancak name='Geçiş Personeli', user_id=NULL ve yanlış bir shop_id ile.
-- Asıl display_name, user_id ve shop_id hâlâ barbers tablosundaydı.
-- Bu migration o veriyi doğru şekilde staff'a taşır ve barbers tablosunu kaldırır.

-- ── 1. Gerçek veriyi barbers → staff'a kopyala ───────────────────────────────
-- staff.id = barbers.id (migration 20260508 aynı UUID'leri kullandı)
UPDATE public.staff s
SET
  name    = b.display_name,
  user_id = b.user_id,
  shop_id = b.shop_id      -- migration'ın oluşturduğu 'Varsayılan Dükkan' yerine gerçek shop
FROM public.barbers b
WHERE s.id = b.id;

-- ── 2. Barbers'ta olup staff'a geçmemiş kayıtları ekle ───────────────────────
-- (migration sırasında appointments/blocks'ta görünmeyenler)
INSERT INTO public.staff (id, shop_id, user_id, name, role, is_active, created_at)
SELECT
  b.id,
  b.shop_id,
  b.user_id,
  b.display_name,
  'staff'::public.staff_role,
  b.is_active,
  b.created_at
FROM public.barbers b
WHERE NOT EXISTS (SELECT 1 FROM public.staff s WHERE s.id = b.id)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Migration'ın oluşturduğu sahte 'Varsayılan Dükkan'ı temizle ────────────
-- Yalnızca hiç staff bağlantısı kalmadıysa sil (güvenlik önlemi)
DELETE FROM public.shops
WHERE name = 'Varsayılan Dükkan'
  AND address = 'Mevcut Adres'
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff s
    JOIN public.appointments a ON a.staff_id = s.id
    WHERE s.shop_id = shops.id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.shop_id = shops.id
      AND s.user_id IS NOT NULL
  );

-- ── 4. Slug'ları gerçek isimlerden yeniden üret ───────────────────────────────
-- Önce placeholder slug'ları temizle
UPDATE public.staff
SET slug = NULL
WHERE slug = 'gecis-personeli';

-- Gerçek isimden üret (Türkçe karakterler dahil)
UPDATE public.staff
SET slug = lower(regexp_replace(
  translate(name, 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU'),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL AND name IS NOT NULL AND name != '';

-- Baş/son tire temizliği
UPDATE public.staff
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL AND (slug LIKE '-%' OR slug LIKE '%-');

-- ── 5. Aynı dükkan içinde slug çakışmalarını çöz (-2, -3, …) ─────────────────
WITH ranked AS (
  SELECT
    id,
    slug,
    ROW_NUMBER() OVER (PARTITION BY shop_id, slug ORDER BY created_at) AS rn
  FROM public.staff
  WHERE slug IS NOT NULL
)
UPDATE public.staff s
SET slug = r.slug || '-' || r.rn
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- ── 6. Barbers tablosunun tüm RLS politikalarını kaldır ───────────────────────
DROP POLICY IF EXISTS "barbers_public_read"          ON public.barbers;
DROP POLICY IF EXISTS "barbers_shop_owner_insert"    ON public.barbers;
DROP POLICY IF EXISTS "barbers_shop_owner_update"    ON public.barbers;
DROP POLICY IF EXISTS "barbers_shop_owner_delete"    ON public.barbers;
DROP POLICY IF EXISTS "barbers_self_update"          ON public.barbers;
DROP POLICY IF EXISTS "barbers_owner_or_self_update" ON public.barbers;

-- ── 7. Barbers tablosunu sil ──────────────────────────────────────────────────
DROP TABLE IF EXISTS public.barbers;
