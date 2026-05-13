-- L-2: pg_advisory_xact_lock çağrılarında hashtext() → 64-bit MD5 anahtarı.
--
-- hashtext() int4 (32-bit) döndürür; yaklaşık 2^16 UUID'de çarpışma beklenir.
-- ('x' || md5(id::text))::bit(64)::bigint yeterince düz ve çarpışmasız bir
-- 64-bit anahtar üretir. pg_advisory_xact_lock bigint alır, int4 otomatik
-- cast edilir ama anahtar uzayı gereksiz yere daralır.
--
-- Etkilenen fonksiyonların en son CREATE OR REPLACE sürümleri aşağıda
-- yeniden tanımlanmaktadır (eski migration'lar dokunulmaz):
--   create_appointment_atomic  ← 20260518190000
--   update_appointment_atomic  ← 20260518150000
--   create_block_atomic        ← 20260518140000
--   cancel_appointment_atomic  ← 20260518160000

-- ── create_appointment_atomic ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS appointments_customer_phone_created_at_idx
  ON public.appointments (customer_phone, created_at)
  WHERE customer_phone IS NOT NULL;

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
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
  v_is_privileged boolean;
BEGIN
  IF p_service_id IS NULL OR p_starts_at IS NULL OR trim(COALESCE(p_customer_name, '')) = '' THEN
    RAISE EXCEPTION 'Eksik randevu bilgisi' USING ERRCODE = '22023';
  END IF;
  IF char_length(trim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Isim en az 2 karakter olmali' USING ERRCODE = '22023';
  END IF;

  IF p_starts_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'Geçmiş bir saate randevu oluşturulamaz' USING ERRCODE = '22023';
  END IF;

  IF p_customer_phone IS NOT NULL AND trim(p_customer_phone) <> '' THEN
    IF (
      SELECT COUNT(*)
      FROM public.appointments
      WHERE customer_phone = trim(p_customer_phone)
        AND created_at > now() - interval '10 minutes'
    ) >= 5 THEN
      RAISE EXCEPTION 'Çok fazla randevu isteği. Lütfen birkaç dakika bekleyin.' USING ERRCODE = 'P0004';
    END IF;
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

  IF p_staff_id IS NOT NULL THEN
    SELECT s.id INTO v_staff_id
    FROM public.staff s
    WHERE s.id = p_staff_id
      AND s.shop_id = v_shop.id
      AND s.is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Personel bulunamadi' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  v_is_privileged := v_role IN ('postgres', 'service_role');
  IF NOT v_is_privileged THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'not allowed to create appointment' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.shops sh
      WHERE sh.id = v_shop.id
        AND (
          sh.owner_user_id = v_uid
          OR sh.owner_id = v_uid
          OR EXISTS (
            SELECT 1
            FROM public.staff admin_staff
            WHERE admin_staff.shop_id = sh.id
              AND admin_staff.user_id = v_uid
              AND admin_staff.role = 'admin'
              AND admin_staff.is_active = true
          )
          OR (
            v_staff_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.staff self_staff
              WHERE self_staff.id = v_staff_id
                AND self_staff.user_id = v_uid
                AND self_staff.is_active = true
            )
          )
        )
    ) THEN
      RAISE EXCEPTION 'not allowed to create appointment' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);

  IF v_staff_id IS NULL THEN
    v_staff_id := public.assign_any_staff(v_shop.id, p_starts_at, v_ends_at);
    IF v_staff_id IS NULL THEN
      RAISE EXCEPTION 'Secilen saatte musait personel yok' USING ERRCODE = 'P0001';
    END IF;
    PERFORM pg_advisory_xact_lock(('x' || md5(v_staff_id::text))::bit(64)::bigint);
    IF NOT public.staff_is_inside_work_window(v_staff_id, p_starts_at, v_ends_at)
       OR public.schedule_has_conflict(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Secilen saatte musait personel yok' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(('x' || md5(v_staff_id::text))::bit(64)::bigint);

    IF NOT public.staff_is_inside_work_window(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Secilen saat personelin calisma saati veya mola araligi disinda' USING ERRCODE = 'P0001';
    END IF;

    IF public.schedule_has_conflict(v_staff_id, p_starts_at, v_ends_at) THEN
      RAISE EXCEPTION 'Secilen saat dolu; cakisan randevu veya manuel blok var' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM set_config('app.scheduling_rpc', 'on', true);

  INSERT INTO public.appointments (
    staff_id, service_id, customer_name, customer_phone, customer_notes,
    customer_user_id, starts_at, ends_at, status, booked_price_cents
  )
  VALUES (
    v_staff_id, v_service.id, trim(p_customer_name), nullif(trim(COALESCE(p_customer_phone, '')), ''),
    nullif(trim(COALESCE(p_customer_notes, '')), ''), p_customer_user_id,
    p_starts_at, v_ends_at, 'confirmed', v_service.price_cents
  )
  RETURNING id INTO v_appointment_id;

  PERFORM set_config('app.scheduling_rpc', 'off', true);

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

-- ── update_appointment_atomic ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_appointment_atomic(
  p_appointment_id uuid,
  p_staff_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service public.services%ROWTYPE;
  v_appointment record;
  v_ends_at timestamptz;
  v_updated int;
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
  v_is_privileged boolean;
BEGIN
  SELECT
    a.id,
    a.status,
    a.staff_id,
    st.shop_id,
    st.user_id AS current_staff_user_id
  INTO v_appointment
  FROM public.appointments a
  JOIN public.staff st ON st.id = a.staff_id
  WHERE a.id = p_appointment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Randevu bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  IF v_appointment.status <> 'confirmed' THEN
    RAISE EXCEPTION 'only confirmed appointments can be edited' USING ERRCODE = '22023';
  END IF;

  SELECT srv.* INTO v_service
  FROM public.services srv
  JOIN public.staff st ON st.shop_id = srv.shop_id
  WHERE srv.id = p_service_id
    AND st.id = p_staff_id
    AND st.shop_id = v_appointment.shop_id
    AND srv.is_active = true
    AND st.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hizmet veya personel bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  v_is_privileged := v_role IN ('postgres', 'service_role');
  IF NOT v_is_privileged THEN
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'not allowed to update appointment' USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.shops sh
      WHERE sh.id = v_appointment.shop_id
        AND (
          sh.owner_user_id = v_uid
          OR sh.owner_id = v_uid
          OR EXISTS (
            SELECT 1
            FROM public.staff admin_staff
            WHERE admin_staff.shop_id = sh.id
              AND admin_staff.user_id = v_uid
              AND admin_staff.role = 'admin'
              AND admin_staff.is_active = true
          )
          OR (
            p_staff_id = v_appointment.staff_id
            AND v_appointment.current_staff_user_id = v_uid
          )
        )
    ) THEN
      RAISE EXCEPTION 'not allowed to update appointment' USING ERRCODE = '42501';
    END IF;
  END IF;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);
  PERFORM pg_advisory_xact_lock(('x' || md5(p_staff_id::text))::bit(64)::bigint);

  IF NOT public.staff_is_inside_work_window(p_staff_id, p_starts_at, v_ends_at)
     OR public.schedule_has_conflict(p_staff_id, p_starts_at, v_ends_at, p_appointment_id, NULL) THEN
    RAISE EXCEPTION 'Bu saat artik musait degil' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.scheduling_rpc', 'on', true);

  UPDATE public.appointments
     SET staff_id = p_staff_id,
         service_id = p_service_id,
         booked_price_cents = v_service.price_cents,
         customer_name = trim(p_customer_name),
         customer_phone = nullif(trim(COALESCE(p_customer_phone, '')), ''),
         customer_notes = nullif(trim(COALESCE(p_customer_notes, '')), ''),
         starts_at = p_starts_at,
         ends_at = v_ends_at,
         status = 'confirmed'
   WHERE id = p_appointment_id
     AND status = 'confirmed';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  PERFORM set_config('app.scheduling_rpc', 'off', true);

  IF v_updated = 0 THEN
    RAISE EXCEPTION 'Randevu bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  RETURN json_build_object('appointment_id', p_appointment_id, 'starts_at', p_starts_at, 'ends_at', v_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat artik musait degil' USING ERRCODE = 'P0001';
END;
$$;

-- ── create_block_atomic ───────────────────────────────────────────────────────

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
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
BEGIN
  IF p_staff_id IS NULL OR p_starts_at IS NULL OR p_ends_at IS NULL OR p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'Gecersiz blok bilgisi' USING ERRCODE = '22023';
  END IF;

  IF v_role NOT IN ('postgres', 'service_role') THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.staff st
      JOIN public.shops sh ON sh.id = st.shop_id
      WHERE st.id = p_staff_id
        AND st.is_active = true
        AND (
          st.user_id = v_uid
          OR sh.owner_user_id = v_uid
          OR sh.owner_id = v_uid
          OR EXISTS (
            SELECT 1
            FROM public.staff admin_staff
            WHERE admin_staff.shop_id = sh.id
              AND admin_staff.user_id = v_uid
              AND admin_staff.role = 'admin'
              AND admin_staff.is_active = true
          )
        )
    ) THEN
      RAISE EXCEPTION 'not allowed to create block' USING ERRCODE = '42501';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(('x' || md5(p_staff_id::text))::bit(64)::bigint);

  IF public.schedule_has_conflict(p_staff_id, p_starts_at, p_ends_at) THEN
    RAISE EXCEPTION 'Bu saat dolu; cakisan randevu veya blok var' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.scheduling_rpc', 'on', true);

  INSERT INTO public.blocks (staff_id, starts_at, ends_at, reason, created_via)
  VALUES (p_staff_id, p_starts_at, p_ends_at, p_reason, p_created_via)
  RETURNING id INTO v_block_id;

  PERFORM set_config('app.scheduling_rpc', 'off', true);

  RETURN json_build_object('block_id', v_block_id, 'starts_at', p_starts_at, 'ends_at', p_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat dolu; cakisan randevu veya blok var' USING ERRCODE = 'P0001';
END;
$$;

-- ── cancel_appointment_atomic ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_appointment_atomic(
  p_appointment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
BEGIN
  SELECT
    a.id,
    a.status,
    a.staff_id,
    a.customer_user_id,
    st.shop_id,
    st.user_id AS staff_user_id
  INTO v_row
  FROM public.appointments a
  JOIN public.staff st ON st.id = a.staff_id
  WHERE a.id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_role NOT IN ('postgres', 'service_role') THEN
    IF v_uid IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.shops sh
      WHERE sh.id = v_row.shop_id
        AND (
          sh.owner_user_id = v_uid
          OR sh.owner_id = v_uid
          OR v_row.staff_user_id = v_uid
          OR v_row.customer_user_id = v_uid
          OR EXISTS (
            SELECT 1
            FROM public.staff admin_staff
            WHERE admin_staff.shop_id = sh.id
              AND admin_staff.user_id = v_uid
              AND admin_staff.role = 'admin'
              AND admin_staff.is_active = true
          )
        )
    ) THEN
      RAISE EXCEPTION 'not allowed to cancel appointment' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_row.status = 'completed' THEN
    RAISE EXCEPTION 'completed appointments cannot be cancelled' USING ERRCODE = '22023';
  END IF;

  IF v_row.status <> 'cancelled' THEN
    PERFORM pg_advisory_xact_lock(('x' || md5(v_row.staff_id::text))::bit(64)::bigint);
    PERFORM set_config('app.scheduling_rpc', 'on', true);

    UPDATE public.appointments
       SET status = 'cancelled'
     WHERE id = p_appointment_id;

    PERFORM set_config('app.scheduling_rpc', 'off', true);
  END IF;

  RETURN jsonb_build_object('appointment_id', p_appointment_id, 'status', 'cancelled');
END;
$$;
