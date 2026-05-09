-- Add customer_notes to appointments
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS customer_notes text;
