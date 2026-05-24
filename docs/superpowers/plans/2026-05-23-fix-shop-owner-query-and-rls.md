# Plan A — Shop Owner Query + RLS Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the root cause of ALL owner-screen failures — `test-berber@berber.dev` gibi hesaplar `owner_id` kolonuyla oluşturulmuş, ama mobil sorgular yalnızca `owner_user_id` kontrol ediyor; ayrıca RLS UPDATE policy sadece `owner_user_id` izin veriyor.

**Architecture:** İki katmanlı fix: (1) Supabase migration ile RLS UPDATE/DELETE policy'lerini hem `owner_user_id` hem `owner_id`'yi kapsayacak şekilde genişlet. (2) 4 mobil ekran dosyasındaki `.eq('owner_user_id', ...)` sorgularını `.or('owner_user_id.eq.X,owner_id.eq.X')` ile değiştir.

**Tech Stack:** React Native (TypeScript), Supabase (PostgreSQL RLS), Supabase JS Client v2

---

## Arka Plan

`shops` tablosunun iki owner kolonu var:
- `owner_user_id UUID` — orijinal schema (initial.sql)
- `owner_id UUID` — migration 20260508 ile eklendi

Onboarding sırasında oluşturulan dükkanlar hangi kolona yazıldığına göre değişiyor. `test-berber@berber.dev` hesabı için dükkan `owner_id`'ye yazılmış, `owner_user_id = NULL`.

**RLS durumu:**
- SELECT: `shops_public_read` → `USING (true)` → herkes okuyabilir ✓
- INSERT: `owner_user_id = auth.uid()` — yeni dükkan açarken sorun yok
- UPDATE: `owner_user_id = auth.uid()` — `owner_id` grubundaki kullanıcılar GÜNCELLEYEMEZ ✗
- DELETE: `owner_user_id = auth.uid()` — `owner_id` grubundaki kullanıcılar SILAMAZ ✗

**Mobil sorgu durumu:** 4 dosyanın tamamı `.eq('owner_user_id', user.id)` kullanıyor → shop bulunamıyor → tüm ekranlar boş veya shopId=null.

---

## Dosya Haritası

- **Modify:** `supabase/migrations/2026-05-23-fix-shop-owner-rls.sql` (yeni migration)
- **Modify:** `apps/mobile/app/(owner)/index.tsx:243`
- **Modify:** `apps/mobile/app/(owner)/agenda.tsx:117`
- **Modify:** `apps/mobile/app/(owner)/team.tsx:523`
- **Modify:** `apps/mobile/app/(owner)/settings.tsx:578`

---

### Task 1: RLS Migration Yaz

**Files:**
- Create: `supabase/migrations/2026-05-23-fix-shop-owner-rls.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

```sql
-- Fix: shops UPDATE ve DELETE policy'lerini hem owner_user_id hem owner_id için çalıştır.
-- Arka plan: migration 20260508 owner_id kolonunu ekledi ama bazı hesaplar bu kolona yazıldı.
-- RLS SELECT public_read olduğu için okuma zaten çalışıyor; yazma policy'leri güncelleniyor.

DROP POLICY IF EXISTS "shops_owner_update" ON public.shops;
DROP POLICY IF EXISTS "shops_owner_delete" ON public.shops;

CREATE POLICY "shops_owner_update" ON public.shops
FOR UPDATE TO authenticated
USING (
  owner_user_id = (SELECT auth.uid())
  OR owner_id    = (SELECT auth.uid())
)
WITH CHECK (
  owner_user_id = (SELECT auth.uid())
  OR owner_id    = (SELECT auth.uid())
);

CREATE POLICY "shops_owner_delete" ON public.shops
FOR DELETE TO authenticated
USING (
  owner_user_id = (SELECT auth.uid())
  OR owner_id    = (SELECT auth.uid())
);
```

- [ ] **Step 2: Migration'ı Supabase'e uygula**

```bash
cd "C:\Users\Emre\Berber randevu"
npx supabase db push
```

Beklenen: `Applied 1 migration` çıktısı, hata yok.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-05-23-fix-shop-owner-rls.sql
git commit -m "fix(db): extend shops UPDATE/DELETE RLS to cover both owner_user_id and owner_id"
```

---

### Task 2: Özet Ekranı (index.tsx) Sorgu Düzelt

**Files:**
- Modify: `apps/mobile/app/(owner)/index.tsx:243`

- [ ] **Step 1: Sorguyu düzelt**

`index.tsx` satır 243'teki:
```ts
const { data: shopData } = await supabase.from('shops').select('id').eq('owner_user_id', user.id).maybeSingle();
```
şunu yap:
```ts
const { data: shopData } = await supabase
  .from('shops')
  .select('id')
  .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
  .maybeSingle();
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/index.tsx
git commit -m "fix(mobile): owner/index — shop query supports both owner_user_id and owner_id"
```

---

### Task 3: Ajanda Ekranı (agenda.tsx) Sorgu Düzelt

**Files:**
- Modify: `apps/mobile/app/(owner)/agenda.tsx:117`

- [ ] **Step 1: Sorguyu düzelt**

`agenda.tsx` satır 117'deki:
```ts
const { data: shopData } = await supabase.from('shops').select('id, slug').eq('owner_user_id', user.id).maybeSingle();
```
şunu yap:
```ts
const { data: shopData } = await supabase
  .from('shops')
  .select('id, slug')
  .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
  .maybeSingle();
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/agenda.tsx
git commit -m "fix(mobile): owner/agenda — shop query supports both owner_user_id and owner_id"
```

---

### Task 4: Ekip Ekranı (team.tsx) Sorgu Düzelt

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx:523`

- [ ] **Step 1: Sorguyu düzelt**

`team.tsx` satır 523'teki:
```ts
const { data: shopData } = await supabase.from('shops').select('id').eq('owner_user_id', user.id).maybeSingle();
```
şunu yap:
```ts
const { data: shopData } = await supabase
  .from('shops')
  .select('id')
  .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
  .maybeSingle();
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/team.tsx
git commit -m "fix(mobile): owner/team — shop query supports both owner_user_id and owner_id"
```

---

### Task 5: Ayarlar Ekranı (settings.tsx) Sorgu Düzelt

**Files:**
- Modify: `apps/mobile/app/(owner)/settings.tsx:578`

- [ ] **Step 1: Sorguyu düzelt**

`settings.tsx` satır 578'deki:
```ts
supabase.from('shops').select('id, name, address, bio, phone, slug, commission_enabled, working_hours').eq('owner_user_id', user.id).maybeSingle()
```
şunu yap:
```ts
supabase
  .from('shops')
  .select('id, name, address, bio, phone, slug, commission_enabled, working_hours')
  .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
  .maybeSingle()
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/settings.tsx
git commit -m "fix(mobile): owner/settings — shop query supports both owner_user_id and owner_id"
```

---

### Task 6: Push + Doğrulama

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Cihazda test** (`test-berber@berber.dev` / `TestBerber123!` ile giriş yap)

Kontrol listesi:
- [ ] Özet ekranı gerçek KPI verileri yüklüyor (mock değil)
- [ ] Ekip ekranı personeli listeliyor (veya boş ekran yerine empty state doğru çalışıyor)
- [ ] Ajanda ekranında berber kolonları görünüyor
- [ ] Ayarlar → Dükkan Bilgileri → Kaydet → "Kaydedildi" ekranı geliyor (artık "Lütfen bekleyin" Alert'i ÇIKMAMALI)
