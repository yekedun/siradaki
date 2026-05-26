-- Normalize staff identity after invite rollout.
--
-- Some remote data had duplicate staff rows for the same (shop_id, user_id).
-- Keep the row with the most scheduling references, merge duplicate references
-- into it, then enforce one staff identity per shop/user.

CREATE TEMP TABLE staff_duplicate_map ON COMMIT DROP AS
WITH ref_counts AS (
  SELECT
    st.id,
    (
      SELECT COUNT(*) FROM public.appointments a WHERE a.staff_id = st.id
    ) + (
      SELECT COUNT(*) FROM public.blocks b WHERE b.staff_id = st.id
    ) + (
      SELECT COUNT(*) FROM public.staff_schedules ss WHERE ss.staff_id = st.id
    ) AS ref_count
  FROM public.staff st
),
ranked AS (
  SELECT
    st.id,
    FIRST_VALUE(st.id) OVER (
      PARTITION BY st.shop_id, st.user_id
      ORDER BY rc.ref_count DESC, st.created_at ASC, st.id ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY st.shop_id, st.user_id
      ORDER BY rc.ref_count DESC, st.created_at ASC, st.id ASC
    ) AS rn
  FROM public.staff st
  JOIN ref_counts rc ON rc.id = st.id
  WHERE st.user_id IS NOT NULL
)
SELECT id AS old_id, keep_id
FROM ranked
WHERE rn > 1;

UPDATE public.appointments a
SET staff_id = m.keep_id
FROM staff_duplicate_map m
WHERE a.staff_id = m.old_id;

UPDATE public.blocks b
SET staff_id = m.keep_id
FROM staff_duplicate_map m
WHERE b.staff_id = m.old_id;

UPDATE public.appointment_slots s
SET staff_id = m.keep_id
FROM staff_duplicate_map m
WHERE s.staff_id = m.old_id;

UPDATE public.block_slots s
SET staff_id = m.keep_id
FROM staff_duplicate_map m
WHERE s.staff_id = m.old_id;

DELETE FROM public.staff_schedules ss
USING staff_duplicate_map m
WHERE ss.staff_id = m.old_id
  AND EXISTS (
    SELECT 1
    FROM public.staff_schedules keep_ss
    WHERE keep_ss.staff_id = m.keep_id
      AND keep_ss.day_of_week = ss.day_of_week
  );

UPDATE public.staff_schedules ss
SET staff_id = m.keep_id
FROM staff_duplicate_map m
WHERE ss.staff_id = m.old_id;

UPDATE public.staff keep
SET
  is_active = keep.is_active OR old.is_active,
  role = CASE
    WHEN keep.role = 'admin'::public.staff_role OR old.role = 'admin'::public.staff_role
      THEN 'admin'::public.staff_role
    ELSE keep.role
  END,
  email = COALESCE(NULLIF(keep.email, ''), NULLIF(old.email, ''), keep.email),
  notification_prefs = COALESCE(keep.notification_prefs, old.notification_prefs)
FROM public.staff old
JOIN staff_duplicate_map m ON m.old_id = old.id
WHERE keep.id = m.keep_id;

DELETE FROM public.staff old
USING staff_duplicate_map m
WHERE old.id = m.old_id;

DROP INDEX IF EXISTS public.staff_shop_user_idx;

CREATE UNIQUE INDEX IF NOT EXISTS staff_shop_user_unique_idx
  ON public.staff(shop_id, user_id)
  WHERE user_id IS NOT NULL;
