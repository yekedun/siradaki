-- barber_id→staff_id rename sonrası PostgreSQL index sütun referansını otomatik
-- güncelledi; ama index ADIYLA yeni canonical adlar 20260525250000'de eklendi.
-- Sonuç: aynı sütun kümesi üzerinde iki index var.
--   idx_appointments_barber_starts  ≡  idx_appointments_staff_starts
--   idx_appointments_barber_status  ≡  idx_appointments_staff_status
--   idx_blocks_barber_starts        ≡  idx_blocks_staff_starts
-- Eski adları kaldır; yeniler IF NOT EXISTS ile zaten var.

DROP INDEX IF EXISTS public.idx_appointments_barber_starts;
DROP INDEX IF EXISTS public.idx_appointments_barber_status;
DROP INDEX IF EXISTS public.idx_blocks_barber_starts;
