-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER barbers_updated_at
BEFORE UPDATE ON public.barbers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── appointment_slots mirror trigger ─────────────────────────────────────────
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

-- ── block_slots mirror trigger ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_block_slots()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO block_slots (block_id, barber_id, starts_at, ends_at)
    VALUES (NEW.id, NEW.barber_id, NEW.starts_at, NEW.ends_at);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE block_slots
       SET barber_id = NEW.barber_id,
           starts_at = NEW.starts_at,
           ends_at   = NEW.ends_at
     WHERE block_id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM block_slots WHERE block_id = OLD.id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER blocks_sync_slots
AFTER INSERT OR UPDATE OR DELETE ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.sync_block_slots();

-- ── get_occupied_ranges ───────────────────────────────────────────────────────
-- Belirtilen usta ve tarih için dolu aralıkları döner.
-- Hem appointments hem blocks'u birleştirir.
CREATE OR REPLACE FUNCTION public.get_occupied_ranges(
  p_barber_id UUID,
  p_date      TEXT  -- "YYYY-MM-DD" UTC tarih
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

-- ── assign_any_barber ─────────────────────────────────────────────────────────
-- "Fark Etmez" seçilince çağrılır.
-- Verilen slot'ta müsait olan ve o gün en az randevusu olan ustayı döner.
-- Beraberlik durumunda created_at'a göre sıralanır (round-robin efekti).
-- NULL döndürüyorsa o saatte hiç müsait usta yoktur.
CREATE OR REPLACE FUNCTION public.assign_any_barber(
  p_shop_id   UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at   TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_barber_id UUID;
BEGIN
  SELECT b.id INTO v_barber_id
  FROM   barbers b
  WHERE  b.shop_id   = p_shop_id
    AND  b.is_active = true
    -- Randevu çakışması yok mu?
    AND  NOT EXISTS (
           SELECT 1 FROM appointments a
           WHERE  a.barber_id = b.id
             AND  a.status   <> 'cancelled'
             AND  tstzrange(a.starts_at, a.ends_at, '[)') &&
                  tstzrange(p_starts_at, p_ends_at, '[)')
         )
    -- Blok çakışması yok mu?
    AND  NOT EXISTS (
           SELECT 1 FROM blocks bl
           WHERE  bl.barber_id = b.id
             AND  tstzrange(bl.starts_at, bl.ends_at, '[)') &&
                  tstzrange(p_starts_at, p_ends_at, '[)')
         )
  ORDER BY
    -- O gün en az randevusu olan öne geçer (round-robin efekti)
    (
      SELECT COUNT(*)
      FROM   appointments a2
      WHERE  a2.barber_id = b.id
        AND  a2.starts_at >= date_trunc('day', p_starts_at)
        AND  a2.starts_at <  date_trunc('day', p_starts_at) + interval '1 day'
        AND  a2.status   <> 'cancelled'
    ) ASC,
    b.created_at ASC  -- beraberlik: en eski usta
  LIMIT 1;

  RETURN v_barber_id;
END;
$$;

-- anon kullanıcılar da bu fonksiyonu çağırabilmeli (web booking flow)
GRANT EXECUTE ON FUNCTION public.assign_any_barber(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_occupied_ranges(UUID, TEXT) TO anon, authenticated;
