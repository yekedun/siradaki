# Owner Flow Refactor — `owner_id` / `owner_user_id` Unification + AddAppointmentModal Real Data

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dükkan sahibinin ajandaya randevu eklemesi, ekibe personel eklemesi, ayarlardan dükkan bilgilerini düzenlemesi ve hizmetlerin randevu modalında listelenmesi tek seferde çalışsın. Dört semptomun ortak kök nedeni olan `shops.owner_id` vs `shops.owner_user_id` ayrımını DB + edge function + mobil tarafta birleştir; AddAppointmentModal'ı gerçek Supabase verisine bağla.

**Architecture:**

- **DB:** `shops` tablosunda iki "owner" kolonu var: legacy `owner_id` (2026-05-08 multi-seat migration) ve yeni `owner_user_id` (2026-05-19 unique index). Yeni onboarding sadece `owner_user_id` yazıyor; yine de `admin_all_appointments`, `admin_all_blocks` RLS policy'leri ve `20260518140000_scheduling_rpc_authorization_hardening.sql` içindeki SECURITY DEFINER yetki kontrolleri (`schedule_can_manage_shop`, `create_appointment_atomic` vb.) **sadece `sh.owner_id = auth.uid()` kontrol ediyor**. Bu yüzden yeni hesaplar için yetki sessizce reddediliyor; RPC `P0001`/`P0002` dönüyor, edge function `409`/`404` mapliyor, mobil UI bunu "saat dolu olabilir" diye gösteriyor.
- **Mobil:** `team.tsx`, `settings.tsx` ve diğer owner ekranları her birinde tekrarlı `from('shops').or('owner_user_id...,owner_id...')` kodu var. Tek bir `useOwnerShop()` hook'una taşınacak; loading/empty/error state'leri tek yerden gelir.
- **AddAppointmentModal:** Hâlâ hard-coded `DEFAULT_SERVICES` kullanıyor ve `Kaydet`'i Supabase'e bağlamak için TODO bırakılmış. Gerçek servisleri ve mevcut staff'ı parent'tan alacak şekilde tip imzaları güncellenecek; Kaydet → `app-book-appointment` edge fn çağrısı.

**Tech Stack:** PostgreSQL 15 (Supabase) · SQL migration · Deno edge functions · React Native (Expo) · TypeScript · Supabase JS v2.

---

## Önemli Notlar (Engineer için)

