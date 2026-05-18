# 07 — Data Fetching

> Web (Server Components + Client fetch) ve Mobil (raw Supabase + useState). Bugünkü gerçek durum, hedef TanStack Query mimarisi, cache key sözleşmesi, prefetch pattern'leri, Supabase client seçimi.

Önceki: [`06-realtime.md`](./06-realtime.md) · Sonraki: [`08-forms.md`](./08-forms.md)

---

## 1. Genel mimari

```
┌──────────────────────────────────────────────────────────────┐
│  Web (Next.js App Router)                                    │
│                                                              │
│  Server Component (page.tsx)                                 │
│    └─ unstable_cache + ISR (revalidate: 60s)                 │
│       shops, services, staff → props olarak Client'a gider   │
│                                                              │
│  Client Component (BookingFlow, BookingModal)                │
│    └─ raw fetch() + useState  ←── bugün                      │
│    └─ useQuery + TanStack Query ←── hedef                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  Mobil (Expo Router / React Native)                          │
│                                                              │
│  Screen component                                            │
│    └─ load() callback + useState  ←── bugün                  │
│    └─ useQuery + TanStack Query  ←── hedef                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Tasarım ilkesi:** Veri her zaman canonical kaynaktan çekilir (Supabase DB veya Edge Function). Realtime event'leri yalnızca refetch tetikleyicisidir — bkz. [`06-realtime.md §1`](./06-realtime.md). Payload'tan UI türetilmez.

---

## 2. Web — Server Component katmanı

### 2.1 Bugünkü durum

`apps/web/src/app/[slug]/page.tsx` bir Next.js async Server Component. Üç bağımsız fetch çalışır:

| Veri | Kaynak | Cache stratejisi |
|---|---|---|
| `shop` (profil, çalışma saatleri) | `supabase.from('shops')` | `unstable_cache` TTL 60 s, tag `shop-profile` |
| `services` | `supabase.from('services')` | ISR `revalidate = 60` — cache yok, her request'te taze |
| `staff` | `supabase.from('staff')` | ISR `revalidate = 60` — cache yok, her request'te taze |

```ts
// apps/web/src/app/[slug]/page.tsx (sadeleştirilmiş)
export const revalidate = 60;   // ISR: route'u 60 s'de bir arka planda yeniler

const getShopBySlug = unstable_cache(
  async (slug) => { /* supabase.from('shops').eq('slug', slug) */ },
  ['shop-profile'],
  { revalidate: 60, tags: ['shop-profile'] },
);

export default async function BookingPage({ params }) {
  const shop = await getShopBySlug(params.slug);
  if (!shop) notFound();

  const supabase = createSupabaseServerClient();          // cookie-based auth

  const [{ data: services }, { data: staff }] = await Promise.all([
    supabase.from('services').select(...).eq('shop_id', shop.id).eq('is_active', true),
    supabase.from('staff').select(...).eq('shop_id', shop.id).eq('is_active', true),
  ]);

  return <BookingFlow shop={shop} staff={staff ?? []} services={services ?? []} />;
}
```

### 2.2 Supabase client seçimi

Web tarafında **üç farklı client** vardır — hangisi nerede kullanılacağını karıştırmak veri sızıntısına veya RLS atlamasına yol açar:

| Client | Ne zaman | Neden |
|---|---|---|
| `createClient(url, anon)` | `generateStaticParams` gibi **build-time** işlerde | Auth context yok, sadece public veri |
| `createSupabaseServerClient()` | Server Component + Route Handler | Cookie'den session alır, RLS doğru çalışır |
| `createSupabaseBrowserClient()` | Client Component | Tarayıcı cookie'si, realtime için de bu |

> `createSupabaseServerClient()` her Server Component render'ında **yeni instance** döner — singleton değil. Next.js bunu doğru şekilde izole eder. Client Component'te Server client **asla kullanılmaz** — bundle'a girer ve cookie'yi okuyamaz.

### 2.3 ISR + unstable_cache ilişkisi

`getShopBySlug` hem `unstable_cache` (process-level in-memory) hem de ISR (disk/CDN level) cache'ine giriyor. Sonuç:
- İlk hit → DB'ye gider, sonuç process cache'e + CDN'e yazılır.
- Sonraki hit (60 s içinde) → process cache'den döner, DB'ye gitmez.
- 60 s sonra → arka planda revalidate; kullanıcı **eski içeriği** görmeye devam eder, yenisi hazırlanır.

`services` ve `staff` şu an `unstable_cache`'e **girmiyor** — sadece ISR'dan faydalanıyor. Shop adı/profil kadar nadiren değişmedikleri için aynı cache stratejisi uygulanabilir; ama şu an öyle değil (bkz. §12 açık konular).

---

## 3. Web — Client Component fetch katmanı

### 3.1 Bugünkü durum: raw `fetch` + `useState`

`BookingFlow.tsx` slot müsaitliğini şu şekilde yönetiyor:

```ts
// apps/web/src/app/[slug]/BookingFlow.tsx (özet)
const [serverSlots, setServerSlots] = useState<SlotItem[]>([]);
const [isLoadingSlots, setIsLoadingSlots] = useState(false);
const [slotError, setSlotError] = useState<string | null>(null);
const [isClosed, setIsClosed] = useState(false);

