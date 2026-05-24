# Shops Owner Column + RLS Audit (2026-05-24)

Snapshot taken against a fresh local Supabase reset (all migrations applied through `20260523000001_add_staff_email.sql`). Feeds Phase 0 / Task 1.2 / Task 1.3 of `docs/superpowers/plans/2026-05-24-owner-flow-refactor.md`.

DB URL: `postgresql://postgres:postgres@127.0.0.1:54202/postgres`
Captured via `docker exec supabase_db_berber-randevu psql -U postgres -d postgres -c "..."`.

---

## A. Columns of `public.shops`

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='shops'
ORDER BY ordinal_position;
```

```
    column_name     |        data_type         | is_nullable |     column_default
--------------------+--------------------------+-------------+-------------------------
 id                 | uuid                     | NO          | gen_random_uuid()
 owner_user_id      | uuid                     | NO          |
 slug               | text                     | NO          |
 display_name       | text                     | NO          |
 bio                | text                     | YES         |
 avatar_url         | text                     | YES         |
 timezone           | text                     | NO          | 'Europe/Istanbul'::text
 working_hours      | jsonb                    | NO          | '{}'::jsonb
 created_at         | timestamp with time zone | NO          | now()
 updated_at         | timestamp with time zone | NO          | now()
 owner_id           | uuid                     | YES         |
 name               | text                     | YES         |
 address            | text                     | YES         |
 commission_enabled | boolean                  | NO          | false
(14 rows)
```

Both `owner_user_id` (NOT NULL) and `owner_id` (nullable) exist on `public.shops`. This is the dual-column state the refactor needs to consolidate.

---

## B. RLS policies on `public.shops`

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='shops';
```

```
     policyname     |  cmd   |                                            qual                                             |                                         with_check
--------------------+--------+---------------------------------------------------------------------------------------------+---------------------------------------------------------------------------------------------
 shops_public_read  | SELECT | true                                                                                        |
 shops_owner_insert | INSERT |                                                                                             | (owner_user_id = ( SELECT auth.uid() AS uid))
 shops_owner_update | UPDATE | ((owner_user_id = ( SELECT auth.uid() AS uid)) OR (owner_id = ( SELECT auth.uid() AS uid))) | ((owner_user_id = ( SELECT auth.uid() AS uid)) OR (owner_id = ( SELECT auth.uid() AS uid)))
 shops_owner_delete | DELETE | ((owner_user_id = ( SELECT auth.uid() AS uid)) OR (owner_id = ( SELECT auth.uid() AS uid))) | 
(4 rows)
```

Notes:
- `shops_owner_insert` uses `owner_user_id` only (no `owner_id` fallback) — INSERTs from clients targeting `owner_id` would fail.
- `shops_owner_update` / `shops_owner_delete` accept either column.

---

## C. All policies in `public` referencing `owner_id`

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
  AND (qual::text LIKE '%owner_id%' OR with_check::text LIKE '%owner_id%');
```

20 rows. Summary by `(tablename, policyname, cmd)`:

| tablename       | policyname                          | cmd    |
|-----------------|-------------------------------------|--------|
| staff           | staff_scheduling_select             | SELECT |
| staff           | staff_scheduling_insert             | INSERT |
| staff           | staff_scheduling_update             | UPDATE |
| staff           | staff_scheduling_delete             | DELETE |
| appointments    | appointments_scheduling_select      | SELECT |
| appointments    | appointments_scheduling_update      | UPDATE |
| staff_schedules | staff_schedules_scheduling_select   | SELECT |
| staff_schedules | staff_schedules_scheduling_insert   | INSERT |
| staff_schedules | staff_schedules_scheduling_update   | UPDATE |
| staff_schedules | staff_schedules_scheduling_delete   | DELETE |
| blocks          | blocks_scheduling_select            | SELECT |
| services        | services_public_or_owner_select     | SELECT |
| services        | services_shop_owner_insert          | INSERT |
| services        | services_shop_owner_update          | UPDATE |
| services        | services_shop_owner_delete          | DELETE |
| widget_tokens   | widget_tokens_shop_owner_select     | SELECT |
| widget_tokens   | widget_tokens_shop_owner_insert     | INSERT |
| widget_tokens   | widget_tokens_shop_owner_delete     | DELETE |
| shops           | shops_owner_update                  | UPDATE |
| shops           | shops_owner_delete                  | DELETE |

Every non-`shops` policy uses the same dual-clause pattern:

```sql
WHERE ((sh.owner_user_id = ( SELECT auth.uid())) OR (sh.owner_id = ( SELECT auth.uid())))
```

(or the equivalent against `staff`/`shops` join). Raw `qual` / `with_check` text for each row was captured during the audit run; consult `pg_policies` directly if exact strings are needed.

---

## D. SECURITY DEFINER functions referencing `owner_id`

```sql
SELECT n.nspname, p.proname
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosecdef=true
  AND pg_get_functiondef(p.oid) LIKE '%owner_id%'
