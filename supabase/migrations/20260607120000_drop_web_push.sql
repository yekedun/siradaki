-- Tarayıcı (web) push tamamen kaldırıldı.
-- Müşteriye tarayıcı bildirimi göndermiyoruz; ilgili cron, tablo ve
-- edge fonksiyonları (appointment-reminder-push, save-push-subscription) silindi.
-- Mobil (Expo) push ve diğer bildirim akışları etkilenmez.

do $$ begin
  perform cron.unschedule('appointment-reminder-push');
exception when others then null;
end $$;

drop table if exists appointment_web_push_subscriptions;