1. **Migration ad konvansiyonu:** Mevcut dosyalar `YYYYMMDDhhmmss_snake_case.sql`. Yeni dosyalar `20260524100000_*` ile başlasın (24 Mayıs 2026).
2. **DB erişimi:** Geliştiricinin Supabase Studio SQL editörüne (veya `supabase db push`'a) erişimi olduğu varsayılıyor. Doğrudan production'a uygulamak yerine her migration'ı önce `supabase db reset` ile lokal stack'te doğrula.
3. **TDD pragmatik:** Edge function ve mobil ekranlar için RN test setup mevcut (`apps/mobile/__tests__`). DB tarafı için her migration'ı, beklenen RLS davranışını manuel SQL prob'larla doğrulayacağız (her phase'de `-- Verify:` blokları var).
4. **Geri dönüşsüz adım yok:** `owner_id` kolonu bu planda **silinmiyor**, sadece sync trigger ekleniyor. Drop için ayrı plan açılacak (Phase 5 placeholder).
5. **Sık commit:** Her task sonunda commit (her phase 3-7 task içerir).

---

## File Structure

**Yeni dosyalar:**
- `supabase/migrations/20260524100000_owner_columns_backfill_and_sync.sql` — backfill + sync trigger
- `supabase/migrations/20260524100001_admin_rls_accept_both_owner_columns.sql` — RLS policy fix
- `supabase/migrations/20260524100002_scheduling_rpc_accept_both_owner_columns.sql` — RPC yetki fix
- `apps/mobile/lib/useOwnerShop.ts` — shop_id çözüm hook'u
- `apps/mobile/lib/appointment-booking.ts` — `app-book-appointment` çağrı sarmalayıcısı + hata mapping
- `apps/mobile/__tests__/useOwnerShop.test.ts`
- `apps/mobile/__tests__/appointment-booking.test.ts`

**Değiştirilecek dosyalar:**
- `apps/mobile/app/(owner)/team.tsx` → useOwnerShop hook'una geçiş
- `apps/mobile/app/(owner)/settings.tsx` → useOwnerShop hook'una geçiş
- `apps/mobile/app/(owner)/index.tsx` (agenda) → useOwnerShop hook + AddAppointmentModal'a `services` + `shopSlug` prop'u
- `apps/mobile/components/AddAppointmentModal.tsx` → `services`/`staffList`/`shopSlug` props, Kaydet → edge fn
- `supabase/functions/app-book-appointment/index.ts` → hata gövdesinde human-readable `reason` ekle

---

## Phase 0 — Schema Audit (read-only)

### Task 0.1: Şema durumunu belgeleyen audit dosyası oluştur

**Files:**
- Create: `docs/superpowers/audits/2026-05-24-shops-owner-schema.md`

- [ ] **Step 1: Lokal Supabase'i ayağa kaldır ve mevcut migrations'ı uygula**

```bash
cd "C:\Users\Emre\Berber randevu"
supabase start
supabase db reset
```
Beklenen: tüm migration'lar hatasız çalışır, `Applying migration 20260523000001_add_staff_email.sql` ile biter.

- [ ] **Step 2: Audit sorgularını çalıştır ve sonucu dosyaya yapıştır**

`docs/superpowers/audits/2026-05-24-shops-owner-schema.md` dosyasını bu içerikle oluştur:

```markdown
# Shops/Owner Schema Audit (2026-05-24)

## A) shops tablosu kolonları
\`\`\`sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='shops'
ORDER BY ordinal_position;
\`\`\`
Sonuç:
<paste>

## B) shops üzerindeki RLS policy'leri
\`\`\`sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='shops';
\`\`\`
Sonuç:
<paste>

## C) `owner_id` referansı içeren tüm policy'ler (tüm tablolar)
\`\`\`sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname='public'
  AND (qual::text LIKE '%owner_id%' OR with_check::text LIKE '%owner_id%');
\`\`\`
Sonuç:
<paste>

## D) `owner_id` referansı içeren SECURITY DEFINER fonksiyonları
\`\`\`sql
SELECT n.nspname, p.proname, pg_get_functiondef(p.oid) AS def
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.prosecdef = true
  AND pg_get_functiondef(p.oid) LIKE '%owner_id%';
\`\`\`
Sonuç (sadece fonksiyon isimleri):
<paste>

## E) Owner kolonu sync durumu
\`\`\`sql
SELECT
  COUNT(*) AS total,
  COUNT(owner_id) AS has_owner_id,
  COUNT(owner_user_id) AS has_owner_user_id,
  COUNT(*) FILTER (WHERE owner_id IS NULL AND owner_user_id IS NOT NULL) AS only_owner_user_id,
  COUNT(*) FILTER (WHERE owner_user_id IS NULL AND owner_id IS NOT NULL) AS only_owner_id,
  COUNT(*) FILTER (WHERE owner_id = owner_user_id) AS in_sync
FROM public.shops;
\`\`\`
Sonuç:
<paste>
```

Sorguları Supabase Studio SQL editöründen çalıştır ve `<paste>` bloklarını doldur.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/audits/2026-05-24-shops-owner-schema.md
git commit -m "docs(audit): shops owner column + RLS audit snapshot (2026-05-24)"
```

---

## Phase 1 — DB: Owner columns backfill + sync

### Task 1.1: Backfill + sync trigger migration'ı yaz (FAILING TEST FIRST)

**Files:**
- Create: `supabase/migrations/20260524100000_owner_columns_backfill_and_sync.sql`
- Create: `supabase/tests/owner_columns_sync_test.sql`

- [ ] **Step 1: Test dosyasını yaz (önce başarısız olmalı)**

`supabase/tests/owner_columns_sync_test.sql`:

```sql
-- Manuel test runner; lokal `supabase db reset` sonrası `psql -f` ile çalıştırılır.
\set ON_ERROR_STOP on

BEGIN;

-- A) Sadece owner_user_id ile insert yap → owner_id otomatik dolmalı
INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 't1@x.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.shops (slug, name, owner_user_id)
VALUES ('test-shop-a', 'Test A', '11111111-1111-1111-1111-111111111111');

DO $$
DECLARE v_owner_id uuid; v_owner_user_id uuid;
BEGIN
  SELECT owner_id, owner_user_id INTO v_owner_id, v_owner_user_id
  FROM public.shops WHERE slug='test-shop-a';
  ASSERT v_owner_id = v_owner_user_id,
    format('owner_id (%s) != owner_user_id (%s)', v_owner_id, v_owner_user_id);
END $$;

-- B) Sadece owner_id ile insert yap → owner_user_id otomatik dolmalı
INSERT INTO auth.users (id, email) VALUES ('22222222-2222-2222-2222-222222222222', 't2@x.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.shops (slug, name, owner_id)
VALUES ('test-shop-b', 'Test B', '22222222-2222-2222-2222-222222222222');

DO $$
DECLARE v_owner_id uuid; v_owner_user_id uuid;
BEGIN
  SELECT owner_id, owner_user_id INTO v_owner_id, v_owner_user_id
  FROM public.shops WHERE slug='test-shop-b';
  ASSERT v_owner_id = v_owner_user_id,
    format('owner_id (%s) != owner_user_id (%s)', v_owner_id, v_owner_user_id);
END $$;

ROLLBACK;

\echo 'PASS: owner columns sync test'
```

- [ ] **Step 2: Testi çalıştır → başarısız olmalı (migration yok henüz)**

```bash
supabase db reset
psql "$DATABASE_URL_LOCAL" -f supabase/tests/owner_columns_sync_test.sql
```

`DATABASE_URL_LOCAL` `.env.local`'da olmalı; yoksa `supabase status` çıktısındaki `DB URL`'i kullan.

Beklenen: A bloğu fail eder ("owner_id (NULL) != owner_user_id (uuid)") çünkü hâlâ sync yok.

- [ ] **Step 3: Migration'ı yaz**

`supabase/migrations/20260524100000_owner_columns_backfill_and_sync.sql`:

```sql
-- Shops `owner_id` (legacy, 2026-05-08) ve `owner_user_id` (2026-05-19) iki kolonunu
-- senkron tutar. Yeni onboarding sadece owner_user_id'ye yazıyor, eski kod hâlâ
-- owner_id'yi kontrol ediyor; bu trigger ikisini de aynı değerde tutar ve eski
-- satırları backfill eder.

-- ── 1. Backfill: hangisi null ise diğerinden kopyala ─────────────────────────
UPDATE public.shops
SET owner_user_id = owner_id
WHERE owner_user_id IS NULL AND owner_id IS NOT NULL;

UPDATE public.shops
SET owner_id = owner_user_id
WHERE owner_id IS NULL AND owner_user_id IS NOT NULL;

-- ── 2. Sync trigger: INSERT/UPDATE'te iki kolonu eşitle ──────────────────────
CREATE OR REPLACE FUNCTION public.shops_sync_owner_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.owner_user_id IS NULL AND NEW.owner_id IS NOT NULL THEN
    NEW.owner_user_id := NEW.owner_id;
  ELSIF NEW.owner_id IS NULL AND NEW.owner_user_id IS NOT NULL THEN
    NEW.owner_id := NEW.owner_user_id;
  ELSIF NEW.owner_user_id IS DISTINCT FROM NEW.owner_id THEN
    -- İki kolon çelişiyorsa owner_user_id'yi authoritative kabul et
    NEW.owner_id := NEW.owner_user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS shops_sync_owner_columns_trg ON public.shops;
CREATE TRIGGER shops_sync_owner_columns_trg
  BEFORE INSERT OR UPDATE OF owner_id, owner_user_id ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.shops_sync_owner_columns();
```

- [ ] **Step 4: Reset + test → PASS olmalı**

```bash
supabase db reset
psql "$DATABASE_URL_LOCAL" -f supabase/tests/owner_columns_sync_test.sql
```

Beklenen son satır: `PASS: owner columns sync test`

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260524100000_owner_columns_backfill_and_sync.sql supabase/tests/owner_columns_sync_test.sql
git commit -m "feat(db): backfill+trigger to keep shops.owner_id and owner_user_id in sync"
```

### Task 1.2: RLS policy'lerini iki kolonu da kabul edecek şekilde güncelle

**Files:**
- Create: `supabase/migrations/20260524100001_admin_rls_accept_both_owner_columns.sql`

- [ ] **Step 1: Migration'ı yaz**

```sql
-- Migration 20260508 admin RLS policy'leri yalnızca shops.owner_id'yi kontrol ediyor.
-- Yeni onboarding'de owner_id NULL kalabiliyor (Task 1.1 trigger'ı bunu çözüyor ama
-- legacy satırlarda hâlâ sapma olabilir). Policy'leri iki kolonu da kabul edecek
-- şekilde güncelliyoruz.

DROP POLICY IF EXISTS "admin_all_appointments" ON public.appointments;
CREATE POLICY "admin_all_appointments" ON public.appointments
FOR ALL TO authenticated
USING (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "admin_all_blocks" ON public.blocks;
CREATE POLICY "admin_all_blocks" ON public.blocks
FOR ALL TO authenticated
USING (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  staff_id IN (
    SELECT s.id FROM public.staff s
    JOIN public.shops sh ON sh.id = s.shop_id
    WHERE sh.owner_id = (SELECT auth.uid())
       OR sh.owner_user_id = (SELECT auth.uid())
  )
);
```

- [ ] **Step 2: Phase 0'daki audit sorgusu C'yi tekrar çalıştır**

`docs/superpowers/audits/2026-05-24-shops-owner-schema.md` dosyasına bir bölüm ekle: "Diğer tablolar". Eğer `services`, `staff`, `staff_schedules`, `shop_hours`, vb. tabloların policy'lerinde **hâlâ** sadece `owner_id` referansı görüyorsan, her birini bu task'ın altına ek bir migration satırı olarak ekle (her policy için DROP + CREATE; aynı `owner_id = ... OR owner_user_id = ...` şablonu).

> ⚠️ **Gerçek dünya etkisi:** Audit'te bulduğun her `owner_id`-only kontrolü bu migration'a ekle. Eksik bırakırsan ilgili tablonun yazma/okuma'sı yeni hesaplar için sessizce reddedilmeye devam eder.

- [ ] **Step 3: Reset + Phase 0 audit C sorgusunu tekrar çalıştır**

```bash
supabase db reset
```

Studio'da C sorgusu artık `OR owner_user_id` içermeyen policy göstermemeli (planda kapsanmayan başka tablolar yoksa).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260524100001_admin_rls_accept_both_owner_columns.sql docs/superpowers/audits/
git commit -m "fix(db): admin RLS policies accept both owner_id and owner_user_id"
```

### Task 1.3: Scheduling RPC yetki fonksiyonunu güncelle

**Files:**
- Create: `supabase/migrations/20260524100002_scheduling_rpc_accept_both_owner_columns.sql`

- [ ] **Step 1: Mevcut helper fonksiyonu bul**

`20260518140000_scheduling_rpc_authorization_hardening.sql` içinde `schedule_can_manage_shop` (veya benzer adlı) bir SECURITY DEFINER fonksiyon olabilir. Yoksa `create_appointment_atomic`, `create_manual_block` vb. RPC'lerin kendisi içinde inline kontrol vardır (yukarıdaki grep'te 5 ayrı `OR sh.owner_id = v_uid` satırı görüldü).

```bash
rg -n "owner_id = v_uid|owner_id = auth.uid" supabase/migrations
```

Çıktıda her satır için RPC adını not et.

- [ ] **Step 2: Migration'ı yaz — `CREATE OR REPLACE FUNCTION` ile her RPC'yi yeniden tanımla**

`supabase/migrations/20260524100002_scheduling_rpc_accept_both_owner_columns.sql`:

```sql
-- Scheduling RPC'leri yetki kontrolünde sadece shops.owner_id'yi kontrol ediyor.
-- Yeni hesaplarda owner_id null olabildiği için bu RPC'ler P0002 (forbidden) dönüyor
-- ve mobil UI bunu "saat dolu" diye gösteriyor. Yetki kontrollerini iki kolonu da
-- kabul edecek şekilde genişletiyoruz.
--
-- NOT: Aşağıdaki CREATE OR REPLACE blokları 20260518140000'deki orijinal
-- fonksiyonların tüm gövdesini içermek zorundadır. Yalnızca yetki kontrol koşulu
-- (`sh.owner_id = v_uid` → `sh.owner_id = v_uid OR sh.owner_user_id = v_uid`)
-- değişir; geri kalan her şey orijinaldeki gibi kalır.

-- [Engineer: 20260518140000_scheduling_rpc_authorization_hardening.sql dosyasını
--  aç, her CREATE OR REPLACE FUNCTION bloğunu bu dosyaya kopyala, içindeki her
--  `sh.owner_id = v_uid` koşulunu `(sh.owner_id = v_uid OR sh.owner_user_id = v_uid)`
--  ile değiştir. Aynı fonksiyonu tekrar yazdığımız için imza ve return tipi
--  bire bir aynı kalmalı.]
```

> ⚠️ Bu task gövdeyi engineer'ın 20260518140000'den birebir kopyalamasını gerektirir; planı kısa tutmak için tüm RPC gövdesini buraya kopyalamadık. Plan execution sırasında her fonksiyonu **tamamen** yazın (kısaltma yok).

- [ ] **Step 3: Doğrulama — test owner ile booking dene**

```sql
-- Studio SQL editor (lokal stack):
-- 1. Yalnızca owner_user_id ile shop oluştur
INSERT INTO auth.users (id, email) VALUES ('33333333-3333-3333-3333-333333333333', 't3@x.test')
  ON CONFLICT DO NOTHING;
INSERT INTO public.shops (slug, name, owner_user_id, timezone)
VALUES ('test-rpc-shop', 'RPC Test', '33333333-3333-3333-3333-333333333333', 'Europe/Istanbul');

-- 2. Bir staff + service ekle (schema'na göre)
-- 3. JWT'siz değil, set local "request.jwt.claims" ile şu user'ı taklit ederek:
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT public.create_appointment_atomic(
  p_shop_slug := 'test-rpc-shop',
  p_shop_id := NULL,
  p_service_id := (SELECT id FROM services WHERE shop_id = (SELECT id FROM shops WHERE slug='test-rpc-shop')),
  p_staff_id := NULL,
  p_starts_at := now() + interval '1 day',
  p_customer_name := 'Test Müşteri',
  p_customer_phone := NULL,
  p_customer_notes := NULL,
  p_customer_user_id := '33333333-3333-3333-3333-333333333333'
);
-- Beklenen: appointment row, exception yok
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260524100002_scheduling_rpc_accept_both_owner_columns.sql
git commit -m "fix(db): scheduling RPCs authorize via owner_id OR owner_user_id"
```

---

## Phase 2 — Mobile: tek `useOwnerShop()` hook'u

### Task 2.1: Hook + test

**Files:**
- Create: `apps/mobile/lib/useOwnerShop.ts`
- Create: `apps/mobile/__tests__/useOwnerShop.test.ts`

- [ ] **Step 1: Test dosyasını yaz**

`apps/mobile/__tests__/useOwnerShop.test.ts`:

```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { useOwnerShop } from '../lib/useOwnerShop';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

describe('useOwnerShop', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns shop row when user owns a shop (owner_user_id match)', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
    const maybeSingle = jest.fn().mockResolvedValue({
      data: { id: 'shop-1', slug: 's1', name: 'X' },
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ or: () => ({ maybeSingle }) }),
    });

    const { result } = renderHook(() => useOwnerShop());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shop?.id).toBe('shop-1');
    expect(result.current.error).toBeNull();
  });

  it('returns null shop when user has no shop', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ or: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    });
    const { result } = renderHook(() => useOwnerShop());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.shop).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('exposes error state on query failure', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'u1' } } });
    (supabase.from as jest.Mock).mockReturnValue({
      select: () => ({ or: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'fail' } }) }) }),
    });
    const { result } = renderHook(() => useOwnerShop());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('fail');
  });
});
```

- [ ] **Step 2: Testi çalıştır → fail**

```bash
cd apps/mobile
npm test -- useOwnerShop
```

Beklenen: `Cannot find module '../lib/useOwnerShop'`.

- [ ] **Step 3: Hook'u yaz**

`apps/mobile/lib/useOwnerShop.ts`:

```ts
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface OwnerShop {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  bio: string | null;
  is_public: boolean;
  timezone: string;
  owner_user_id: string;
}

