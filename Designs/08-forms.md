# 08 — Forms & Validation

> Repodaki tüm form yüzeyleri, mevcut validasyon stratejisi, hata yönetimi, zod şema konumu önerisi ve açık konular.

Önceki: [`07-data-fetching.md`](./07-data-fetching.md) · Sonraki: [`09-design-system.md`](./09-design-system.md)

---

## 1. Genel durum

**Form kütüphanesi yok.** `react-hook-form`, `zod`, `@hookform/resolvers` — hiçbiri repoda mevcut değil. Tüm formlar ham `useState` + `onChange`/`onChangeText` ile çalışıyor. Validasyon her formun `handleSubmit`/`handleSave` fonksiyonunda elle yazılmış.

Bu tasarım küçük form sayısı için kabul edilebilir; ama şema paylaşımı, tip türetme ve tutarlı hata mesajları için `zod` eklenebilir (bkz. §9).

---

## 2. Form envanteri

| Form | Dosya | Platform | Alanlar | Validasyon yeri |
|---|---|---|---|---|
| Müşteri randevu formu | `apps/web/src/components/BookingModal.tsx` | Web | ad, telefon, not | HTML5 `required` + JS guard |
| Yeni / düzenle randevu | `apps/mobile/components/AddAppointmentModal.tsx` | Mobil | ad, telefon, hizmet, tarih, saat | `handleSave` Alert |
| Personel ekle | `apps/mobile/app/(owner)/team.tsx` | Mobil | ad soyad | inline length check |
| Komisyon oranı | `apps/mobile/app/(owner)/team.tsx` | Mobil | yüzde sayı | `0–100` range + NaN |
| Randevu linki (slug) | `apps/mobile/app/(owner)/team.tsx` | Mobil | slug string | regex `/^[a-z0-9]…$/` |
| working_hours editörü | — | — | — | **uygulanmadı** |

> **working_hours editörü yok:** `shops.working_hours` JSON kolonu `types.ts`'te `WorkingHours` tipiyle tanımlı, ama hiçbir ekranda düzenleme formu yok. Okuma yapılıyor, yazma yok. Açık konu olarak §10'da.

---

## 3. Web — `BookingModal`

### 3.1 Alanlar

| Alan | Input tipi | Zorunlu | Kural |
|---|---|---|---|
| Ad Soyad | `<input type="text">` | ✓ | `minLength={2}`, `required` |
| Telefon | `<input type="tel">` | ✓ | `required`, JS guard `length ≥ 10` |
| Not | `<textarea>` | — | opsiyonel, sınır yok |

### 3.2 Validasyon akışı

```
handleSubmit()
  ├─ name.trim().length < 2  → return (HTML5 engeller ama JS guard da var)
  ├─ phone.trim().length < 10 → return
  └─ fetch() → book-appointment edge function
       ├─ 409  → onConflict() + hata mesajı
       └─ 200  → onSuccess()
```

Submit butonu `disabled={name.trim().length < 2 || phone.trim().length < 10}` — geçersiz giriş varken buton pasif kalır; kullanıcı boş submit deneyemez.

### 3.3 `customer_phone` gönderimi

Telefon zorunlu olduğundan `phone.trim()` her zaman dolu gelir; `|| undefined` koşulu kaldırıldı. Edge function artık her zaman dolu bir string alır.

### 3.4 Supabase client

`BookingModal` bir `'use client'` component; doğrudan `fetch()` ile `book-appointment` Edge Function'a gidiyor:

```ts
fetch(`${SUPABASE_URL}/functions/v1/book-appointment`, {
  method: "POST",
  headers: { apikey: SUPABASE_ANON_KEY },
  body: JSON.stringify({ ... }),
})
```

**Server Action'a taşınmıyor** — 409 conflict handling ve realtime invalidation bu `fetch` pattern'ine bağlı; taşıma gereksiz karmaşıklık ekler.

---

## 4. Mobil — `AddAppointmentModal`

### 4.1 Alanlar

| Alan | Bileşen | Zorunlu | Not |
|---|---|---|---|
| Müşteri Adı | `TextInput` | ✓ | `autoCapitalize="words"` |
| Telefon | `TextInput` `keyboardType="phone-pad"` | ✓ | `length ≥ 10` guard |
| Hizmet | Chip selector (servis listesi) | ✓ | Hizmet yoksa bloke edilir |
| Tarih | `DateTimePicker` (date mode) | ✓ | Geçmiş tarih engellenir |
| Saat | `DateTimePicker` (time mode) | ✓ | Geçmiş saat engellenir (+60 s tolerans) |
| Süre | Seçilen hizmetten türetilir | — | Düzenlenemez, gösterim amaçlı |

