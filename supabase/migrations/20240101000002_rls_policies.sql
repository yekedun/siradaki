-- RLS tüm tablolarda aktif
ALTER TABLE public.shops             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.block_slots       ENABLE ROW LEVEL SECURITY;

-- ── shops ────────────────────────────────────────────────────────────────────
-- Herkese açık okuma (müşteri sayfası için).
-- Yazma sadece sahibine.
CREATE POLICY "shops_public_read"   ON public.shops FOR SELECT USING (true);
CREATE POLICY "shops_owner_insert"  ON public.shops FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "shops_owner_update"  ON public.shops FOR UPDATE  USING (owner_user_id = auth.uid());
CREATE POLICY "shops_owner_delete"  ON public.shops FOR DELETE  USING (owner_user_id = auth.uid());

-- ── barbers ──────────────────────────────────────────────────────────────────
-- Herkese açık okuma (müşteri usta seçimi için).
-- Dükkan sahibi: dükkandaki tüm ustaları yönetir.
-- Usta: kendi profilini güncelleyebilir.
CREATE POLICY "barbers_public_read" ON public.barbers FOR SELECT USING (true);

CREATE POLICY "barbers_shop_owner_insert" ON public.barbers FOR INSERT WITH CHECK (
  shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
);
CREATE POLICY "barbers_shop_owner_update" ON public.barbers FOR UPDATE USING (
  shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
);
CREATE POLICY "barbers_shop_owner_delete" ON public.barbers FOR DELETE USING (
  shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
);
-- Usta kendi satırını güncelleyebilir (avatar, display_name)
CREATE POLICY "barbers_self_update" ON public.barbers FOR UPDATE USING (
  user_id = auth.uid()
);

-- ── services ─────────────────────────────────────────────────────────────────
-- Aktif hizmetler herkese açık (booking flow için).
-- Dükkan sahibi: tüm hizmetleri (aktif/pasif) görür ve yönetir.
CREATE POLICY "services_public_read_active" ON public.services
  FOR SELECT USING (is_active = true);

CREATE POLICY "services_shop_owner_read_all" ON public.services
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );
CREATE POLICY "services_shop_owner_insert" ON public.services
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );
CREATE POLICY "services_shop_owner_update" ON public.services
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );
CREATE POLICY "services_shop_owner_delete" ON public.services
  FOR DELETE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );

-- ── appointments ─────────────────────────────────────────────────────────────
-- Dükkan sahibi: dükkandaki tüm randevulara tam erişim.
-- Usta: sadece kendi randevularına erişim.
-- Müşteri web booking: edge function service_role ile yazar → client policy gerekmez.

-- Dükkan sahibi
CREATE POLICY "appointments_shop_owner_select" ON public.appointments
  FOR SELECT USING (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "appointments_shop_owner_insert" ON public.appointments
  FOR INSERT WITH CHECK (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "appointments_shop_owner_update" ON public.appointments
  FOR UPDATE USING (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "appointments_shop_owner_delete" ON public.appointments
  FOR DELETE USING (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );

-- Usta (sadece kendi randevuları)
CREATE POLICY "appointments_barber_select" ON public.appointments
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );
CREATE POLICY "appointments_barber_insert" ON public.appointments
  FOR INSERT WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );
CREATE POLICY "appointments_barber_update" ON public.appointments
  FOR UPDATE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- ── blocks ───────────────────────────────────────────────────────────────────
-- Dükkan sahibi: tüm ustaların bloklarını görür/yönetir.
-- Usta: sadece kendi bloklarını yönetir (walk-in, mola).

-- Dükkan sahibi
CREATE POLICY "blocks_shop_owner_select" ON public.blocks
  FOR SELECT USING (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "blocks_shop_owner_insert" ON public.blocks
  FOR INSERT WITH CHECK (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );
CREATE POLICY "blocks_shop_owner_delete" ON public.blocks
  FOR DELETE USING (
    barber_id IN (
      SELECT b.id FROM public.barbers b
      JOIN   public.shops s ON s.id = b.shop_id
      WHERE  s.owner_user_id = auth.uid()
    )
  );

-- Usta (sadece kendi bloğu)
CREATE POLICY "blocks_barber_select" ON public.blocks
  FOR SELECT USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );
CREATE POLICY "blocks_barber_insert" ON public.blocks
  FOR INSERT WITH CHECK (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );
CREATE POLICY "blocks_barber_delete" ON public.blocks
  FOR DELETE USING (
    barber_id IN (SELECT id FROM public.barbers WHERE user_id = auth.uid())
  );

-- ── widget_tokens ─────────────────────────────────────────────────────────────
-- Sadece dükkan sahibi
CREATE POLICY "widget_tokens_shop_owner_select" ON public.widget_tokens
  FOR SELECT USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );
CREATE POLICY "widget_tokens_shop_owner_insert" ON public.widget_tokens
  FOR INSERT WITH CHECK (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );
CREATE POLICY "widget_tokens_shop_owner_delete" ON public.widget_tokens
  FOR DELETE USING (
    shop_id IN (SELECT id FROM public.shops WHERE owner_user_id = auth.uid())
  );

-- ── mirror tablolar ──────────────────────────────────────────────────────────
-- Realtime abonelikleri için herkese açık okuma.
-- Yazma sadece trigger (service_role) tarafından yapılır.
CREATE POLICY "appointment_slots_public_read" ON public.appointment_slots FOR SELECT USING (true);
CREATE POLICY "block_slots_public_read"       ON public.block_slots       FOR SELECT USING (true);
