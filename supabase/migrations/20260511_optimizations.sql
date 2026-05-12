-- 1. get_shop_occupied_ranges RPC (F-01)
-- Belirli bir gün için, bir dükkandaki tüüüüm personellerin meşgul olduğu aralıkları tek seferde döner.
CREATE OR REPLACE FUNCTION public.get_shop_occupied_ranges(
  p_shop_id uuid,
  p_date    date
)
RETURNS TABLE (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  -- 1. Onaylanmış randevular
  SELECT staff_id, starts_at, ends_at
  FROM public.appointments
  WHERE status = 'confirmed'
    AND starts_at >= p_date::timestamptz
    AND starts_at < (p_date + 1)::timestamptz
    AND staff_id IN (SELECT id FROM public.staff WHERE shop_id = p_shop_id AND is_active = true)
  
  UNION ALL
  
  -- 2. Bloklar (walk-in, mola vb.)
  SELECT staff_id, starts_at, ends_at
  FROM public.blocks
  WHERE starts_at >= p_date::timestamptz
    AND starts_at < (p_date + 1)::timestamptz
    AND staff_id IN (SELECT id FROM public.staff WHERE shop_id = p_shop_id AND is_active = true)

  UNION ALL

  -- 3. Personel o gün çalışmıyorsa tüm günü dolu say
  SELECT
    ss.staff_id,
    p_date::timestamptz AS starts_at,
    (p_date + 1)::timestamptz AS ends_at
  FROM public.staff_schedules ss
  JOIN public.staff s ON s.id = ss.staff_id
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = false

  UNION ALL

  -- 4. Mola saatleri → break_start/break_end aralığını dolu say
  SELECT
    ss.staff_id,
    (p_date + ss.break_start)::timestamptz AS starts_at,
    (p_date + ss.break_end)::timestamptz AS ends_at
  FROM public.staff_schedules ss
  JOIN public.staff s ON s.id = ss.staff_id
  WHERE s.shop_id = p_shop_id
    AND s.is_active = true
    AND ss.day_of_week = EXTRACT(DOW FROM p_date)::int
    AND ss.is_working = true
    AND ss.break_start IS NOT NULL
    AND ss.break_end IS NOT NULL
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_occupied_ranges(uuid, date) TO authenticated;

-- 2. get_shop_dashboard_stats RPC (F-02)
-- Owner dashboard'ı için, 30 günlük verileri veritabanında agregasyon yaparak döner.
CREATE OR REPLACE FUNCTION public.get_shop_dashboard_stats(
  p_shop_id uuid,
  p_today   date,
  p_staff_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_range_start timestamptz := p_today::timestamptz - interval '30 days';
  v_range_end   timestamptz := p_today::timestamptz + interval '30 days';
  v_today_start timestamptz := p_today::timestamptz;
  v_today_end   timestamptz := (p_today + 1)::timestamptz;
  
  v_total_today int;
  v_completed_today int;
  v_cancelled_today int;
  v_revenue_today numeric;
  v_top_staff text;
  v_busiest_day text;
  v_busiest_count int;
  v_staff_stats json;
BEGIN
  -- Bugün Toplam, Tamamlanan, İptal ve Tahmini Ciro
  SELECT 
    COUNT(*), 
    COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.status != 'cancelled' THEN srv.price_cents ELSE 0 END), 0) / 100.0
  INTO v_total_today, v_completed_today, v_cancelled_today, v_revenue_today
  FROM public.appointments a
  JOIN public.staff st ON a.staff_id = st.id
  LEFT JOIN public.services srv ON a.service_id = srv.id
  WHERE st.shop_id = p_shop_id 
    AND (p_staff_id IS NULL OR a.staff_id = p_staff_id)
    AND a.starts_at >= v_today_start 
    AND a.starts_at < v_today_end;

  -- 30 Günlük En Çok Tercih Edilen (Top Staff)
  SELECT st.name INTO v_top_staff
  FROM public.appointments a
  JOIN public.staff st ON a.staff_id = st.id
  WHERE st.shop_id = p_shop_id 
    AND (p_staff_id IS NULL OR a.staff_id = p_staff_id)
    AND a.starts_at >= v_range_start 
    AND a.starts_at < v_range_end
    AND a.status != 'cancelled'
  GROUP BY st.id, st.name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- 30 Günlük En Yoğun Gün
  SELECT to_char(a.starts_at, 'YYYY-MM-DD'), COUNT(*) INTO v_busiest_day, v_busiest_count
  FROM public.appointments a
  JOIN public.staff st ON a.staff_id = st.id
  WHERE st.shop_id = p_shop_id 
    AND (p_staff_id IS NULL OR a.staff_id = p_staff_id)
    AND a.starts_at >= v_range_start 
    AND a.starts_at < v_range_end
    AND a.status != 'cancelled'
  GROUP BY to_char(a.starts_at, 'YYYY-MM-DD')
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Personel bazlı bugünün geçerli randevu sayıları (staffStats)
  SELECT json_agg(json_build_object('id', st.id, 'name', st.name, 'count', COALESCE(counts.c, 0)))
  INTO v_staff_stats
  FROM public.staff st
  LEFT JOIN (
    SELECT staff_id, COUNT(*) as c
    FROM public.appointments
    WHERE status != 'cancelled'
      AND starts_at >= v_today_start
      AND starts_at < v_today_end
    GROUP BY staff_id
  ) counts ON counts.staff_id = st.id
  WHERE st.shop_id = p_shop_id
    AND (p_staff_id IS NULL OR st.id = p_staff_id)
    AND st.is_active = true;

  RETURN json_build_object(
    'total', v_total_today,
    'completed', v_completed_today,
    'cancelled', v_cancelled_today,
    'revenue', v_revenue_today,
    'topStaff', v_top_staff,
    'busiestDay', json_build_object('date', v_busiest_day, 'count', COALESCE(v_busiest_count, 0)),
    'staffStats', COALESCE(v_staff_stats, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shop_dashboard_stats(uuid, date, uuid) TO authenticated;
