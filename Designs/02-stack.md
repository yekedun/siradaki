# 02 — Stack

> Her bağımlılığın versiyonu + **neden o** + **neden o versiyon**. Frontend implementasyonu sırasında "şunu kurabilir miyim" sorusuna cevap.

Önceki: [`01-architecture.md`](./01-architecture.md) · Sonraki: [`03-auth.md`](./03-auth.md)

---

## 1. Web (`apps/web`)

### Şu an kurulu

| Paket | Versiyon | Neden |
|---|---|---|
| `next` | `^14.2.0` | App Router (gerekli), Server Components + Server Actions stable. 15'e geçmek için aciliyet yok — ekosistem 14'te oturmuş durumda. |
| `react` / `react-dom` | `18.2.0` *(pinned)* | Next 14 ile uyumlu sabit versiyon. 19 deneysel — Suspense/use() davranışı değişti, şu an riskli. |
| `@supabase/ssr` | `^0.10.2` | App Router'da cookie-aware Supabase client. `createServerClient` + `createBrowserClient`. Server Component + Server Action senaryolarında **mecburi**. |
| `@supabase/supabase-js` | `^2.43.0` | Realtime + RPC + auth. `@supabase/ssr` peer dependency'si. |
| `tailwindcss` | `^3.4.0` | v3 stable. v4 (alpha) PostCSS olmadan çalışıyor ama production'a erken — beklemekte fayda. |
| `typescript` | `^5.4.0` | `noUncheckedIndexedAccess` + `const` type parameters destekli en yakın stable. |

### Eklenecek (planlı, henüz yok)

> Bu bölümdeki versiyonlar **öneri** — henüz `package.json`'a girmedi, repo'dan doğrulanmadı. Kurulum sırasında en yakın stable'a güncellenebilir.

| Paket | Versiyon (öneri) | Neden |
|---|---|---|
| `@tanstack/react-query` | `^5.51` *(tahmin)* | **Optimistic update + staleTime + `queryClient.invalidateQueries`** üçlüsü realtime ile temiz çalışır — Supabase channel `INSERT` event'inde tek `invalidateQueries(['appointments', dayKey])` yazıyoruz, UI kendi kendini yeniliyor. |
| `react-hook-form` | `^7.52` *(tahmin)* | Uncontrolled form (re-render minimize), `zod` resolver native uyumlu. |
| `zod` | `^3.25` | Runtime + compile-time validation. Backend'den dönen JSON'u `parse()` ile doğrulayıp tip kazandırıyoruz — RLS dışında ikinci savunma katmanı. *(repo lockfile: 3.25.76)*
| `@hookform/resolvers` | `^3.9` | `zodResolver(schema)` adapter — `react-hook-form` ile `zod` birleştirici. |
| `date-fns` | `^4.1.0` | Mobilde zaten var, web'de aynı versiyon. **Tree-shake'lenebilir** (tek tek `import { format } from "date-fns/format"`). `dayjs` daha küçük ama API/i18n daha sınırlı. |
| `date-fns-tz` | `^3.2` | `Europe/Istanbul` timezone formatlamaları. Postgres `TIMESTAMPTZ` doğru tutuyor ama UI'da TR saatine çevirmek gerek. |

### Yok ve eklenmeyecek (mevcut karar)

- ❌ `next-intl` / `react-i18next` — sadece Türkçe (bkz. `00-overview` §8)
- ❌ `framer-motion` — Tailwind animations + native CSS transitions yetiyor; modal sheet için bile gerekli olmadı
- ❌ State manager (Zustand / Redux / Jotai) — Server Components + TanStack Query + URL state + form state yeterli. Client-side global state minimum.

---

## 2. Mobil (`apps/mobile`)

### Şu an kurulu

