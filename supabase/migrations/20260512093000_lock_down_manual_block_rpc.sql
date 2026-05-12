-- Manual blocks must go through verified edge functions.
DO $$
BEGIN
  IF to_regprocedure('public.create_block_atomic(uuid, timestamptz, timestamptz, text, text)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) TO service_role;
  END IF;
END $$;

DROP POLICY IF EXISTS "public can read block times" ON public.blocks;
DROP POLICY IF EXISTS "barber manages own blocks" ON public.blocks;
DROP POLICY IF EXISTS "admin_all_blocks" ON public.blocks;
DROP POLICY IF EXISTS "staff_own_blocks" ON public.blocks;

CREATE POLICY "owner_can_read_blocks"
ON public.blocks
FOR SELECT
USING (
  staff_id IN (
    SELECT s.id
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = auth.uid()
  )
);

CREATE POLICY "staff_can_read_own_blocks"
ON public.blocks
FOR SELECT
USING (
  staff_id IN (
    SELECT s.id
    FROM public.staff s
    WHERE s.user_id = auth.uid()
  )
);
