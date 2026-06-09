-- Adds is_listed flag so shop owners can hide their shop from customer search
-- without affecting admin-controlled status field (pending/active/rejected).

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS is_listed boolean NOT NULL DEFAULT true;

-- Owner can update is_listed on their own shop
GRANT UPDATE (is_listed) ON public.shops TO authenticated;