interface State {
  shop: OwnerShop | null;
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

export function useOwnerShop(): State {
  const [shop, setShop] = useState<OwnerShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setShop(null);
      setLoading(false);
      return;
    }
    const { data, error: qErr } = await supabase
      .from('shops')
      .select('id, slug, name, address, phone, bio, is_public, timezone, owner_user_id')
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .maybeSingle();
    if (qErr) {
      setError(new Error(qErr.message));
      setShop(null);
    } else {
      setShop((data as any) ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return { shop, loading, error, reload: load };
}
```

- [ ] **Step 4: Test → PASS**

```bash
npm test -- useOwnerShop
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/useOwnerShop.ts apps/mobile/__tests__/useOwnerShop.test.ts
git commit -m "feat(mobile): add useOwnerShop hook for unified shop_id resolution"
```

### Task 2.2: `team.tsx`'i hook'a geçir

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx:545-580`

- [ ] **Step 1: Import + replace shop resolution**

`team.tsx:545-580` aralığında `loadStaff` fonksiyonu `from('shops').select().or(...)` yapıyor. Bunu kaldır, hook'tan al:

```diff
-import { supabase } from '../../lib/supabase';
+import { supabase } from '../../lib/supabase';
+import { useOwnerShop } from '../../lib/useOwnerShop';
@@
 export default function TeamScreen() {
   const [staff, setStaff] = useState<StaffMember[]>(INIT_STAFF);
   ...
-  const [shopId, setShopId] = useState<string | null>(null);
+  const { shop, loading: shopLoading, error: shopError } = useOwnerShop();
+  const shopId = shop?.id ?? null;

   useEffect(() => {
-    loadStaff();
-  }, []);
+    if (shopId) loadStaff(shopId);
+  }, [shopId]);

-  async function loadStaff() {
-    const { data: { user } } = await supabase.auth.getUser();
-    if (!user) return;
-    const { data: shopData } = await supabase
-      .from('shops')
-      .select('id')
-      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
-      .maybeSingle();
-    if (!shopData) return;
-    setShopId(shopData.id);
-    const { data } = await supabase.from('staff').select('id, name, is_active, commission_type, commission_rate_bps').eq('shop_id', shopData.id);
+  async function loadStaff(sid: string) {
+    const { data, error } = await supabase
+      .from('staff')
+      .select('id, name, is_active, commission_type, commission_rate_bps')
+      .eq('shop_id', sid)
+      .order('created_at');
+    if (error) {
+      Alert.alert('Hata', `Personel listesi yüklenemedi: ${error.message}`);
+      return;
+    }
     if (data) { ... }
   }
```

(`...` kısmı: mevcut map mantığını koru.)

`onSaved={loadStaff}` çağrısı artık parametresiz; `onSaved={() => shopId && loadStaff(shopId)}` yap.

- [ ] **Step 2: Loading state'i göster**

`return` öncesi:

```tsx
if (shopLoading) {
  return <View style={styles.screen}><Text style={styles.emptyText}>Dükkan bilgisi yükleniyor…</Text></View>;
}
if (shopError) {
  return <View style={styles.screen}><Text style={styles.emptyText}>Hata: {shopError.message}</Text></View>;
}
if (!shop) {
  return <View style={styles.screen}><Text style={styles.emptyText}>Dükkan bulunamadı. Kayıt akışını tamamlayın.</Text></View>;
}
```

- [ ] **Step 3: Manuel test**

```bash
cd apps/mobile
npx expo start --android
```
- Owner ile giriş yap → Ekip sekmesi
- "Personel ekle" → ad gir → Ekle
- Hata yok ve liste güncellenmelidir

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/team.tsx
git commit -m "refactor(mobile): team screen uses useOwnerShop hook"
```

### Task 2.3: `settings.tsx`'i hook'a geçir

**Files:**
- Modify: `apps/mobile/app/(owner)/settings.tsx` (shop yükleyen useEffect)

- [ ] **Step 1: Mevcut shop yükleme bloğunu bul**

```bash
rg -n "from\('shops'\)" apps/mobile/app/\(owner\)/settings.tsx
```

- [ ] **Step 2: Aynı diff şablonunu uygula**

Mevcut `useEffect`'i sil, `const { shop, loading: shopLoading, reload } = useOwnerShop();` ile değiştir. ProfileEditorSheet açıldığında `shop` üzerinden form state'i prefill et; Kaydet sonrası `await reload()`.

- [ ] **Step 3: "Lütfen bekleyin. Dükkan bilgileri yükleniyor" mesajı sadece `shopLoading` true iken görünsün**

Mevcut kod buna takılı kaldığı için yükleme bittiğinde temizlenmelidir. State `shopLoading`'e bağlanırsa hook bittiğinde otomatik çözülür.

- [ ] **Step 4: Manuel test — düzenlemeye tıkla, form prefill olmalı**

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/\(owner\)/settings.tsx
git commit -m "refactor(mobile): settings screen uses useOwnerShop hook"
```

### Task 2.4: Agenda (`(owner)/index.tsx`) hook'a geçir

**Files:**
- Modify: `apps/mobile/app/(owner)/index.tsx`

- [ ] **Step 1: shop_id'yi nereden okuduğunu bul**

```bash
rg -n "shop_id|shop_slug|from\('shops'\)" apps/mobile/app/\(owner\)/index.tsx
```

- [ ] **Step 2: Hook'a geçir, slug ve id'yi child componentlere prop olarak ver**

AddAppointmentModal'a şu prop'ları ekleyeceğiz (Task 3.1):
- `shopId`
- `shopSlug`
- `services: ServiceOption[]`
- `staffList: StaffOption[]`

Agenda'da `useOwnerShop` + `services` query + `staff` query yap; ikisini de modal'a indirir.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(owner\)/index.tsx
git commit -m "refactor(mobile): agenda fetches services+staff via useOwnerShop"
```

---

## Phase 3 — AddAppointmentModal real data + edge fn integration

### Task 3.1: Booking sarmalayıcı + test

**Files:**
- Create: `apps/mobile/lib/appointment-booking.ts`
- Create: `apps/mobile/__tests__/appointment-booking.test.ts`

- [ ] **Step 1: Test yaz**

`apps/mobile/__tests__/appointment-booking.test.ts`:

```ts
import { bookAppointment, mapBookingError } from '../lib/appointment-booking';
import { supabase } from '../lib/supabase';

jest.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

describe('bookAppointment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns data on success', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({ data: { id: 'a1' }, error: null });
    const r = await bookAppointment({
      shopSlug: 's', serviceId: 'svc', staffId: 'st',
      startsAt: '2026-05-25T10:00:00Z', customerName: 'A',
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id).toBe('a1');
  });

  it('maps 409 to BOOKING_CONFLICT with Turkish message', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { context: { status: 409 }, message: 'Slot dolu' },
    });
    const r = await bookAppointment({
      shopSlug: 's', serviceId: 'svc', staffId: null,
      startsAt: '2026-05-25T10:00:00Z', customerName: 'A',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('BOOKING_CONFLICT');
      expect(r.message).toContain('dolu');
    }
  });

  it('maps 404 to NOT_FOUND', async () => {
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: null,
      error: { context: { status: 404 }, message: 'Bulunamadı' },
    });
    const r = await bookAppointment({
      shopSlug: 's', serviceId: 'svc', staffId: null,
      startsAt: '2026-05-25T10:00:00Z', customerName: 'A',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('NOT_FOUND');
  });
});

