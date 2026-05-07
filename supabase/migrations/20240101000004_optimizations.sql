-- Performans index'leri
CREATE INDEX idx_appointments_barber_starts ON public.appointments(barber_id, starts_at);
CREATE INDEX idx_appointments_barber_status ON public.appointments(barber_id, status);
CREATE INDEX idx_blocks_barber_starts       ON public.blocks(barber_id, starts_at);
CREATE INDEX idx_services_barber_active     ON public.services(barber_id, is_active);
CREATE INDEX idx_appointment_slots_barber   ON public.appointment_slots(barber_id);
CREATE INDEX idx_widget_tokens_hash         ON public.widget_tokens(token_hash);

-- Realtime yayınına ekle (BookingFlow ve mobile app subscriptions için)
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;

-- pg_cron: eski veriyi temizle (Dashboard > Extensions'dan pg_cron aktif olmalı)
-- Aktif değilse bu blok sessizce geçilir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-old-appointments',
      '0 3 * * *',
      $sql$DELETE FROM public.appointments
        WHERE status IN ('completed', 'cancelled')
          AND created_at < now() - interval '90 days'$sql$
    );
    PERFORM cron.schedule(
      'cleanup-old-blocks',
      '15 3 * * *',
      $sql$DELETE FROM public.blocks
        WHERE ends_at < now() - interval '30 days'$sql$
    );
  END IF;
END;
$$;