const fetchSlots = useCallback(() => {
  if (!selectedService || selectedStaffId === null) return;
  let cancelled = false;
  setIsLoadingSlots(true);
  setSlotError(null);

  const params = new URLSearchParams({
    shop_slug: shop.slug, date: selectedDate,
    service_id: selectedService.id, staff_id: selectedStaffId ?? '',
  });

  fetch(`${SUPABASE_URL}/functions/v1/get-availability?${params}`, {
    headers: { apikey: SUPABASE_ANON_KEY },
  })
    .then(async (res) => { /* json parse */ })
    .then((data) => { if (!cancelled) { setServerSlots(data.slots ?? []); setIsClosed(Boolean(data.closed)); } })
    .catch((err) => { if (!cancelled) setSlotError(err.message); })
    .finally(() => { if (!cancelled) setIsLoadingSlots(false); });

  return () => { cancelled = true; };
}, [selectedService, selectedStaffId, selectedDate, shop.slug]);

// selectedService / selectedStaff / selectedDate değişince otomatik fetch
useEffect(() => { fetchSlots(); }, [fetchSlots]);
```

**Bu pattern'in bugün çalışmasını sağlayan fren:** `cancelled` flag'i race condition'ı önler. Ancak cache yok, arka planda refresh yok, retry yok — her dependency değişiminde sıfırdan fetch.

### 3.2 Hedef: `useQuery` ile slot fetch

TanStack Query entegrasyonu yapılırsa aynı fetch şu hale gelir:

```ts
// Hedef kod — henüz repoda yok
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['availability', shop.slug, staffId, date, serviceId],
  queryFn: () => fetchAvailability({ shopSlug: shop.slug, staffId, date, serviceId }),
  enabled: !!serviceId && staffId !== null,
  staleTime: 0,            // slot verisi anlık — hiç stale kabul etme
  gcTime: 2 * 60 * 1000,  // 2 dk cache'de tut (tab değiştirip geri gelince instant)
  retry: 1,
});
```

Realtime invalidation hook'u (`useRealtimeInvalidation` — bkz. [`06-realtime.md §5`](./06-realtime.md)) `refetch` yerine `queryClient.invalidateQueries` çağırır; TanStack Query otomatik re-fetch yapar.

> **Neden henüz TQ yok?** Web BookingFlow, `'use client'` direktifli tek bir component olarak geliştirildi; `QueryClientProvider` kurulmadı. TQ'yu eklemek için provider wrapper + `QueryClient` instance'ı gerekiyor (bkz. §12).

---

## 4. Mobil — veri çekme katmanı

### 4.1 Bugünkü durum: raw `load()` + useState

Hem staff ajanda hem owner ajanda aynı pattern'i izliyor:

```ts
// apps/mobile/app/(owner)/agenda.tsx (özet)
const [appts, setAppts] = useState<Appointment[]>([]);
const [blocks, setBlocks] = useState<Block[]>([]);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);

const load = useCallback(async () => {
  if (!shopId) return;
  const { start, end } = getDayBoundsUTC(selectedDay, TZ);

  const [{ data: apptList }, { data: blockList }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, staff_id, ..., services(name, duration_min)')
      .in('staff_id', staffIds)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString())
      .not('status', 'eq', 'cancelled'),
    supabase
      .from('blocks')
      .select('id, staff_id, starts_at, ends_at, block_type, note')
      .in('staff_id', staffIds)
      .gte('starts_at', start.toISOString())
      .lt('starts_at', end.toISOString()),
  ]);

  setAppts(apptList ?? []);
  setBlocks(blockList ?? []);
  setLoading(false);
}, [shopId, selectedDay, staffIds]);

