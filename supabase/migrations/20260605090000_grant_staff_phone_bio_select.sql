-- Fix: phone and bio columns were added to staff in 20260604120000_add_staff_phone
-- but only UPDATE was granted — SELECT was omitted, causing the booking page
-- to fail fetching staff (permission denied for column phone), which made the
-- staff picker and WhatsApp button both disappear.

GRANT SELECT (phone, bio) ON public.staff TO anon, authenticated;
