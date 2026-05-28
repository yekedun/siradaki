-- Public invite pre-validation must not expose the invite_tokens table.
-- The mobile app validates a single token through the open-invite edge function,
-- which uses service_role and returns only validity state.

DROP POLICY IF EXISTS "anyone_select_unused_tokens" ON public.invite_tokens;
