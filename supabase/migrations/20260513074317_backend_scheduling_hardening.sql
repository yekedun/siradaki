-- Backend scheduling hardening:
-- 1. Close the RLS gap on the staff table.
-- 2. Remove legacy barber_id-based get_occupied_ranges overloads that survived
--    the staff_id migration and can be selected by ambiguous callers.

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_public_read_active" ON public.staff;
DROP POLICY IF EXISTS "staff_owner_manage" ON public.staff;
DROP POLICY IF EXISTS "staff_self_read" ON public.staff;
DROP POLICY IF EXISTS "staff_self_update" ON public.staff;

-- Public booking and availability flows need to list active staff, but inactive
-- rows and ownership metadata must not become broadly visible.
CREATE POLICY "staff_public_read_active" ON public.staff
FOR SELECT USING (is_active = true);

CREATE POLICY "staff_owner_manage" ON public.staff
FOR ALL USING (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = auth.uid()
       OR sh.owner_id = auth.uid()
  )
)
WITH CHECK (
  shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = auth.uid()
       OR sh.owner_id = auth.uid()
  )
);

CREATE POLICY "staff_self_read" ON public.staff
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "staff_self_update" ON public.staff
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP FUNCTION IF EXISTS public.get_occupied_ranges(uuid, text);
DROP FUNCTION IF EXISTS public.get_occupied_ranges(text, date);
DROP FUNCTION IF EXISTS public.get_occupied_ranges(uuid, timestamp with time zone);
DROP FUNCTION IF EXISTS public.assign_any_barber(uuid, timestamp with time zone, timestamp with time zone);

DROP INDEX IF EXISTS public.idx_block_slots_barber;

ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.sync_appointment_slots() SET search_path = public;
ALTER FUNCTION public.get_staff_day_hours(uuid, date) SET search_path = public;
ALTER FUNCTION public.get_shop_dashboard_stats(uuid, date, uuid) SET search_path = public;
ALTER FUNCTION public.schedule_day_bounds(date, text) SET search_path = public;
