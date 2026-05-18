# 11 — Conventions

> Commit mesajı formatı, dosya isimlendirme, TypeScript konfigürasyonu, UI string yönetimi, export pattern'leri, lint/format araçları.

Önceki: [`10-routing.md`](./10-routing.md) · Sonraki: [`12-roadmap-open-questions.md`](./12-roadmap-open-questions.md)

---

## 1. Commit mesajı formatı

Repo Conventional Commits kullanıyor. Format:

```
<type>(<scope>): <kısa açıklama>
```

**Kullanılan type'lar:**

| Type | Kullanım |
|---|---|
| `feat` | Yeni özellik |
| `fix` | Hata düzeltme |
| `refactor` | Davranış değiştirmeyen yapısal değişiklik |
| `docs` | Yalnızca dokümantasyon |
| `chore` | Bağımlılık, config, araç güncellemesi |

**Kullanılan scope'lar:** `mobile`, `web`, `shared` — monorepo paketlerine eşleşir.

**Scope'suz commit örnekleri:** `docs:`, `chore:` — birden fazla paketi etkileyen değişiklikler scope almaz.

```
feat(mobile): per-barber commission toggle
fix(shared): remove as any cast, improve removeChannel error handling
refactor(web): migrate booking flow realtime to useRealtimeInvalidation
docs: working hours editor design spec
```

> **Geçiş dönemi:** Eski commit'lerde (`harden scheduling integrity`, `pre scheduling hardening snapshot`) serbest format görülüyor. Yaklaşık 10 commit öncesinden itibaren Conventional Commits tutarlı şekilde uygulanıyor.

---

## 2. Branch isimlendirme

Tutarsız — zorunlu kural yok:

| Branch | Format |
|---|---|
| `feature/antigravity-devam` | `feature/<konu>` |
| `scheduling-hardening` | `<konu>` (prefix yok) |
| `main` | kalıcı ana dal |

`feature/` prefix'i kullanılıyor ama zorunlu değil. `fix/`, `chore/`, `release/` branch'i gözlemlenmedi.

---

## 3. Dosya ve klasör isimlendirme

### 3.1 Genel kural

| Dosya türü | Platform | Kural | Örnek |
|---|---|---|---|
| React component | Web | PascalCase | `BookingModal.tsx`, `SlotGrid.tsx` |
| React component | Mobil (components/) | PascalCase | `AddAppointmentModal.tsx`, `WorkingHoursEditor.tsx` |
| Route/screen | Mobil (app/) | lowercase | `agenda.tsx`, `settings.tsx`, `team.tsx` |
| Route/page | Web (app/) | lowercase | `page.tsx`, `layout.tsx`, `not-found.tsx` |
| Lib/util | Web | kebab-case | `supabase-browser.ts`, `supabase-server.ts` |
| Lib/util | Mobil | kebab-case veya lowercase | `user-context.tsx`, `widget-bridge.ts`, `theme.ts` |
| Expo Router layout | Mobil | `_layout.tsx` | (Expo Router convention) |

### 3.2 Klasör isimlendirme

Expo Router grup klasörleri `(grupAdı)` formatında: `(app)`, `(owner)`, `(auth)`.

Web `src/` altı: `app/`, `components/`, `lib/` — lowercase klasör adları.

### 3.3 İstisna

`BookingFlow.tsx` — route dosyası olmasına rağmen PascalCase; hem `[slug]/page.tsx` hem `[barberSlug]/page.tsx`'ten import edilen paylaşımlı Client Component.

---

## 4. TypeScript konfigürasyonu

### 4.1 Root `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "noEmit": true
  }
}
```

Tüm paketler bu base'den extend eder. `strict: true` — `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes` dahil tüm strict flag'ler aktif. `noUncheckedIndexedAccess` — `arr[0]` tipi `T | undefined` olur.

### 4.2 Web tsconfig

`tsconfig.base.json`'ı extend eder; ek olarak `strictNullChecks: true` (base'den zaten geliyor, tekrar edilmiş), `allowJs: true`. `strict: true` base'den kalıtılır.

### 4.3 Mobil tsconfig

`expo/tsconfig.base`'i extend eder; `strict: true` doğrudan belirtilmiş.

### 4.4 `any` kullanımı

Codebase'de `as any` veya `: any` kullanımı neredeyse yok. Yakın geçmişte temizlendi:

```
fix(shared): remove as any cast, improve removeChannel error handling
```

İzin verilen tek istisna: Expo Router `router.replace("/(owner)" as any)` — typed routes henüz tüm route string'leri desteklemediğinde zorunlu cast.

---

## 5. UI string yönetimi

**i18n sistemi yok.** Türkçe string'ler her dosyada inline tanımlı. Merkezi string constants veya lokalizasyon dosyası mevcut değil.

```tsx
// Tüm stringler bileşen içinde hard-coded
Alert.alert("Eksik", "Müşteri adı en az 2 karakter olmalı");
Alert.alert("Kopyalandı", "Randevu linkin panoya kopyalandı.");
<Text>Dükkan payı</Text>
title: "Randevular"
```

`apps/mobile/android/res/values/strings.xml` — Android native uygulama adı ve arka plan servisi isimleri için; UI string'leri için değil.

**Sonuç:** Uygulama Türkçe-only; lokalizasyon ihtiyacı öngörülmüyor. Inline string pattern kabul gören standarttır.

---

## 6. Export pattern'leri

### 6.1 Expo Router screens — `export default` (zorunlu)

Expo Router dosya tabanlı routing için varsayılan export bekler:

```ts
// app/(owner)/agenda.tsx
export default function OwnerAgenda() { ... }