ORDER BY p.proname;
```

```
 nspname |              proname
---------+-----------------------------------
 public  | cancel_appointment_atomic
 public  | complete_appointment_with_revenue
 public  | create_appointment_atomic
 public  | create_block_atomic
 public  | get_commission_report
 public  | get_staff_commission_configs
 public  | update_appointment_atomic
 public  | update_staff_commission_config
(8 rows)
```

---

## E. Owner column sync state

```sql
SELECT COUNT(*) AS total,
       COUNT(owner_id) AS has_owner_id,
       COUNT(owner_user_id) AS has_owner_user_id,
       COUNT(*) FILTER (WHERE owner_id IS NULL AND owner_user_id IS NOT NULL) AS only_owner_user_id,
       COUNT(*) FILTER (WHERE owner_user_id IS NULL AND owner_id IS NOT NULL) AS only_owner_id,
       COUNT(*) FILTER (WHERE owner_id = owner_user_id) AS in_sync
FROM public.shops;
```

```
 total | has_owner_id | has_owner_user_id | only_owner_user_id | only_owner_id | in_sync
-------+--------------+-------------------+--------------------+---------------+---------
     0 |            0 |                 0 |                  0 |             0 |       0
(1 row)
```

Local DB is empty after `db reset` — expected. Re-run this query against production before Task 1.x to assess back-fill risk.

---

## Findings

### Columns on `public.shops`
Both `owner_id` (uuid, nullable) and `owner_user_id` (uuid, NOT NULL) are present. The dual-column state is real and must be reconciled by the refactor.

### Tables (besides `appointments`, `blocks`, `shops`) whose RLS references `owner_id` — must be patched by Task 1.2

- `public.staff` — policies: `staff_scheduling_select`, `staff_scheduling_insert`, `staff_scheduling_update`, `staff_scheduling_delete`
- `public.staff_schedules` — policies: `staff_schedules_scheduling_select`, `staff_schedules_scheduling_insert`, `staff_schedules_scheduling_update`, `staff_schedules_scheduling_delete`
- `public.services` — policies: `services_public_or_owner_select`, `services_shop_owner_insert`, `services_shop_owner_update`, `services_shop_owner_delete`
- `public.widget_tokens` — policies: `widget_tokens_shop_owner_select`, `widget_tokens_shop_owner_insert`, `widget_tokens_shop_owner_delete`

For completeness, the in-scope tables already named in Task 1.2 (`appointments_scheduling_select`, `appointments_scheduling_update`, `blocks_scheduling_select`) also use the dual-clause pattern, plus the `shops` table's own `shops_owner_update` / `shops_owner_delete`.

The plan-mentioned policies `admin_all_appointments` / `admin_all_blocks` do NOT appear in this audit — they either no longer exist locally under those names or were never created in current migrations. Task 1.2 should reconcile naming: the actual scheduling-side policies are `appointments_scheduling_*` / `blocks_scheduling_select`.

### SECURITY DEFINER functions to review in Task 1.3

- `cancel_appointment_atomic`
- `complete_appointment_with_revenue`
- `create_appointment_atomic`
- `create_block_atomic`
- `get_commission_report`
- `get_staff_commission_configs`
- `update_appointment_atomic`
- `update_staff_commission_config`

All eight reference `owner_id` somewhere in their body and must be audited to ensure they tolerate the consolidated owner column (likely switching authoritative comparisons to `owner_user_id` and dropping `owner_id` fallback once back-fill completes).
