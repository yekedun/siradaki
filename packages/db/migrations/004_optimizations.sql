-- ─────────────────────────────────────────────
-- D-02: get_occupied_ranges — index-friendly range filter
--
-- Önceki sürüm `starts_at::date = p_date` kullanıyordu; functional cast
-- mevcut `(barber_id, starts_at)` index'inin kullanılmasını engelliyordu
-- (planner Seq Scan + filter'a düşüyordu). Range karşılaştırmasına
-- dönüştürülerek index range scan'e çekildi.
--
-- Doğrulama (Supabase SQL editor):
--   EXPLAIN ANALYZE SELECT * FROM get_occupied_ranges('<uuid>', current_date);
--   → "Index Scan using appointments_barber_id_starts_at_idx" görülmeli.
-- ─────────────────────────────────────────────
create or replace function public.get_occupied_ranges(
  p_barber_id uuid,
  p_date      date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer as $$
  select starts_at, ends_at
  from public.appointments
  where barber_id = p_barber_id
    and status = 'confirmed'
    and starts_at >= p_date::timestamptz
    and starts_at <  (p_date + 1)::timestamptz
  union all
  select starts_at, ends_at
  from public.blocks
  where barber_id = p_barber_id
    and starts_at >= p_date::timestamptz
    and starts_at <  (p_date + 1)::timestamptz
  order by starts_at;
$$;

grant execute on function public.get_occupied_ranges to anon, authenticated;

-- ─────────────────────────────────────────────
-- D-04: widget_tokens.expires_at temizliği — pg_cron
--
-- Süresi dolmuş token'lar tabloyu şişirir. Her gün 03:00 UTC'de temizle.
-- pg_cron Supabase'de varsayılan etkin değil; extension'ı dashboard veya
-- SQL ile etkinleştirmek gerekir.
-- ─────────────────────────────────────────────
create extension if not exists pg_cron;

-- Idempotent: aynı isimli job varsa kaldır
do $$
begin
  if exists (select 1 from cron.job where jobname = 'clean-expired-widget-tokens') then
    perform cron.unschedule('clean-expired-widget-tokens');
  end if;
end$$;

select cron.schedule(
  'clean-expired-widget-tokens',
  '0 3 * * *',
  $$delete from public.widget_tokens where expires_at is not null and expires_at < now()$$
);
