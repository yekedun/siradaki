-- get_occupied_ranges: belirtilen berber ve tarih için dolu aralıkları döner
-- Hem appointments hem blocks tablosunu birleştirir
CREATE OR REPLACE FUNCTION public.get_occupied_ranges(
  p_barber_id UUID,
  p_date      TEXT   -- "YYYY-MM-DD" formatında UTC tarih
)
RETURNS TABLE (starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.starts_at, a.ends_at
  FROM   appointments a
  WHERE  a.barber_id = p_barber_id
    AND  a.starts_at >= p_date::date::timestamptz
    AND  a.starts_at <  (p_date::date + interval '1 day')::timestamptz
    AND  a.status   <> 'cancelled'
  UNION ALL
  SELECT b.starts_at, b.ends_at
  FROM   blocks b
  WHERE  b.barber_id = p_barber_id
    AND  b.starts_at >= p_date::date::timestamptz
    AND  b.starts_at <  (p_date::date + interval '1 day')::timestamptz
  ORDER  BY starts_at;
$$;

-- sync_appointment_slots: appointments INSERT/UPDATE/DELETE → appointment_slots mirror'ı günceller
CREATE OR REPLACE FUNCTION public.sync_appointment_slots()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO appointment_slots (appointment_id, barber_id, starts_at, ends_at)
    VALUES (NEW.id, NEW.barber_id, NEW.starts_at, NEW.ends_at)
    ON CONFLICT (appointment_id) DO UPDATE SET
      barber_id = EXCLUDED.barber_id,
      starts_at = EXCLUDED.starts_at,
      ends_at   = EXCLUDED.ends_at;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE appointment_slots
       SET barber_id = NEW.barber_id,
           starts_at = NEW.starts_at,
           ends_at   = NEW.ends_at
     WHERE appointment_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM appointment_slots WHERE appointment_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER appointments_sync_slots
AFTER INSERT OR UPDATE OR DELETE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_slots();

-- barbers.updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER barbers_updated_at
BEFORE UPDATE ON public.barbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
