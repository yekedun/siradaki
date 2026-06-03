-- shops.status alanına 'suspended' değeri eklenir.
-- Önce constraint kaldırılır, sonra yeni constraint eklenir.

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shops_status_check;

ALTER TABLE public.shops
  ADD CONSTRAINT shops_status_check
  CHECK (status IN ('pending', 'active', 'rejected', 'suspended'));

COMMENT ON COLUMN public.shops.status IS
  'pending=admin onayı bekleniyor, active=erişim açık, rejected=reddedildi, suspended=admin tarafından geçici durduruldu';