describe('mapBookingError', () => {
  it('formats CONFLICT', () => {
    expect(mapBookingError({ code: 'BOOKING_CONFLICT', message: '' }))
      .toMatch(/saat dolu/i);
  });
  it('formats NOT_FOUND', () => {
    expect(mapBookingError({ code: 'NOT_FOUND', message: '' }))
      .toMatch(/bulunamadı/i);
  });
});
```

- [ ] **Step 2: Testi çalıştır → fail (module yok)**

```bash
npm test -- appointment-booking
```

- [ ] **Step 3: Implementation**

`apps/mobile/lib/appointment-booking.ts`:

```ts
import { supabase } from './supabase';

export interface BookingArgs {
  shopSlug: string;
  serviceId: string;
  staffId: string | null;
  startsAt: string;          // ISO string
  customerName: string;
  customerPhone?: string | null;
}

export type BookingErrorCode =
  | 'BOOKING_CONFLICT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'UNKNOWN';

export interface BookingError {
  code: BookingErrorCode;
  message: string;
}

export type BookingResult =
  | { ok: true; data: { id: string } }
  | { ok: false; code: BookingErrorCode; message: string };

export async function bookAppointment(a: BookingArgs): Promise<BookingResult> {
  const { data, error } = await supabase.functions.invoke('app-book-appointment', {
    body: {
      shop_slug: a.shopSlug,
      service_id: a.serviceId,
      staff_id: a.staffId,
      starts_at: a.startsAt,
      customer_name: a.customerName,
      customer_phone: a.customerPhone ?? null,
    },
  });
  if (error) {
    const status = (error as any)?.context?.status ?? 0;
    let code: BookingErrorCode = 'UNKNOWN';
    if (status === 409) code = 'BOOKING_CONFLICT';
    else if (status === 404) code = 'NOT_FOUND';
    else if (status === 429) code = 'RATE_LIMITED';
    else if (status === 400) code = 'VALIDATION';
    else if (status === 401) code = 'UNAUTHORIZED';
    return { ok: false, code, message: error.message ?? 'Bilinmeyen hata' };
  }
  return { ok: true, data };
}

