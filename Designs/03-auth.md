# 03 — Auth

> Supabase Auth flow, owner / staff / customer rol tespiti, RLS politikaları, client kurulumu (web SSR + mobil SecureStore).

Önceki: [`02-stack.md`](./02-stack.md) · Sonraki: [`04-database.md`](./04-database.md)

---

## 1. Genel akış

```
┌──────────────────────────────────────────────────────────────────┐
│                    Üç yüz, üç auth modu                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Customer (web)        Owner (mobil)        Staff (mobil)        │
│  ────────────         ───────────────       ───────────────      │
│  Anonim — anon key     E-posta + parola      E-posta + parola    │
│  Session yok           SecureStore'da         SecureStore'da     │
│  RLS public-read       Session tutulur       Session tutulur     │
│                                                                  │
│           ↓                    ↓                   ↓             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              Supabase Auth (supabase.auth.*)             │    │
│  │  e-posta + parola · session refresh · onAuthStateChange  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                ↓                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │           Postgres RLS — auth.uid() lookup               │    │
│  │  shops.owner_id   = uid → owner role                     │    │
│  │  staff.user_id    = uid → staff role                     │    │
│  │  customer_user_id = uid → kendi randevuları (opsiyonel)  │    │
│  │  anon                   → public-read (slug, services)   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Supabase Auth konfigürasyonu

### Provider'lar
- ✅ **E-posta + parola** — tek aktif yöntem.
- ⚠ **E-posta doğrulama** — Lokal dev'de **kapalı** (`confirm = false`). Production'da açılması **şart** (`supabase/config.toml`).
- ❌ Google / Apple / Phone OTP — kullanılmıyor.

### Token yapısı
- Standart Supabase JWT (`access_token` + `refresh_token`)
- **Custom claim yok** — rol bilgisi JWT'de değil, **DB lookup ile** tespit ediliyor (bkz. §5).
- Refresh otomatik (`autoRefreshToken: true`).

---

## 3. Web client kurulumu

**İki ayrı client:** Server Component / Route Handler / Server Action için **server client**, Client Component için **browser client**.

### 3.1 — Browser client

`apps/web/src/lib/supabase-browser.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@berber/db/src/database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Kullanım:** Client Component'lerin içinde `'use client'` ile:
```tsx
'use client';
const supabase = createSupabaseBrowserClient();
const { data, error } = await supabase.from('services').select();
```

### 3.2 — Server client

`apps/web/src/lib/supabase-server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@berber/db/src/database.types";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options));
        },
      },
    }
  );
}
```

**Kullanım:** Server Component / Server Action / Route Handler:
```tsx
// app/[slug]/page.tsx
export default async function ShopPage({ params }: { params: { slug: string } }) {
  const supabase = createSupabaseServerClient();
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', params.slug)
    .single();
  // ...
}
```

### 3.3 — `unstable_cache` + auth çakışması (önemli!)

`unstable_cache` cookie-less raw client istiyor (Next kısıtı). Server client cookie'ye dokunduğu için cache içine giremez. **Çözüm:** ISR sayfalarda raw `supabase-js` client tut (`createClient` direkt), auth'lu sayfalarda `createSupabaseServerClient` kullan.

> Şu an `apps/web/src/lib/`'de raw client örneği yok — gerektiğinde eklenecek (bkz. `12-roadmap-open-questions`).

---

## 4. Mobil client kurulumu

`apps/mobile/lib/supabase.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "@berber/db/src/database.types";

const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,    // deep link auth callback'i yok
    },
  }
);
```

