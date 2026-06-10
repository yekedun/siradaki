-- Multi-service: create_appointment_atomic now takes p_service_ids uuid[].
-- Backward compat: if p_service_ids is NULL/empty, fall back to [p_service_id].
-- Writes appointments.service_id = first service; booked_price_cents = SUM(price);
-- ends_at = starts_at + SUM(duration); plus one appointment_services row per service.

DROP FUNCTION IF EXISTS public.create_appointment_atomic(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid
);

CREATE OR REPLACE FUNCTION public.create_appointment_atomic(
  p_shop_slug text DEFAULT NULL,
  p_shop_id uuid DEFAULT NULL,
  p_service_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_starts_at timestamptz DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL,
  p_customer_user_id uuid DEFAULT NULL,
  p_service_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop public.shops%ROWTYPE;
  v_service_ids uuid[];
  v_total_duration int;
  v_total_price int;
  v_primary_service_id uuid;
  v_primary_service_name text;
  v_matched_count int;
  v_staff_id uuid;
  v_ends_at timestamptz;
  v_appointment_id uuid;
  v_staff_name text;
BEGIN
  -- Resolve the service id list (new array param wins; else single fallback)
  IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
    v_service_ids := p_service_ids;
  ELSIF p_service_id IS NOT NULL THEN
    v_service_ids := ARRAY[p_service_id];
  ELSE
    v_service_ids := NULL;
  END IF;

  IF v_service_ids IS NULL OR array_length(v_service_ids, 1) IS NULL
     OR p_starts_at IS NULL OR trim(COALESCE(p_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'Eksik randevu bilgisi' USING ERRCODE = '22023';
  END IF;
  IF char_length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'İsim en az 2 karakter olmalı' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_shop
  FROM public.shops
  WHERE (p_shop_id IS NOT NULL AND id = p_shop_id)
     OR (p_shop_id IS NULL AND slug = p_shop_slug)
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dükkan bulunamadı' USING ERRCODE = 'P0002';
  END IF;

  -- Validate ALL services belong to this shop and are active; compute totals.
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(s.duration_min), 0)::int,
    COALESCE(SUM(s.price_cents), 0)::int
  INTO v_matched_count, v_total_duration, v_total_price
  FROM public.services s
  WHERE s.id = ANY(v_service_ids)
    AND s.shop_id = v_shop.id
    AND s.is_active = true;

  IF v_matched_count <> cardinality(v_service_ids) OR v_matched_count = 0 THEN
    RAISE EXCEPTION 'Hizmet bulunamadı' USING ERRCODE = 'P0002';
  END IF;

  v_primary_service_id := v_service_ids[1];
  SELECT name INTO v_primary_service_name
  FROM public.services WHERE id = v_primary_service_id;

  v_ends_at := p_starts_at + make_interval(mins => v_total_duration);

  IF p_staff_id IS NULL THEN
    v_staff_id := public.assign_any_staff(v_shop.id, p_starts_at, v_ends_at);
    IF v_staff_id IS NULL THEN
      RAISE EXCEPTION 'Seçilen saatte hiç müsait personel yok' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT s.id INTO v_staff_id
    FROM public.staff s
    WHERE s.id = p_staff_id
      AND s.shop_id = v_shop.id
      AND s.is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Personel bulunamadı' USING ERRCODE = 'P0002';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext(v_staff_id::text));
    IF NOT public.staff_is_inside_work_window(v_staff_id, p_starts_at, v_ends_at)
       OR public.schedule_has_conflict(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Bu saat artık müsait değil' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.appointments (
    staff_id, service_id, customer_name, customer_phone, customer_notes,
    customer_user_id, starts_at, ends_at, status, booked_price_cents
  )
  VALUES (
    v_staff_id, v_primary_service_id, trim(p_customer_name),
    nullif(trim(COALESCE(p_customer_phone, '')), ''),
    nullif(trim(COALESCE(p_customer_notes, '')), ''), p_customer_user_id,
    p_starts_at, v_ends_at, 'confirmed', v_total_price
  )
  RETURNING id INTO v_appointment_id;

  -- One row per service, preserving caller order, with price/duration snapshot.
  INSERT INTO public.appointment_services
    (appointment_id, service_id, duration_min, price_cents, sequence_order)
  SELECT
    v_appointment_id,
    s.id,
    s.duration_min,
    s.price_cents,
    array_position(v_service_ids, s.id) - 1
  FROM public.services s
  WHERE s.id = ANY(v_service_ids)
    AND s.shop_id = v_shop.id;

  SELECT name INTO v_staff_name FROM public.staff WHERE id = v_staff_id;

  RETURN json_build_object(
    'appointment_id', v_appointment_id,
    'starts_at', p_starts_at,
    'ends_at', v_ends_at,
    'staff_id', v_staff_id,
    'staff_name', COALESCE(v_staff_name, ''),
    'barber_display_name', COALESCE(v_staff_name, ''),
    'service_name', COALESCE(v_primary_service_name, '')
  );
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat artık müsait değil' USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(
  text, uuid, uuid, uuid, timestamptz, text, text, text, uuid, uuid[]
) TO anon, authenticated;