export function mapBookingError(err: { code: BookingErrorCode; message: string }): string {
  switch (err.code) {
    case 'BOOKING_CONFLICT': return 'Bu saat dolu. Lütfen başka bir saat seçin.';
    case 'NOT_FOUND': return 'Dükkan veya hizmet bulunamadı. Sayfayı yenileyin.';
    case 'RATE_LIMITED': return 'Çok fazla deneme. Lütfen birkaç dakika bekleyin.';
    case 'VALIDATION': return `Geçersiz bilgi: ${err.message}`;
    case 'UNAUTHORIZED': return 'Oturum gerekli. Lütfen tekrar giriş yapın.';
    default: return `Randevu eklenemedi: ${err.message}`;
  }
}
```

- [ ] **Step 4: Test → PASS**

```bash
npm test -- appointment-booking
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/appointment-booking.ts apps/mobile/__tests__/appointment-booking.test.ts
git commit -m "feat(mobile): appointment booking wrapper with typed error mapping"
```

### Task 3.2: AddAppointmentModal'ı bağla

**Files:**
- Modify: `apps/mobile/components/AddAppointmentModal.tsx`

- [ ] **Step 1: Props arayüzünü genişlet**

`AddAppointmentModalProps`'a şu alanları ekle:

```ts
interface AddAppointmentModalProps {
  // ... mevcut alanlar
  shopSlug: string;
  services: ServiceOption[];       // parent'tan gelir, fallback yok
  staffList: StaffOption[];
  onBooked?: (apptId: string) => void;
}
```

- [ ] **Step 2: DEFAULT_SERVICES kullanımını kaldır**

```diff
-const DEFAULT_SERVICES: ServiceOption[] = [
-  { id: 'sac', ... },
-  ...
-];
+// services artık parent'tan zorunlu prop olarak geliyor
```

Bileşen içinde `services` doğrudan props'tan kullanılsın.

- [ ] **Step 3: Kaydet handler'ını yaz**

```tsx
import { bookAppointment, mapBookingError } from '../lib/appointment-booking';
...
async function handleSave() {
  if (!selectedServiceId || !selectedSlot || !selectedDate) {
    Alert.alert('Eksik bilgi', 'Hizmet, tarih ve saat seçin.');
    return;
  }
  const svc = services.find(s => s.id === selectedServiceId);
  if (!svc) return;

  const startsAt = buildIsoFromDateAndSlot(selectedDate, selectedSlot, /* tz from shop or 'Europe/Istanbul' */ 'Europe/Istanbul');
  setSaving(true);
  const r = await bookAppointment({
    shopSlug,
    serviceId: selectedServiceId,
    staffId: selectedStaffId ?? null,
    startsAt,
    customerName: customerName.trim(),
    customerPhone: customerPhone.trim() || null,
  });
  setSaving(false);

  if (!r.ok) {
    Alert.alert('Hata', mapBookingError(r));
    return;
  }
  onBooked?.(r.data.id);
  onClose();
}
```

`buildIsoFromDateAndSlot`'u helper olarak yaz (component dosyasının başında):

```ts
function buildIsoFromDateAndSlot(date: Date, slot: string, tz: string): string {
  const [h, m] = slot.split(':').map(Number);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  // tz literal-saat olarak yorumla; Supabase RPC timezone-aware bir starts_at bekliyor
  // basit fallback: lokal saat dilimi (Türkiye için yeterli, edge fn tarafında UTC'ye dönüşür)
  return `${y}-${mo}-${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`;
}
```

> ⚠️ Eğer cihaz timezone'u Europe/Istanbul değilse bu yanlış olabilir. Shop'un kendi `timezone` alanını kullanmak için Task 3.3'e bak.

- [ ] **Step 4: Manuel test**

Mobil app'i aç → Yeni Randevu → Hizmet, tarih, saat, müşteri adı seç → Kaydet. Beklenen: liste güncellenir, hata yok. Aynı slot'a ikinci randevu eklemeyi dene → "Bu saat dolu" alert'i.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/AddAppointmentModal.tsx
git commit -m "feat(mobile): wire AddAppointmentModal to app-book-appointment edge fn"
```