useEffect(() => { void load(); }, [load]);
```

Realtime subscription `load()` fonksiyonunu doğrudan çağırıyor — 300 ms debounce ile.

### 4.2 Staff ajandası (M3 ekranı)

Staff kendi `user_id`'sine bağlı tek `staff_id`'yi sorgular. `appointments` RLS `staff.user_id = auth.uid()` ile sınırlanmış.

```ts
// Mobil staff fetch (apps/mobile/app/(app)/index.tsx — sadeleştirilmiş)
supabase
  .from('appointments')
  .select('id, starts_at, ends_at, status, customer_name, ..., services(name)')
  .eq('staff_id', staffId)
  .gte('starts_at', dayStart)
  .lt('starts_at', dayEnd)
  .not('status', 'eq', 'cancelled')
  .order('starts_at')
```

### 4.3 Owner ajandası (O2 ekranı)

Owner, shop'taki tüm staff'ı önce çeker (`.eq('shop_id', shopId)`), ardından `staffIds` listesiyle `.in('staff_id', staffIds)` koşuluyla randevuları alır. RLS owner kısıtlamasını zaten uygular; filter güvenlik için değil performans için.

### 4.4 Hedef: `useQuery` ile mobil fetch

```ts
// Hedef kod — henüz repoda yok
const { data: appointments, isLoading } = useQuery({
  queryKey: ['appointments', staffId, selectedDay],
  queryFn: () => fetchDayAppointments({ staffId, day: selectedDay }),
  staleTime: 30 * 1000,    // 30 s — ajanda sık değişmez
  gcTime: 5 * 60 * 1000,
});

const { data: blocks } = useQuery({
  queryKey: ['blocks', staffId, selectedDay],
  queryFn: () => fetchDayBlocks({ staffId, day: selectedDay }),
  staleTime: 30 * 1000,
});
```

`useFocusEffect` (Expo Router) + background → foreground AppState geçişlerinde `invalidateQueries` tetiklenir (bkz. [`06-realtime.md §7`](./06-realtime.md)).

---

## 5. Query key sözleşmesi (hedef)

TanStack Query'de query key hem **cache kimliği** hem **invalidation filtresi**. Key'ler her zaman **array** olmalı; string key cache çakışmalarına neden olur.

### 5.1 Kural

```
[kaynak, kapsam_1, kapsam_2, ..., parametreler]
```

Daha genel key'ler daha spesifik key'leri kapsar:

```ts
queryClient.invalidateQueries({ queryKey: ['appointments'] })
// → tüm randevu key'lerini invalidate eder

queryClient.invalidateQueries({ queryKey: ['appointments', staffId] })
// → sadece bu staff'ın randevularını invalidate eder

