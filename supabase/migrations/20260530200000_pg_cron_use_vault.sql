-- pg_cron job'unu Supabase Vault'tan service_role_key okuyacak şekilde yeniden planla.
-- ALTER DATABASE ile app.* parametresi set edilemiyor (Supabase hosted kısıtlaması).
-- URL public olduğu için hardcode edildi; key Vault'tan alınıyor.
--
-- Önkoşul: Dashboard → Vault → "service_role_key" adında secret oluşturulmuş olmalı.

do $$ begin
  perform cron.unschedule('daily-summary-push');
exception when others then null;
end $$;

select cron.schedule(
  'daily-summary-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url     := 'https://lkovehtujarfwcvtahoq.supabase.co/functions/v1/daily-summary-push',
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
