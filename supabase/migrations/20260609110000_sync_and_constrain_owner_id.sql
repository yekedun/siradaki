-- shops.owner_id (20260508'de eklendi) ve shops.owner_user_id (orijinal, NOT NULL)
-- farklı migration yollarında yazılmış olabilir.
-- register-shop edge fn yalnızca owner_user_id'yi set eder → yeni dükkanlar
-- owner_id=NULL ile kalır.
--
-- Strateji:
--   1. Mevcut NULL satırları backfill et
--   2. Veri uyuşmazlığı varsa migration'ı durdur
--   3. BEFORE INSERT OR UPDATE trigger'ı ile owner_id'yi owner_user_id'ye
--      otomatik sync et — edge fn kodu değiştirmeden her zaman eşit kalır
--   4. CHECK kısıtı: NULL veya eşit (NULL = geçici trigger öncesi durum için)

-- 1. Yeni dükkanlar: owner_id NULL → owner_user_id ile doldur
UPDATE public.shops
SET owner_id = owner_user_id
WHERE owner_id IS NULL;

-- 2. Veri tutarlılığını doğrula; uyuşmazlık varsa migration dursun
DO $$
DECLARE
  v_mismatch integer;
BEGIN
  SELECT COUNT(*) INTO v_mismatch
  FROM public.shops
  WHERE owner_id IS NOT NULL AND owner_id <> owner_user_id;

  IF v_mismatch > 0 THEN
    RAISE EXCEPTION
      'shops.owner_id ve owner_user_id % satırda uyuşmuyor — migration iptal',
      v_mismatch;
  END IF;
END;
$$;

-- 3. Otomatik sync trigger: register-shop gibi edge fn'ler owner_id set etmese
--    de, INSERT/UPDATE anında owner_id = owner_user_id olarak yazılır.
CREATE OR REPLACE FUNCTION public.sync_shops_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.owner_id := NEW.owner_user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_sync_owner_id ON public.shops;
CREATE TRIGGER shops_sync_owner_id
BEFORE INSERT OR UPDATE OF owner_user_id ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.sync_shops_owner_id();

-- 4. Guard: NULL ise henüz sync edilmemiş; eşit değilse veri hatası
ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_owner_ids_match;

ALTER TABLE public.shops
  ADD CONSTRAINT shops_owner_ids_match
  CHECK (owner_id IS NULL OR owner_id = owner_user_id);
