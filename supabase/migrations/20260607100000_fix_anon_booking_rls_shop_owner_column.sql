-- Fix: public booking pages stopped showing services/staff.
--
-- Root cause: migration 20260530500000_narrow_public_shops_column_grants
-- revoked the `owner_user_id` column from anon's SELECT grant on public.shops.
-- But several owner-scoped RLS policies on `services` and `staff` are evaluated
-- for the anon role and reference `shops.owner_user_id` in a subquery. Postgres
-- enforces column-level privileges while planning those policy subqueries, so
-- anon's SELECT on services/staff failed entirely with:
--   "permission denied for table shops" (42501)
-- The Next.js server component swallows the error (`data ?? []`), rendering an
-- empty list ("Henüz hizmet tanımlanmamış") and no available time slots.
--
-- Fix: keep ownership metadata hidden from anon (do NOT re-grant the column).
-- Instead, ensure the owner-scoped policy branches are only evaluated for the
-- authenticated role. Anon keeps its is_active-only public read path, which
-- never touches the shops table.

-- ── services ────────────────────────────────────────────────────────────────
-- Owner "read all" (incl. inactive) is only meaningful for a signed-in owner.
DROP POLICY IF EXISTS "services_shop_owner_read_all" ON public.services;
CREATE POLICY "services_shop_owner_read_all" ON public.services
  FOR SELECT TO authenticated USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = (SELECT auth.uid()))
  );

-- ── staff ───────────────────────────────────────────────────────────────────
-- The consolidated select policy targeted both anon and authenticated, but its
-- USING clause reads shops.owner_user_id. Split it: anon sees only active staff
-- (the public booking path, no shops access); authenticated keeps the full
-- owner/self visibility.
DROP POLICY IF EXISTS "staff_scheduling_select" ON public.staff;

CREATE POLICY "staff_scheduling_select_public" ON public.staff
FOR SELECT TO anon USING (
  is_active = true
);

CREATE POLICY "staff_scheduling_select" ON public.staff
FOR SELECT TO authenticated USING (
  is_active = true
  OR user_id = (SELECT auth.uid())
  OR shop_id IN (
    SELECT sh.id
    FROM public.shops sh
    WHERE sh.owner_user_id = (SELECT auth.uid())
       OR sh.owner_id = (SELECT auth.uid())
  )
);
