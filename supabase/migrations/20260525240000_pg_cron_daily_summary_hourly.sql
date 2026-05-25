-- daily-summary-push cron'u her 15 dakikada bir tetikle.
-- Edge fonksiyonu her 15 dakikada bir calisir ve her dukkan icin
-- "acilis saati - 15dk" tam slotunu kendi icinde hesaplar (Europe/Istanbul).
-- Boylece her dukkana ozel zaman icin ayri cron job yonetmeye gerek kalmaz
-- ve tetikleme acilistan tam 15dk once dusebilir.

do $$ begin
  perform cron.unschedule('daily-summary-push');
exception when others then null;
end $$;

select cron.schedule(
  'daily-summary-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_url', true) || '/functions/v1/daily-summary-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