**Önemli farklar (web'den):**
- **`expo-secure-store`** kullanıyor — AsyncStorage **değil**. Token şifreli saklanır (iOS Keychain / Android EncryptedSharedPreferences).
- Singleton `supabase` export — uygulama boyunca tek instance.
- `detectSessionInUrl: false` — mobilde URL bazlı auth callback yok.

---

## 5. Rol tespit deseni — `UserContext` (mobil)

**Karar:** Rol JWT'de **değil**, DB lookup'tan geliyor. Bu lookup'ı **tek bir yerde** (`UserContext`) yapıyoruz, geri kalan kod `useUserRole()` hook'undan okuyor.

`apps/mobile/lib/user-context.tsx`:
```ts
export type UserRole = "owner" | "staff" | null;

interface UserContextValue {
  role:     UserRole;
  shopId:   string | null;
  staffId:  string | null;
  loading:  boolean;
  reload:   () => void;
}
```

### Resolution algoritması

```
1. supabase.auth.getUser() → user.id (auth.uid())
2. shops tablosuna sor:
   WHERE owner_id = uid OR owner_user_id = uid
   ↳ Tek satır dönerse → role = "owner", shopId set
3. (Step 2 boşsa) staff tablosuna sor:
   WHERE user_id = uid
   ↳ Tek satır dönerse → role = "staff", staffId + shopId set
4. (İkisi de boşsa) → role = null
   (Oturum açık ama DB'de yok; nadir, ama olabilir.)
```

### Niye iki owner kolonu?

`shops` tablosunda **hem `owner_user_id` hem `owner_id`** var. Migration history'sinden:
- `owner_user_id` — initial migration (`20240101000001`)
- `owner_id` — multi-seat migration (`20260508`) yeni eklendi

Şu an her ikisi de tutuluyor (legacy compatibility), RLS politikaları **ikisini de** check ediyor:
```sql
WHERE sh.owner_user_id = auth.uid() OR sh.owner_id = auth.uid()
```

**Tek kolona düşürme** ileride yapılacak migration olarak `12-roadmap-open-questions`'da takip ediliyor.

### Auth state senkronizasyonu

```ts
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    reload();   // session değiştiğinde rol lookup'ını yeniden çalıştır
  });
  return () => subscription.unsubscribe();
}, [reload]);
```

### Web tarafında karşılığı (henüz yok)

Web'de şu an `UserContext` yok çünkü müşteri akışı anonim. Owner / staff web paneli açılırsa **aynı pattern** Next için yazılır:

```ts
// apps/web/src/lib/user-context.tsx (gelecekte)
'use client';
export function UserProvider({ children }: { children: ReactNode }) {
  // aynı algoritma, supabase-browser client ile
}
```

> Detay → [`07-data-fetching.md`](./07-data-fetching.md)

---

## 6. Router guard — mobil state machine

`apps/mobile/app/_layout.tsx`:

```
┌────────────────────────────────────────────────┐
│  session === undefined  (henüz yüklenmedi)     │
│  → ActivityIndicator                           │
├────────────────────────────────────────────────┤
│  session === null  (oturum yok)                │
│  → router.replace("/(auth)/login")             │
├────────────────────────────────────────────────┤
│  session populated + role === "owner"          │
│  + segment !== "(owner)"                       │
│  → router.replace("/(owner)")                  │
├────────────────────────────────────────────────┤
│  session populated + role === "staff"          │
│  + segment !== "(app)"                         │
│  → router.replace("/(app)")                    │
├────────────────────────────────────────────────┤
│  session populated + role === null             │
│  (oturum açık ama DB'de kullanıcı yok)         │
│  → şu an redirect YAPILMIYOR; planlı çözüm:    │
│    toast ("Hesabın bu dükkanda aktif değil") + │
│    supabase.auth.signOut() → login'e döner     │
└────────────────────────────────────────────────┘
```

**Önemli detaylar:**
- `session === undefined` → loading state. **`null` ile karıştırma** (`null` "oturum yok" demek).
- Segment kontrolü sonsuz redirect'i önler — kullanıcı zaten `(owner)`'daysa `(owner)`'a tekrar push'lanmıyor.
- Auth state change'de `RouterGuard` otomatik tetikleniyor (`session` prop değişiyor).

---

## 7. Login akışı

`apps/mobile/app/(auth)/login.tsx`:

```ts
async function handleLogin() {
  if (!email || !password) return;
  setLoading(true);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) Alert.alert("Giriş Başarısız", error.message);
  setLoading(false);
}
```

Login başarılı olursa:
1. `supabase.auth` token'ı SecureStore'a yazar.
2. `onAuthStateChange` tetiklenir → `_layout.tsx`'teki `setSession` çağrılır.
3. `UserProvider` tetiklenir → rol resolve edilir.
4. `RouterGuard` ilgili route group'a redirect eder.

> **UX notu:** Error mesajı şu an raw Supabase mesajı (`Alert("Giriş Başarısız", error.message)`). Türkçeleştirilmesi (`"E-posta veya parola hatalı"` gibi) `11-conventions.md`'de takip ediliyor.

---

## 8. Logout akışı

```ts
async function handleLogout() {
  await supabase.auth.signOut();
  // onAuthStateChange tetiklenir → session = null
  // → RouterGuard otomatik /(auth)/login'e redirect eder
  // SecureStore'da token silinir.
}
```

**Önerilen UX:** Logout butonu confirm modal (`"Hesaptan çıkmak istediğine emin misin?"`) ile korunmalı — kazara tıklama önlenir. DESIGN.md zaten bu metni içeriyor.

---

## 9. Customer auth durumu

### Web'de — anonim
- Müşteri Supabase Auth **kullanmıyor**, sadece anon key ile RLS public-read yapıyor.
- `shops` (`is_active = true`), `services`, `staff` (`is_active = true`), `staff_schedules` tabloları anon erişimli.
- Randevu oluşturma `customer-book-appointment` edge function'ı üzerinden, müşteri identity'sini **payload'da** taşıyor (`customer_name`, `customer_phone`).

### Customer Auth altyapısı (kullanılmıyor ama hazır)
RLS politikalarında `customer_user_id = auth.uid()` görünüyor — bu **kayıtlı müşteri** desteği için altyapı. Şu an:
- Web booking flow anon kalıyor.
- Eğer ileride "Hesabımdan iptal" feature'ı eklenirse, `customer_user_id` kolonu zaten dolduruluyor (login'li akış için).
- `archive/customer/` klasöründeki eski mobil müşteri app'i bu auth'u kullanıyordu — şu an deprecated.