**Staff seçimi bu formda yok** — `staffId` prop olarak gelir, modal bilmez.

### 4.2 Edit mode

`editingAppt` prop'u dolu gelirse form mevcut randevunun değerleriyle açılır. Edit modunda geçmiş tarih validasyonu atlanır (mevcut randevunun saati değiştirilebilmeli). Submit `create_appointment_atomic` yerine `update_appointment_atomic` RPC'sini çağırır.

### 4.3 Validasyon sırası (`handleSave`)

```
1. name.trim().length < 2         → Alert "Müşteri adı en az 2 karakter"
2. phone.trim().length < 10       → Alert "Telefon numarası zorunlu"
3. !hasServices                   → Alert "Aktif hizmet tanımlanmalı"
4. !serviceId                     → Alert "Kayıtlı bir hizmet seçmelisin"
5. !isEdit && startsAt < now-60s  → Alert "Geçmiş saate randevu eklenemez"
6. supabase.rpc(...)
   ├─ error.code 23P01 / P0001    → Alert "Çakışma"
   └─ error                       → Alert "Hata: {message}"
```

### 4.4 RPC parametreleri

```ts
// Yeni randevu
supabase.rpc("create_appointment_atomic", {
  p_shop_id:         shopId,
  p_service_id:      serviceId,
  p_staff_id:        staffId,
  p_starts_at:       startsAt.toISOString(),
  p_customer_name:   name.trim(),
  p_customer_phone:  phone.trim(),   // artık her zaman dolu
  p_customer_notes:  null,
  p_customer_user_id: null,
})

// Düzenleme
supabase.rpc("update_appointment_atomic", {
  p_appointment_id:  editingAppt.id,
  p_staff_id:        staffId,
  p_service_id:      serviceId,
  p_starts_at:       startsAt.toISOString(),
  p_customer_name:   name.trim(),
  p_customer_phone:  phone.trim(),
  p_customer_notes:  null,
})
```

---

## 5. Mobil — `team.tsx` modal'ları

Üç ayrı `<Modal>` component'i var; inline form yok.

### 5.1 "Personel ekle" modal

```
Alan:     newStaffName (TextInput, autoCapitalize="words")
Validasyon: name.trim().length < 2 → Alert "Geçersiz ad"
Submit:   supabase.from("staff").insert({ name, slug, shop_id })
Slug:     isimden otomatik türetilir (toSlug(name)), çakışma varsa suffix eklenir
```

### 5.2 "Komisyon Oranı" modal

```
Alan:     commissionInput (TextInput, keyboardType="decimal-pad")
Validasyon:
  - boş → komisyon kapatılır (commission_type: "none")
  - parseFloat → NaN, negatif veya >100 → Alert "0 ile 100 arasında"
Submit:   supabase.rpc("update_staff_commission_config", { ... })
```

### 5.3 "Randevu Linki" modal

```
Alan:     slugInput (TextInput, autoCapitalize="none")
Validasyon: regex /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/ (isValidSlug)
Submit:   supabase.from("staff").update({ slug })
```

---

## 6. Hata yönetimi

### 6.1 Web

HTML5 `required` / `minLength` tarayıcı tarafında ilk savunma katmanı. JS guard'lar (`handleSubmit`'in başında `return`) tarayıcı validasyonunu bypass eden çağrılara karşı ikinci katman. Edge Function hataları catch'te `errorMsg` state'ine yazılır, form "error" adımına geçer.

```
Katman 1: HTML5 attribute  → tarayıcı engeller (form submit çalışmaz)
Katman 2: JS guard         → handleSubmit başında return
Katman 3: disabled button  → pasif görünüm + tıklama engeli
Katman 4: API error        → errorMsg → "error" step gösterimi
```

### 6.2 Mobil

`Alert.alert()` tek hata kanalı. Validasyon hataları sıralı — ilk başarısız kural anında uyarı gösterir, sonrakiler kontrol edilmez. RPC hataları doğrudan `error.message` ile Alert'e yazılır.

> **Fark:** Web'de hata inline (form içinde kırmızı mesaj); mobilde `Alert` — modal üzerinde native dialog açılır. Tutarlılık için mobilde de inline hata gösterimi tercih edilebilir (bkz. §10).

---

## 7. Zod şema konumu (öneri)

