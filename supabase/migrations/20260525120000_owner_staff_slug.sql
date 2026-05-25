-- Owner staff kaydına slug ekle
--
-- shops_ensure_owner_staff trigger'ı owner için staff kaydı oluştururken slug
-- set etmiyordu. Bu yüzden dükkan sahiplerinin "Hesabım" ekranında kişisel
-- randevu linki görünmüyordu.
--
-- Bu migration:
-- 1. Trigger fonksiyonunu slug üretecek şekilde günceller
-- 2. Mevcut slug-sız owner staff kayıtlarını backfill eder

-- ── Yardımcı: Türkçe destekli slug üretici ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      lower(translate(
        p_text,
        'çğıöşüÇĞİÖŞÜ',
        'cgiosuCGIOSU'
      )),
      '[^a-z0-9]+', '-', 'g'
    )
  )
$$;

-- ── Trigger fn güncelle ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_owner_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner_id   uuid;
  v_owner_name text;
  v_base_slug  text;
  v_slug       text;
  v_suffix     int := 0;
BEGIN
  v_owner_id := COALESCE(NEW.owner_user_id, NEW.owner_id);

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Owner zaten bu dükkanın staff'ında varsa bir şey yapma
  IF EXISTS (
    SELECT 1
    FROM public.staff st
    WHERE st.shop_id = NEW.id
      AND st.user_id = v_owner_id
  ) THEN
    RETURN NEW;
  END IF;

  v_owner_name := COALESCE(NULLIF(NEW.display_name, ''), NULLIF(NEW.name, ''), 'Dukkan Sahibi');
  v_base_slug  := public.slugify(v_owner_name);

  -- Aynı dükkan içinde çakışma yoksa base slug'ı kullan, varsa -2, -3 ... ekle
  v_slug := v_base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.staff
      WHERE shop_id = NEW.id AND slug = v_slug
    );
    v_suffix := v_suffix + 1;
    v_slug   := v_base_slug || '-' || v_suffix;
  END LOOP;

  INSERT INTO public.staff (shop_id, user_id, name, slug, role, is_active)
  VALUES (NEW.id, v_owner_id, v_owner_name, v_slug, 'admin'::public.staff_role, true);

  RETURN NEW;
END;
$$;

-- ── Backfill: slug'sız owner staff kayıtları ─────────────────────────────────
-- Mevcut kayıtlar için slug üret (çakışma varsa -2, -3 ekle)
DO $$
DECLARE
  r       record;
  v_base  text;
  v_slug  text;
  v_sfx   int;
BEGIN
  FOR r IN
    SELECT st.id, st.shop_id, st.name
    FROM   public.staff st
    JOIN   public.shops sh ON sh.id = st.shop_id
    WHERE  st.slug IS NULL
      AND  st.name IS NOT NULL
      AND  st.user_id = sh.owner_user_id
  LOOP
    v_base := public.slugify(r.name);
    v_slug := v_base;
    v_sfx  := 0;

    LOOP
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM public.staff
        WHERE shop_id = r.shop_id AND slug = v_slug
      );
      v_sfx  := v_sfx + 1;
      v_slug := v_base || '-' || v_sfx;
    END LOOP;

    UPDATE public.staff SET slug = v_slug WHERE id = r.id;
  END LOOP;
END;
$$;
