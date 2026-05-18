# 01 — Mimari

> Monorepo yapısı, paketler arası bağımlılık grafiği, build orchestration, TypeScript stratejisi. **"Kod nereye gider?"** sorusunun cevabı.

Önceki: [`00-overview.md`](./00-overview.md) · Sonraki: [`02-stack.md`](./02-stack.md)

---

## 1. Neden monorepo?

Sıradaki'nin iki yüzeyi (Web + Mobil) **aynı backend'i, aynı tipleri, aynı iş kurallarını** paylaşır. Üç teknik gerekçe:

1. **Tip güvenliği:** `supabase gen types` ile üretilen `database.types.ts` **tek kaynaktan** her iki app'e gider. Web'deki bir kolon değişikliği mobilde derlemeyi bozar — derhal yakalanır.
2. **İş mantığı paylaşımı:** Slot hesaplama (`computeAvailableSlots`), sabitler (`SLOT_GRANULARITY_MIN`, `DEFAULT_WORKING_HOURS`), domain tipleri (`StaffPublic`, `ServicePublic`) **tek yerde** yazılır.
3. **Edge function ile tip senkronizasyonu:** Supabase Edge Function'lar Deno koştuğu için kendi `database.types.ts` kopyasını tutar — `db:check` script'i bunun web/mobil tarafıyla **birebir eşleştiğini** doğrular.

UX perspektifinden: müşteri web'de "randevu alındı" toast'ı görür, **aynı saniye** mobile push gibi gelir → bunu yapabilmek için iki tarafın realtime payload'ını tip seviyesinde aynı şekilde anlaması şart. Monorepo bunu garanti eder.

---

## 2. Workspace yerleşimi

```
the-realbarber/
├── apps/
│   ├── web/          @berber/web      Next.js 14 — müşteri booking
│   └── mobile/       @berber/mobile   Expo SDK 51 — owner + staff
│
├── packages/
│   ├── db/           @berber/db       Supabase types (CLI-generated)
│   └── shared/       @berber/shared   slot-utils + constants + types
│
├── supabase/
│   ├── functions/                     9 edge function (Deno)
│   ├── migrations/                    34 SQL migration
│   └── snippets/                      yardımcı SQL parçaları
│
├── pnpm-workspace.yaml                workspace tanımı
├── turbo.json                         task orchestration
├── tsconfig.base.json                 ortak TS ayarları
├── .npmrc                             node-linker=hoisted (RN için kritik)
└── package.json                       root scripts (dev/build/type-check)
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Wildcard glob — yeni bir paket eklerken sadece klasör açıp `package.json` yazmak yeterli.

---

## 3. Bağımlılık grafı

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│        ┌─────────────────┐         ┌─────────────────┐       │
│        │  @berber/web    │         │ @berber/mobile  │       │
│        │  (Next.js)      │         │  (Expo)         │       │
│        └────────┬────────┘         └────────┬────────┘       │
│                 │                           │                │
│                 │       depends on          │                │
│                 ▼                           ▼                │
│        ┌─────────────────────────────────────────┐           │
│        │           @berber/shared                │           │
│        │   slot-utils · constants · types        │           │
│        └────────────────────┬────────────────────┘           │
│                             │                                │
│                             ▼                                │
│        ┌─────────────────────────────────────────┐           │
│        │              @berber/db                 │           │
│        │     database.types.ts (CLI-generated)   │           │
│        └─────────────────────────────────────────┘           │
│                                                              │
└──────────────────────────────────────────────────────────────┘

         ↕ (paralel, monorepo dışında ama aynı tipleri tüketir)

        ┌─────────────────────────────────┐
        │   supabase/functions/_shared/   │
        │       database.types.ts         │
        │  (db:check ile senkron tutulur) │
        └─────────────────────────────────┘
```

**Kural:** apps katmanı `apps/*` paketlerden **birbirini import edemez**. Web mobili, mobil web'i bilmez. Paylaşım her zaman `packages/*` üzerinden geçer.

---

## 4. Paket-paket inceleme

### 4.1 · `@berber/db`

```json
{
  "name": "@berber/db",
  "scripts": {
    "generate-types": "supabase gen types typescript --local > src/database.types.ts"
  }
}
```

**Tek iş:** `database.types.ts` dosyasını barındırmak.
- 36 KB, Supabase CLI tarafından **otomatik üretiliyor** — elden değiştirme.
- Migration eklendikçe `pnpm db:sync` çalıştırılır → hem `packages/db/src/database.types.ts` hem `supabase/functions/_shared/database.types.ts` güncellenir.
- `db:check` script'i bu iki dosyanın byte-by-byte aynı olduğunu doğrular (CI'da koşulmalı).

