-- Her 15 dakikada randevu hatırlatma push'u gönder.
-- Edge fn kendi içinde 24h ve 1h pencerelerini hesaplar, çift gönderimi önler.

select cron.schedule(
  'appointment-reminder-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://lkovehtujarfwcvtahoq.supabase.co/functions/v1/appointment-reminder-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1
      )
    ),
    body    := '{}'::jsonb
  ) as request_id;
  $$
);
