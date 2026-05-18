# 00 — Genel Bakış

> Bu dokümantasyon serisinin **başlangıç noktası**. Burada ürünün ne olduğunu, kimin için olduğunu, hangi yüzeyleri olduğunu ve frontend implementasyonunun nasıl parçalandığını anlatır. Detaylar sonraki dosyalarda.

---

## 1. Ürün

**Sıradaki** — *(TR: "next / up next")* — berber, kuaför ve klinikler için **mobil-öncelikli randevu ve ekip yönetim platformu**.

- **Kod tabanı adı:** `berber-randevu` · paket scope'u `@berber/*`
- **Marka adı:** *Sıradaki* (tasarım dilinde; pakette / dosya adlarında yok)
- **Konum:** monorepo (`pnpm` workspace + Turborepo)
- **Repo:** [`yekedun/the-realbarber`](https://github.com/yekedun/the-realbarber), aktif branch `scheduling-hardening`

Ürünün özünde **bir kuyruk** vardır — sıradaki müşteri, sıradaki randevu, sıradaki müsait slot. "Sıradaki" tam olarak bunu söyler.

---

## 2. İki yüzey + üç rol

| Yüzey | Kullanıcı | Stack | Konum |
|---|---|---|---|
| **Web — Müşteri booking** | Son müşteri (anonim) | Next.js 14 App Router | `apps/web/` |
| **Mobil — Owner paneli** | Dükkan sahibi | Expo SDK 51 / React Native | `apps/mobile/app/(owner)/` |
| **Mobil — Staff paneli** | Usta / personel | Expo SDK 51 / React Native | `apps/mobile/app/(app)/` |

### Roller, auth tarafında

Rol bilgisi **JWT claim'inde değil, lookup tabanlı** tutulur:

| Rol | Lookup |
|---|---|
| Owner | `shops.owner_id = auth.uid()` |
| Staff | `staff.user_id = auth.uid()` ve `staff.role ∈ {admin, staff}` |
| Customer | Anonim — `auth.uid()` yok, anon key ile RLS public-read |

> Detay → [`03-auth.md`](./03-auth.md)

---

## 3. Ekran haritası

### Web (`apps/web/src/app/`)

| Kod | Yol | Ne yapar |
|---|---|---|
| **W1** | `layout.tsx` | Root layout, globals.css |
| **W2** | `[slug]/page.tsx` | Berber profili (ISR 60s) — sticky 380px profil + booking grid |
| **W3** | `[slug]/BookingFlow.tsx` + `components/BookingModal.tsx` | 4 adımlı booking: Hizmet → Usta → Tarih → Saat → Modal onay |
| **W4** | `not-found.tsx` | 404 |

### Mobil — `(auth)` group

| Kod | Yol | Ne yapar |
|---|---|---|
| **M1** | `app/(auth)/login.tsx` | E-posta ile Supabase Auth login |

### Mobil — `(app)` group · Staff (`role = staff`)

| Kod | Yol | Ne yapar |
|---|---|---|
| **M2** | `app/(app)/_layout.tsx` | Bottom tab bar (3 sekme) |
| **M3** | `app/(app)/index.tsx` | Randevular — timeline + NOW pulse, **ana ekran** |
| **M4** | `app/(app)/block.tsx` | Slot bloklama (walk-in / mola / kişisel) |
| **M5** | `app/(app)/settings.tsx` | Hesap + widget token + çıkış |

### Mobil — `(owner)` group · Owner (`shops.owner_id = uid`)

| Kod | Yol | Ne yapar |
|---|---|---|
| **O1** | `app/(owner)/index.tsx` | Özet (Bugün, KPI'lar) |
| **O2** | `app/(owner)/agenda.tsx` | Ajanda (tüm ekip, drag-drop reassignment) |
| **O3** | `app/(owner)/earnings.tsx` | Kazanç + komisyon |
| **O4** | `app/(owner)/team.tsx` | Ekip yönetimi + çalışma saatleri |
| **O5** | `app/(owner)/settings.tsx` | Dükkan ayarları |

> Detay → [`10-routing.md`](./10-routing.md)

---

## 4. Stack (frontend bakış)

### Web (`apps/web`)
- **Framework:** Next.js `^14.2` App Router · React `18.2`
- **Styling:** Tailwind CSS `^3.4` (config: `tailwind.config.ts`)
- **Supabase:** `@supabase/ssr ^0.10.2` (server + browser client) + `@supabase/supabase-js ^2.43`
- **Data fetching (hedef):** Server Components default + **TanStack Query** interaktif sayfalarda + Server Actions mutations için *(eklenecek — şu an yok)*
- **Form (hedef):** **`react-hook-form` + `zod`** *(eklenecek — şu an yok)*
- **TypeScript:** `^5.4`

### Mobil (`apps/mobile`)
- **Framework:** Expo SDK `~51.0` · React Native `0.74.5` · `expo-router ~3.5`
- **Styling:** vanilla `StyleSheet` API · token kaynağı `apps/mobile/lib/theme.ts` (NativeWind kullanılmıyor)
- **Tarih/saat:** `date-fns ^4.1` (timezone gerekirse `date-fns-tz` eklenecek)
- **Supabase:** `@supabase/supabase-js ^2.43` + `expo-secure-store` (session persistence)
- **Data fetching (hedef):** **TanStack Query baştan sona** *(eklenecek — şu an yok)*
- **Form (hedef):** **`react-hook-form` + `zod`** *(eklenecek — şu an yok)*
- **Icons:** `@expo/vector-icons` (Feather)
- **Native widget:** Android + iOS home-screen widget (`apps/mobile/modules/widget/android/` + `apps/mobile/modules/widget/ios/BarberWidget.swift`)

### Backend (`supabase/`)
- **Postgres** + `btree_gist` extension (exclusion constraints)
- **Edge Functions:** 9 adet, Deno runtime
- **Realtime:** 4 tablo (`appointments`, `appointment_slots`, `blocks`, `block_slots`)
- **Auth:** Supabase Auth, e-posta + parola (confirmation kapalı, lokal dev)
- **Rate limiting:** Upstash Redis (IP bazlı, `book-appointment`)

### Monorepo
- **Manager:** pnpm `^9` (`.npmrc`: `node-linker=hoisted` — RN gerektiriyor)
- **Build orchestrator:** Turborepo `^2`
- **Workspaces:**
  - `apps/web` → `@berber/web`
  - `apps/mobile` → `@berber/mobile`
  - `packages/db` → `@berber/db` (Supabase CLI üretiyor: `database.types.ts`)
  - `packages/shared` → `@berber/shared` (`slot-utils`, `constants`, `types`)
- **TypeScript:** baştan sona, monorepo geneli `tsconfig.base.json`

> Detay → [`02-stack.md`](./02-stack.md)

---

## 5. Glossary (Türkçe terim listesi)

| Türkçe | Kod / İngilizce | Açıklama |
|---|---|---|
| Randevu | `appointment` | Onaylı, iptal veya tamamlanmış müşteri rezervasyonu |
| Slot | `slot` | 15 dk granülaritede zaman dilimi (`SLOT_GRANULARITY_MIN`) |
| Blok / Bloklama | `block` | Walk-in / mola / kişisel — slot'ı kapatma |
| Usta / Personel | `staff` | Dükkanda çalışan (eski: `barber` — kullanılmıyor) |
| Dükkan | `shop` | Tenant ana varlığı, `slug` üzerinden public erişim |
| Müşteri | `customer` | Anonim, web üzerinde randevu alır |
| Komisyon | `commission` | Owner ↔ staff arası gelir paylaşımı |
| Müsaitlik | `availability` | Belirli usta + gün için açık slot listesi |
| Çalışma saatleri | `working_hours` / `staff_schedules` | Dükkan fallback + personel bazlı haftalık |
| Mola | `break` | `staff_schedules.break_start/end` — otomatik dolu sayılır |

---

## 6. Veri akışı (en üst seviye)

```
┌──────────────────┐                           ┌──────────────────┐
│  Web (anonim)    │                           │  Mobil (auth'lı) │
│  apps/web        │                           │  apps/mobile     │
└────────┬─────────┘                           └────────┬─────────┘
         │                                              │
         │ supabase-js (anon key)                       │ supabase-js (JWT)
         │ + edge function POST                         │ + edge function POST
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Edge Functions (Deno)             │
│  ─────────────────────────────────────────────────────────────  │
│   get-availability · book-appointment · block-walkin            │
│   create-manual-block · create-widget-token · invite-barber     │
│   customer-get-availability · customer-book-appointment         │
│   customer-cancel-appointment                                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │ service_role
                                 ▼
                ┌────────────────────────────────┐
                │      Postgres (Supabase)       │
                │  shops · staff · services      │
                │  appointments · blocks         │
                │  appointment_slots · block_slots (realtime mirror)
                │  staff_schedules · widget_tokens
                │  RLS — owner / staff / anon
                └────────────────────────────────┘
                                 │
                                 │ Realtime channel (publication)
                                 ▼
                ┌────────────────────────────────┐
                │  Mobil + Web subscribers       │
                │  query invalidation tetikler   │
                └────────────────────────────────┘
```

---

## 7. Doküman haritası

| # | Dosya | İçerik |
|---|---|---|
| 00 | **`00-overview.md`** | Buradasın |
| 01 | [`01-architecture.md`](./01-architecture.md) | Monorepo yapısı, paketler arası bağımlılık diyagramı |
| 02 | [`02-stack.md`](./02-stack.md) | Tüm bağımlılıkların tam liste + versiyon + neden |
| 03 | [`03-auth.md`](./03-auth.md) | Supabase Auth flow, owner/staff/customer rol lookup, RLS örnekleri |
| 04 | [`04-database.md`](./04-database.md) | Tablo-tablo şema: kolonlar, ilişkiler, constraint'ler, RLS notları |
| 05 | [`05-edge-functions.md`](./05-edge-functions.md) | 9 fonksiyonun input/output şeması + error code'ları |
| 06 | [`06-realtime.md`](./06-realtime.md) | 4 realtime tablo, subscription pattern, query invalidation |
| 07 | [`07-data-fetching.md`](./07-data-fetching.md) | Web (unstable_cache + Server Components) + Mobil (raw useState) — bugünkü gerçek + hedef mimari |
| 08 | [`08-forms.md`](./08-forms.md) | Ham useState validasyon (bugün), zod + shared şema önerisi (hedef) |
| 09 | [`09-design-system.md`](./09-design-system.md) | Tasarım sistemi tüketim rehberi (Tailwind preset + RN tokens) |
| 10 | [`10-routing.md`](./10-routing.md) | Expo Router groups + Next App Router segment haritası |
| 11 | [`11-conventions.md`](./11-conventions.md) | Naming, dosya yapısı, commit/PR, Türkçe UI string kuralları |
| 12 | [`12-roadmap-open-questions.md`](./12-roadmap-open-questions.md) | Bilinmeyenler, sonra cevaplanacak konular |

---

## 8. Bilinen açık konular

- ⚠️ **Logo:** Gerçek logo yok. Tüm yüzeylerde placeholder mark var (`@berber/mobile`'da brand mark + web'de barber pole 404). **Değiştirilecek.**
- ⚠️ **Dark mode:** Şu an `colors_and_type.css` sadece light token tutuyor. Roadmap'te bekletildi.
- ⚠️ **i18n:** Sadece Türkçe. `next-intl` / `i18n-js` paketleri **yok ve eklenmeyecek** (mevcut karar). UI string'leri kod içinde sabit.
- ⚠️ **Telefon doğrulama:** `BookingModal` ve `AddAppointmentModal`'da telefon alanı serbest text input. `libphonenumber` yok, validation yok. İleride TR formatı eklenebilir.
- ⚠️ **Tarih kütüphanesi:** `date-fns` mobilde 5 dosyada var; web tarafında kullanım yok ama gerekecek. `date-fns-tz` henüz yok — `Europe/Istanbul` timezone'u Postgres `TIMESTAMPTZ` ile handle ediliyor.
- ⚠️ **Test framework:** Hiç yok (Jest / Vitest / Playwright / RNTL — hepsi eklenecek konular). CI pipeline yok.

> Detay → [`12-roadmap-open-questions.md`](./12-roadmap-open-questions.md)

---

## 9. Bu dokümanı kim yazdı, ne kadar güvenilir?

- ✅ **Repo'dan birebir okundu** (migration'lar, edge function dosya isimleri, `package.json`'lar, route yapısı): `2026-05-14`, branch `scheduling-hardening`, commit `e0b5285a`. Edge function listesi: `book-appointment`, `block-walkin`, `create-manual-block`, `create-widget-token`, `customer-book-appointment`, `customer-cancel-appointment`, `customer-get-availability`, `get-availability`, `invite-barber`.
- ✅ **Mimari kararlar kullanıcıyla onaylandı:** TanStack Query (hibrit web/mobile), zod + react-hook-form, Türkçe-only.
- ⚠️ **Tasarım tarafı yok sayıldı** — repo içindeki `DESIGN.md` ve `Designs/` klasörü bu dokümantasyonda referans alınmadı. Tasarım kaynağı: `colors_and_type.css` + `preview/*` + `ui_kits/*`.
