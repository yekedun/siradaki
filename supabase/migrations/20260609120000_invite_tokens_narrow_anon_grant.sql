-- invite_tokens üzerindeki anon SELECT grant, created_by (auth.users FK) ve
-- used_by sütunlarını gereksiz yere açıyor.
-- Anon'un ihtiyacı: token'ı doğrulamak (token), hangi dükkan (shop_id),
-- süresi geçmiş mi (expires_at), kullanılmış mı (used_at).
-- created_by ve used_by auth kullanıcı ID'leri — dışarıya açık olmamalı.

REVOKE SELECT ON public.invite_tokens FROM anon;

GRANT SELECT (
  id,
  token,
  shop_id,
  expires_at,
  used_at,
  created_at
) ON public.invite_tokens TO anon;