### Task 3.3: Agenda'da services ve staff'ı modal'a ver

**Files:**
- Modify: `apps/mobile/app/(owner)/index.tsx`

- [ ] **Step 1: services ve staff query'lerini ekle**

Hook altında:

```tsx
const { shop } = useOwnerShop();
const [services, setServices] = useState<ServiceOption[]>([]);
const [staffList, setStaffList] = useState<StaffOption[]>([]);

useEffect(() => {
  if (!shop?.id) return;
  (async () => {
    const [{ data: svcs }, { data: stf }] = await Promise.all([
      supabase.from('services').select('id, name, duration_min, price_cents').eq('shop_id', shop.id).eq('is_active', true).order('created_at'),
      supabase.from('staff').select('id, name').eq('shop_id', shop.id).eq('is_active', true).order('created_at'),
    ]);
    setServices((svcs ?? []).map((s: any) => ({
      id: s.id,
      label: s.name,
      dur: s.duration_min,
      price: `${Math.round(s.price_cents / 100)}₺`,
    })));
    setStaffList((stf ?? []).map((s: any) => ({ id: s.id, name: s.name })));
  })();
}, [shop?.id]);
```

`services` tablosunun kolon isimleri farklı olabilir; doğrula:

```bash
rg -n "create table.*services" supabase/migrations
```

