-- Services belong to a shop, while appointments can outlive or be cancelled
-- before shop/account deletion. Service deletion should not block account
-- deletion; keep the appointment row and clear the optional service reference.
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id)
  REFERENCES public.services(id)
  ON DELETE SET NULL;
