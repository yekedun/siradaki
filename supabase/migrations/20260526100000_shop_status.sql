-- Add status column to shops table
-- pending = awaiting admin approval, active = access granted, rejected = application rejected
ALTER TABLE shops
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'rejected'));

COMMENT ON COLUMN shops.status IS 'pending=admin onayı bekleniyor, active=erişim açık, rejected=reddedildi';
