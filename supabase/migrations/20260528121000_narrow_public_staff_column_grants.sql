-- Keep public booking staff data minimal. RLS already limits anon reads to
-- active staff rows, but column grants must also avoid exposing auth user ids
-- and internal roles on those public rows.

REVOKE SELECT ON public.staff FROM anon, authenticated;

GRANT SELECT (
  id,
  shop_id,
  name,
  slug,
  is_active
) ON public.staff TO anon;

GRANT SELECT (
  id,
  shop_id,
  user_id,
  name,
  role,
  is_active,
  created_at,
  slug,
  notification_prefs
) ON public.staff TO authenticated;
