-- get_server_time(): Sunucu UTC zamanını döndürür.
-- Mobil istemci bu RPC'yi çağırarak cihaz saatinden bağımsız
-- "şimdiki an" bilgisi alır; geçmiş slot filtrelemesi buna göre yapılır.
create or replace function get_server_time()
returns timestamptz
language sql
security definer
stable
as $$ select now() $$;

grant execute on function get_server_time() to authenticated;