queryClient.invalidateQueries({ queryKey: ['appointments', staffId, '2026-05-14'] })
// → sadece o günü invalidate eder
```

### 5.2 Referans tablosu

| Veri | Key şablonu | staleTime | gcTime |
|---|---|---|---|
| Shop profili | `['shop', slug]` | 60 s | 5 dk |
| Hizmetler | `['services', shopId]` | 60 s | 5 dk |
| Staff listesi | `['staff', shopId]` | 60 s | 5 dk |
| Slot müsaitliği | `['availability', staffId, date, serviceId]` | **0** | 2 dk |
| Staff randevuları | `['appointments', staffId, date]` | 30 s | 5 dk |
| Owner randevuları | `['appointments', shopId, date]` | 30 s | 5 dk |
| Bloklar | `['blocks', staffId, date]` | 30 s | 5 dk |
| Owner KPI özeti | `['kpi', shopId, today]` | 60 s | 10 dk |
| Kazanç raporu | `['earnings', staffId, month]` | 5 dk | 30 dk |

> **`staleTime: 0` neden?** Slot müsaitliği gerçek zamanlı — seçim ekranı açıkken başka bir müşteri aynı slot'u alabilir. TanStack Query `staleTime: 0` ile her focus veya mount'ta refetch yapar; realtime subscription bunu tamamlar.

### 5.3 Key'e parametre eklerken dikkat

`staffId` veya `shopId` **null** olabilir (henüz yüklenmemişse). Key'e `null` girince TQ onu geçerli sayar ve sorgu çalışır — ama backend hata döner. Çözüm: `enabled: !!staffId`.

```ts
useQuery({
  queryKey: ['appointments', staffId, date],
  queryFn: ...,
  enabled: !!staffId,   // staffId null iken sorgu çalışmaz
});
```

---

## 6. Edge Function çağrı deseni

`get-availability` Edge Function'ı standart REST fetch ile çağrılır. TanStack Query'ye taşınınca `queryFn` içine girer:

```ts
// packages/shared/api/availability.ts (önerilen yer)
export async function fetchAvailability(params: {
  shopSlug: string;
  staffId: string | 'any' | null;
  date: string;          // 'YYYY-MM-DD'
  serviceId: string;
}): Promise<AvailabilityResponse> {
  const qs = new URLSearchParams({
    shop_slug: params.shopSlug,
    date: params.date,
    service_id: params.serviceId,
    staff_id: params.staffId ?? '',
  });
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-availability?${qs}`,
    { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'Müsaitlik bilgisi alınamadı.');
  }
  return res.json() as Promise<AvailabilityResponse>;
}
```

Mobil için `NEXT_PUBLIC_` prefix'siz env kullanılır — `EXPO_PUBLIC_SUPABASE_URL`.

> Edge Function response şeması: `{ slots: SlotItem[], closed?: boolean }`. Detay: [`05-edge-functions.md §3`](./05-edge-functions.md).

---

## 7. Mutation → invalidation akışı

Mutation (randevu alma, blok oluşturma, iptal) tamamlanınca ilgili query key'leri invalidate edilir. TanStack Query ile:

```ts
// Örnek: randevu al
const mutation = useMutation({
  mutationFn: bookAppointment,
  onSuccess: () => {
    // Slot grid'i sıfırla — slot artık dolu
    qc.invalidateQueries({ queryKey: ['availability', staffId, date, serviceId] });
    // Ajanda ekranı varsa onu da yenile
    qc.invalidateQueries({ queryKey: ['appointments', staffId, date] });
  },
  onError: (err) => {
    if (err.statusCode === 409) {
      // BOOKING_CONFLICT — slot kapıldı, availability yenile
      qc.invalidateQueries({ queryKey: ['availability'] });
    }
  },
});
```

**Bugünkü durum:** `BookingModal.tsx` mutation sonucunda `onSuccess` ve `onConflict` callback'leri üst component'e iletiyor; üst component `fetchSlots()` çağırıyor. TQ'ya geçince callback'ler kaldırılır, `onSuccess` handler yeter.

---

## 8. Prefetch pattern'leri

### 8.1 Web: Server Component'te prefetch

Server Component'te veri zaten server-side fetch ediliyor ve props olarak geçiyor — bu **gerçek prefetch**. Client Component hydrate olunca ek fetch yapmaz; sadece realtime event'i veya kullanıcı etkileşimi tetikler.

```
Server (Next.js render)                Client (hydrate)
───────────────────────────────────    ────────────────────────
getShopBySlug()  → shop prop          ← prop olarak alır
services fetch() → services prop      ← prop olarak alır
staff fetch()    → staff prop         ← prop olarak alır
                                      fetchSlots() ← kullanıcı tarih seçince
```

TanStack Query'ye geçilirse `dehydrate` + `HydrationBoundary` pattern kullanılabilir:

```ts
// Hedef web — henüz uygulanmamış
// page.tsx (Server Component)
const queryClient = new QueryClient();
await queryClient.prefetchQuery({
  queryKey: ['services', shop.id],
  queryFn: () => fetchServices(shop.id),
});
const dehydratedState = dehydrate(queryClient);

return (
  <HydrationBoundary state={dehydratedState}>
    <BookingFlow shop={shop} />
  </HydrationBoundary>
);
```

Bu sayede Client Component mount'ta ek fetch yapmaz — server cache'i kullanır.

### 8.2 Mobil: tarih scroll prefetch

Kullanıcı tarih scroll ederken bir sonraki günün verisini önceden çekmek:

```ts
// Hedef mobil — henüz uygulanmamış
const qc = useQueryClient();

const prefetchNextDay = (day: string) => {
  qc.prefetchQuery({
    queryKey: ['appointments', staffId, day],
    queryFn: () => fetchDayAppointments({ staffId, day }),
    staleTime: 30 * 1000,
  });
};

// DateStrip bileşeninde görünür tarihten bir gün sonrasını prefetch et
useEffect(() => {
  prefetchNextDay(nextDay(selectedDay));
}, [selectedDay]);
```

---

## 9. Hata yönetimi

### 9.1 Slot yükleme hataları (web)

Bugün `slotError` state'i `SlotGrid`'e `errorMessage` prop olarak geçiyor; grid "Yeniden Dene" butonu gösteriyor. TQ'ya geçince `error` ve `refetch` hook'tan gelir, pattern aynı kalır.

```ts
<SlotGrid
  slots={data?.slots ?? []}
  isLoading={isLoading}
  errorMessage={error?.message ?? null}
  onRetry={refetch}
/>
```

### 9.2 BOOKING_CONFLICT (409)

`BookingModal.tsx`'te `res.status === 409` kontrolü var. Bu durum `useMutation.onError`'a taşınır; `invalidateQueries(['availability'])` çağrısıyla slot grid taze veri ile render edilir.

### 9.3 Network offline

Mobil için `@tanstack/react-query` v5'in `networkMode: 'offlineFirst'` seçeneği offline query'leri cache'den servis eder. Şu an yoksa kullanıcı siyah hata ekranı görüyor — TQ bu durumu ücretsiz çözer.

---

## 10. QueryClient kurulumu (hedef)

TanStack Query her iki platformda da `QueryClientProvider` gerektirir:

```ts
// apps/web/src/app/providers.tsx (oluşturulmalı)
'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: true,
      },
    },
  }));
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// apps/web/src/app/layout.tsx
// <Providers>{children}</Providers> ile sar
```

```ts
// apps/mobile/app/_layout.tsx (eklenecek)
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,  // mobilde AppState ile yapılır
    },
  },
});

// return içinde:
// <QueryClientProvider client={qc}>{/* ... */}</QueryClientProvider>
```

---

## 11. Fetch seçimi: Supabase SDK vs raw fetch

| Durum | Yöntem | Neden |
|---|---|---|
| DB tablosu okuma | `supabase.from(...)` | RLS otomatik, tip güvenli |
| Edge Function çağrısı | `fetch()` veya `supabase.functions.invoke()` | DB client değil; `invoke()` JWT otomatik ekler |
| Server Component DB okuma | `createSupabaseServerClient().from(...)` | Cookie session |
| Server Component public okuma | `createClient(url, anon).from(...)` veya `unstable_cache` | Auth gereksiz, cache için daha temiz |

> `supabase.functions.invoke('get-availability', { body: params })` anonim çağrılarda `apikey` header'ını otomatik ekler — web'deki `fetch()` + `headers: { apikey }` pattern'iyle eşdeğer. Tek fark: `invoke()` POST yapar, `get-availability` GET bekliyor. `fetch()` kalmalı.

---

## 12. Açık konular

- ⚠️ **TanStack Query kurulu değil** — web veya mobilde `QueryClientProvider` yok. Tüm data fetching raw `useState` + `useCallback`. §10'daki kurulum adımları yapılmadan §3.2, §4.4, §8 hedef pattern'leri uygulanamaz.
- ⚠️ **`services` ve `staff` server-side cache'e girmiyor** — `unstable_cache` sadece `shop` profilinde var; `services` + `staff` ISR'dan geliyor ama process-level cache yok. Değişim nadirse `unstable_cache(['services', shopId])` eklenebilir.
- ⚠️ **Web'de `refetchOnWindowFocus` davranışı belirsiz** — TQ olmadığından şu an bu davranış yok. TQ kurulunca default `true`'dur; slot grid'i her sekme değişiminde refetch eder — booking flow için istenen davranış bu, ama ajanda için pahalı olabilir.
- ⚠️ **Mobil'de AppState listener yok** — background → foreground geçişinde global invalidate (`queryClient.invalidateQueries()`) tetiklenmiyor. Kullanıcı uygulamayı arka plana alıp geri dönünce stale veri görebilir. Bkz. [`06-realtime.md §7.4`](./06-realtime.md).
- ⚠️ **`fetchSlots` race condition** — `cancelled` flag pattern bugün çalışıyor ama TQ`dan daha kırılgan. Promise `.finally` içindeki `cancelled` check TQ'nun built-in abort controller'ıyla değiştirilmeli.
- ⚠️ **`packages/shared/api/`** dizini yok — `fetchAvailability` ve benzeri query function'lar web + mobil arasında paylaşılmıyor; her yüz kendi URL kurma mantığını tekrarlıyor. Ortak lib §6'daki şablonla oluşturulmalı.
- 🚧 **Server Component → TQ HydrationBoundary geçişi** — §8.1'deki `dehydrate` + `HydrationBoundary` pattern şu an uygulanmamış. Mevcut prop drilling çalışıyor; TQ kurulunca migrasyon isteğe bağlı.
- ⚠️ **`QueryClient` singleton riski** — Server Component'te `new QueryClient()` render başına yaratılırsa her request'te sıfır cache başlar. `useState` ile client-side singleton veya request-scoped cache context kullanılmalı (§10'da `useState` ile çözüldü).

---

**Sonraki:** [`08-forms.md`](./08-forms.md) — `react-hook-form + zod` pattern, Server Action entegrasyonu, mobil form validasyon.
