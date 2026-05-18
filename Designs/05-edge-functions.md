# 05 — Edge Functions

> 8 Supabase Edge Function (Deno runtime). Her birinin **endpoint, input, output, error code'ları, auth gereksinimi**.

Önceki: [`04-database.md`](./04-database.md) · Sonraki: [`06-realtime.md`](./06-realtime.md)

---

## 1. Genel patern

### Endpoint formatı
```
POST https://<project-ref>.supabase.co/functions/v1/<function-name>
```

GET kullanan tek istisna: `get-availability` (query param ile çalışıyor).

### Ortak request headers
```http
Content-Type: application/json
Authorization: Bearer <jwt-or-anon-or-widget-token>  # endpoint'e göre
```

### Ortak success response
```json
{ "data": "..." }                  // ya da düz nesne
```

### Ortak error response (`_shared/cors.ts → error()` helper'ı)
```json
{
  "error": "Türkçe hata mesajı",
  "code": "BOOKING_CONFLICT",       // opsiyonel, frontend dispatch için
  "should_refetch_availability": true,
  "retry_after": 600                 // saniye, rate limit durumunda
}
```

**HTTP status** Edge Function tarafından set ediliyor; frontend `res.ok` ile dallanır, `res.status` ile error code'a karar verir.

### CORS
Tüm fonksiyonlar **OPTIONS preflight'a** ekstra logic koymuyor — `_shared/cors.ts` izin veriyor (web + mobil her domain'den).

---

## 2. Fonksiyon listesi (tek bakışta)

| # | Fonksiyon | Method | Auth | verify_jwt | Çağıran |
|---|---|---|---|---|---|
| 1 | `get-availability` | GET | anon key | ❌ | web booking, mobil ajanda |
| 2 | `book-appointment` | POST | anon key | ❌ | web booking (anonim müşteri) |
| 3 | `customer-book-appointment` | POST | user JWT | ✅ | kayıtlı müşteri (arşiv app) |
| 4 | `customer-cancel-appointment` | POST | user JWT | ✅ | kayıtlı müşteri (arşiv app) |
| 5 | `block-walkin` | POST | **widget token** | ❌ | Android home-screen widget |
| 6 | `create-manual-block` | POST | user JWT | ✅ | mobil staff/owner (M4, AddAppt modal) |
| 7 | `create-widget-token` | POST | user JWT | ✅ | mobil owner settings |
| 8 | `invite-barber` | POST | user JWT | ✅ | mobil owner team |

> ⚠️ **Not:** Önceki sohbette kullanıcı `customer-get-availability`'yi de saydı (9 fonksiyon), repo'da `scheduling-hardening` branch'inde **bu fonksiyon yok**. Dashboard'da deploy edilmiş olabilir veya başka branch'te kalmış olabilir — **doğrulanması gereken konu**.

---

## 3. Fonksiyon-fonksiyon detay

### 3.1 — `get-availability`

**Görevi:** Belirli dükkan + tarih + hizmet kombinasyonu için **müsait slot listesi** döner. Web booking flow'un *"Saat seç"* adımı bunu çağırır.

#### Request
```http
GET /functions/v1/get-availability
  ?shop_slug=keskin-berber
  &date=2026-05-14         # YYYY-MM-DD
  &service_id=<uuid>
  &staff_id=<uuid>|any     # opsiyonel; yoksa veya "any" → "Fark Etmez"
```

#### Authorization
Anon key (`apikey` header, Supabase varsayılan).

#### Response — `staff_id = uuid` (belirli personel)
```json
{
  "staff_id": "<uuid>",
  "closed": false,
  "occupied": [
    { "starts_at": "2026-05-14T07:00:00Z", "ends_at": "2026-05-14T07:45:00Z" }
  ],
  "slots": [
    { "starts_at": "...", "ends_at": "...", "available": true  },
    { "starts_at": "...", "ends_at": "...", "available": false }
  ]
}
```

#### Response — `staff_id = "any"`
```json
{
  "staff_id": "any",
  "slots": [
    { "starts_at": "...", "ends_at": "...", "available": true }
  ]
}
```

`available = true` → **en az 1 aktif personel** o slot'ta müsait. Slot bazında union mantığı.

#### Closed-day senaryosu (personel o gün çalışmıyor)
```json
{ "staff_id": "<uuid>", "closed": true, "occupied": [], "slots": [] }
```