**Tüketim:**
```ts
import type { Database } from "@berber/db/src/database.types";
// veya tek tek:
import type { Tables, TablesInsert } from "@berber/db/src/database.types";

type Appointment = Tables<"appointments">;
type NewAppointment = TablesInsert<"appointments">;
```

> ⚠️ Şu an `package.json`'da `"main"` / `"exports"` alanı **yok** → import path full (`@berber/db/src/database.types`). İleride `exports` eklenip `@berber/db` tek satırlık import'a düşürülebilir. Şimdilik bu öncelik değil.

---

### 4.2 · `@berber/shared`

```json
{
  "name": "@berber/shared",
  "exports": {
    "./slot-utils":  "./src/slot-utils.ts",
    "./constants":   "./src/constants.ts",
    "./types":       "./src/types.ts"
  }
}
```

Üç alt-modül, üç sorumluluk:

| Alt-modül | İçerik | Tüketici |
|---|---|---|
| `./constants` | `SLOT_GRANULARITY_MIN`, `DEFAULT_WORKING_HOURS`, `MIN_BOOKING_NOTICE_MINUTES`, `MAX_BOOKING_DAYS`, `MIN_CANCEL_NOTICE_MINUTES`, `DAY_KEYS` | web + mobil + edge fn |
| `./slot-utils` | `computeAvailableSlots(occupied, workStart, workEnd, durationMin)` — saf fonksiyon, yan etki yok | web `SlotGrid`, mobil ajanda render |
| `./types` | `ShopPublic`, `StaffPublic`, `ServicePublic`, `BookAppointmentRequest`, `BookAppointmentResponse`, `WorkingHours`, `Slot` | web + mobil — Supabase row tipinin **public-facing** alt kümesi |

**Önemli karar:** `@berber/shared` **derlenmez** (`noEmit: true`). Apps doğrudan `.ts` dosyalarını import eder → bundler (Next.js / Metro) transpile eder. Bu sayede:
- Build adımı yok, anlık değişiklik
- Source map kaybolmuyor
- `dist/` klasörü yok, repo daha temiz

**Tüketim:**
```ts
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import { SLOT_GRANULARITY_MIN } from "@berber/shared/constants";
import type { StaffPublic } from "@berber/shared/types";
```

---

### 4.3 · `@berber/web` (`apps/web`)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              W1 root layout
│   │   ├── not-found.tsx           W4
│   │   ├── globals.css             Tailwind + custom utilities
│   │   └── [slug]/
│   │       ├── page.tsx            W2 berber profili (ISR 60s)
│   │       └── BookingFlow.tsx     W3 4 adımlı flow
│   ├── components/
│   │   ├── ServiceSelector.tsx
│   │   ├── SlotGrid.tsx
│   │   └── BookingModal.tsx
│   └── lib/
│       ├── supabase-browser.ts     client-side client
│       └── supabase-server.ts      server-side (cookie-aware) client
├── tailwind.config.ts
├── next.config.mjs
└── package.json
```

**Bağımlılıkları:**
```jsonc
{
  "@berber/db":            "workspace:*",  // tipler
  "@berber/shared":        "workspace:*",  // slot-utils + constants
  "@supabase/ssr":         "^0.10.2",       // server + browser client
  "@supabase/supabase-js": "^2.43.0",
  "next":                  "^14.2.0",
  "react":                 "18.2.0",
  "react-dom":             "18.2.0"
}
```

**Eklenecek (henüz yok, planlanan):**
- `@tanstack/react-query` — interaktif sayfalarda
- `react-hook-form` + `zod` + `@hookform/resolvers` — booking form'u
- `date-fns` + `date-fns-tz` — tarih + timezone (Europe/Istanbul)

---

### 4.4 · `@berber/mobile` (`apps/mobile`)

```
apps/mobile/
├── app/
│   ├── _layout.tsx                 root (Stack navigator, auth gate)
│   ├── (auth)/
│   │   └── login.tsx               M1
│   ├── (app)/                      STAFF route group
│   │   ├── _layout.tsx             M2 tab bar
│   │   ├── index.tsx               M3 randevular (ana ekran)
│   │   ├── block.tsx               M4 bloklama
│   │   └── settings.tsx            M5 ayarlar
│   └── (owner)/                    OWNER route group
│       ├── _layout.tsx             tab bar
│       ├── index.tsx               O1 özet
│       ├── agenda.tsx              O2 ajanda
│       ├── earnings.tsx            O3 kazanç
│       ├── team.tsx                O4 ekip
│       └── settings.tsx            O5 ayarlar
├── components/
│   ├── AppointmentDetailSheet.tsx
│   └── AddAppointmentModal.tsx
├── lib/
│   └── theme.ts                    token kaynağı (renkler, radius, shadow)
├── modules/
│   └── widget/
│       ├── plugin/index.js         Expo config plugin
│       ├── android/                home-screen widget kaynak
│       └── ios/BarberWidget.swift  WidgetKit extension
├── app.json                        Expo + EAS config
├── eas.json                        development / preview / production profilleri
├── babel.config.js
├── metro.config.js
└── package.json
```

**Bağımlılıkları:**
```jsonc
{
  "@berber/db":              "workspace:*",
  "@berber/shared":          "workspace:*",
  "@supabase/supabase-js":   "^2.43.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "expo":                    "~51.0.0",
  "expo-router":             "~3.5.0",
  "expo-secure-store":       "~13.0.0",     // session
  "expo-updates":            "~0.25.28",    // OTA
  "date-fns":                "^4.1.0",
  "react":                   "18.2.0",
  "react-native":            "0.74.5",
  "react-native-reanimated": "~3.10.1",
  "react-native-gesture-handler": "~2.16.1"
}
```

**Eklenecek:**
- `@tanstack/react-query` — tüm ekranlarda data fetching
- `react-hook-form` + `zod` — block ekranı, add appointment modal
- `date-fns-tz` — `Europe/Istanbul` formatlamaları için

---

## 5. TypeScript stratejisi

### Ortak `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noUncheckedIndexedAccess": true,
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

