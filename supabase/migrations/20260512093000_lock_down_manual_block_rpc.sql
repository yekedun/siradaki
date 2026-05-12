-- Manual blocks must go through verified edge functions.
REVOKE EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_block_atomic(uuid, timestamptz, timestamptz, text, text) TO service_role;
