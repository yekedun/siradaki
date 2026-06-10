-- Multi-service booking: an appointment can have N services.
-- appointments.service_id is retained (= primary/first service) for backward-compat reads.

CREATE TABLE IF NOT EXISTS public.appointment_services (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id     UUID NOT NULL REFERENCES public.services(id)     ON DELETE RESTRICT,
  -- price/duration snapshot at booking time so later service edits don't rewrite history
  duration_min   INTEGER NOT NULL CHECK (duration_min > 0),
  price_cents    INTEGER          CHECK (price_cents >= 0),
  sequence_order INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment
  ON public.appointment_services(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_services_service
  ON public.appointment_services(service_id);

ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Shop owner / staff can read rows for appointments in their shop.
-- (Booking writes happen via SECURITY DEFINER RPC, so no INSERT policy is needed for anon.)
CREATE POLICY appointment_services_read_owner
  ON public.appointment_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.appointments a
      JOIN public.staff st ON st.id = a.staff_id
      JOIN public.shops sh ON sh.id = st.shop_id
      WHERE a.id = appointment_services.appointment_id
        AND sh.owner_user_id = auth.uid()
    )
  );

GRANT SELECT ON public.appointment_services TO authenticated;
