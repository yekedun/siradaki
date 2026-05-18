-- Add personal slug to staff for shareable booking URLs
-- URL format: /{shop-slug}/u/{staff-slug}
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS slug text;

-- 1. Temel slug üret (index yok, çakışma yaşanmaz)
UPDATE public.staff
SET slug = lower(regexp_replace(
  translate(name, 'çğıöşüÇĞİÖŞÜ', 'cgiosuCGIOSU'),
  '[^a-z0-9]+', '-', 'g'
))
WHERE slug IS NULL AND name IS NOT NULL;

-- 2. Baş/son tire temizle
UPDATE public.staff
SET slug = trim(both '-' from slug)
WHERE slug IS NOT NULL;

-- 3. Tamamen boş kaldıysa NULL yap
UPDATE public.staff
SET slug = NULL
WHERE slug = '';

-- 4. Aynı dükkan içi çakışmaları çöz (-2, -3, …)
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

-- 5. Dedup tamamlandıktan sonra unique index oluştur
CREATE UNIQUE INDEX IF NOT EXISTS staff_shop_slug_uniq
  ON public.staff(shop_id, slug)
  WHERE slug IS NOT NULL;
