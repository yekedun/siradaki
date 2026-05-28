-- staff_schedules_scheduling_select policy (20260528122000) joins staff and shops
-- filtering by user_id / owner_user_id / owner_id. Without indexes these columns
-- cause a sequential scan on every authenticated schedule read.
CREATE INDEX IF NOT EXISTS idx_staff_user_id         ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_shops_owner_user_id   ON public.shops(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id        ON public.shops(owner_id);
