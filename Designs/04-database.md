# 04 — Database

> Tablo-tablo şema, kolonlar, ilişkiler, constraint'ler, indeksler, RLS, RPC'ler, realtime publication. Frontend'in **ne çekeceğini ve nasıl filtreleneceğini** anlatır.

Önceki: [`03-auth.md`](./03-auth.md) · Sonraki: [`05-edge-functions.md`](./05-edge-functions.md)

---

## 1. Şema haritası

```
                    ┌──────────────┐
                    │  auth.users  │  (Supabase yönetiyor)
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   shops.owner_id    staff.user_id    customer_profiles.user_id
        │                  │                  │
        ▼                  ▼                  ▼
   ┌──────────┐       ┌──────────┐      ┌──────────────────┐
   │  shops   │◄──────┤  staff   │      │ customer_profiles │
   │  (slug)  │ shop_id  │ shop_id │   │                  │
   └─────┬────┘       └────┬─────┘      └──────────────────┘
         │                 │
         │                 │ staff_id
         │                 ├──────────────┐
         │                 │              │
         ▼                 ▼              ▼
   ┌──────────┐    ┌──────────────┐  ┌──────────┐
   │ services │    │ appointments │  │  blocks  │
   └──────────┘    │ (staff_id)   │  │(staff_id)│
                   └──────┬───────┘  └────┬─────┘
                          │  trigger      │  trigger
                          ▼               ▼
                   ┌──────────────┐  ┌──────────┐
                   │ appointment_ │  │ block_   │ ← realtime mirrors
                   │   slots      │  │  slots   │
                   └──────────────┘  └──────────┘

   ┌──────────────────┐    ┌────────────────┐    ┌──────────────────┐
   │ staff_schedules  │    │ widget_tokens  │    │ phone_booking_*  │
   │ (mola + çalışma) │    │ (Android widget) │   │ (rate limit)     │
   └──────────────────┘    └────────────────┘    └──────────────────┘
```

**4 tablo realtime publication'da:** `appointments`, `appointment_slots`, `blocks`, `block_slots`.

---

## 2. Konvansiyonlar

| Karar | Değer |
|---|---|
| **Primary key** | `uuid` (default `gen_random_uuid()`) |
| **Timestamps** | `timestamptz` (asla `timestamp without tz`) |
| **Date** | `date` (sadece staff_schedules ve query parametrelerinde) |
| **Time** | `time` (staff_schedules `work_start/end`, `break_start/end`) |
| **Para** | `integer price_cents` (cent cinsinden, TL × 100) |
| **Süre** | `integer duration_min` (dakika) |
| **String case** | `snake_case` tablolar + kolonlar |
| **Foreign key** | `ON DELETE CASCADE` (alt kayıt parent silinince temizlenir) |
| **`auth.users` FK** | `ON DELETE SET NULL` (kullanıcı silinse de veri kalır) |
| **Soft delete** | Yok — `status = 'cancelled'` veya `is_active = false` ile ifade ediliyor |

---

## 3. Tablolar

### 3.1 · `shops`

Dükkan — sistemin **tenant ana varlığı**. Slug ile public erişim (`/[slug]`).

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `owner_user_id` | `uuid` | FK → `auth.users`. **Legacy kolon**, hâlâ check ediliyor. |
| `owner_id` | `uuid` | FK → `auth.users`. **Yeni kolon** (multi-seat migration). |
| `slug` | `text` UNIQUE | URL'de görünür: `siradaki.app/keskin-berber` |
| `display_name` | `text` | Profil sayfasında başlık |
| `name` | `text` | Multi-seat migration'da eklendi, kullanım tutarsız |
| `address` | `text` | Multi-seat migration |
| `bio` | `text` | Profil sayfası açıklama |
| `avatar_url` | `text` | Profil resmi URL |
| `timezone` | `text` NOT NULL | Default `'Europe/Istanbul'` |
| `working_hours` | `jsonb` NOT NULL | Default `'{}'`, format `WorkingHours` (bkz. `@berber/shared/types`) |
| `created_at` / `updated_at` | `timestamptz` | `updated_at` trigger ile otomatik |

