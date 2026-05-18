# 10 — Routing

> Expo Router grup yapısı, Next.js App Router segment haritası, deep link pattern'leri, auth guard mekanizması.

Önceki: [`09-design-system.md`](./09-design-system.md) · Sonraki: [`11-conventions.md`](./11-conventions.md)

---

## 1. Genel bakış

| Platform | Router | Auth | Public |
|---|---|---|---|
| Mobil | Expo Router v3 (file-based) | Tam — role-based yönlendirme | Hayır (tüm route'lar guard'lı) |
| Web | Next.js App Router | Yok — middleware yok | Evet (tüm route'lar public) |

Mobil: owner ve staff farklı route gruplarına yönlendiriliyor. Web: sadece müşteri booking sayfaları var — auth gerektiren sayfa yok.

---

## 2. Mobil — Expo Router yapısı

```
apps/mobile/app/
  _layout.tsx              ← root layout: session + RouterGuard + UserProvider
  (auth)/
    login.tsx              ← giriş ekranı
  (app)/                   ← staff grubu
    _layout.tsx            ← tab navigator (2 sekme)
    index.tsx              ← günlük ajanda
    block.tsx              ← blok ekleme
    settings.tsx           ← usta ayarları
  (owner)/                 ← owner grubu
    _layout.tsx            ← tab navigator (4 sekme)
    index.tsx              ← owner dashboard (KPI + agenda)
    agenda.tsx             ← personel ajandası (owner görünümü)
    earnings.tsx           ← kazanç özeti
    settings.tsx           ← dükkan ayarları
    team.tsx               ← personel yönetimi
```

Expo Router `typedRoutes: true` aktif — route string'leri type-check edilir.

---

## 3. Mobil — Auth guard

### 3.1 Mekanizma

`RouterGuard` — `_layout.tsx`'te `<Slot />` ile yan yana render edilen, null dönen bir component. `Redirect` bileşeni kullanılmıyor.

```ts
function RouterGuard({ session }) {
  const router   = useRouter();
  const segments = useSegments();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (session === undefined || loading) return;  // henüz bilinmiyor

    const inAuth  = segments[0] === "(auth)";
    const inApp   = segments[0] === "(app)";
    const inOwner = segments[0] === "(owner)";

    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }
    if (role === "owner" && !inOwner) router.replace("/(owner)");
    else if (role === "staff" && !inApp) router.replace("/(app)");
    // role === null → loading veya tanımsız kullanıcı — yönlendirme yok
  }, [session, role, loading, segments, router]);

  return null;
}
```

### 3.2 Session state üçlüsü

| `session` değeri | Anlam | Davranış |
|---|---|---|
| `undefined` | Henüz kontrol edilmedi | `ActivityIndicator` gösterilir |
| `null` | Giriş yapılmamış | `/(auth)/login`'e yönlendirilir |
| `Session` | Aktif oturum | Role'a göre yönlendirilir |

Root layout `session` state'i başlangıçta `undefined` olarak başlatır — `ActivityIndicator` ilk render'da flash'ı önler.

### 3.3 Loading sırası

```
getSession()        → session set edilir (undefined → null/Session)
UserProvider        → shops + staff lookup (2 seri Supabase query)
RouterGuard effect  → role + session her ikisi hazır olunca çalışır
```

Aralarında race condition yok — `if (session === undefined || loading) return` guard ikisini de bekler.

---

## 4. Mobil — Role detection

`apps/mobile/lib/user-context.tsx` — `UserProvider` + `useUserRole()` hook.

### 4.1 Lookup sırası

```
1. supabase.auth.getUser() → user.id

2. shops tablosu:
   .or("owner_id.eq.{id},owner_user_id.eq.{id}")
   Bulursa → role="owner", shopId=shop.id, staffId=null

3. Bulamazsa staff tablosu:
   .eq("user_id", user.id)
   Bulursa → role="staff", staffId=staff.id, shopId=staff.shop_id

4. Hiçbiri → role=null, shopId=null, staffId=null
```

`owner_id` ve `owner_user_id` kontrolü — multi-shop refactor süreci için iki farklı kolon aynı anda kontrol ediliyor (geçiş dönemi).

### 4.2 Context değerleri

```ts
interface UserContextValue {
  role:    "owner" | "staff" | null;
  shopId:  string | null;
  staffId: string | null;
  loading: boolean;
  reload:  () => void;
}
```

`reload()` — invite akışı veya login sonrası force refresh için. `onAuthStateChange` her oturum değişikliğinde otomatik `reload()` tetikler.

---

## 5. Mobil — Tab navigatorlar

### 5.1 (owner) grubu — 4 sekme

```
index.tsx     → "Ana Sayfa"  (KPI + agenda)
agenda.tsx    → "Ajanda"     (personel seçimi + günlük timeline)
earnings.tsx  → "Kazanç"     (tarih aralığı özeti)
settings.tsx  → "Ayarlar"    (dükkan + personel ayarları)
```

### 5.2 (app) grubu — 2 sekme (staff)

```
index.tsx     → "Ajanda"     (kendi günlük randevuları)
settings.tsx  → "Ayarlar"    (kişisel ayarlar)
```

`block.tsx` tab'da görünmez — `(app)` içinde ama `tabBarButton: () => null` ile gizlenmiş.

---

## 6. Mobil — Deep link

`app.config.json`'da `"scheme": "berberapp"` tanımlı. Expo Router bu scheme'i otomatik yakalar.

```
berberapp://(owner)/agenda    → owner ajanda ekranı
berberapp://(app)/index       → staff ajanda ekranı
berberapp://(auth)/login      → login ekranı
```

**Kısıtlar:**
- `extra.router.origin: false` — web base URL yönlendirmesi yok
- Universal Link (iOS) / App Link (Android) kurulmamış — sadece custom scheme
- `Linking.getInitialURL()` veya özel handler yok — deep link altyapısı tanımlı ama aktif akış yok
- Widget → uygulama geçişi için scheme kullanılabilir (mevcut widget'ta uygulanmamış)

---

## 7. Web — App Router yapısı

```
apps/web/src/app/
  layout.tsx                      ← root layout (Inter font, globals.css)
  not-found.tsx                   ← 404 sayfası
  globals.css                     ← Tailwind + CSS custom properties
  [slug]/
    page.tsx                      ← dükkan booking sayfası
    BookingFlow.tsx               ← 'use client' interaktif bileşen
    u/
      [barberSlug]/
        page.tsx                  ← kişisel berber booking sayfası
```

Web'de `(auth)`, `(owner)` gibi route grupları yok — middleware.ts yok — tüm sayfalar public.

---

## 8. Web — Segment haritası

### 8.1 `/[slug]` — Dükkan sayfası

| Özellik | Değer |
|---|---|
| Tür | Server Component (async) |
| `revalidate` | 60 (saniye) |
| `dynamicParams` | `true` |
| `generateStaticParams` | Evet — tüm `shops.slug`'ları build time'da |
| `unstable_cache` | `getShopBySlug` — `tags: ["shop-profile"]`, 60s |
| `generateMetadata` | Evet — `{display_name} — Randevu Al` |
| 404 | `notFound()` — `not-found.tsx` render edilir |

`generateStaticParams` tüm shop slug'larını build time'da üretir. Yeni eklenen dükkanlar `dynamicParams: true` sayesinde 404 döndürmez — ilk istekte oluşturulur.

### 8.2 `/[slug]/u/[barberSlug]` — Kişisel berber sayfası

| Özellik | Değer |
|---|---|
| Tür | Server Component (async) |
| `revalidate` | 60 (saniye) |
| `dynamicParams` | `true` |
| `generateStaticParams` | **Yok** — ISR on-demand |
| `unstable_cache` | `getShopBySlug` — aynı cache, aynı tag |
| `generateMetadata` | Evet — `{barber.name} · {display_name} — Randevu Al` |
| 404 | Berber slug eşleşmezse `notFound()` |

Berber inactive ise `lockedBarber` prop'u `undefined`, `inactiveBarberName` dolu — `BookingFlow` "Bu berber artık aktif değil" mesajı gösterir, slot listesi boş gelir.

### 8.3 `BookingFlow` — Client bileşen

`[slug]/BookingFlow.tsx` — `'use client'`. Her iki page component'ten de import edilir. Slot seçimi, `BookingModal`, realtime invalidation burada yaşar.

---

## 9. Web — Cache ve ISR katmanları

```
Build time:
  generateStaticParams() → tüm shops.slug → statik HTML üretilir

İlk istek (cache miss):
  SSR → unstable_cache miss → Supabase query → HTML + cache set

Sonraki istekler (60s içinde):
  unstable_cache hit → cached HTML dönülür

60s sonra:
  stale-while-revalidate → cached HTML + background regeneration

Cache tag invalidation:
  revalidateTag("shop-profile") → tüm dükkan sayfaları yenilenir
  (henüz tetikleyici uygulanmamış — §11 açık konular)
```

---

## 10. Web — generateStaticParams detayı

```ts
// apps/web/src/app/[slug]/page.tsx
export async function generateStaticParams() {
  const supabase = createClient<Database>(url, anon);
  const { data } = await supabase.from("shops").select("slug");
  return (data ?? []).map(({ slug }) => ({ slug }));
}
```

Build sırasında `NEXT_PUBLIC_SUPABASE_URL` veya `NEXT_PUBLIC_SUPABASE_ANON_KEY` tanımlı değilse `[]` döner — build crash olmaz, tüm sayfalar ISR on-demand üretilir.

`[barberSlug]/page.tsx`'te `generateStaticParams` yoktur — berber sayısı dükkan sayısıyla çarpıldığında build süresi uzar; `dynamicParams: true` + 60s ISR tercih edildi.

---

## 11. Açık konular

- ⚠️ **Deep link akışı pasif** — `"scheme": "berberapp"` tanımlı ama `Linking.getInitialURL()` veya özel handler yok. Widget → ilgili randevu ekranı gibi deep link akışları kurulmamış.
- ⚠️ **`role === null` state'i sessizce bekleniyor** — Oturum açık ama DB'de kaydı olmayan kullanıcı için yönlendirme yok; loading sonsuz döner. Onboarding veya "hesap bulunamadı" ekranı eklenmeli.
- ⚠️ **`revalidateTag("shop-profile")` tetikleyicisi yok** — Dükkan adı veya avatar değişince cache otomatik yenilenmez; 60s TTL dolana kadar eski veri gösterilir. Supabase webhook veya admin action tetikleyici eklenebilir.
- ⚠️ **Universal Link / App Link yok** — iOS'ta `https://berber.app/[slug]` linki uygulamayı açmaz, tarayıcı açar. Deep link entegrasyonu için associated domains (iOS) + asset links (Android) kurulmalı.
- 🚧 **Web'de staff/owner paneli yok** — Tüm yönetim mobil uygulamada. Web müşteri-only; gelecekte owner web dashboard eklenirse auth + middleware gerekecek.

---

**Sonraki:** [`11-conventions.md`](./11-conventions.md) — Dosya/klasör isimlendirme, commit/PR kuralları, TypeScript kuralları, Türkçe UI string kuralları.
