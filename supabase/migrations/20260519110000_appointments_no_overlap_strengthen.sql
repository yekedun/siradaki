-- M-4: appointments_no_overlap EXCLUDE koşulunu güçlendir.
--
-- Mevcut constraint WHERE (status = 'confirmed') kullanıyor; bu durumda
-- completed/pending gibi durumlardaki randevular çakışma korumasından muaf.
-- schedule_has_conflict zaten status <> 'cancelled' kontrolü yapıyor, ancak
-- DB seviyesindeki EXCLUDE bunu karşılamıyordu.
-- Orijinal şema WHERE (status <> 'cancelled') kullanıyordu — bu migration
-- eski korumayı geri yükler.

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status <> 'cancelled');