**İndeksler:**
- `idx_shops_owner` ON `(owner_user_id)`
- `idx_shops_slug` ON `(slug)` *(slug zaten UNIQUE — bu duplikasyon olabilir, kontrol edilebilir)*

**`working_hours` JSONB formatı:**
```json
{
  "mon": { "open": "09:00", "close": "19:00", "enabled": true },
  "tue": { "open": "09:00", "close": "19:00", "enabled": true },
  ...
  "sun": { "open": null, "close": null, "enabled": false }
}
```

Defaults: `@berber/shared/constants → DEFAULT_WORKING_HOURS`.

> ⚠️ **Dual owner kolonu** — Bkz. `03-auth.md §10`. İleride tek kolona düşürülecek.

---

### 3.2 · `staff`

Dükkana bağlı çalışan. **`barbers` tablosu hâlâ schema'da var ama BOŞ** — aktif tablo bu.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `shop_id` | `uuid` NOT NULL | FK → `shops`, CASCADE |
| `user_id` | `uuid` UNIQUE | FK → `auth.users`, SET NULL. NULL iken davet kabul edilmemiş demek |
| `name` | `text` NOT NULL | Görünen ad |
| `role` | `staff_role` enum NOT NULL | `'admin'` veya `'staff'` |
| `is_active` | `boolean` NOT NULL | Default `true`. `false` → public listede görünmez |
| `created_at` | `timestamptz` | |
| 🚧 `slug` | `text` *(planlı)* | Per-staff deep link feature için — bkz. açık konular |
| 🚧 `avatar_url` | `text` *(planlı)* | Personel kartlarında — bkz. açık konular |

**`staff_role` enum:**
```sql
CREATE TYPE public.staff_role AS ENUM ('admin', 'staff');
```

- `admin` — owner'a yakın yetki (henüz frontend'de ayrı pattern yok)
- `staff` — varsayılan, kendi randevularını yönetir

**RLS notu:** Anon role'ün SELECT'i açık (`is_active = true` filtreli) — public booking için zorunlu.

> 🚧 **Per-staff deep link (`/{shop}/u/{staff}`) feature için** `staff` tablosuna `slug` kolonu eklenecek. Migration sonrası `database.types.ts` regenerate edilmeli.

---

### 3.3 · `services`

Hizmetler **dükkan düzeyinde** tanımlanır — tüm staff sunabilir.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `shop_id` | `uuid` NOT NULL | FK → `shops`, CASCADE |
| `name` | `text` NOT NULL | "Saç + Sakal" |
| `duration_min` | `integer` NOT NULL | CHECK 1–480 (8 saat max) |
| `price_cents` | `integer` | NULL olabilir (fiyat gizli) |
| `display_order` | `integer` NOT NULL | UI sıralama; default 0 |
| `is_active` | `boolean` NOT NULL | Default true; pasifse müşteri görmez |
| `created_at` | `timestamptz` | |

**İndeksler:**
- `idx_services_shop_active` ON `(shop_id, is_active)` — müşteri akışı
- `idx_services_shop_order` ON `(shop_id, display_order)` — UI sıralama

**RLS:** Anon SELECT açık (`is_active = true` filtreli).

---

### 3.4 · `appointments`

