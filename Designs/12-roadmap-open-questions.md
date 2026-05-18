# 12 — Roadmap & Açık Konular

> Tüm dokümanlardan derlenen açık konular, önceliklendirilmiş teknik borç listesi, karar bekleyen mimari sorular ve bilinçli olarak yapılmayan şeyler.

Önceki: [`11-conventions.md`](./11-conventions.md)

---

## 1. Öncelik skalası

| Seviye | Tanım |
|---|---|
| **P0** | Üretim öncesi zorunlu — güvenlik açığı, veri kaybı riski veya kritik bozuk akış |
| **P1** | Kısa vadeli teknik borç — geliştirici deneyimi veya kullanıcı deneyimi ciddi biçimde etkileniyor |
| **P2** | Orta vadeli iyileştirme — önemli ama acil değil |
| **🔷** | Karar bekliyor — kod yazılmadan önce bilinçli tercih yapılmalı |
| **🚫** | Roadmap dışı — bilinçli karar, tekrar gündeme alınmasın |

---

## 2. P0 — Üretim öncesi zorunlu

### `invite-barber` edge function bozuk
- **Kaynak:** [`05-edge-functions.md §7`](./05-edge-functions.md)
- **Sorun:** `barbers` tablosuna (deprecated, boş) insert yapıyor — `staff` tablosuna değil. Owner panel "Personel davet et" akışı gerçek değil.
- **Fix:** Edge function'ı `staff` tablosuna yazacak şekilde yeniden yaz. `owner_id` check'ini yeni kolon ile güncelle.
- **Efor:** Küçük (1–2 saat)

### Logout sonrası `removeAllChannels` eksik
- **Kaynak:** [`06-realtime.md §12`](./06-realtime.md)
- **Sorun:** `apps/mobile/app/_layout.tsx`'te `onAuthStateChange` handler'ında `supabase.removeAllChannels()` çağrısı yok. Her login-logout döngüsünde WS kanalları bellekte birikir. Web'de `AuthProvider` dosyası hiç yok.
- **Fix:**
  ```ts
  // _layout.tsx
  supabase.auth.onAuthStateChange((_e, s) => {
    if (!s) supabase.removeAllChannels();
    setSession(s);
  });
  ```
- **Efor:** Küçük (30 dk)

### E-posta doğrulama production'da açılmalı
- **Kaynak:** [`03-auth.md`](./03-auth.md)
- **Sorun:** `supabase/config.toml`'da `confirm = false` — lokal dev için kapalı. Production'a taşımadan önce açılmazsa herhangi bir e-posta ile hesap oluşturulabilir.
- **Fix:** `confirm = true` + e-posta template'i (`/supabase/templates/`) hazırla.
- **Efor:** Küçük (1 saat)

### Rate limit Upstash olmadan bypass oluyor
- **Kaynak:** [`05-edge-functions.md §7`](./05-edge-functions.md)
- **Sorun:** `book-appointment` edge function Upstash env'leri yoksa rate limit'i **sessizce atlar**. Production'da env eksikse sınırsız booking isteği gelebilir.
- **Fix:** Upstash ortam değişkenlerini production'a ekle. Yoksa `503 Service Unavailable` dön — silent bypass değil.
- **Efor:** Küçük (30 dk config + test)

### `role === null` sonsuz loading
- **Kaynak:** [`10-routing.md §11`](./10-routing.md)
- **Sorun:** Oturumu açık ama `shops` veya `staff` tablosunda kaydı olmayan kullanıcı `RouterGuard`'da sonsuz spinner görüyor. Onboarding akışı veya "hesap bulunamadı" ekranı yok.
- **Fix:** `role === null && session !== null` durumuna özel ekran — "Hesabınız yapılandırılıyor, lütfen bekleyin" veya destek yönlendirmesi.
- **Efor:** Orta (2–4 saat)

---

## 3. P1 — Kısa vadeli teknik borç

