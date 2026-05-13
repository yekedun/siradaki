-- Clean up remaining non-scheduling RLS advisor warnings.
--
-- Keeps the existing access model intact while:
-- - wrapping auth.uid() calls in SELECT for initplan caching
-- - merging duplicate permissive policies for the same table/action
-- - scoping owner/self write policies to authenticated users

-- shops ----------------------------------------------------------------------

DROP POLICY IF EXISTS "shops_owner_insert" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_update" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_delete" ON public.shops;

CREATE POLICY "shops_owner_insert" ON public.shops
FOR INSERT TO authenticated
WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "shops_owner_update" ON public.shops
FOR UPDATE TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "shops_owner_delete" ON public.shops
FOR DELETE TO authenticated
USING (owner_user_id = (SELECT auth.uid()));

-- barbers --------------------------------------------------------------------

DROP POLICY IF EXISTS "barbers_shop_owner_insert" ON public.barbers;
DROP POLICY IF EXISTS "barbers_shop_owner_update" ON public.barbers;
DROP POLICY IF EXISTS "barbers_shop_owner_delete" ON public.barbers;
DROP POLICY IF EXISTS "barbers_self_update" ON public.barbers;
DROP POLICY IF EXISTS "barbers_owner_or_self_update" ON public.barbers;

CREATE POLICY "barbers_shop_owner_insert" ON public.barbers
FOR INSERT TO authenticated
WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "barbers_owner_or_self_update" ON public.barbers
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "barbers_shop_owner_delete" ON public.barbers
FOR DELETE TO authenticated
USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- customer_profiles ----------------------------------------------------------

DROP POLICY IF EXISTS "customer_profiles_own_read" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_own_insert" ON public.customer_profiles;
DROP POLICY IF EXISTS "customer_profiles_own_update" ON public.customer_profiles;

CREATE POLICY "customer_profiles_own_read" ON public.customer_profiles
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "customer_profiles_own_insert" ON public.customer_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "customer_profiles_own_update" ON public.customer_profiles
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- services -------------------------------------------------------------------

DROP POLICY IF EXISTS "services_public_read_active" ON public.services;
DROP POLICY IF EXISTS "services_shop_owner_read_all" ON public.services;
DROP POLICY IF EXISTS "services_public_or_owner_select" ON public.services;
DROP POLICY IF EXISTS "services_shop_owner_insert" ON public.services;
DROP POLICY IF EXISTS "services_shop_owner_update" ON public.services;
DROP POLICY IF EXISTS "services_shop_owner_delete" ON public.services;

CREATE POLICY "services_public_or_owner_select" ON public.services
FOR SELECT TO anon, authenticated
USING (
  is_active = true
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "services_shop_owner_insert" ON public.services
FOR INSERT TO authenticated
WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "services_shop_owner_update" ON public.services
FOR UPDATE TO authenticated
USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "services_shop_owner_delete" ON public.services
FOR DELETE TO authenticated
USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- widget_tokens --------------------------------------------------------------

DROP POLICY IF EXISTS "widget_tokens_shop_owner_select" ON public.widget_tokens;
DROP POLICY IF EXISTS "widget_tokens_shop_owner_insert" ON public.widget_tokens;
DROP POLICY IF EXISTS "widget_tokens_shop_owner_delete" ON public.widget_tokens;

CREATE POLICY "widget_tokens_shop_owner_select" ON public.widget_tokens
FOR SELECT TO authenticated
USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "widget_tokens_shop_owner_insert" ON public.widget_tokens
FOR INSERT TO authenticated
WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "widget_tokens_shop_owner_delete" ON public.widget_tokens
FOR DELETE TO authenticated
USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- availability RPC surface ---------------------------------------------------

-- Public clients should use the get-availability Edge Function. These helper
-- RPCs expose raw occupied ranges and schedule rows, so keep direct execution
-- to service-role callers such as Edge Functions.
REVOKE EXECUTE ON FUNCTION public.get_occupied_ranges(uuid, date)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_staff_day_hours(uuid, date)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_occupied_ranges(uuid, date) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_staff_day_hours(uuid, date) TO service_role;