**Randevu — onaylı, iptal, tamamlanmış.** Sistemin merkezi tablosu.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `staff_id` | `uuid` NOT NULL | FK → `staff`. **Eski adı `barber_id`** (multi-seat migration'da rename) |
| `service_id` | `uuid` | FK → `services`, NULLable (geçmiş kayıtlar için) |
| `customer_name` | `text` NOT NULL | CHECK length ≥ 2 |
| `customer_phone` | `text` | NULLable |
| `customer_notes` | `text` | NULLable, müşterinin booking'te bıraktığı not |
| `customer_user_id` | `uuid` | FK → `auth.users`, SET NULL. Kayıtlı müşteri akışı için |
| `starts_at` | `timestamptz` NOT NULL | |
| `ends_at` | `timestamptz` NOT NULL | CHECK `ends_at > starts_at` |
| `status` | `text` NOT NULL | CHECK `IN ('confirmed', 'cancelled', 'completed')` |
| `notes` | `text` | Staff/owner not — müşteri görmez |
| `created_at` | `timestamptz` | |

**🔥 Exclusion constraint:**
```sql
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed')
```

**Bu satır kritik:** Postgres seviyesinde **çift booking imkânsız**. Race condition'da bile DB ikinci insert'i reddeder → edge function `23P01` hata kodu döner → frontend "Çakışma" alert'i.

> `book-appointment` edge function bunu işliyor — bkz. `05-edge-functions.md`.

**İndeksler:**
- `idx_appointments_staff_starts` ON `(staff_id, starts_at)` — ajanda günlük listesi
- `idx_appointments_staff_status` ON `(staff_id, status)` — durum filtreleri
- `idx_appointments_customer` ON `(customer_user_id)` — kayıtlı müşteri akışı

---

### 3.5 · `appointment_slots` *(mirror)*

`appointments` tablosunun **slim public-readable kopyası**. Trigger ile yönetiliyor.

| Kolon | Tip |
|---|---|
| `appointment_id` | `uuid` PK FK → `appointments`, CASCADE |
| `staff_id` | `uuid` NOT NULL |
| `starts_at` | `timestamptz` NOT NULL |
| `ends_at` | `timestamptz` NOT NULL |

**Trigger:** `appointments_sync_slots` (AFTER INSERT/UPDATE/DELETE) → `sync_appointment_slots()` SECURITY DEFINER fonksiyonu.

**Mirror sebebi:**
1. **Public realtime** — `appointments` tablosunun RLS politikaları kompleks; anon kullanıcı tüm appointment'ları SELECT edemez. Slot mirror anon-okunabilir → web booking realtime kanalına girebiliyor.
2. **Slim payload** — Realtime channel'a sadece çakışma için gerekli kolonlar düşüyor; PII (customer_name, phone) kaymıyor.

> Detay → [`06-realtime.md`](./06-realtime.md)

---

### 3.6 · `blocks`

Walk-in, mola, kişisel blok — **müşteri olmayan slot kapatma**.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `staff_id` | `uuid` NOT NULL | FK → `staff`, CASCADE |
| `starts_at` | `timestamptz` NOT NULL | |
| `ends_at` | `timestamptz` NOT NULL | CHECK `ends_at > starts_at` |
| `reason` | `text` NOT NULL | CHECK `IN ('walkin', 'break', 'personal')` |
| `created_via` | `text` NOT NULL | CHECK `IN ('widget', 'app', 'web')` |
| `created_at` | `timestamptz` | |

**Exclusion constraint** — aynı `staff_id` için çakışan blok yasak (appointments ile aynı pattern).

> `staff_schedules` üzerinden mola otomatik dolu sayıldığı için **`reason = 'break'` blokları nadirdir** — kullanıcı manuel ekleyebilir ama tipik akışta gerek yok.

---

### 3.7 · `block_slots` *(mirror)*

`blocks` tablosunun public-readable kopyası. Aynı pattern (trigger ile sync).

---

### 3.8 · `staff_schedules`

Personel başına haftalık çalışma + mola.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `staff_id` | `uuid` NOT NULL | FK → `staff`, CASCADE |
| `day_of_week` | `int` NOT NULL | CHECK 0–6. **`0 = Pazar`, `6 = Cumartesi`** (Postgres `EXTRACT(DOW)` ile uyumlu) |
| `is_working` | `boolean` NOT NULL | Default `true`. `false` → o gün kapalı (tüm gün dolu sayılır) |
| `work_start` | `time` NOT NULL | Default `'09:00'` |
| `work_end` | `time` NOT NULL | Default `'19:00'`. CHECK `work_start < work_end` |
| `break_start` | `time` | NULLable |
| `break_end` | `time` | NULLable. CHECK `break_start < break_end` veya ikisi de NULL |

**Constraint'ler:**
- `UNIQUE (staff_id, day_of_week)` — bir günde tek satır
- `break_order` CHECK — mola tutarlı tanımlı olmalı

**Önemli kural:** `is_working = false` ise tüm gün dolu sayılır (`get_occupied_ranges` 00:00–24:00 bloğu döner). `break_start/end` tanımlıysa o saatler de dolu.

**RLS:** Anon SELECT — `staff.is_active = true` satırlarına public read (booking flow availability hesabı için).

---

### 3.9 · `widget_tokens`

Android home-screen widget için dükkan bazlı API token.

| Kolon | Tip | Notlar |
|---|---|---|
| `id` | `uuid` PK | |
| `shop_id` | `uuid` NOT NULL | FK → `shops`, CASCADE |
| `token_hash` | `text` UNIQUE NOT NULL | bcrypt-style hash, raw token sadece bir kez döner |
| `label` | `text` NOT NULL | Default `'Widget'`, owner-readable etiket |
| `last_used_at` | `timestamptz` | Widget her tetiklediğinde güncellenir |
| `expires_at` | `timestamptz` | NULLable — varsayılan süresiz |
| `created_at` | `timestamptz` | |

> Frontend etkisi: owner panel `settings.tsx`'te token listesi + "Yeni token oluştur" CTA.

---

### 3.10 · `customer_profiles`

Kayıtlı müşteri (anonim olmayan booking için).

| Kolon | Tip | Notlar |
|---|---|---|
| `user_id` | `uuid` PK | FK → `auth.users`, CASCADE |
| `full_name` | `text` NOT NULL | Default `''` |
| `phone` | `text` | NULLable |
| `created_at` / `updated_at` | `timestamptz` | |

**RLS:** Üç ayrı policy — hepsi `user_id = auth.uid()` şartıyla. **Sadece kendi user_id'siyle eşleşen müşteri** kendi satırını görür / yazar / günceller. Cross-user erisim kapalı.

**Durum:** Şu an web booking flow **anonim** — bu tablo `archive/customer/` mobil app'ten kalan altyapı. İleride "Hesabımdan iptal" feature'ı eklenirse aktif olur.

---

### 3.11 · Diğer destekleyici tablolar

| Tablo | Amaca | Frontend etkisi | Durum |
|---|---|---|---|
| `barbers` | Eski multi-shop şema | Boş, kullanılmıyor | ⚠️ DEPRECATED, henüz DROP edilmedi |

> ⚠️ **Migration'da tanımlı ama production'da görünmeyen tablolar:** `commission_snapshots`, `commission_rules`, `phone_booking_rate_limits`. SQL migration'ları mevcut (`20260517_optional_commission_tracking`, `20260518150000_commission_snapshot_integrity`, `20260518190000_phone_booking_rate_limit`) ama REST API'dan tablo listesinde görünmüyor. Production'a push edilmemiş olabilir, veya farklı schema'da. Frontend bu tablolara dokunmadan önce **deploy durumu doğrulanmalı**.
>
> Owner panel `earnings.tsx` komisyon verisi için: tablo varsa kolonları incelenip ayrı bir section yazılacak; yoksa hesaplama edge function'da mı yapılıyor netleştirilecek.

---

## 4. RPC fonksiyonları

Frontend'in **doğrudan çağıracağı** veya edge function üzerinden tetikleyeceği SQL fonksiyonları.

### 4.1 — `get_occupied_ranges(barber_id, date)`

```sql
get_occupied_ranges(p_barber_id uuid, p_date text)
  RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
```

> ⚠️ **Parametre adları eski terminolojiden** (`p_barber_id`), ama fonksiyon `staff` tablosu üzerinde çalışıyor. `p_date` **TEXT** — `'YYYY-MM-DD'` formatında string geçirilir (DATE değil).

Verilen staff + gün için **dolu olan tüm aralıkları** döner — randevular + bloklar + non-working day full block + mola saatleri. Web booking flow ve mobil ajanda **availability hesabı** için.

**Anon ve authenticated** — GRANT EXECUTE açık.

```ts
// Frontend kullanımı
const { data, error } = await supabase.rpc('get_occupied_ranges', {
  p_barber_id: staffId,
  p_date: '2026-05-14',     // YYYY-MM-DD
});
```

### 4.2 — `get_staff_day_hours(staff_id, date)`

```sql
get_staff_day_hours(p_staff_id uuid, p_date date)
  RETURNS TABLE (is_working boolean, work_start time, work_end time)
```

Belirli staff + gün için çalışma penceresi. Edge function `get-availability` bu fonksiyonu çağırıp `computeAvailableSlots`'a parametre olarak veriyor.

### 4.3 — `assign_any_staff` / `assign_any_barber`

```sql
assign_any_barber(p_shop_id, p_starts_at, p_ends_at)
  RETURNS uuid
```

Müşteri **"Fark Etmez"** seçince çağrılır. **O slot'ta müsait olan + o gün en az randevusu olan** staff'ı round-robin mantığıyla döner. Beraberlik durumunda en eski (`created_at` ASC) usta öne geçer.

> ⚠️ Adında `barber` geçiyor (eski sürümden kalan), ama `staff` tablosu üzerinde çalışıyor. İleride rename edilecek.

### 4.4 — `update_appointment_atomic`

```sql
update_appointment_atomic(
  p_appointment_id  uuid,        -- taşınan randevunun id'si
  p_new_staff_id    uuid,        -- hedef staff (drag-drop ile)
  p_new_service_id  uuid,        -- hizmet değişti mi
  p_new_starts_at   timestamptz, -- yeni başlangıç
  p_new_customer_name   text,    -- müşteri adı (eşzamanlı düzenleme)
  p_new_customer_phone  text,    -- telefon
  p_new_notes           text     -- staff/owner notu
)
  RETURNS void
```

Owner Ajanda'da **drag-drop reassignment** veya AppointmentDetailSheet'te **düzenleme** için. Tek bir transaction'da hem appointment'ı günceller hem exclusion constraint'i check eder.

Hedef staff'ta çakışma varsa `23P01` (exclusion constraint) veya `P0001` (custom error) döner → frontend "Çakışma" alert'i.

### 4.5 — `sync_appointment_slots` / `sync_block_slots` *(trigger fonksiyonları)*

`AFTER INSERT/UPDATE/DELETE` trigger'larının arkasındaki fonksiyonlar — mirror tabloları otomatik senkronize eder. Frontend tarafından **doğrudan çağrılmaz**.

---

## 5. Mirror tablo deseni — neden ve nasıl

```
appointments (RLS korunuyor, PII içeriyor)
       │
       │ TRIGGER appointments_sync_slots
       │ AFTER INSERT/UPDATE/DELETE FOR EACH ROW
       │
       ▼
appointment_slots (public-readable, sadece zaman + staff_id)
       │
       ▼
Realtime channel ──→ web + mobil abone
```

**Trade-off:** İki tabloya yazıyoruz, biraz yer kaybı. **Karşılığında:**
- ✅ Web (anon) realtime çakışma bilgisi alabiliyor
- ✅ PII (customer_name, phone) kanala düşmüyor
- ✅ RLS basit kalıyor — appointments owner/staff korumalı, slots herkese açık

---

## 6. Constraint'ler — kritik dört tane

### 6.1 — `appointments_no_overlap` (GIST exclusion)
**Effect:** Aynı staff için confirmed çakışan randevu **DB tarafından reddedilir**.
**Frontend etkisi:** `book-appointment` edge function 409 döner → "Çakışma" alert.

### 6.2 — `blocks_no_overlap` (GIST exclusion)
**Effect:** Aynı staff için çakışan blok yasak.
**Frontend etkisi:** `block-walkin` / `create-manual-block` edge function hata döner.

### 6.3 — `appointments.status` CHECK
**Effect:** Sadece `'confirmed'`, `'cancelled'`, `'completed'`.
**Frontend etkisi:** TypeScript `Database['public']['Tables']['appointments']['Row']['status']` zaten union type, runtime hatası imkânsız.

### 6.4 — `blocks.reason` CHECK
**Effect:** Sadece `'walkin'`, `'break'`, `'personal'`.
**Frontend etkisi:** Block ekranı (M4) bu üç seçeneği radio olarak gösterir.

---

## 7. İndeksler

| Tablo | Indeks | Niye |
|---|---|---|
| `shops` | `(slug)` | `/[slug]` sayfa yüklemesi |
| `shops` | `(owner_user_id)` | Role lookup (owner) |
| `staff` | `(shop_id, is_active)` | Public booking — aktif personel listesi |
| `staff` | `(user_id)` | Role lookup (staff) |
| `services` | `(shop_id, is_active)` | Hizmet listesi |
| `services` | `(shop_id, display_order)` | UI sıralama |
| `appointments` | `(staff_id, starts_at)` | Ajanda günlük listesi |
| `appointments` | `(staff_id, status)` | Status filtreleri |
| `appointments` | `(customer_user_id)` | Kayıtlı müşteri akışı |
| `blocks` | `(staff_id, starts_at)` | Müsaitlik hesabı |
| `staff_schedules` | `(staff_id, day_of_week)` | Haftalık schedule lookup |
| `widget_tokens` | `(token_hash)` | Widget request authentication |

---

## 8. RLS politikaları — özetin özeti

`03-auth.md §10` zaten anlattı; burada **frontend perspektifinden** kısa kural seti:

| Tablo | Anon read | Authenticated read | Authenticated write |
|---|---|---|---|
| `shops` | ✅ slug ile single row | ✅ owner kendi shop'unu | ✅ owner kendi shop'unu update |
| `staff` | ✅ `is_active = true` | ✅ kendi shop + kendi user_id | ✅ owner ekibi yönetir |
| `services` | ✅ `is_active = true` | ✅ kendi shop | ✅ owner yönetir |
| `appointments` | ❌ | ✅ kendi staff_id + owner'ın shop'u + kendi customer_user_id | ✅ aynı + müşteri cancel |
| `appointment_slots` | ✅ herkese açık | ✅ | trigger yönetir |
| `blocks` | ❌ | ✅ staff/owner | ✅ staff/owner |
| `block_slots` | ✅ herkese açık | ✅ | trigger yönetir |
| `staff_schedules` | ✅ aktif staff için | ✅ staff/owner | ✅ staff/owner |

> Tüm policy'ler `(SELECT auth.uid())` initplan-safe wrapping kullanıyor — performans için kritik.

---

## 9. Realtime publication

**Sadece şu 4 tablo** `supabase_realtime` publication'ında:
- `appointments`
- `appointment_slots`
- `blocks`
- `block_slots`

**Diğer tablolar realtime'a girmez** — staff, services, shops, schedules değişiklikleri push edilmez. Bunlar değişince UI **manuel refetch** etmeli.

> Detay → [`06-realtime.md`](./06-realtime.md)

---

## 10. pg_cron temizlik işleri

```sql
-- Her gece 03:00 — completed/cancelled appointments 90 günden eski
cleanup-old-appointments  '0 3 * * *'

-- Her gece 03:15 — eski bloklar (ends_at 30 günden eski)
cleanup-old-blocks         '15 3 * * *'
```

**Frontend etkisi:** Yok — sadece DB boyut yönetimi. Eski randevuları geri çağırmak isteyen feature olursa bu işleri yeniden düşünmek gerekir.

---

## 11. Açık konular

- 🚧 **`staff.slug` kolonu eklenecek** — per-staff deep link feature (`/{shop}/u/{staff}`). Auto-slugify `name → slug`, UNIQUE per shop. Migration sonrası `database.types.ts` regen + `@berber/shared/types.ts → StaffPublic`'e `slug: string` ekleme.
- 🚧 **`staff.avatar_url` eklenebilir** — personel kartlarında foto gösterimi için. Şu an sadece text initial.
- ⚠️ **Dual owner column** (`shops.owner_user_id` + `owner_id`) — tek kolona düşür. Migration: `ALTER COLUMN owner_id SET NOT NULL` + `DROP COLUMN owner_user_id` + RLS policy'leri update.
- ⚠️ **`barbers` tablosu deprecated** — boş, kullanılmıyor. Migration ile DROP edilebilir; ama legacy RLS policy'leri ve trigger'lar referansları temizlenmeli.
- ⚠️ **`shops.name` vs `display_name`** — Multi-seat migration ikincisini ekledi, ama kullanım belirsiz. Hangisi UI'da görünüyor, hangisi internal? Standardize edilmeli.
- ⚠️ **`assign_any_barber` rename** — fonksiyon adı eski terminolojiden. `assign_any_staff`'a rename, eski isimle uyumlu wrapper bırak (edge function'lar geçişi için).
- ⚠️ **Cancellation reason field yok** — `appointments` tablosunda `cancelled_reason` veya `cancelled_at` yok. İptal istatistikleri için eklenebilir.

---

**Sonraki:** [`05-edge-functions.md`](./05-edge-functions.md) — 9 fonksiyonun input/output şeması + error code'ları.