| Paket | Versiyon | Neden |
|---|---|---|
| `expo` | `~51.0.0` | SDK 51 stable. EAS Build profilleri (`development`, `preview`, `production`) bu sürüme bağlı. |
| `react-native` | `0.74.5` *(pinned)* | Expo SDK 51 ile birlikte gelen sabit versiyon. **Asla manuel bump etme** — Expo SDK'sı bump etmeli. |
| `expo-router` | `~3.5.0` | File-based routing. App Router'a (Next) çok benzer mental model. `(group)` syntax ile route gruplandırma — owner vs staff ayrımı için kritik. |
| `@react-native-async-storage/async-storage` | `1.23.1` *(pinned)* | Supabase session persistence için. **Native modül** — versiyonu Expo SDK ile birebir eşleşmeli (yoksa native build fail). |
| `@supabase/supabase-js` | `^2.43.0` | Web ile **aynı versiyon** — realtime payload tipi uyuşmalı. |
| `expo-secure-store` | `~13.0.0` | iOS Keychain + Android EncryptedSharedPreferences. Supabase auth token şifreli saklanır → AsyncStorage'tan daha güvenli. |
| `expo-updates` | `~0.25.28` | OTA — JS-only değişiklikler EAS'a push edilir, kullanıcı 30 saniyede günceller. Native modül değiştiyse yeni build şart. |
| `date-fns` | `^4.1.0` | Web ile aynı versiyon. |
| `react-native-reanimated` | `~3.10.1` | NOW pulse animasyonu, drag-drop ajanda lift, sheet'lerin yumuşak in/out'u. **Native modül** — Expo SDK eşleşmeli. |
| `react-native-gesture-handler` | `~2.16.1` | Drag-drop (Ajanda), swipe (sheet kapatma), long-press (appointment detail). Native modül. |
| `react-native-safe-area-context` | `4.10.5` | iPhone notch + Android nav bar safe-area. |
| `react-native-screens` | `3.31.1` | Native stack navigator backing. |
| `@expo/vector-icons` | `^14.0.0` | Feather + diğer setler. Lucide RN paketinden daha hafif (sadece kullandığını bundle'a koyar). |
| `@react-native-community/datetimepicker` | `8.0.1` | Native picker — block ekranında saat seçimi, owner panel team schedule'da. |
| `expo-linking` | `~6.3.0` | Deep link — `/{shop-slug}/u/{staff-slug}` linkinin mobil'de açılması için (gelen feature). |
| `expo-constants` | `~16.0.0` | App metadata (version, build, env). |
| `expo-status-bar` | `~1.12.0` | Status bar style kontrolü. |
| `expo-dev-client` | `^4.0.29` | Dev build için Metro bağlantısı. |

### Eklenecek (planlı)

| Paket | Versiyon (öneri) | Neden |
|---|---|---|
| `@tanstack/react-query` | `^5.51` | Web ile aynı. Realtime channel event → `invalidateQueries`. |
| `react-hook-form` | `^7.52` | Block ekranı, AddAppointment modal — şu an her form `useState` ile manuel handle ediliyor, hata kontrolü dağınık. |
| `zod` | `^3.23` | Edge function response validation. |
| `@hookform/resolvers` | `^3.9` | RHF + zod köprüsü. |
| `date-fns-tz` | `^3.2` | TR saati formatlama. |

### Yok ve eklenmeyecek

- ❌ `nativewind` — vanilla `StyleSheet` zaten ekipte oturmuş, token kaynağı `lib/theme.ts`. NativeWind class string parsing runtime'a yük getirir.
- ❌ `react-native-svg` — gerekirse ekleriz (barber pole "tam diagonal" olabilmesi için), şimdilik stripe alternasyonu yeterli.
- ❌ `expo-linear-gradient` — gradient'tan kaçındık (`colors_and_type.css`'te "no gradients" kuralı).
- ❌ `react-native-paper` / `gluestack` / `tamagui` — kendi token sistemimizi taşıyoruz, third-party UI kit gereksiz.

---

## 3. Backend / Edge Function

### Postgres extensions
- `btree_gist` (exclusion constraint için zorunlu — randevu çakışmasını engelliyor)
- `pg_cron` (commission snapshot job için, migration 20260518150000)
- `pgcrypto` / `uuid-ossp` (default UUID generation)

### Edge Function runtime
- **Deno** (Supabase yönetiyor, versiyon Supabase platform tarafında)
- `_shared/database.types.ts` — `pnpm db:sync` ile `packages/db` ile **birebir** senkron
- `_shared/cors.ts` ve `_shared/auth.ts` gibi yardımcılar (varsa)

### Edge Function bağımlılıkları (Deno import map)
- `@supabase/supabase-js` — kullanıcı yerine RPC çağırmak için service_role
- `@upstash/redis` — `book-appointment` IP rate limit

> Detay → [`05-edge-functions.md`](./05-edge-functions.md)

---

## 4. Tooling

### Monorepo
| Araç | Versiyon | Görevi |
|---|---|---|
| `pnpm` | `^9.0` | Paket yöneticisi, workspace |
| `turbo` | `^2.0` | Task orchestration, paralel `dev` / `build` / `type-check` |
| `typescript` | `^5.4` | Tüm paketler aynı versiyon |

### Konfigürasyon dosyaları
- `tsconfig.base.json` — strict, bundler resolution, noEmit
- `turbo.json` — task pipeline
- `.npmrc` — `node-linker=hoisted` (RN için zorunlu)
- `.gitignore`, `.env.example`

### Eklenecek tooling
| Araç | Versiyon (öneri) | Neden |
|---|---|---|
| `eslint` + `@typescript-eslint/*` | `^8` | Web'de var, mobilde yok. Ortak `packages/eslint-config` paketi açılabilir. |
| `prettier` | `^3.3` | Formatlamayı standartlaştırmak için. |
| `husky` + `lint-staged` | son sürümler | Pre-commit'te type-check + lint + format. |
| `vitest` (web) / `jest` (mobil) | sonra | Test infrastructure — `00-overview` §8'de bekletildi. |