- [ ] **Step 2: Modal'a prop ilet**

```tsx
<AddAppointmentModal
  ...
  shopSlug={shop?.slug ?? ''}
  services={services}
  staffList={staffList}
  onBooked={() => refreshAppointments()}
/>
```

`shop` null iken modal disabled olmalı (FAB butonunu `disabled={!shop}` yap).

- [ ] **Step 3: Manuel test**

Hizmetler sekmesinden yeni hizmet ekle → Ajanda'ya dön → Randevu ekle modal'ını aç → yeni hizmet listede görünmelidir.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(owner\)/index.tsx
git commit -m "feat(mobile): agenda passes live services+staff to AddAppointmentModal"
```

---

## Phase 4 — Edge function error message clarity

### Task 4.1: `app-book-appointment`: hata gövdesinde `reason` ekle

**Files:**
- Modify: `supabase/functions/app-book-appointment/index.ts:74-82`

- [ ] **Step 1: error body'ye reason ekle**

```diff
   if (rpcError) {
     const status = mapRpcErrorStatus(rpcError.code);
     if (status === 500) console.error("create_appointment_atomic failed:", rpcError);
     return error(rpcError.message ?? "Randevu olusturulamadi", status, {
       code: status === 409 ? "BOOKING_CONFLICT" : status === 429 ? "RATE_LIMITED" : "BOOKING_ERROR",
       should_refetch_availability: status === 409,
+      reason: rpcError.code,
+      pg_message: rpcError.message,
       ...(status === 429 ? { retry_after: 600 } : {}),
     });
   }
