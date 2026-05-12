-- Finalize manual block hardening after later scheduling migrations.
-- Manual block writes must only happen through verified edge functions.

REVOKE EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) TO service_role;

DROP POLICY IF EXISTS "public can read block times" ON public.blocks;
DROP POLICY IF EXISTS "barber manages own blocks" ON public.blocks;
DROP POLICY IF EXISTS "admin_all_blocks" ON public.blocks;
DROP POLICY IF EXISTS "staff_own_blocks" ON public.blocks;
DROP POLICY IF EXISTS "owner_can_read_blocks" ON public.blocks;
DROP POLICY IF EXISTS "staff_can_read_own_blocks" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_insert" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_update" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_delete" ON public.blocks;
DROP POLICY IF EXISTS "blocks_scheduling_select" ON public.blocks;

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