---

## 5. Versiyon pinning politikası

Üç sınıf, üç davranış:

### Sabit pin (`X.Y.Z`)
- `react: 18.2.0`
- `react-dom: 18.2.0`
- `react-native: 0.74.5`
- `@react-native-async-storage/async-storage: 1.23.1`
- `react-native-safe-area-context: 4.10.5`
- `react-native-screens: 3.31.1`
- `@react-native-community/datetimepicker: 8.0.1`

**Neden:** Native modül + framework lock. Versiyon kaymasında **native build kırılır**, EAS pipeline ölür.

### Tilde (`~X.Y.Z`) — patch yükselt, minor değil
- `expo: ~51.0.0`
- `expo-router: ~3.5.0`
- Tüm Expo SDK paketleri tilde.

**Neden:** Expo SDK 51 ailesi içindeyiz; SDK 52 geçişi planlı manevra istiyor.

### Caret (`^X.Y.Z`) — minor yükselt OK
- `next: ^14.2.0`
- `@supabase/supabase-js: ^2.43.0`
- `tailwindcss: ^3.4.0`
- `date-fns: ^4.1.0`

**Neden:** SemVer'a güveniyoruz, küçük güvenlik patch'lerini almak için.

> **Major bump (örn. Next 14 → 15, Expo 51 → 52)** — ayrı PR, ayrı test pass, ayrı QA gün. Asla kendiliğinden olmaz.

---

## 6. Önemli trade-off'lar

### 6.1 — `@supabase/ssr` cookie management
Next App Router'da Supabase'i kullanmak için `@supabase/ssr` kurmak şart. Trade-off: Server Component içinde `createServerClient`'a `cookies()` (Next API) geçirmek gerekli; `unstable_cache`'in cookie-less raw client istemesi yüzünden ISR + auth kombinasyonu **iki ayrı client** taşımayı gerektiriyor (bkz. `apps/web/src/lib/supabase-server.ts`). Karmaşık ama Next'in kısıtı, başka yol yok.

### 6.2 — Mobile: NativeWind yerine vanilla StyleSheet
NativeWind güzel ama runtime'da Tailwind class string'i parse etmek ek maliyet. Vanilla StyleSheet `lib/theme.ts`'den token alır, type-safe ve hızlı. Trade-off: Web ile **class string paylaşılamaz** — token paylaşılır (JS objesi olarak), JSX paylaşılmaz. Bu zaten istenilen şey (bkz. `01-architecture` §7).

### 6.3 — date-fns vs dayjs vs Intl native
`date-fns` aynı API'yi web ve mobil'de tutar, tree-shake olur, TS desteği iyi. `dayjs` daha küçük ama plugin sistemi tarih aritmetiğinde sınırlı. Native `Intl.DateTimeFormat` formatlama için yeter, ama "n gün ekle" / "haftanın günü" gibi aritmetik için utility kütüphanesi şart.

### 6.4 — `noUncheckedIndexedAccess: true`
`array[0]` artık `T | undefined`. Bu **daha güvenli** ama her `array[0]` kullanımı `?.` veya guard gerektirir. Trade-off: kod biraz daha verbose, runtime bug'ı **derleme zamanında** yakalıyoruz.

### 6.5 — Test yok
Şu an iş hızı testten kıymetli — özellik koymak öncelik. Ama booking flow yeniden yazılırken Vitest + RTL ile **adım adım test** ekleyeceğiz (bkz. `12-roadmap-open-questions`).

---

## 7. Hızlı kurulum komutları

### Yeni geliştirici (clone sonrası)

```bash
# 1. Tüm paketleri kur
pnpm install

# 2. Tip kontrolü
pnpm type-check

# 3. .env.local dosyalarını oluştur
cp .env.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
# Mobil: apps/mobile/.env.local.example dosyası şu an boş/eksik — manuel oluştur
# (EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY)
# (Supabase URL + anon key + service role key doldur)

# 4. Web dev
pnpm --filter @berber/web dev

# 5. Mobil dev (Metro)
pnpm --filter @berber/mobile start --dev-client
```

### Eklenecek paketleri kurma (tüm sprint'te bir kerede)

```bash
# Web'e
pnpm --filter @berber/web add @tanstack/react-query react-hook-form zod @hookform/resolvers date-fns date-fns-tz

# Mobil'e
pnpm --filter @berber/mobile add @tanstack/react-query react-hook-form zod @hookform/resolvers date-fns-tz

# Dev tools (root)
pnpm add -D -w prettier eslint husky lint-staged
```

---

**Sonraki:** [`03-auth.md`](./03-auth.md) — Supabase Auth flow, owner/staff/customer lookup, RLS örnekleri.