#### Error code'ları
| HTTP | Mesaj | Sebep |
|---|---|---|
| 400 | `"shop_slug, date, service_id zorunlu"` | Query param eksik |
| 404 | `"Dükkan bulunamadı"` | Slug yanlış |
| 404 | `"Hizmet bulunamadı"` | service_id geçersiz veya pasif |
| 404 | `"Personel bulunamadı"` | staff_id geçersiz veya pasif |
| 404 | `"Dükkanda aktif personel yok"` | "any" senaryosunda hiç staff yok |
| 500 | `"Müsaitlik bilgisi alınamadı"` | RPC `get_occupied_ranges` veya `get_shop_occupied_ranges` patladı |

#### Frontend kullanım örneği
```ts
// apps/web/src/components/SlotGrid.tsx (Client Component)
const params = new URLSearchParams({
  shop_slug: slug,
  date: dateISO,                         // "2026-05-14"
  service_id: serviceId,
  ...(staffId ? { staff_id: staffId } : {}),  // "any" yerine yoksa
});

const res = await fetch(
  `${SUPABASE_URL}/functions/v1/get-availability?${params}`,
  { headers: { apikey: ANON_KEY } }
);
const { slots } = await res.json();
```

---

### 3.2 — `book-appointment` *(anonim müşteri)*

**Görevi:** Anonim müşterinin web booking flow'un sonunda randevuyu **atomik olarak** oluşturur. GIST exclusion constraint + advisory lock ile **çift booking imkânsız**.

#### Request
```http
POST /functions/v1/book-appointment
Content-Type: application/json
```

```ts
{
  "shop_slug":      "keskin-berber",
  "service_id":     "<uuid>",
  "staff_id":       "<uuid>" | null,   // null → "Fark Etmez" (assign_any_staff)
  "starts_at":      "2026-05-14T08:30:00Z",
  "customer_name":  "Ahmet Yılmaz",     // min 2 char
  "customer_phone": "+90 555 123 45 67", // opsiyonel
  "customer_notes": "Saçımı kısa kestirin" // opsiyonel
}
```

#### Authorization
Anon key (Authorization header gerekmez ama Supabase varsayılan `apikey` header şart).

#### Rate limit
- **5 randevu / 10 dakika / IP** — Upstash Redis ile, IP başına `INCR + EXPIRE NX`.
- Limit aşılırsa HTTP 429 + `{ code: "RATE_LIMITED", retry_after: 600 }`.
- Upstash env'leri yoksa rate limit **bypass edilir** (lokal dev fallback).

#### Response — success
```json
{
  "appointment_id":  "<uuid>",
  "starts_at":       "2026-05-14T08:30:00Z",
  "ends_at":         "2026-05-14T09:15:00Z",
  "staff_name":      "Ahmet",
  "service_name":    "Saç + Sakal"
}
```

(`create_appointment_atomic` RPC çıktısı — bkz. §4.1.)

