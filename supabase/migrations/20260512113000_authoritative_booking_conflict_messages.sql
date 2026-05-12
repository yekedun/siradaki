-- Clarify authoritative scheduling errors without weakening existing locks or
-- exclusion constraints. The write path remains create_appointment_atomic /
-- create_block_atomic under the same transaction-safe strategy.

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_shop_slug text DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL,
  p_customer_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.shops%ROWTYPE;
  v_service public.services%ROWTYPE;
  v_staff_id uuid;
  v_ends_at timestamptz;
  v_appointment_id uuid;
  v_staff_name text;
BEGIN
  IF p_service_id IS NULL OR p_starts_at IS NULL OR trim(COALESCE(p_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'Eksik randevu bilgisi' USING ERRCODE = '22023';
  END IF;
  IF char_length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Isim en az 2 karakter olmali' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_shop
  FROM public.shops
  WHERE (p_shop_id IS NOT NULL AND id = p_shop_id)
     OR (p_shop_id IS NULL AND slug = p_shop_slug)
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dukkan bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
    AND shop_id = v_shop.id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hizmet bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);

  IF p_staff_id IS NULL THEN
    v_staff_id := public.assign_any_staff(v_shop.id, p_starts_at, v_ends_at);
    IF v_staff_id IS NULL THEN
      RAISE EXCEPTION 'Secilen saatte musait personel yok' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT s.id INTO v_staff_id
    FROM public.staff s
    WHERE s.id = p_staff_id
      AND s.shop_id = v_shop.id
      AND s.is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Personel bulunamadi' USING ERRCODE = 'P0002';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_staff_id::text));

    IF NOT public.staff_is_inside_work_window(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Secilen saat personelin calisma saati veya mola araligi disinda' USING ERRCODE = 'P0001';
    END IF;

    IF public.schedule_has_conflict(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Secilen saat dolu; cakisan randevu veya manuel blok var' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.appointments (
    staff_id, service_id, customer_name, customer_phone, customer_notes,
    customer_user_id, starts_at, ends_at, status
  )
  VALUES (
    v_staff_id, v_service.id, trim(p_customer_name), nullif(trim(COALESCE(p_customer_phone, '')), ''),
    nullif(trim(COALESCE(p_customer_notes, '')), ''), p_customer_user_id,
    p_starts_at, v_ends_at, 'confirmed'
  )
  RETURNING id INTO v_appointment_id;

  SELECT name INTO v_staff_name FROM public.staff WHERE id = v_staff_id;

  RETURN json_build_object(
    'appointment_id', v_appointment_id,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'staff_id', v_staff_id,
    'staff_name', COALESCE(v_staff_name, ''),
    'barber_display_name', COALESCE(v_staff_name, ''),
    'service_name', v_service.name
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Secilen saat dolu; cakisan randevu veya manuel blok var' USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_block_atomic(
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text DEFAULT 'walkin',
  p_created_via text DEFAULT 'app'
)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_block_id uuid;
BEGIN
  IF p_staff_id IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Gecersiz blok bilgisi' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_staff_id::text));

  IF public.schedule_has_conflict(p_staff_id, p_starts_at, p_ends_at) THEN
    RAISE EXCEPTION 'Bu saat dolu; cakisan randevu veya blok var' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.blocks (staff_id, starts_at, ends_at, reason, created_via)
  VALUES (p_staff_id, p_starts_at, p_ends_at, p_reason, p_created_via)
  RETURNING id INTO v_block_id;

  RETURN json_build_object('block_id', v_block_id, 'starts_at', p_starts_at, 'ends_at', p_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat dolu; cakisan randevu veya blok var' USING ERRCODE = 'P0001';
END;
$$;
