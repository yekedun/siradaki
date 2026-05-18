-- customer_profiles tablosu arşivlenen müşteri uygulamasına aitti.
-- Aktif uygulama kodu referansı yok; RLS politikaları geçerliydi ama hiçbir
-- edge function veya mobil/web kodu bu tabloyu sorgulamıyordu.
DROP TABLE IF EXISTS public.customer_profiles;