`packages/shared/src/schemas/` altında tutulmalı. Web ve mobil aynı şemaları kullanır; yineleme önlenir.

```
packages/shared/src/schemas/
  appointment.ts      ← customer_name, customer_phone, customer_notes
  staff.ts            ← name, slug, commission
  working-hours.ts    ← WorkingHours JSON yapısı (editör yazılınca)
```

```ts
// packages/shared/src/schemas/appointment.ts (öneri — henüz yok)
import { z } from "zod";

export const bookingFormSchema = z.object({
  customer_name:  z.string().min(2, "Ad en az 2 karakter olmalı"),
  customer_phone: z.string().min(10, "Geçerli bir telefon numarası gir"),
  customer_notes: z.string().optional(),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;
```

Şema türden `BookingFormValues` tipi türetilir — `BookAppointmentRequest`'in client-side alt kümesi olarak kullanılabilir.

**Bugünkü durum:** `packages/shared/src/schemas/` dizini yok. Zod bağımlılığı da yok. Hook veya lib eklenmeden önce `packages/shared/package.json`'a `"zod": "^3"` eklenmeli.

---

## 8. Telefon validasyon kuralı

Her iki platform `phone.trim().length < 10` kontrolü yapıyor. Bu minimal bir kural — formatı kontrol etmiyor (parantez, boşluk, ülke kodu vb.). Türk numaraları `05xx xxx xx xx` formatında 11 karakter (boşluksuz), `+90 5xx…` formatında 13+.

Şu an `length < 10` Türkiye dışı kısa numaraları da geçirir. Daha sıkı kural için:

```ts
// Zod ile
z.string().regex(/^(\+90|0)?5\d{9}$/, "Geçerli bir Türk telefon numarası gir")
```

> Şu an uygulanmıyor — `length < 10` minimal koruma olarak bırakıldı. Regex eklenmesi §10 açık konularında.

---

## 9. Zod entegrasyon planı (hedef)

1. `packages/shared`'a `zod` peer dep ekle
2. `packages/shared/src/schemas/` altında şemaları yaz
3. Web'de `bookingFormSchema.parse({ customer_name, customer_phone, customer_notes })` ile `handleSubmit` başında validasyon — hataları field bazlı göster
4. Mobilde `bookingFormSchema.safeParse(...)` ile `handleSave`'de validasyon — `.error.issues` üzerinden `Alert` yerine inline hata state'leri

`react-hook-form` opsiyonel: web için form state yönetimi kolaylaşır ama mevcut `useState` pattern'i yeterince küçük. Eklenmesi şart değil.

---

## 10. Açık konular

- ⚠️ **`working_hours` editörü yok** — `shops.working_hours` JSONB kolonu okunuyor ama yazma formu yok. Owner dükkan saatlerini değiştiremiyor. 7 günlük açık/kapalı toggle + saat picker içermeli.
- ⚠️ **Telefon format validasyonu zayıf** — `length ≥ 10` minimal. Türkiye GSM regex'i (`/^(0?5\d{9})$/`) eklenebilir; web ve mobilde tek yerden (shared şema) dağıtılmalı.
- ⚠️ **Mobil hata gösterimi tutarsız** — `Alert.alert()` native dialog açar, arka planda modal kaybolabilir gibi görünür. Field bazlı inline hata daha iyi UX sunar.
- ⚠️ **Zod + shared şemalar yok** — §7'de önerilen yapı kurulmadı. Web ve mobil validasyon kuralları ayrı ayrı yazılı, senkronize edilmiyor.
- ⚠️ **`customer_notes` web'de gönderiliyor, mobilde gönderilmiyor** — Web `BookingModal` not alanını edge function'a iletirken, mobil `AddAppointmentModal` `p_customer_notes: null` olarak sabit bırakıyor. Not alanı mobilde de görünür kılınabilir.
- 🚧 **Email / SMS doğrulama yok** — Telefon numarası format kontrolü dışında OTP veya SMS doğrulama akışı yok. Roadmap dışı.
- ⚠️ **Slug benzersizliği sadece client'ta kontrol ediliyor** — `team.tsx`'te slug çakışması `staffList` üzerinden mevcut slugları karşılaştırıyor. Race condition'da iki farklı personele aynı slug atanabilir. DB'de `UNIQUE` kısıtı olup olmadığı doğrulanmalı (bkz. `04-database.md`).

---

**Sonraki:** [`09-design-system.md`](./09-design-system.md) — Tailwind preset, React Native token tüketimi, bileşen kütüphanesi, tipografi, spacing, renk sistemi.
