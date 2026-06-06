-- Owner/staff need to read commission config from the staff table directly
-- (used in the mobile staff-edit sheet to pre-fill the commission toggle).
GRANT SELECT (commission_type, commission_rate_bps) ON public.staff TO authenticated;