#### Error code'ları (RPC code → HTTP status map)
| RPC code | HTTP | code field | Sebep |
|---|---|---|---|
| `P0001` | 409 | `BOOKING_CONFLICT` | GIST exclusion — slot dolu. Frontend `should_refetch_availability: true` görür → slot listesi yenilenmeli. |
| `P0002` | 404 | `BOOKING_ERROR` | Dükkan / hizmet / personel bulunamadı |
| `22023` | 400 | `BOOKING_ERROR` | Geçersiz parametre (örn. starts_at) |
| `P0004` | 429 | `RATE_LIMITED` | DB rate limit (phone-based, edge function üzerinde Upstash + DB'de phone_booking_rate_limits) |
| — | 400 | — | "Geçmiş bir saate randevu oluşturulamaz" (frontend validation) |
| diğer | 500 | `BOOKING_ERROR` | RPC unexpected |

#### Frontend kullanım örneği
```ts
// apps/web/src/components/BookingModal.tsx
const res = await fetch(
  `${SUPABASE_URL}/functions/v1/book-appointment`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({
      shop_slug, service_id, staff_id, starts_at,
      customer_name, customer_phone, customer_notes,
    }),
  }
);

if (!res.ok) {
  const err = await res.json();
  if (err.code === 'BOOKING_CONFLICT')  { /* slot listesi yenile */ }
  if (err.code === 'RATE_LIMITED')       { /* retry_after timer */ }
  throw new Error(err.error);
}
```

---

### 3.3 — `customer-book-appointment` *(kayıtlı müşteri)*

**Görevi:** Login'li müşteri akışı. `customer_user_id = auth.uid()` set eder. **Şu an aktif değil** — arşivdeki müşteri app'i kullanıyordu. İleride "Hesabım" feature'ı eklenirse aktif.

#### Request
```http
POST /functions/v1/customer-book-appointment
Authorization: Bearer <user-jwt>
```

```ts
{
  "shop_slug":      "...",
  "service_id":     "<uuid>",
  "staff_id":       "<uuid>" | null,
  "starts_at":      "...",
  "customer_name":  "...",
  "customer_phone": "..."   // opsiyonel
}
```

`book-appointment` ile farkları:
- **JWT zorunlu** (401 dönerse oturum yok)
- **Rate limit yok** (auth'lu kullanıcı, IP bazlı koruma yerine RLS)
- **`customer_notes` yok**, ama backend `customer_user_id`'yi set ediyor

#### Response + error code'ları
`book-appointment` ile aynı, sadece `RATE_LIMITED` (429) yok.

---

### 3.4 — `customer-cancel-appointment` *(kayıtlı müşteri)*

**Görevi:** Kendi randevusunu iptal. RLS + edge function ek olarak **min 2 saat kala** kuralını uygular.

#### Request
```http
POST /functions/v1/customer-cancel-appointment
Authorization: Bearer <user-jwt>
```

```ts
{ "appointment_id": "<uuid>" }
```

#### Pre-flight
1. JWT doğrula (`auth.getUser()` 401 dönerse abort).
2. `appointments` tablosundan `customer_user_id = auth.uid()` filtreli single fetch.
3. `MIN_CANCEL_NOTICE_MINUTES` = **120 dk** kontrolü.

#### Response — success
```json
{ "success": true }
```

#### Error code'ları
| HTTP | Mesaj | Sebep |
|---|---|---|
| 401 | `"Oturum gerekli"` | JWT yok |
| 401 | `"Oturum doğrulanamadı"` | JWT geçersiz |
| 404 | `"Randevu bulunamadı"` | Yok veya başkasının |
| 400 | `"Randevu zaten iptal edilmiş"` | `status = 'cancelled'` |
| 409 | `"...2 saatten az kaldığı için iptal edilemez..."` | `starts_at - now < 2h` |
| 500 | `"İptal işlemi başarısız"` | `cancel_appointment_atomic` patladı |

---

### 3.5 — `block-walkin` *(widget)*

**Görevi:** Android home-screen widget'tan **walk-in müşteri** için anında slot kapatma. Widget token ile authenticate.

#### Request
```http
POST /functions/v1/block-walkin
Authorization: Bearer <widget-token-raw>
```

```ts
{
  "staff_id":     "<uuid>",     // opsiyonel — tek aktif staff varsa atlanabilir
  "duration_min": 30,            // 5-480
  "reason":       "walkin" | "break" | "personal"  // default "walkin"
}
```

#### Authorization
- **Raw widget token** (SHA-256 hash ile `widget_tokens` tablosunda lookup).
- **2 saniye cooldown** per-token (DoS önlemi).

#### Response — success (HTTP 201)
```json
{
  "id": "<block-uuid>",
  "staff_id": "<uuid>",
  "starts_at": "...",
  "ends_at": "...",
  "reason": "walkin",
  "created_via": "widget"
}
```

#### Error code'ları
| HTTP | Mesaj | code | Sebep |
|---|---|---|---|
| 401 | `"Authorization header eksik"` | — | Token yok |
| 401 | `"Geçersiz token"` | — | Hash match yok |
| 401 | `"Token süresi dolmuş"` | — | `expires_at < now` |
| 429 | `"Çok hızlı istek..."` | — | 2sn cooldown |
| 403 | `"Personel bu dükkana ait değil"` | — | staff_id ≠ token.shop_id |
| 404 | `"Aktif personel bulunamadı"` | — | Hiç staff yok |
| 400 | `"staff_id zorunlu"` | — | >1 staff var, hangisi belirsiz |
| 409 | `"..."` | `BLOCK_CONFLICT` | GIST exclusion |
| 500 | `"Blok oluşturulamadı"` | `BLOCK_ERROR` | RPC patladı |

---

### 3.6 — `create-manual-block`

**Görevi:** Mobil app içinden (M4 "Slot Blokla" ekranı + AddAppointmentModal'da slot kapama) mola/walk-in/kişisel blok.

#### Request
```http
POST /functions/v1/create-manual-block
Authorization: Bearer <user-jwt>
```

```ts
{
  "staff_id":     "<uuid>",
  "duration_min": 30,            // 5-480
  "reason":       "break"        // default "break"
}
```

#### Yetki kontrolü
```ts
const isOwner = shop.owner_id === user.id;
const isSelf  = staff.user_id === user.id;
if (!isOwner && !isSelf) return 403;
```

- Owner kendi shop'undaki **her** staff için blok oluşturabilir.
- Staff sadece **kendisi** için.

#### Response (HTTP 201) — `create_block_atomic` çıktısı
Aynı `block-walkin` ile (sadece `created_via: 'app'`).

#### Error code'ları
| HTTP | Mesaj | Sebep |
|---|---|---|
| 401 | `"Giriş gerekli"` / `"Geçersiz oturum"` | JWT yok/bozuk |
| 400 | `"staff_id zorunlu"` / `"duration_min 5-480 dakika arasında olmalı"` | Validation |
| 404 | `"Personel bulunamadı"` | Pasif veya yok |
| 403 | `"Bu personel için blok oluşturma yetkiniz yok"` | Owner/self değil |
| 409 | RPC mesajı | GIST exclusion |
| 500 | `"Blok oluşturulamadı"` | RPC patladı |

---

### 3.7 — `create-widget-token`

**Görevi:** Owner kendi dükkanı için yeni widget token üretir. **Raw token sadece bir kez** döner; sonra hash olarak saklanır.

#### Request
```http
POST /functions/v1/create-widget-token
Authorization: Bearer <user-jwt>
```

```ts
{ "label": "Salon kasası" }   // opsiyonel, default "Telefon Widget"
```

#### Yetki kontrolü
```ts
shops.owner_user_id = auth.uid()
```

> ⚠️ **Yalnızca `owner_user_id` check ediliyor**, yeni `owner_id` kolonu değil. Dual owner column migration tamamlanınca buraya bakılmalı.

#### Response (HTTP 201)
```json
{
  "id": "<token-row-uuid>",
  "label": "Salon kasası",
  "created_at": "...",
  "raw_token": "abc-def-...-xyz"
}
```

> **`raw_token`** UI'da owner'a gösterilir, kopyalanır. Bir daha alınamaz — kayboldıysa yenisini üretmek gerekir.

#### Error code'ları
| HTTP | Mesaj | Sebep |
|---|---|---|
| 401 | `"Authorization header eksik"` / `"Kimlik doğrulama başarısız"` | JWT yok/bozuk |
| 404 | `"Dükkan profili bulunamadı"` | Owner değil |
| 500 | `"Token oluşturulamadı"` | DB insert patladı |

---

### 3.8 — `invite-barber`

**Görevi:** Owner yeni personeli e-posta ile davet eder. Supabase Auth `inviteUserByEmail` + DB kayıt insert.

> ⚠️ **Önemli legacy bug:** Bu fonksiyon **`barbers` tablosuna insert ediyor**, `staff` değil! Multi-seat migration sonrası **bozuk kalmış**. Yeni davet akışı için fonksiyon **güncellenmeli** veya **yeniden yazılmalı**. Bu yüzden owner panel "Personel davet et" akışı şu an gerçek değil.

#### Request
```http
POST /functions/v1/invite-barber
Authorization: Bearer <user-jwt>
```

```ts
{
  "email":        "yeni-personel@gmail.com",
  "display_name": "Mehmet Ali"
}
```

#### Yetki
`shops.owner_user_id = auth.uid()` (yine yalnızca legacy kolon).

#### Response (HTTP 201)
```json
{
  "barber": {
    "id": "<uuid>",
    "display_name": "Mehmet Ali",
    "invite_email": "yeni-personel@gmail.com"
  }
}
```

#### Error code'ları
| HTTP | Mesaj | Sebep |
|---|---|---|
| 401 | `"Authorization header eksik"` / `"Kimlik doğrulama başarısız"` | JWT |
| 403 | `"Dükkan sahibi yetkisi gerekli"` | Owner değil |
| 400 | `"email ve display_name zorunlu"` | Param eksik |
| 500 | `"Davet gönderilemedi: ..."` | Supabase Auth invite hatası |
| 500 | `"Usta kaydı oluşturulamadı: ..."` | DB insert hatası |

---

## 4. Altta yatan RPC'ler

Edge function'lar büyük çoğunluğunda **atomic RPC'ler** üzerinden çalışıyor — race condition ve double-write'a karşı tek transaction.

### 4.1 — `create_appointment_atomic`

Imza (parametre adları edge function'dan):
```sql
create_appointment_atomic(
  p_shop_slug          text,
  p_shop_id            uuid,     -- alternatif (slug yerine)
  p_service_id         uuid,
  p_staff_id           uuid,     -- null → assign_any_staff
  p_starts_at          timestamptz,
  p_customer_name      text,
  p_customer_phone     text,
  p_customer_notes     text,
  p_customer_user_id   uuid      -- kayıtlı müşteri akışı
)
RETURNS jsonb  -- { appointment_id, starts_at, ends_at, staff_name, service_name }
```

İçeride:
1. Phone rate limit kontrolü (P0004)
2. Advisory lock (staff_id + day)
3. GIST exclusion ile çakışma kontrolü (P0001)
4. `appointments` insert + mirror trigger `appointment_slots`'a yazar

### 4.2 — `cancel_appointment_atomic`

```sql
cancel_appointment_atomic(p_appointment_id uuid)
RETURNS void
```

İçeride: advisory lock + ownership check + `UPDATE status = 'cancelled'` + mirror auto-cleanup.

### 4.3 — `create_block_atomic`

```sql
create_block_atomic(
  p_staff_id     uuid,
  p_starts_at    timestamptz,
  p_ends_at      timestamptz,
  p_reason       text,
  p_created_via  text
)
RETURNS jsonb  -- block row
```

İçeride: GIST exclusion kontrolü, `blocks` insert + mirror trigger.

---

## 5. Frontend kullanım pattern'leri

### Web — Server Action (önerilen)
```ts
// apps/web/src/app/[slug]/actions.ts
'use server';

export async function bookAppointment(input: BookAppointmentRequest) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/book-appointment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(input),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new BookingError(err.code, err.error, err.should_refetch_availability);
  }

  return res.json();
}
```

### Mobil — `supabase.functions.invoke`
```ts
// apps/mobile/app/(app)/block.tsx
const { data, error } = await supabase.functions.invoke('create-manual-block', {
  body: { staff_id, duration_min, reason },
});
if (error) {
  Alert.alert('Çakışma', error.message ?? 'Blok oluşturulamadı');
  return;
}
```

> `supabase.functions.invoke` otomatik JWT'yi Authorization header'a koyar — manuel set etmeye gerek yok.

---

## 6. Error code haritası — özet

| HTTP | Anlam | Frontend davranışı |
|---|---|---|
| 400 | Validation hatası | Form-level error gösterme |
| 401 | Auth eksik / geçersiz | Login'e yönlendir, session refresh |
| 403 | Yetki yok | Toast: "Bu işlemi yapamazsın", geri |
| 404 | Kaynak yok | Toast: "Bulunamadı", refetch |
| 409 | Çakışma (`BOOKING_CONFLICT` / `BLOCK_CONFLICT`) | Slot listesini yenile + Alert: "Çakışma" |
| 429 | Rate limit (`RATE_LIMITED`) | Sayaç başlat (`retry_after`), butonu disable et |
| 500 | Sunucu hatası | Toast: "Bir şeyler ters gitti, tekrar dene", log |

---

## 7. Açık konular

- ⚠️ **`invite-barber` bozuk** — `barbers` tablosuna insert ediyor, `staff` değil. Owner panel "Personel davet et" akışı gerçek değil. **Bu öncelikli düzeltme.**
- ⚠️ **`customer-get-availability` belirsiz** — kullanıcı 9. fonksiyon olarak saydı, repo'da yok. Dashboard'da deploy edilmiş olabilir; doğrulanmalı.
- ⚠️ **Owner column check'leri legacy** — `create-widget-token` ve `invite-barber` yalnızca `shops.owner_user_id`'yi check ediyor, yeni `owner_id` kolonunu değil. Dual owner column migration tamamlanınca buraya bakılmalı.
- ⚠️ **`block-walkin` `staff_id` ambiguity** — birden fazla aktif staff varken `staff_id` yoksa 400 dönüyor; widget'ın multi-staff support'u bu nedenle sınırlı. Widget UI'da staff seçici eklenebilir.
- ⚠️ **`book-appointment` rate limit fallback** — Upstash env'leri yoksa rate limit bypass oluyor. Production'da Upstash zorunlu olmalı; yoksa log uyarısı + 503 dönmek opsiyonu düşünülmeli.
- ⚠️ **Error mesajları karışık** — bazı yerlerde Türkçe (`"Çok fazla istek..."`), bazı yerlerde İngilizce-Türkçe karışık (`"Method not allowed"`, `"Gecersiz JSON"`). Tutarlı Türkçe + kod field'a göre frontend tarafı tek mapping yapsın diye **mesajlar standartlaştırılmalı**.
- ⚠️ **Idempotency key yok** — `book-appointment` çift POST atılırsa GIST exclusion zaten ikinciyi reddediyor (DB-safe), ama frontend "yeniden dene" senaryolarında idempotency key (`X-Idempotency-Key` header) olursa daha temiz olur.

---

**Sonraki:** [`06-realtime.md`](./06-realtime.md) — 4 realtime tablosu, subscription pattern, query invalidation.
