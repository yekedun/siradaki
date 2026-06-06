-- Keep account deletion from being blocked by invite token audit references.
-- Shop deletion already cascades invite_tokens through shop_id; these rules cover
-- staff/invitee accounts and older edge-function cleanup paths.
ALTER TABLE public.invite_tokens
  DROP CONSTRAINT IF EXISTS invite_tokens_created_by_fkey;

ALTER TABLE public.invite_tokens
  ADD CONSTRAINT invite_tokens_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.invite_tokens
  DROP CONSTRAINT IF EXISTS invite_tokens_used_by_fkey;

ALTER TABLE public.invite_tokens
  ADD CONSTRAINT invite_tokens_used_by_fkey
  FOREIGN KEY (used_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
