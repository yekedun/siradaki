-- Direct clients must not bypass the atomic scheduling RPCs for appointment
-- creation, deletion, or time/staff/service changes. Status-only flows such as
-- cancel/complete remain allowed through their existing policies/RPCs.

DROP POLICY IF EXISTS "appointments_scheduling_insert" ON public.appointments;
DROP POLICY IF EXISTS "appointments_scheduling_delete" ON public.appointments;

CREATE OR REPLACE FUNCTION public.prevent_direct_appointment_scheduling_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('none', 'postgres', 'service_role')
     OR current_setting('app.scheduling_rpc', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'appointment scheduling writes must use atomic RPC'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'appointment scheduling deletes are not allowed'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
     AND (
       NEW.staff_id IS DISTINCT FROM OLD.staff_id
       OR NEW.service_id IS DISTINCT FROM OLD.service_id
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     ) THEN
    RAISE EXCEPTION 'appointment rescheduling must use atomic RPC'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS appointments_prevent_direct_scheduling_writes ON public.appointments;

CREATE TRIGGER appointments_prevent_direct_scheduling_writes
  BEFORE INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_appointment_scheduling_writes();

REVOKE EXECUTE ON FUNCTION public.prevent_direct_appointment_scheduling_writes()
  FROM PUBLIC, anon, authenticated;
