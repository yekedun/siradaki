-- Public booking clients must use widget-get-availability/get_staff_day_hours.
-- Direct anon reads expose staff working patterns and are not required by the app.
DROP POLICY IF EXISTS "anon_read_schedules" ON public.staff_schedules;
DROP POLICY IF EXISTS "staff_schedules_scheduling_select" ON public.staff_schedules;

CREATE POLICY "staff_schedules_scheduling_select" ON public.staff_schedules
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
