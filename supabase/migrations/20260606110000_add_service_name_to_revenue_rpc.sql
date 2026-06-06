-- Owner summary needs service names to calculate the "top preferred" insight.
-- The function return type changes, so PostgreSQL requires dropping it first.
DROP FUNCTION IF EXISTS public.get_shop_appointments_revenue(uuid, timestamptz, timestamptz, uuid[]);

CREATE FUNCTION public.get_shop_appointments_revenue(
  p_shop_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_staff_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  staff_id uuid,
  service_id uuid,
  service_name text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  booked_price_cents integer,
  completed_price_cents integer,
  completed_commission_cents integer,
  completed_shop_share_cents integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.shops sh
    WHERE sh.id = p_shop_id
      AND (
        sh.owner_user_id = (SELECT auth.uid())
        OR sh.owner_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.staff admin_staff
          WHERE admin_staff.shop_id = p_shop_id
            AND admin_staff.user_id = (SELECT auth.uid())
            AND admin_staff.role = 'admin'
        )
      )
  ) THEN
    RAISE EXCEPTION 'not allowed to read shop revenue' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.staff_id,
    a.service_id,
    sv.name AS service_name,
    a.status,
    a.starts_at,
    a.ends_at,
    a.booked_price_cents,
    a.completed_price_cents,
    a.completed_commission_cents,
    a.completed_shop_share_cents
  FROM public.appointments a
  JOIN public.staff st ON st.id = a.staff_id
  LEFT JOIN public.services sv ON sv.id = a.service_id
  WHERE st.shop_id = p_shop_id
    AND a.starts_at >= p_from
    AND a.starts_at < p_to
    AND a.status <> 'cancelled'
    AND (p_staff_ids IS NULL OR a.staff_id = ANY(p_staff_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.get_shop_appointments_revenue(uuid, timestamptz, timestamptz, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shop_appointments_revenue(uuid, timestamptz, timestamptz, uuid[]) TO authenticated;
