# Plan B — Personel Ekleme: SMTP Bağımlılığını Kaldır

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ekip ekranında personel ekleme akışını SMTP/email invite'dan bağımsız hale getir. Dükkan sahibi, usta hesabı oluşturmak için e-posta göndermek zorunda kalmadan isim + opsiyonel email ile personeli sisteme ekleyebilmeli.

**Architecture:** `invite-barber` edge function çağrısını kaldır. Doğrudan `staff` tablosuna insert yap (email opsiyonel, contact bilgisi olarak saklanır). `staff` tablosuna `email text` kolonu ekle. `user_id` bağlantısı şimdilik null — usta kendi hesabıyla giriş yapma akışı (deep-link / QR) ayrı bir feature olarak planlanacak.

**Tech Stack:** React Native (TypeScript), Supabase (PostgreSQL), Supabase JS Client v2

---

## Arka Plan

Mevcut `handleAddStaff` akışı:
1. Email varsa → `supabase.functions.invoke('invite-barber')` çağır
2. `invite-barber` → `supabase.auth.admin.inviteUserByEmail()` → SMTP gerektirir
3. Supabase projesi SMTP konfigüre edilmemişse → hata → "personel davet edilemedi"

**Sorun:** SMTP olmadan invite çalışmıyor. Usta giriş akışı (QR link, magic link) ayrıca kurulmalı — bu plan sadece "personeli kayıt altına al" hedefini karşılıyor.

**staff tablosu mevcut kolonlar** (migration'lardan derleme):
`id, shop_id, user_id, name, role, is_active, commission_type, commission_rate_bps, slug, created_at`

`email` kolonu YOK → migration ile eklenecek.

---

## Dosya Haritası

- **Create:** `supabase/migrations/2026-05-23-add-staff-email.sql`
- **Modify:** `apps/mobile/app/(owner)/team.tsx` (handleAddStaff fonksiyonu)

---

### Task 1: staff Tablosuna email Kolonu Ekle

**Files:**
- Create: `supabase/migrations/2026-05-23-add-staff-email.sql`

- [ ] **Step 1: Migration oluştur**

```sql
-- Personele iletişim e-postası ekle. user_id'den bağımsız — davet akışı değil.
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS email text;
```

- [ ] **Step 2: Migration'ı uygula**

```bash
cd "C:\Users\Emre\Berber randevu"
npx supabase db push
```

Beklenen: `Applied 1 migration`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/2026-05-23-add-staff-email.sql
git commit -m "feat(db): add email contact field to staff table"
```

---

### Task 2: handleAddStaff — SMTP Bağımlılığını Kaldır

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx`

- [ ] **Step 1: handleAddStaff'ı yeniden yaz**

Mevcut fonksiyonu (`handleAddStaff`) şununla değiştir:

```ts
async function handleAddStaff(name: string, email: string) {
  if (!shopId) {
    Alert.alert('Hata', 'Dükkan bilgisi yüklenemedi. Lütfen tekrar deneyin.');
    return;
  }

  const { data, error: insertErr } = await supabase
    .from('staff')
    .insert({
      shop_id: shopId,
      name: name.trim(),
      email: email.trim() || null,
      role: 'staff',
      is_active: true,
    })
    .select('id, name, is_active, commission_type, commission_rate_bps')
    .single();

  if (insertErr || !data) {
    Alert.alert('Hata', 'Personel eklenemedi. Lütfen tekrar deneyin.');
    return;
  }

  setStaff((prev) => [
    ...prev,
    {
      id: (data as any).id,
      name: (data as any).name,
      status: 'Aktif',
      meta: 'Komisyon yok',
    },
  ]);
  setAddOpen(false);
}
```

**Dikkat:** `invite-barber` edge function çağrısı tamamen kaldırılıyor. Supabase JS client'tan `invoke` kullanımı da kaldırılıyor.

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(owner)/team.tsx
git commit -m "fix(mobile): staff add — remove SMTP invite dependency, direct insert with email as contact"
```

---

### Task 3: AddStaffSheet — Komisyon Alanını Ekle

**Files:**
- Modify: `apps/mobile/app/(owner)/team.tsx` (AddStaffSheet bileşeni, handleAdd fonksiyonu)

Mevcut `AddStaffSheet.handleAdd`, `commInput`'u da topluyor ama `onAdd` callback'e geçirmiyor. Bu commit'te komisyon oranını da insert'e ekle.

- [ ] **Step 1: onAdd tipini güncelle**

`AddStaffSheet` interface'ini değiştir:
```ts
interface AddStaffSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, email: string, commissionRate: number | null) => void;
}
```

`handleAdd` içinde:
```ts
function handleAdd() {
  if (name.trim().length < 2) {
    Alert.alert('Geçersiz', 'Geçerli bir ad gir.');
    return;
  }
  const rate = commInput.trim() ? parseFloat(commInput) : null;
  if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
    Alert.alert('Geçersiz', 'Komisyon 0-100 arasında olmalı.');
    return;
  }
  onAdd(name.trim(), email.trim(), rate);
  setName(''); setEmail(''); setCommInput('');
}
```

- [ ] **Step 2: handleAddStaff'ı komisyon destekleyecek şekilde güncelle**

```ts
async function handleAddStaff(name: string, email: string, commissionRate: number | null) {
  if (!shopId) {
    Alert.alert('Hata', 'Dükkan bilgisi yüklenemedi. Lütfen tekrar deneyin.');
    return;
  }

  const { data, error: insertErr } = await supabase
    .from('staff')
    .insert({
      shop_id: shopId,
      name: name.trim(),
      email: email.trim() || null,
      role: 'staff',
      is_active: true,
      commission_type: commissionRate !== null ? 'percentage' : 'none',
      commission_rate_bps: commissionRate !== null ? Math.round(commissionRate * 100) : null,
    })
    .select('id, name, is_active, commission_type, commission_rate_bps')
    .single();

  if (insertErr || !data) {
    Alert.alert('Hata', 'Personel eklenemedi. Lütfen tekrar deneyin.');
    return;
  }

  const rate = (data as any).commission_rate_bps;
  setStaff((prev) => [
    ...prev,
    {
      id: (data as any).id,
      name: (data as any).name,
      status: 'Aktif',
      meta: rate ? `%${Math.round(rate / 100)} komisyon` : 'Komisyon yok',
    },
  ]);
  setAddOpen(false);
}
```

`<AddStaffSheet>` render'ında `onAdd={handleAddStaff}` propunu güncelle (3 parametre artık).

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(owner)/team.tsx
git commit -m "fix(mobile): staff add — include commission rate in insert, pass through from sheet"
```

---

### Task 4: Push + Doğrulama

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Cihazda test**

`test-berber@berber.dev` ile giriş:
- [ ] Ekip → "+ Personel ekle" → Sadece isim doldur, e-posta boş bırak → "Ekle" → Personel listede görünmeli
- [ ] Ekip → "+ Personel ekle" → İsim + e-posta doldur → "Ekle" → Yine personel listede görünmeli (artık davet e-postası gönderilmeyecek, sadece kayıt açılacak)
- [ ] Eklenen personel "Aktif" badge'i ile listede görünmeli
