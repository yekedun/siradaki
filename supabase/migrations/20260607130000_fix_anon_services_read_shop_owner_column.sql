-- Follow-up to 20260607100000: the active services SELECT policy in production
-- is "services_public_or_owner_select" (created in 20260518130000), not the
-- legacy "services_shop_owner_read_all" name the previous migration targeted.
--
-- That policy is granted to anon + authenticated and its USING clause reads
-- shops.owner_user_id, which anon can no longer access after
-- 20260530500000_narrow_public_shops_column_grants. Result: anon SELECT on
-- services fails with "permission denied for table shops", so public booking
-- pages render no services.
--
-- Fix (same shape as the staff fix): split the policy so anon evaluates only
-- the is_active branch (never touching shops) and authenticated keeps the full
-- public-or-owner visibility.

DROP POLICY IF EXISTS "services_public_or_owner_select" ON public.services;

CREATE POLICY "services_public_read_anon" ON public.services
FOR SELECT TO anon
USING (
  is_active = true
);

CREATE POLICY "services_public_or_owner_select" ON public.services
FOR SELECT TO authenticated
USING (
  is_active = true
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);
