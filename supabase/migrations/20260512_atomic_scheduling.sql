-- Atomic scheduling RPCs and staff-based realtime mirrors.
-- This keeps availability derived while making writes transaction-safe per staff.

ALTER TABLE public.block_slots RENAME COLUMN barber_id TO staff_id;
ALTER TABLE public.block_slots DROP CONSTRAINT IF EXISTS block_slots_staff_id_fkey;
ALTER TABLE public.block_slots ADD CONSTRAINT block_slots_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES public.staff(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_block_slots_staff ON public.block_slots(staff_id);

CREATE OR REPLACE FUNCTION public.sync_block_slots()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.block_slots (block_id, staff_id, starts_at, ends_at)
    VALUES (NEW.id, NEW.staff_id, NEW.starts_at, NEW.ends_at)
    ON CONFLICT (block_id) DO UPDATE SET
      staff_id = EXCLUDED.staff_id,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.block_slots
       SET staff_id = NEW.staff_id,
           starts_at = NEW.starts_at,
           ends_at = NEW.ends_at
     WHERE block_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.block_slots WHERE block_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS blocks_sync_slots ON public.blocks;
CREATE TRIGGER blocks_sync_slots
AFTER INSERT OR UPDATE OR DELETE ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.sync_block_slots();

CREATE OR REPLACE FUNCTION public.schedule_day_bounds(
  p_date date,
  p_timezone text,
  OUT starts_at timestamptz,
  OUT ends_at timestamptz
)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    p_date::timestamp AT TIME ZONE p_timezone,
    (p_date + 1)::timestamp AT TIME ZONE p_timezone;
$$;

CREATE OR REPLACE FUNCTION public.get_occupied_ranges(
  p_staff_id uuid,
  p_date     date
)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH staff_shop AS (
    SELECT s.id, sh.timezone
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE s.id = p_staff_id
  ),
  bounds AS (
    SELECT b.starts_at AS day_start, b.ends_at AS day_end, ss.timezone
    FROM staff_shop ss
    CROSS JOIN LATERAL public.schedule_day_bounds(p_date, ss.timezone) b
  )
  SELECT a.starts_at, a.ends_at
  FROM public.appointments a
  CROSS JOIN bounds b
  WHERE a.staff_id = p_staff_id
    AND a.status <> 'cancelled'
    AND a.starts_at < b.day_end
    AND a.ends_at > b.day_start

  UNION ALL

  SELECT bl.starts_at, bl.ends_at
  FROM public.blocks bl
  CROSS JOIN bounds b
  WHERE bl.staff_id = p_staff_id
    AND bl.starts_at < b.day_end
    AND bl.ends_at > b.day_start

  UNION ALL

  SELECT b.day_start, b.day_end
  FROM public.staff_schedules ss
  CROSS JOIN bounds b
  WHERE ss.staff_id = p_staff_id
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = false

  UNION ALL

  SELECT
    (p_date + ss.break_start)::timestamp AT TIME ZONE b.timezone,
    (p_date + ss.break_end)::timestamp AT TIME ZONE b.timezone
  FROM public.staff_schedules ss
  CROSS JOIN bounds b
  WHERE ss.staff_id = p_staff_id
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = true
    AND ss.break_start IS NOT NULL
    AND ss.break_end IS NOT NULL

  ORDER BY starts_at;
$$;

CREATE OR REPLACE FUNCTION public.get_shop_occupied_ranges(
  p_shop_id uuid,
  p_date    date
)
RETURNS TABLE (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public
AS $$
  WITH shop_bounds AS (
    SELECT sh.timezone, b.starts_at AS day_start, b.ends_at AS day_end
    FROM public.shops sh
    CROSS JOIN LATERAL public.schedule_day_bounds(p_date, sh.timezone) b
    WHERE sh.id = p_shop_id
  )
  SELECT a.staff_id, a.starts_at, a.ends_at
  FROM public.appointments a
  JOIN public.staff s ON s.id = a.staff_id
  CROSS JOIN shop_bounds b
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND a.status <> 'cancelled'
    AND a.starts_at < b.day_end
    AND a.ends_at > b.day_start

  UNION ALL

  SELECT bl.staff_id, bl.starts_at, bl.ends_at
  FROM public.blocks bl
  JOIN public.staff s ON s.id = bl.staff_id
  CROSS JOIN shop_bounds b
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND bl.starts_at < b.day_end
    AND bl.ends_at > b.day_start

  UNION ALL

  SELECT ss.staff_id, b.day_start, b.day_end
  FROM public.staff_schedules ss
  JOIN public.staff s ON s.id = ss.staff_id
  CROSS JOIN shop_bounds b
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = false

  UNION ALL

  SELECT
    ss.staff_id,
    (p_date + ss.break_start)::timestamp AT TIME ZONE b.timezone,
    (p_date + ss.break_end)::timestamp AT TIME ZONE b.timezone
  FROM public.staff_schedules ss
  JOIN public.staff s ON s.id = ss.staff_id
  CROSS JOIN shop_bounds b
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = true
    AND ss.break_start IS NOT NULL
    AND ss.break_end IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.staff_is_inside_work_window(
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT
      s.id AS staff_id,
      sh.timezone,
      sh.working_hours,
      (p_starts_at AT TIME ZONE sh.timezone)::date AS local_date,
      EXTRACT(DOW FROM p_starts_at AT TIME ZONE sh.timezone)::int AS dow
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE s.id = p_staff_id
  ),
  day_ctx AS (
    SELECT
      ctx.*,
      CASE ctx.dow
        WHEN 0 THEN 'sun'
        WHEN 1 THEN 'mon'
        WHEN 2 THEN 'tue'
        WHEN 3 THEN 'wed'
        WHEN 4 THEN 'thu'
        WHEN 5 THEN 'fri'
        WHEN 6 THEN 'sat'
      END AS wh_key
    FROM ctx
  ),
  schedule AS (
    SELECT
      dc.timezone,
      dc.local_date,
      COALESCE(ss.is_working, ((dc.working_hours -> dc.wh_key ->> 'enabled')::boolean), false) AS is_working,
      COALESCE(ss.work_start, (dc.working_hours -> dc.wh_key ->> 'open')::time) AS work_start,
      COALESCE(ss.work_end, (dc.working_hours -> dc.wh_key ->> 'close')::time) AS work_end
    FROM day_ctx dc
    LEFT JOIN public.staff_schedules ss
      ON ss.staff_id = dc.staff_id
     AND ss.day_of_week = EXTRACT(DOW FROM dc.local_date)::int
  )
  SELECT COALESCE(bool_and(
    is_working
    AND work_start IS NOT NULL
    AND work_end IS NOT NULL
    AND p_starts_at >= ((local_date + work_start)::timestamp AT TIME ZONE timezone)
    AND p_ends_at <= ((local_date + work_end)::timestamp AT TIME ZONE timezone)
  ), false)
  FROM schedule;
$$;

CREATE OR REPLACE FUNCTION public.schedule_has_conflict(
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_ignore_appointment_id uuid DEFAULT NULL,
  p_ignore_block_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.appointments a
    WHERE a.staff_id = p_staff_id
      AND a.status <> 'cancelled'
      AND (p_ignore_appointment_id IS NULL OR a.id <> p_ignore_appointment_id)
      AND tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  )
  OR EXISTS (
    SELECT 1
    FROM public.blocks b
    WHERE b.staff_id = p_staff_id
      AND (p_ignore_block_id IS NULL OR b.id <> p_ignore_block_id)
      AND tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  )
  OR EXISTS (
    SELECT 1
    FROM public.get_occupied_ranges(
      p_staff_id,
      (p_starts_at AT TIME ZONE (
        SELECT sh.timezone
        FROM public.staff s
        JOIN public.shops sh ON sh.id = s.shop_id
        WHERE s.id = p_staff_id
      ))::date
    ) r
    WHERE tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
      AND NOT EXISTS (
        SELECT 1
        FROM public.appointments a
        WHERE a.staff_id = p_staff_id
          AND a.status <> 'cancelled'
          AND (p_ignore_appointment_id IS NULL OR a.id <> p_ignore_appointment_id)
          AND a.starts_at = r.starts_at
          AND a.ends_at = r.ends_at
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE b.staff_id = p_staff_id
          AND (p_ignore_block_id IS NULL OR b.id <> p_ignore_block_id)
          AND b.starts_at = r.starts_at
          AND b.ends_at = r.ends_at
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.assign_any_staff(
  p_shop_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_id uuid;
  r record;
BEGIN
  FOR r IN
    SELECT s.id
    FROM public.staff s
    WHERE s.shop_id = p_shop_id
      AND s.is_active = true
    ORDER BY (
      SELECT COUNT(*)
      FROM public.appointments a
      WHERE a.staff_id = s.id
        AND a.status <> 'cancelled'
        AND a.starts_at >= date_trunc('day', p_starts_at)
        AND a.starts_at < date_trunc('day', p_starts_at) + interval '1 day'
    ), s.created_at, s.id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext(r.id::text));
    IF public.staff_is_inside_work_window(r.id, p_starts_at, p_ends_at)
       AND NOT public.schedule_has_conflict(r.id, p_starts_at, p_ends_at) THEN
      v_staff_id := r.id;
      EXIT;
    END IF;
  END LOOP;

  RETURN v_staff_id;
END;
$$;

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

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id
    AND shop_id = v_shop.id
    AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hizmet bulunamadı' USING ERRCODE = 'P0002';
  END IF;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);

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
    RAISE EXCEPTION 'Bu saat artık müsait değil' USING ERRCODE = 'P0001';
END;
$$;

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
  v_ends_at timestamptz;
BEGIN
  SELECT srv.* INTO v_service
  FROM public.services srv
  JOIN public.staff st ON st.shop_id = srv.shop_id
  WHERE srv.id = p_service_id
    AND st.id = p_staff_id
    AND srv.is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hizmet veya personel bulunamadı' USING ERRCODE = 'P0002';
  END IF;

  v_ends_at := p_starts_at + make_interval(mins => v_service.duration_min);
  PERFORM pg_advisory_xact_lock(hashtext(p_staff_id::text));

  IF NOT public.staff_is_inside_work_window(p_staff_id, p_starts_at, v_ends_at)
     OR public.schedule_has_conflict(p_staff_id, p_starts_at, v_ends_at, p_appointment_id, NULL) THEN
    RAISE EXCEPTION 'Bu saat artık müsait değil' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.appointments
     SET staff_id = p_staff_id,
         service_id = p_service_id,
         customer_name = trim(p_customer_name),
         customer_phone = nullif(trim(COALESCE(p_customer_phone, '')), ''),
         customer_notes = nullif(trim(COALESCE(p_customer_notes, '')), ''),
         starts_at = p_starts_at,
         ends_at = v_ends_at,
         status = 'confirmed'
   WHERE id = p_appointment_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Randevu bulunamadı' USING ERRCODE = 'P0002';
  END IF;

  RETURN json_build_object('appointment_id', p_appointment_id, 'starts_at', p_starts_at, 'ends_at', v_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saat artık müsait değil' USING ERRCODE = 'P0001';
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
    RAISE EXCEPTION 'Geçersiz blok bilgisi' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_staff_id::text));

  IF public.schedule_has_conflict(p_staff_id, p_starts_at, p_ends_at) THEN
    RAISE EXCEPTION 'Bu saatte zaten bir randevu veya blok var' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.blocks (staff_id, starts_at, ends_at, reason, created_via)
  VALUES (p_staff_id, p_starts_at, p_ends_at, p_reason, p_created_via)
  RETURNING id INTO v_block_id;

  RETURN json_build_object('block_id', v_block_id, 'starts_at', p_starts_at, 'ends_at', p_ends_at);
EXCEPTION
  WHEN exclusion_violation THEN
    RAISE EXCEPTION 'Bu saatte zaten bir randevu veya blok var' USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION public.assign_any_staff(uuid, timestamptz, timestamptz) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_appointment_atomic(text, uuid, uuid, uuid, timestamptz, text, text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_appointment_atomic(uuid, uuid, uuid, timestamptz, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_occupied_ranges(uuid, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_shop_occupied_ranges(uuid, date) TO authenticated;