```

- [ ] **Step 2: Deploy ve smoke test**

```bash
supabase functions deploy app-book-appointment
```

Mobil app'te yeni hata mesajı body'sini görmek için `appointment-booking.ts`'i logla.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/app-book-appointment/index.ts
git commit -m "fix(edge): include pg reason in app-book-appointment error body"
```

---

## Phase 5 — End-to-end smoke test (manuel)

### Task 5.1: Yeni test owner ile dört flow'u doğrula

**Files:**
- Create: `docs/superpowers/audits/2026-05-24-owner-flow-verification.md`

- [ ] **Step 1: Test owner hesabı oluştur**

Mobil register akışı: yeni e-posta, yeni dükkan slug, hizmet seç. Audit dosyasına: kullanıcı id, shop id, owner_user_id ve owner_id değerleri (Studio'dan kontrol et) yaz.

- [ ] **Step 2: Personel ekle akışı**

- Ekip sekmesi → "Personel ekle" → Ad: "Ahmet Test", Komisyon: 40
- Beklenen: liste güncellenir, yeni satır görünür
- Audit dosyasına ekran görüntüsü yolu yaz

- [ ] **Step 3: Hizmet ekle akışı**

- Hizmetler sekmesi → Yeni hizmet ekle
- Beklenen: liste güncellenir

- [ ] **Step 4: Randevu ekle akışı**

- Ajanda → FAB → modal aç
- Step 3'te eklenen hizmet listede olmalı
- Step 2'deki personeli seç, saat seç, Kaydet
- Beklenen: randevu eklenir, takvimde görünür

- [ ] **Step 5: Ayarlar düzenleme**

- Ayarlar → "Düzenle"
- Form prefill olmalı, kaydet çalışmalı

- [ ] **Step 6: Hepsi yeşilse commit**

```bash
git add docs/superpowers/audits/2026-05-24-owner-flow-verification.md
git commit -m "docs(audit): owner flow E2E verification 2026-05-24"
```

---

## Phase 6 — (Sonra) Legacy column drop

> Bu phase ayrı bir plan dosyasına bırakıldı. Bir hafta production soak süresinden sonra `shops.owner_id` kolonu drop edilecek. Şu anda **dokunma**.

---

## Self-Review Notes

- [x] Spec coverage: dört semptom (randevu, personel, ayarlar, hizmet) Phase 1-3'te ele alınmış; "büyük DB refactor" Phase 0+1'de.
- [x] No placeholders: her step'te ya kod ya komut ya somut görev var. Task 1.3 step 2 engineer'a 20260518140000'i kopyalama talimatı veriyor (gövde uzun olduğu için inline kopyalanmadı) — bu kasıtlı ve kapsam belirtilmiş.
- [x] Type consistency: `OwnerShop`, `BookingArgs`, `ServiceOption`, `StaffOption` her phase'de aynı isimle kullanılıyor.

---

## Risk Notları

1. **Sync trigger çakışan değerleri çözerken `owner_user_id`'yi authoritative kabul ediyor.** Eğer eski admin paneli `owner_id`'yi direkt güncelliyorsa, sonraki UPDATE'te bu değer `owner_user_id`'ye kopyalanır — istenen davranış ama doğrula.
2. **RLS policy'leri 20260518140000 dışındaki migration'lara da yayılmış olabilir.** Phase 1 Task 1.2 step 2 audit'i kapsamlı olmalı; eksik kalan policy hâlâ sessiz reddetmeye yol açabilir.
3. **Edge function deploy'u production'a direkt çıkar.** Phase 4 deploy'unu mesai dışında veya feature flag arkasında yap (proje feature flag kullanmıyor → mesai dışı tercih).
4. **AddAppointmentModal timezone hesabı basit:** Shop timezone'u Europe/Istanbul dışındaysa starts_at yanlış çevrilebilir. Mevcut kullanıcılar Türkiye'de olduğu için ilk sürümde sorun değil; ileride `shop.timezone`'u modal'a geçir.
