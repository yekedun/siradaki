-- Consolidate scheduling RLS policies after the staff_id migration.
-- This removes legacy barber_id-era policy names, reduces permissive policy
-- fan-out on hot scheduling tables, and makes auth.uid() initplan-safe.

-- appointments ---------------------------------------------------------------

DROP POLICY IF EXISTS "admin_all_appointments" ON public.appointments;
DROP POLICY IF EXISTS "staff_own_appointments" ON public.appointments;
DROP POLICY IF EXISTS "appointments_barber_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_barber_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_barber_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_shop_owner_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_shop_owner_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_shop_owner_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_shop_owner_delete" ON public.appointments;
DROP POLICY IF EXISTS "appointments_customer_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_customer_cancel" ON public.appointments;
DROP POLICY IF EXISTS "appointments_scheduling_select" ON public.appointments;
DROP POLICY IF EXISTS "appointments_scheduling_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_scheduling_update" ON public.appointments;
DROP POLICY IF EXISTS "appointments_scheduling_delete" ON public.appointments;

CREATE POLICY "appointments_scheduling_select" ON public.appointments
FOR SELECT TO authenticated USING (
  customer_user_id = (SELECT auth.uid())
  OR staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "appointments_scheduling_insert" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "appointments_scheduling_update" ON public.appointments
FOR UPDATE TO authenticated USING (
  (
    customer_user_id = (SELECT auth.uid())
    AND status = 'confirmed'
    AND starts_at > now()
  )
  OR staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  (
    customer_user_id = (SELECT auth.uid())
    AND status = 'cancelled'
  )
  OR staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "appointments_scheduling_delete" ON public.appointments
FOR DELETE TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- blocks ---------------------------------------------------------------------

DROP POLICY IF EXISTS "admin_all_blocks" ON public.blocks;
DROP POLICY IF EXISTS "staff_own_blocks" ON public.blocks;
DROP POLICY IF EXISTS "blocks_barber_select" ON public.blocks;
DROP POLICY IF EXISTS "blocks_barber_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_barber_delete" ON public.blocks;
DROP POLICY IF EXISTS "blocks_shop_owner_select" ON public.blocks;
DROP POLICY IF EXISTS "blocks_shop_owner_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_shop_owner_delete" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_select" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_update" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_delete" ON public.blocks;

CREATE POLICY "blocks_scheduling_select" ON public.blocks
FOR SELECT TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "blocks_scheduling_insert" ON public.blocks
FOR INSERT TO authenticated WITH CHECK (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "blocks_scheduling_update" ON public.blocks
FOR UPDATE TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "blocks_scheduling_delete" ON public.blocks
FOR DELETE TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- staff ----------------------------------------------------------------------

DROP POLICY IF EXISTS "staff_public_read_active" ON public.staff;
DROP POLICY IF EXISTS "staff_owner_manage" ON public.staff;
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
DROP POLICY IF EXISTS "staff_self_update" ON public.staff;
DROP POLICY IF EXISTS "staff_scheduling_select" ON public.staff;
DROP POLICY IF EXISTS "staff_scheduling_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_scheduling_update" ON public.staff;
DROP POLICY IF EXISTS "staff_scheduling_delete" ON public.staff;

CREATE POLICY "staff_scheduling_select" ON public.staff
FOR SELECT TO anon, authenticated USING (
  is_active = true
  OR user_id = (SELECT auth.uid())
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "staff_scheduling_insert" ON public.staff
FOR INSERT TO authenticated WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "staff_scheduling_update" ON public.staff
FOR UPDATE TO authenticated USING (
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

CREATE POLICY "staff_scheduling_delete" ON public.staff
FOR DELETE TO authenticated USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

-- staff_schedules ------------------------------------------------------------

DROP POLICY IF EXISTS "anon_read_schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "owner_manage_schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_own_schedule" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_scheduling_select" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_scheduling_insert" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_scheduling_update" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_scheduling_delete" ON public.staff_schedules;

CREATE POLICY "staff_schedules_scheduling_select" ON public.staff_schedules
FOR SELECT TO anon, authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    LEFT JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.is_active = true
       OR st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "staff_schedules_scheduling_insert" ON public.staff_schedules
FOR INSERT TO authenticated WITH CHECK (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "staff_schedules_scheduling_update" ON public.staff_schedules
FOR UPDATE TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);

CREATE POLICY "staff_schedules_scheduling_delete" ON public.staff_schedules
FOR DELETE TO authenticated USING (
  staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);
