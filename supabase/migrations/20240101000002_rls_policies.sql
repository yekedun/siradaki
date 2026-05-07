-- RLS tüm tablolarda aktif
ALTER TABLE public.barbers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;

-- ── barbers ────────────────────────────────────────────────────────────────
CREATE POLICY "barbers_public_read"   ON public.barbers FOR SELECT USING (true);
CREATE POLICY "barbers_owner_insert"  ON public.barbers FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "barbers_owner_update"  ON public.barbers FOR UPDATE  USING (auth.uid() = auth_user_id);
CREATE POLICY "barbers_owner_delete"  ON public.barbers FOR DELETE  USING (auth.uid() = auth_user_id);

-- ── services ───────────────────────────────────────────────────────────────
-- Aktif hizmetler herkese açık; barber kendi tüm hizmetlerini görebilir
CREATE POLICY "services_public_read_active" ON public.services
  FOR SELECT USING (is_active = true);

CREATE POLICY "services_owner_read_all" ON public.services
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "services_owner_insert" ON public.services
  FOR INSERT WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "services_owner_update" ON public.services
  FOR UPDATE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "services_owner_delete" ON public.services
  FOR DELETE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

-- ── appointments ───────────────────────────────────────────────────────────
-- INSERT: edge function service_role ile yapıyor — client policy'ye gerek yok
-- SELECT/UPDATE: sadece sahibi berber
CREATE POLICY "appointments_owner_select" ON public.appointments
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "appointments_owner_update" ON public.appointments
  FOR UPDATE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

-- ── blocks ─────────────────────────────────────────────────────────────────
-- INSERT: edge function (block-walkin) service_role ile yapıyor
CREATE POLICY "blocks_owner_select" ON public.blocks
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "blocks_owner_insert" ON public.blocks
  FOR INSERT WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "blocks_owner_delete" ON public.blocks
  FOR DELETE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

-- ── widget_tokens ──────────────────────────────────────────────────────────
CREATE POLICY "widget_tokens_owner_select" ON public.widget_tokens
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "widget_tokens_owner_insert" ON public.widget_tokens
  FOR INSERT WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "widget_tokens_owner_delete" ON public.widget_tokens
  FOR DELETE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE auth_user_id = auth.uid())
  );

-- ── appointment_slots ──────────────────────────────────────────────────────
-- Realtime abonelikleri için herkese açık okuma; yazma sadece trigger (service_role)
CREATE POLICY "appointment_slots_public_read" ON public.appointment_slots
  FOR SELECT USING (true);
