-- Ensure every shop owner is also represented as an active bookable staff row.
-- Booking and availability stay staff-based; this only maintains the shop/staff invariant.

CREATE OR REPLACE FUNCTION public.ensure_owner_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_owner_name text;
BEGIN
  v_owner_id := COALESCE(NEW.owner_user_id, NEW.owner_id);

  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_owner_name := COALESCE(NULLIF(NEW.display_name, ''), NULLIF(NEW.name, ''), 'Dukkan Sahibi');

  IF EXISTS (
    SELECT 1
    FROM public.staff st
    WHERE st.shop_id = NEW.id
      AND st.user_id = v_owner_id
  ) THEN
    UPDATE public.staff
    SET
      role = 'admin'::public.staff_role,
      is_active = true
    WHERE shop_id = NEW.id
      AND user_id = v_owner_id;

    RETURN NEW;
  END IF;

  INSERT INTO public.staff (shop_id, user_id, name, role, is_active)
  VALUES (NEW.id, v_owner_id, v_owner_name, 'admin'::public.staff_role, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_ensure_owner_staff ON public.shops;
CREATE TRIGGER shops_ensure_owner_staff
  AFTER INSERT OR UPDATE OF owner_user_id, owner_id, display_name, name ON public.shops
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_owner_staff();

INSERT INTO public.staff (shop_id, user_id, name, role, is_active)
SELECT
  sh.id,
  COALESCE(sh.owner_user_id, sh.owner_id),
  COALESCE(NULLIF(sh.display_name, ''), NULLIF(sh.name, ''), 'Dukkan Sahibi'),
  'admin'::public.staff_role,
  true
FROM public.shops sh
WHERE COALESCE(sh.owner_user_id, sh.owner_id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff st
    WHERE st.shop_id = sh.id
      AND st.user_id = COALESCE(sh.owner_user_id, sh.owner_id)
  );

UPDATE public.staff st
SET
  role = 'admin'::public.staff_role,
  is_active = true
FROM public.shops sh
WHERE st.shop_id = sh.id
  AND st.user_id = COALESCE(sh.owner_user_id, sh.owner_id);
