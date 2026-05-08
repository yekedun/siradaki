-- ── indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_shops_owner          ON public.shops(owner_user_id);
CREATE INDEX idx_shops_slug           ON public.shops(slug);

CREATE INDEX idx_barbers_shop         ON public.barbers(shop_id);
CREATE INDEX idx_barbers_user         ON public.barbers(user_id);
CREATE INDEX idx_barbers_shop_active  ON public.barbers(shop_id, is_active);

CREATE INDEX idx_services_shop_active ON public.services(shop_id, is_active);
CREATE INDEX idx_services_shop_order  ON public.services(shop_id, display_order);

CREATE INDEX idx_appointments_barber_starts ON public.appointments(barber_id, starts_at);
CREATE INDEX idx_appointments_barber_status ON public.appointments(barber_id, status);

CREATE INDEX idx_blocks_barber_starts ON public.blocks(barber_id, starts_at);

CREATE INDEX idx_appointment_slots_barber ON public.appointment_slots(barber_id);
CREATE INDEX idx_block_slots_barber       ON public.block_slots(barber_id);

CREATE INDEX idx_widget_tokens_hash   ON public.widget_tokens(token_hash);
CREATE INDEX idx_widget_tokens_shop   ON public.widget_tokens(shop_id);

-- ── realtime publications ─────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.block_slots;

-- ── pg_cron: eski veri temizleme ──────────────────────────────────────────────
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
