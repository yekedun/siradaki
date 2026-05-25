-- Staff bildirim tercihleri.
--   new_appointment: yeni randevu push (varsayilan: true)
--   cancellation:    iptal push     (varsayilan: true)
--   daily_summary:   gunluk ozet    (varsayilan: true)
-- Personel icin yalnizca daily_summary toggle gosterilir; new_appointment ve
-- cancellation her zaman aktif. Dukkan sahibi (staff.user_id = shops.owner_user_id)
-- her uc tercihi de degistirebilir; edge fonksiyonlari owner gonderimini bu
-- alana bakarak filtreler.

alter table public.staff
  add column if not exists notification_prefs jsonb
  not null
  default '{"new_appointment":true,"cancellation":true,"daily_summary":true}'::jsonb;

comment on column public.staff.notification_prefs is
  'Personel bildirim tercihleri. Owner icin tum anahtarlar; personel icin yalnizca daily_summary aktif kullanilir.';
