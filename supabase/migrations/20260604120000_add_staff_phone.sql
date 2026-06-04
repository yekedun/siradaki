-- Add phone and bio columns to staff table
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS bio   text;

-- Allow staff to update their own profile fields (name, phone, bio)
-- push_token and notification_prefs already granted in 20260530100000
GRANT UPDATE (name, phone, bio) ON public.staff TO authenticated;
