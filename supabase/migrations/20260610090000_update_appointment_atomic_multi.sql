-- Multi-service edit: update_appointment_atomic now takes p_service_ids uuid[].
-- Backward compat: if p_service_ids is NULL/empty, fall back to [p_service_id].
-- Also resyncs appointment_services rows (PR #72 left them stale on edit).

DROP FUNCTION IF EXISTS public.update_appointment_atomic(
  uuid, uuid, uuid, timestamptz, text, text, text
);

CREATE OR REPLACE FUNCTION public.update_appointment_atomic(
  p_appointment_id uuid,
  p_staff_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL,
  p_service_ids uuid[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment record;
  v_service_ids uuid[];
  v_matched_count int;
  v_total_duration int;
  v_total_price int;
  v_primary_service_id uuid;
  v_ends_at timestamptz;
  v_updated int;
  v_role text := current_setting('role', true);
  v_uid uuid := auth.uid();
  v_is_privileged boolean;
BEGIN
  -- Resolve the service id list (new array param wins; else single fallback)
  IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
    v_service_ids := p_service_ids;
  ELSIF p_service_id IS NOT NULL THEN
    v_service_ids := ARRAY[p_service_id];
  ELSE
    RAISE EXCEPTION 'Eksik randevu bilgisi' USING ERRCODE = '22023';
  END IF;

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

  -- Target staff must be active in the same shop
  PERFORM 1
  FROM public.staff st
  WHERE st.id = p_staff_id
    AND st.shop_id = v_appointment.shop_id
    AND st.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hizmet veya personel bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  -- Validate ALL services belong to this shop and are active; compute totals.
  SELECT
    COUNT(*)::int,
    COALESCE(SUM(s.duration_min), 0)::int,
    COALESCE(SUM(s.price_cents), 0)::int
  INTO v_matched_count, v_total_duration, v_total_price
  FROM public.services s
  WHERE s.id = ANY(v_service_ids)
    AND s.shop_id = v_appointment.shop_id
    AND s.is_active = true;

  IF v_matched_count <> cardinality(v_service_ids) OR v_matched_count = 0 THEN
    RAISE EXCEPTION 'Hizmet veya personel bulunamadi' USING ERRCODE = 'P0002';
  END IF;

  v_primary_service_id := v_service_ids[1];

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

  v_ends_at := p_starts_at + make_interval(mins => v_total_duration);
  PERFORM pg_advisory_xact_lock(('x' || md5(p_staff_id::text))::bit(64)::bigint);

  IF NOT public.staff_is_inside_work_window(p_staff_id, p_starts_at, v_ends_at)
     OR public.schedule_has_conflict(p_staff_id, p_starts_at, v_ends_at, p_appointment_id, NULL) THEN
    RAISE EXCEPTION 'Bu saat artik musait degil' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.scheduling_rpc', 'on', true);

  UPDATE public.appointments
     SET staff_id = p_staff_id,
         service_id = v_primary_service_id,
         booked_price_cents = v_total_price,
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

  -- Resync the per-service snapshot rows, preserving caller order.
  DELETE FROM public.appointment_services WHERE appointment_id = p_appointment_id;
  INSERT INTO public.appointment_services
    (appointment_id, service_id, duration_min, price_cents, sequence_order)
  SELECT
    p_appointment_id,
    s.id,
    s.duration_min,
    s.price_cents,
    array_position(v_service_ids, s.id) - 1
  FROM public.services s
  WHERE s.id = ANY(v_service_ids)
    AND s.shop_id = v_appointment.shop_id;

  RETURN json_build_object('appointment_id', p_appointment_id, 'starts_at', p_starts_at, 'ends_at', v_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat artik musait degil' USING ERRCODE = 'P0001';
END;
$$;

-- Mirror the grant posture of 20260515081251_restrict_scheduling_rpc_execute.sql
REVOKE EXECUTE ON FUNCTION public.update_appointment_atomic(
  uuid, uuid, uuid, timestamptz, text, text, text, uuid[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_appointment_atomic(
  uuid, uuid, uuid, timestamptz, text, text, text, uuid[]
) TO authenticated;