---

## 10. RLS politikaları — özetin özeti

**Tüm hot path politikalar** (`appointments`, `blocks`, `staff`, `staff_schedules`) son consolidation migration'da (`20260514080010_scheduling_rls_policy_consolidation.sql`) tek bir mantıkta toparlandı:

```sql
-- Pattern: "Bu randevuya kimler dokunabilir?"
USING (
  customer_user_id = (SELECT auth.uid())    -- kendi randevusu (kayıtlı müşteri)
  OR staff_id IN (
    SELECT st.id
    FROM public.staff st
    JOIN public.shops sh ON sh.id = st.shop_id
    WHERE st.user_id = (SELECT auth.uid())                          -- atanmış usta
       OR sh.owner_user_id = (SELECT auth.uid())                    -- dükkan sahibi (legacy)
       OR sh.owner_id      = (SELECT auth.uid())                    -- dükkan sahibi (yeni)
  )
)
```

### Önemli detaylar

| Detay | Açıklama |
|---|---|
| **`(SELECT auth.uid())` wrapping** | Postgres initplan optimization — query başına bir kez evalüe edilir, satır başına değil. Performans kritik. |
| **Dual owner column** | Hem `owner_user_id` hem `owner_id` check edilir (legacy compat). |
| **Anon role özel** | `staff` ve `staff_schedules` için anon SELECT açık (sadece `is_active = true` filtre'siyle) — public booking için zorunlu. |
| **`appointments_scheduling_update`** | Müşteri sadece `status = 'cancelled'` set edebilir; staff/owner serbest. WITH CHECK farklı USING'den. |
| **Single FOR-PER-ACTION policy** | Eskiden `appointments_barber_select`, `appointments_shop_owner_select` gibi ayrı politikalar vardı — şimdi tek `appointments_scheduling_select`. Permissive fan-out azaldı. |

> Detay → [`04-database.md`](./04-database.md) §RLS bölümü.

---

## 11. Frontend kullanım pattern'leri

### Server Component (web)
```tsx
// app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function Dashboard() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS otomatik filtreliyor — user bağlamında query
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .order("starts_at");
  // ...
}
```

### Client Component (web)
```tsx
'use client';
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export function useSession() {
  const supabase = createSupabaseBrowserClient();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_e, s) => setSession(s)
    );
    return () => subscription.unsubscribe();
  }, []);

  return session;
}
```

### Mobile (içeride zaten kurulu)
```tsx
import { useUserRole } from "../lib/user-context";

export default function Settings() {
  const { role, shopId, staffId, loading } = useUserRole();
  if (loading) return <ActivityIndicator />;
  if (role === "owner") return <OwnerSettings shopId={shopId!} />;
  if (role === "staff") return <StaffSettings staffId={staffId!} />;
  return <Error />;
}
```

---

## 12. Açık konular

- ⚠️ **Email verification production'da kapalı** — `supabase/config.toml`'da `enable_confirmations = true` set edilmeli, e-posta template'i Türkçeleştirilmeli.
- ⚠️ **Rate limiting login'de yok** — Brute force koruması Supabase Auth'un kendi limit'lerine bırakılmış. Üst seviye `Upstash Redis` denenebilir.
- ⚠️ **`role === null` handle edilmiyor** — oturum açık ama DB'de kullanıcı yok senaryosu (örn. owner kendi shop'unu sildi). Mobilde toast + force logout pattern'i ekleyeceğiz.
- ⚠️ **Dual owner column legacy** — `shops.owner_user_id` ve `shops.owner_id` ikisi de var. Tek kolona düşürmek için migration planlanacak (`shops.owner_id` kalır, RLS de tek kolona dönüştürülür).
- ⚠️ **Web'de owner/staff girişi yok** — şu an web sadece müşteri akışı. Owner web paneli açıldığında aynı `@supabase/ssr` pattern'i + `UserContext` analogu yazılacak.
- ⚠️ **Türkçe error mesajları** — `error.message` raw Supabase mesajları (İngilizce). Login screen'de `mapError(error)` helper'ı ile Türkçeleştirilmeli.
- ⚠️ **Password reset / "Şifremi unuttum"** — şu an login screen'inde yok. `supabase.auth.resetPasswordForEmail()` ile eklenecek.
- ⚠️ **Kayıt akışı** — Login screen'inde *"Kayıt ol"* link'i pasif. Owner registration backend'de mi yapılıyor (invite-only mu) yoksa self-serve mi olacak — karar verilecek.

---

**Sonraki:** [`04-database.md`](./04-database.md) — tablo-tablo şema, kolonlar, ilişkiler, constraint'ler, full RLS dökümü.
