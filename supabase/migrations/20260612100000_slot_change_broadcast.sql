-- ── Slot değişimi broadcast'i ─────────────────────────────────────────────────
-- Public booking sayfası (web) anon çalışır ve RLS gereği appointments/blocks
-- tablolarını dinleyemez (postgres_changes RLS'e tabidir; ayrıca müşteri PII'si
-- anon'a açılamaz). Bu yüzden randevu/blok değişimlerinde PII İÇERMEYEN bir
-- broadcast mesajı yayınlanır: topic = shop_slots:{shop_id},
-- payload = { staff_id, dates, table, op }.
--
-- Kanal public'tir (private=false): payload yalnızca personel UUID'si ve tarih
-- içerir; dinleyen taraf sadece "müsaitliği yeniden çek" sinyali olarak kullanır.
-- Yazma yolu ne olursa olsun (widget-book, app-book, update_appointment_atomic,
-- iptal akışları, blok CRUD) trigger tek choke-point olarak tetiklenir.

CREATE OR REPLACE FUNCTION public.broadcast_slot_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff_id uuid;
  v_shop_id  uuid;
  v_timezone text;
  v_dates    text[] := '{}';
  v_old_date text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_staff_id := OLD.staff_id;
  ELSE
    v_staff_id := NEW.staff_id;
  END IF;

  SELECT s.shop_id, COALESCE(sh.timezone, 'Europe/Istanbul')
    INTO v_shop_id, v_timezone
    FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
   WHERE s.id = v_staff_id;

  -- Personel/dükkan bulunamazsa (ör. cascade delete sırası) sessizce çık.
  IF v_shop_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Etkilenen günler dükkan timezone'unda hesaplanır. UPDATE'te randevu başka
  -- güne taşınmış olabilir — eski ve yeni gün birlikte yayınlanır.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_dates := array_append(v_dates, to_char(NEW.starts_at AT TIME ZONE v_timezone, 'YYYY-MM-DD'));
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_old_date := to_char(OLD.starts_at AT TIME ZONE v_timezone, 'YYYY-MM-DD');
    IF NOT (v_old_date = ANY (v_dates)) THEN
      v_dates := array_append(v_dates, v_old_date);
    END IF;
  END IF;

  BEGIN
    PERFORM realtime.send(
      jsonb_build_object(
        'staff_id', v_staff_id,
        'dates',    to_jsonb(v_dates),
        'table',    TG_TABLE_NAME,
        'op',       TG_OP
      ),
      'slots_changed',
      'shop_slots:' || v_shop_id::text,
      false  -- public kanal — payload PII içermez
    );
  EXCEPTION WHEN OTHERS THEN
    -- Broadcast başarısızlığı randevu yazma işlemini asla geri almamalı.
    RAISE WARNING 'broadcast_slot_change failed: %', SQLERRM;
  END;

  RETURN NULL;  -- AFTER trigger; dönüş değeri kullanılmaz
END;
$$;

-- Trigger fonksiyonu API üzerinden çağrılamaz (dönüş tipi trigger) ama yine de
-- yüzeyi daraltalım.
REVOKE ALL ON FUNCTION public.broadcast_slot_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_appointments_slot_broadcast ON public.appointments;
CREATE TRIGGER trg_appointments_slot_broadcast
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_slot_change();

DROP TRIGGER IF EXISTS trg_blocks_slot_broadcast ON public.blocks;
CREATE TRIGGER trg_blocks_slot_broadcast
  AFTER INSERT OR UPDATE OR DELETE ON public.blocks
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_slot_change();
