-- Keep public shop discovery working without exposing owner auth user ids.
-- Authenticated owner/staff flows keep their existing table privileges.

REVOKE ALL ON public.shops FROM anon;

GRANT SELECT (
  id,
  slug,
  display_name,
  name,
  bio,
  avatar_url,
  timezone,
  working_hours,
  address,
  phone,
  status,
  commission_enabled,
  created_at,
  updated_at
) ON public.shops TO anon;