**Önemli iki seçim:**

1. **`moduleResolution: "bundler"`** — Next.js ve Metro bundler'ları zaten kendi resolution'ını yapar. Node tarzı path resolution gereksiz.
2. **`noEmit: true`** — Tüm paketler kaynağını doğrudan tüketir, derlenmez. Bu nedenle `shared/` ve `db/` paketlerinde `dist/` veya `build/` yoktur.

3. **`noUncheckedIndexedAccess: true`** — `array[0]` tipinde `T | undefined` döner. Senior bug yakalayıcı, ama her zaman `?.` veya guard gerektirir.

### Her paket kendi `tsconfig.json`'unda `base`'i extend eder

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "lib": ["dom", "es2022"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*", "next-env.d.ts"]
}
```

---

## 6. Build orchestration — Turborepo

`turbo.json`:
```json
{
  "tasks": {
    "build":      { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**", ".expo/**"] },
    "dev":        { "cache": false, "persistent": true },
    "type-check": { "dependsOn": ["^build"], "outputs": [] },
    "lint":       { "outputs": [] }
  }
}
```

**`^build` notasyonu** — paket bir task'ı koştuğunda **bağımlılıklarının** önce build edilmesi gerekir. Bizim durumda `packages/*` derlenmiyor (`noEmit`) ama yine de `type-check` task'ı `^build` istiyor — bu pratikte no-op olur ama task graph'ı doğru tutar.

**Kullanım:**
```bash
pnpm dev                          # tüm app'leri paralel başlatır
pnpm --filter @berber/web dev     # sadece web
pnpm --filter @berber/mobile start  # sadece mobil
pnpm type-check                   # tüm paketler için tsc --noEmit
pnpm lint                         # tüm paketler için lint
```

---

## 7. Kod paylaşım kuralları

**`packages/shared`'a koy:**
- ✅ Pure functions (input → output, yan etki yok)
- ✅ Sabitler (`SLOT_GRANULARITY_MIN`, working hours defaults)
- ✅ Domain tipleri (`StaffPublic`, `BookAppointmentRequest`)
- ✅ Supabase row tipinden türetilen "public-facing" alt-tipler
- ✅ İş kuralları (slot hesaplama, mola kontrolü, çalışma saati kontrolü)

**`packages/shared`'a KOYMA:**
- ❌ React component'leri (web ve mobil farklı render system kullanıyor)
- ❌ Hook'lar — `useFoo()` mobil ve web'de farklı patterns gerektirebilir (örn. mobil'de `useEffect` cleanup, web'de `Suspense`)
- ❌ Stil / token (mobil StyleSheet vs Tailwind class string — `apps/*/lib/theme` veya `apps/*/tailwind.config` içinde kalır)
- ❌ Supabase client kurulumu — her app kendi adapter'ını kurar (`apps/web/src/lib/supabase-*.ts` vs mobil'de SecureStore adapter)
- ❌ `@berber/db`'ye runtime kodu — bu paket **sadece tip barındırır**, hiçbir şey execute etmez. Yeni bir helper / hook / fonksiyon yazılacaksa `@berber/shared` veya app içine gider.

**Bu yüzden ortak UI kit yok.** Tasarım sistemi `colors_and_type.css` + `preview/*` + `ui_kits/*` referansı olarak durur, ama **her app token'ları kendi formatında** taşır:
- Web → `tailwind.config.ts` extend + `globals.css` CSS variables
- Mobil → `apps/mobile/lib/theme.ts` JS objesi (StyleSheet'in `Color` parameter formatı)

> Detay → [`09-design-system.md`](./09-design-system.md)

---

## 8. `.npmrc` ve hoisted linker

```
node-linker=hoisted
```

**Neden zorunlu:** React Native'in `settings.gradle` ve Metro bundler'ı pnpm'in **symlink yapısını anlamıyor** — modülleri bulamıyor, build kırılıyor.

`hoisted` mode'da pnpm, npm/yarn ile aynı düz `node_modules/` yapısını kurar (sembolik link yok, gerçek kopya). Trade-off: disk alanından biraz daha fazla kullanır ama RN için **şart**.

Web tarafı pnpm'in normal sembolik link'lerinden faydalanabilir ama monorepo tek `.npmrc` taşıdığı için her iki taraf da hoisted.

---

## 9. Mimari kararların UI/UX'e etkisi

> "Mimari neden tasarımcı için önemli?" — çünkü bazı kararlar **kullanıcı deneyimini doğrudan etkiler**.

| Karar | UX kazancı |
|---|---|
| **Aynı tip Web + Mobil + Edge** | "Randevu alındı" → mobile **eşzamanlı** push (realtime payload tipi her iki tarafça aynı parse edilir, race yok) |
| **`@berber/shared/slot-utils` paylaşımı** | Web "müsait saat" gösterimi ile mobil "ajanda render" **birebir aynı algoritma** — müşteri "saat 14:00 boş" görür, berber de aynı saati boş görür. Drift yok. |
| **`packages/db` derlenmemiş, anlık** | Yeni kolon eklendiğinde IDE içinde **2 saniyede** her iki app'te tip hatası — hatayı erken yakala, kullanıcıya hatalı UI gösterme. |
| **Edge function shared types** | Backend response şeklini değiştirirsen frontend derleme kırılır. Yani "üretimde booking sayfası boş kalır" senaryosu **build aşamasında** patlar. |
| **Hoisted linker (`.npmrc`)** | Build her seferinde **tutarlı**. Mobil'de "lokal Metro çalışıyor, EAS build kırık" gibi yapı sorunları yok → kritik feature deploy gecikmez. |

---

## 10. Açık konular

- ⚠️ **`@berber/db` export'ları belirsiz:** `package.json`'da `exports` alanı yok → import path full (`@berber/db/src/database.types`). İleride `exports: { ".": "./src/database.types.ts" }` ekleyip import'u kısaltabiliriz.
- ⚠️ **Ortak ESLint config yok:** Her paket kendi `.eslintrc` taşıyor (sadece `apps/web` taşıyor, `apps/mobile` taşımıyor). `packages/eslint-config` paketi açabilir, tüm app'lere ortak rule set verebiliriz.
- ⚠️ **Test paketi yok:** `packages/test-utils` (fixtures, supabase mock client, test data factory) ileride gerekecek.
- ⚠️ **Storybook / UI kit paketi yok:** `colors_and_type.css` + `preview/*` repo'da değil, **tasarım sistemi projesinde** duruyor. Web ve mobil her seferinde token'ları manuel sync ediyor (bkz. `09-design-system.md`). Otomatize edilebilir.
- 🚧 **Geliyor:** Per-staff deep link feature (`/{shop}/u/{staff}`). Bu, `staff` tablosuna `slug` kolonu ekleyecek — `packages/db` regen edildiğinde tipler otomatik güncellenecek. `packages/shared/types.ts` içindeki `StaffPublic`'e de `slug: string` alanı eklenecek.

---

**Sonraki:** [`02-stack.md`](./02-stack.md) — her bağımlılığın tam liste + versiyon + neden seçildi.