// app/_layout.tsx
export default function RootLayout() { ... }
```

### 6.2 Web Next.js pages — `export default` (zorunlu)

App Router page.tsx ve layout.tsx varsayılan export gerektirir:

```ts
export default async function BookingPage({ params }: PageProps) { ... }
export default function RootLayout({ children }) { ... }
```

Next.js metadata/cache sabitler named export:

```ts
export const revalidate = 60;
export const dynamicParams = true;
export async function generateStaticParams() { ... }
export async function generateMetadata() { ... }
```

### 6.3 Paylaşımlı bileşenler — named export (tercih)

Framework zorunluluğu olmayan tüm bileşenler ve utility'ler named export kullanır:

```ts
// Web components
export function BookingModal(...) { ... }
export function BookingFlow(...) { ... }
export function SlotGrid(...) { ... }

// Mobile components
export function AddAppointmentModal(...) { ... }
export function WorkingHoursEditor(...) { ... }
export function AppointmentDetailSheet(...) { ... }

// Lib/util
export function createSupabaseBrowserClient() { ... }
export function useRealtimeInvalidation(...) { ... }
export const useUserRole = () => useContext(UserContext);
```

### 6.4 Özet kural

| Dosya türü | Export tipi | Neden |
|---|---|---|
| Expo Router screen/layout | `export default` | Framework zorunluluğu |
| Next.js page/layout | `export default` | Framework zorunluluğu |
| Next.js metadata constants | named `export const` | Framework zorunluluğu |
| Component (paylaşımlı) | named `export function` | Tree-shaking, refactor kolaylığı |
| Hook | named `export function/const` | Convention |
| Type/interface | named `export type/interface` | Convention |

---

## 7. Lint ve format

### 7.1 Mevcut araçlar

| Araç | Konum | Kapsam |
|---|---|---|
| ESLint `next/core-web-vitals` | `apps/web/.eslintrc.json` | Yalnızca web |
| TypeScript compiler | Her paket | Type check — tüm repo |

### 7.2 Eksik araçlar

- **Prettier yok** — root'ta veya herhangi bir pakette `.prettierrc` dosyası yok
- **Biome yok** — `biome.json` yok
- **Mobil ESLint yok** — `apps/mobile/` için ESLint config yok
- **Shared/packages ESLint yok** — `packages/` için kural yok

### 7.3 Web ESLint config

```json
{
  "extends": "next/core-web-vitals"
}
```

`next/core-web-vitals` — `eslint-config-next`'in katı preset'i. React hooks kuralları, `<Image>`, `<Link>` Next.js bileşen kuralları dahil. Özel kural yok.

### 7.4 Format tutarlılığı

Prettier olmadan format editör/geliştirici inisiyatifine bırakılmış. Kod incelendiğinde indent (2 boşluk), noktalı virgül (var), tek tırnak (string'lerde çift tırnak da görülüyor) tutarsız biçimde uygulanıyor.

---

## 8. Açık konular

- ⚠️ **Mobil ESLint yok** — `apps/mobile/` için lint kuralı tanımlı değil. `expo/tsconfig.base` TypeScript strict sağlıyor ama stil/mantık hataları lint edilmiyor.
- ⚠️ **Prettier yok** — Format tutarsızlıkları manuel; otomatik format komutu yok. Root'a `prettier` + `"format": "prettier --write ."` script eklenebilir.
- ⚠️ **Branch naming standardı yok** — `feature/` prefix'li ve prefix'siz branch'ler karışık. CONTRIBUTING.md veya CLAUDE.md'de kural belgelenmeli.
- ℹ️ **Conventional Commits yakın geçmişte benimsendi** — Eski commit'ler serbest format; `feat/fix/refactor/docs` tutarlı kullanımı ~10 commit öncesinden itibaren.

---

**Sonraki:** [`12-roadmap-open-questions.md`](./12-roadmap-open-questions.md) — Bilinen eksikler, açık mimari sorular, öncelik sırası.