### TanStack Query kurulu değil
- **Kaynak:** [`07-data-fetching.md §12`](./07-data-fetching.md)
- **Sorun:** Web ve mobilde tüm veri çekme `useState` + `useCallback` + `useEffect` ile yapılıyor. Cache yok, stale-while-revalidate yok, background refetch yok. `QueryClientProvider` hiçbir yerde kurulmamış.
- **Bağımlı konular:** AppState listener, `refetchOnWindowFocus`, prefetch, optimistic update pattern'leri TQ kurulmadan uygulanamaz.
- **Efor:** Büyük (web + mobil tüm fetch'leri migrate etmek — 1–2 gün)

### `working_hours` editörü yok
- **Kaynak:** [`08-forms.md §10`](./08-forms.md)
- **Sorun:** `shops.working_hours` JSONB kolonu okunuyor ama yazma formu yok. Owner dükkan saatlerini uygulama üzerinden değiştiremiyor — doğrudan DB erişimi gerekiyor.
- **Fix:** Owner settings ekranına 7 günlük toggle + saat picker ekle. Zod şeması `packages/shared/src/schemas/working-hours.ts`'te tanımlansın.
- **Efor:** Orta (yarım gün UI + validation)

### Dual owner column (`shops.owner_user_id` + `owner_id`)
- **Kaynak:** [`04-database.md §11`](./04-database.md), [`05-edge-functions.md §7`](./05-edge-functions.md)
- **Sorun:** `shops` tablosunda iki ayrı owner kolonu var. `create-widget-token` ve `invite-barber` yalnızca `owner_user_id`'yi check ediyor — yeni `owner_id` kolonu gözardı ediliyor.
- **Fix:** Migration: `ALTER COLUMN owner_id SET NOT NULL` → `DROP COLUMN owner_user_id` → RLS + edge function güncellemesi.
- **Efor:** Orta (migration + test — dikkatli)

### AppState listener yok (mobil)
- **Kaynak:** [`06-realtime.md §12`](./06-realtime.md), [`07-data-fetching.md §12`](./07-data-fetching.md)
- **Sorun:** `AppState` import veya listener repoda hiçbir yerde yok. Uygulama arka plana gidip geri dönünce stale veri kalıyor. Background → foreground geçişinde `invalidateQueries()` tetiklenmiyor.
- **Fix:**
  ```ts
  AppState.addEventListener('change', (state) => {
    if (state === 'active') load(); // veya TQ sonrası invalidateQueries()
  });
  ```
- **Efor:** Küçük (1 saat — ama TQ bağımlılığı var)

### Zod + paylaşımlı şemalar yok
- **Kaynak:** [`08-forms.md §7, §9`](./08-forms.md)
- **Sorun:** Web ve mobil validasyon kuralları ayrı ayrı elle yazılmış, senkronize edilmiyor. `packages/shared/src/schemas/` dizini yok.
- **Fix:** `packages/shared`'a `zod ^3` ekle, `schemas/appointment.ts`, `schemas/staff.ts` oluştur. Her platform aynı şemayı içe aktarsın.
- **Efor:** Orta (şema yazımı + iki platformda entegrasyon — yarım gün)

### `customer_notes` tutarsızlığı
- **Kaynak:** [`08-forms.md §10`](./08-forms.md)
- **Sorun:** Web `BookingModal` `customer_notes` alanını edge function'a gönderiyor; mobil `AddAppointmentModal` `p_customer_notes: null` olarak sabit bırakıyor.
- **Fix:** Mobil forma not alanı ekle veya web'de not alanını kaldır — tutarlı hale getir.
- **Efor:** Küçük

### `packages/shared/api/` dizini yok
- **Kaynak:** [`07-data-fetching.md §12`](./07-data-fetching.md)
- **Sorun:** `fetchAvailability` ve benzeri edge function çağrıları her platformda ayrı yazılıyor. URL kurma, header ekleme, hata parse etme tekrar ediyor.
- **Fix:** `packages/shared/src/api/availability.ts`, `booking.ts` gibi ortak fonksiyonlar. Her platform import eder.
- **Efor:** Küçük (1–2 saat)

### Mobil ESLint / Prettier yok
- **Kaynak:** [`11-conventions.md §8`](./11-conventions.md)
- **Sorun:** Web'de `next/core-web-vitals` ESLint var; mobilde hiç lint yok. Monorepo geneli format aracı yok. Tab/space, trailing comma, quote style tutarsız olabilir.
- **Fix:** `packages/eslint-config` + Prettier config ekle; root `package.json`'a `lint:all` script.
- **Efor:** Orta (setup kolay, ama oluşan lint hatalarını temizlemek sürer)

### Test framework yok
- **Kaynak:** [`00-overview.md §8`](./00-overview.md)
- **Sorun:** Jest, Vitest, Playwright, RNTL — hiçbiri kurulu değil. CI pipeline yok.
- **Öneri:** Başlangıç için Vitest (shared + web unit) + Playwright (web e2e booking flow). Mobil için RNTL önce kritik hook'lara.
- **Efor:** Büyük (altyapı + ilk test coverage)

---

## 4. P2 — Orta vadeli

### `staff.slug` kolonu ekle (per-staff deep link)
- **Kaynak:** [`04-database.md §11`](./04-database.md)
- **Notlar:** `/{shop}/u/{barberSlug}` route'u web'de **zaten var** (`[slug]/u/[barberSlug]/page.tsx`). Fakat `staff` tablosunda `slug` kolonu henüz yok — route parametre olarak çalışıyor ama DB'de canonical değil. Migration + `UNIQUE per shop` kısıtı + `database.types.ts` regen.
- **Efor:** Küçük

### `barbers` tablosu DROP
- **Kaynak:** [`04-database.md §11`](./04-database.md)
- **Notlar:** Boş, deprecated. Ama DROP öncesi tüm RLS policy'leri ve trigger'lar referansını temizle.
- **Efor:** Küçük (ama dikkatli migration)

### Telefon format validasyonu güçlendir
- **Kaynak:** [`08-forms.md §8`](./08-forms.md)
- **Notlar:** `length ≥ 10` minimal. TR GSM regex: `/^(0?5\d{9})$/`. Zod şemasına girer, web + mobil tek yerden alır.
- **Efor:** Küçük

### Slug benzersizliği DB kısıtı ile güvence altına al
- **Kaynak:** [`08-forms.md §10`](./08-forms.md)
- **Notlar:** `team.tsx`'te slug çakışması sadece client-side `staffList` ile kontrol ediliyor. Race condition riski var. `staff(slug, shop_id)` UNIQUE kısıtı eksikse ekle.
- **Efor:** Küçük (migration + hata mesajı)

### Deep link akışını aktifleştir
- **Kaynak:** [`10-routing.md §11`](./10-routing.md)
- **Notlar:** `"scheme": "berberapp"` tanımlı ama `Linking.getInitialURL()` yok. Widget → randevu ekranı gibi akışlar kurulamıyor. iOS Universal Link + Android App Link da yok.
- **Efor:** Orta

### Mobil spacing token'ları ekle
- **Kaynak:** [`09-design-system.md §11`](./09-design-system.md)
- **Notlar:** `theme.ts`'e `S = { xs:4, sm:8, md:16, lg:24, xl:32 }` objesi. Magic number'ları temizler.
- **Efor:** Küçük (değer tanımı kolay; mevcut magic number'ları S referanslarıyla değiştirmek orta)

### `--umber` ve `--mint` Tailwind'a ekle
- **Kaynak:** [`09-design-system.md §11`](./09-design-system.md)
- **Notlar:** Kazanç/komisyon rengi (`--umber-600`) ve tamamlandı rengi (`--mint-600`) `tailwind.config.ts`'te yok — raw hex yazılıyor.
- **Efor:** Küçük

### `assign_any_barber` → `assign_any_staff` rename
- **Kaynak:** [`04-database.md §11`](./04-database.md)
- **Efor:** Küçük (eski isimle uyumlu wrapper bırak)

### `revalidateTag("shop-profile")` tetikleyicisi
- **Kaynak:** [`10-routing.md §11`](./10-routing.md)
- **Notlar:** Dükkan adı/avatar değişince Next.js cache otomatik yenilenmez; 60s TTL dolana kadar eski veri. Supabase webhook veya owner settings action'ından tetiklenebilir.
- **Efor:** Orta

---

## 5. Karar bekleyen mimari sorular

Bu konularda kod yazılmadan önce bilinçli tercih yapılmalı.

### 🔷 Font: Montserrat mı, sistem fontu mu?
- Kanonik tipografi Montserrat üzerine optimize edildi (tracking değerleri, ağırlık seçimi). Web ve mobilde şu an sistem fontu (Inter / -apple-system) kullanılıyor.
- **Seçenek A:** Montserrat web'e (`next/font` ile) ve mobil'e (`expo-font` ile) ekle — kanonik tasarıma tam uyum.
- **Seçenek B:** Sistem fontu kal — tracking değerlerini (`0.16em` overline vb.) yeniden ayarla.
- **Kaynak:** [`09-design-system.md §11`](./09-design-system.md)

### 🔷 TanStack Query migration zamanlaması
- TQ olmadan AppState listener, prefetch, optimistic update, background refetch düzgün uygulanamıyor. Migration ertelenirse P1 borç büyüyor.
- **Seçenek A:** Önce web, sonra mobil — kademeli.
- **Seçenek B:** Yeni özellik geliştirme dondurulur, tam migration yapılır.
- **Kaynak:** [`07-data-fetching.md`](./07-data-fetching.md)

### 🔷 `customer-get-availability` edge function nerede?
- Kullanıcı 9. fonksiyon olarak saydı; `scheduling-hardening` branch'inde yok. Dashboard'da deploy edilmiş olabilir, başka branch'te kalmış olabilir, ya da henüz yazılmamış olabilir.
- **Aksiyon:** Supabase dashboard'dan kontrol et; varsa `05-edge-functions.md`'e ekle, yoksa listedeki fonksiyon sayısını 8 olarak sabitle.
- **Kaynak:** [`05-edge-functions.md §2`](./05-edge-functions.md)

### 🔷 Input radius: 12px mi, 10px mi?
- Kanonik `--radius-md` = 12px. Web `tailwind.config.ts` ve mobil `R.input` = 10px.
- **Aksiyon:** Tasarım kararı — kanonik güncellenmeli mi, yoksa implementasyon mu?
- **Kaynak:** [`09-design-system.md §11`](./09-design-system.md)

### 🔷 Komisyon hesaplama — DB mi, edge function mı?
- `commission_snapshots` ve `commission_rules` migration'ları mevcut ama production'a push edilmemiş olabilir. `earnings.tsx` şu an komisyon verisini nereden çekiyor netleşmedi.
- **Aksiyon:** Supabase production schema'sını kontrol et; tablo varsa `04-database.md`'e ekle.
- **Kaynak:** [`04-database.md §11`](./04-database.md)

### 🔷 Web owner/staff paneli roadmap'te mi?
- Şu an tüm yönetim mobil. Web'de authenticated route yok, middleware yok. Gelecekte web panel eklenmesi ciddi mimari değişiklik gerektirir (auth guard, rol-based layout, Supabase SSR session).
- **Aksiyon:** Kısa/orta vade planını belirle — plana göre web auth altyapısını ne zaman kurmak gerektiğini belirle.
- **Kaynak:** [`10-routing.md §11`](./10-routing.md)

---

## 6. Roadmap dışı — bilinçli kararlar

Bu maddeler tekrar açılmasın diye kayıt altında.

| Konu | Karar | Gerekçe |
|---|---|---|
| **i18n / çoklu dil** | 🚫 Yok, yapılmayacak | Sadece Türkiye pazarı, çeviri maliyeti değmez |
| **SMS / OTP doğrulama** | 🚫 Şimdi yok | Twilio entegrasyonu ayrı maliyet kalemi; basit e-posta yeterli |
| **Broadcast / presence** | 🚫 Roadmap dışı | "Şu an X düzenliyor" göstergesi MVP kapsamı dışı |
| **Skeleton shimmer** | 🚫 Kullanılmıyor | Tasarım kararı — sessiz placeholder blok tercih edildi |
| **Bounce/spring animasyon** | 🚫 Kullanılmıyor | Brand motion prensibi: `--ease-out` only, overshoot yok |
| **Emoji ve dekoratif unicode** | 🚫 Kullanılmıyor | Tek istisna: `·` middot ve `›` chevron |
| **Gradient arka planlar** | 🚫 Kullanılmıyor | Flat cool slate canvas — gradients yok |
| **`react-hook-form`** | ⚠️ Değerlendiriliyor | Zod eklenmesi kesin; RHF form sayısı az olduğu için opsiyonel |

---

## 7. Özet — öncelik matrisi

| # | Konu | Öncelik | Efor | Bağımlılık |
|---|---|---|---|---|
| 1 | `invite-barber` fix (barbers → staff) | **P0** | Küçük | — |
| 2 | Logout `removeAllChannels` | **P0** | Küçük | — |
| 3 | Email doğrulama production'da aç | **P0** | Küçük | — |
| 4 | Rate limit Upstash production'a ekle | **P0** | Küçük | — |
| 5 | `role === null` onboarding/hata ekranı | **P0** | Orta | — |
| 6 | TanStack Query kurulumu | **P1** | Büyük | — |
| 7 | `working_hours` editörü | **P1** | Orta | Zod |
| 8 | Dual owner column temizliği | **P1** | Orta | Dikkatli migration |
| 9 | AppState listener | **P1** | Küçük | TQ (tam fayda için) |
| 10 | Zod + shared schemas | **P1** | Orta | — |
| 11 | `customer_notes` tutarsızlığı | **P1** | Küçük | — |
| 12 | `packages/shared/api/` | **P1** | Küçük | — |
| 13 | Mobil lint/format | **P1** | Orta | — |
| 14 | Test altyapısı | **P1** | Büyük | — |
| 15 | `staff.slug` + per-staff deep link | **P2** | Küçük | DB migration |
| 16 | `barbers` tablosu DROP | **P2** | Küçük | Dikkatli migration |
| 17 | Telefon regex validasyonu | **P2** | Küçük | Zod |
| 18 | Slug UNIQUE DB kısıtı | **P2** | Küçük | — |
| 19 | Deep link + Universal Link | **P2** | Orta | — |
| 20 | Mobil spacing tokens | **P2** | Küçük | — |
| 21 | Umber/mint Tailwind'a ekle | **P2** | Küçük | — |
| 22 | `revalidateTag` tetikleyicisi | **P2** | Orta | — |
