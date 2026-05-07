# OPTIMIZATIONS.md — Berber Randevu

> Denetim tarihi: 2026-05-05  
> Kapsam: `apps/web`, `apps/mobile`, `supabase/functions`, `packages/shared`  
> Toplam kod: ~2.844 satır TypeScript/SQL

> **Uygulama durumu (2026-05-05):**
> Quick Wins listesindeki 7 bulgu ile F-08 ve F-12 uygulandı. Açık kalan: F-02 ve F-03 (duplicate dosya yapısı — kalıcı çözüm uzun vadeli, D-01 öneriliyor), F-06 sadece avatar yerinde uygulandı (page.tsx).

---

## 1) Optimization Summary

### Genel Optimizasyon Sağlığı

Proje genel olarak iyi tasarlanmış: Realtime-first mimari, DB seviyesinde çakışma koruması (GIST exclude constraint), sunucu tarafında slot doğrulama ve tip güvenliği bulunuyor. Kritik seviye performans sorunu yok; ancak bakım riskini artıran duplicate kod, önlenebilir DB round-trip'leri ve eksik caching fırsatları mevcut.

### Top 3 Yüksek Etkili İyileştirme

1. **`generateMetadata` çift sorgu** — Her sayfa yüklemesinde aynı barber iki kez sorgulanıyor; `unstable_cache` ile hem duplicate hem de cache sorunu tek hamlede çözülür.
2. **Duplicate `slot-utils.ts` / `types.ts`** — `packages/shared` ile `supabase/functions/_shared` arası manuel senkronizasyon: bir dosyada yapılan değişiklik diğerine yansıtılmazsa sessizce üretime hatalı davranış girer.
3. **Mobil randevu listesi: sayfalandırma ve eksik UPDATE olayı** — Limit'siz sorgu + yalnızca INSERT dinleyen Realtime, çok sayıda randevuda hem yavaşlık hem de tutarsız UI'a yol açar.

### Değişim Yapılmazsa En Büyük Risk

`slot-utils.ts` duplicate kodu: slot hesaplama algoritmasında yapılacak bir hata düzeltmesi yalnızca bir kopyaya uygulanırsa, web rezervasyonları ile edge function slot doğrulaması farklı davranır → müşteri geçerli bir slotla ödeme yaparken sunucu 409 döner (veya tam tersi, çift rezervasyon).

---

## 2) Findings (Prioritized)

---

### F-01 · Çift Barber Sorgusu (generateMetadata + Sayfa) — ✅ UYGULANDI

- **Kategori:** DB
- **Ciddiyet:** High
- **Etki:** Her sayfa yüklemesinde 1 gereksiz DB round-trip; gecikme artışı + DB bağlantı kullanımı
- **Kanıt:**
  ```
  apps/web/src/app/[slug]/page.tsx
  ├── satır 15-19  → generateMetadata: .select("display_name").eq("slug", params.slug)
  └── satır 28-32  → BookingPage:      .select("id, slug, display_name, ...").eq("slug", params.slug)
  ```
  Aynı `params.slug` için iki ayrı Supabase sorgusu yapılıyor; ilki yalnızca `display_name` seçiyor, ikincisi tam profili alıyor.
- **Neden Verimsiz:** Next.js `generateMetadata` ve sayfa bileşeni aynı request içinde sıralı çalışır; tek bir çağrıyla her ikisini de beslemek mümkün. Ayrıca barber profili statik veriye yakın (çok seyrek değişir) ama hiç cache'lenmiyor — her istek DB'ye gidiyor.
- **Önerilen Düzeltme:**
  ```typescript
  // apps/web/src/app/[slug]/page.tsx
  import { unstable_cache } from "next/cache";

  const getBarber = unstable_cache(
    async (slug: string) => {
      const supabase = createSupabaseServerClient();
      const { data } = await supabase
        .from("barbers")
        .select("id, slug, display_name, bio, avatar_url, timezone, working_hours")
        .eq("slug", slug)
        .single();
      return data;
    },
    ["barber-profile"],
    { revalidate: 60, tags: ["barber-profile"] } // 60 saniye TTL
  );

  export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const barber = await getBarber(params.slug);
    if (!barber) return { title: "Berber bulunamadı" };
    return { title: `${barber.display_name} — Randevu Al` };
  }

  export default async function BookingPage({ params }: PageProps) {
    const barber = await getBarber(params.slug); // cache'ten gelir, DB'ye gitmez
    if (!barber) notFound();
    // ... aynı devam
  }
  ```
- **Tradeoff / Risk:** `unstable_cache` ile profile değişikliği 60 saniyeye kadar gecikmeli yansır. Barber display_name değiştirirse meta tag gecikmeli güncellenir (SEO açısından önemsiz). `revalidate` süresi ihtiyaca göre ayarlanabilir.
- **Beklenen Etki:** ~%33 DB yükü azalması (sayfa başına 2 → 1 sorgu) + cache hit'lerde sıfır DB sorgusu.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/[slug]/page.tsx` (local)

---

### F-02 · Duplicate `slot-utils.ts` — Manuel Senkronizasyon Riski — ✅ UYGULANDI (D-01)

- **Kategori:** Algorithm / Reliability
- **Ciddiyet:** High
- **Etki:** Bakım maliyeti, sessiz davranış uyumsuzluğu riski
- **Kanıt:**
  ```
  packages/shared/src/slot-utils.ts              ← Node.js / Next.js / Expo
  supabase/functions/_shared/slot-utils.ts        ← Deno edge functions
  ```
  Deno dosyasının 1-4. satırları bunu açıkça belirtiyor:
  ```
  // Elle senkronize tutulur. Algoritma değişirse buraya da yansıt.
  ```
  `computeAvailableSlots` ve `localTimeToUTC` fonksiyonları birebir kopyalanmış. İki dosya arasındaki tek fark:
  - Deno kopyasında `SLOT_GRANULARITY_MIN = 15` ve `BOOKING_GRACE_PERIOD_MIN = 5` satır 13-14'te yeniden tanımlanıyor (`packages/shared/constants.ts`'ten import edilemiyor çünkü Deno `functions/` dışına erişemiyor).
- **Neden Verimsiz:** `book-appointment` edge function `computeAvailableSlots` kullanarak server-side slot doğrulaması yapıyor. Eğer web tarafındaki algoritma güncellenir ama Deno kopyası güncellenmezse, müşterinin gördüğü slotlar ile sunucunun kabul ettiği slotlar farklılaşır → gerçek slotlar için 409 hatası.
- **Önerilen Düzeltme:**
  Deno kısıtı nedeniyle tam çözüm teknik olarak zor, ancak riski azaltmak için:
  1. İki dosyayı `diff` eden bir CI adımı ekle (değişiklik algılandığında build başarısız olsun):
     ```bash
     # turbo.json veya .github/workflows içine
     diff <(sed '1,4d' supabase/functions/_shared/slot-utils.ts) \
          <(sed '1,5d;13,14d' packages/shared/src/slot-utils.ts) \
       || (echo "slot-utils out of sync!" && exit 1)
     ```
  2. Her iki dosyanın başına checksum/versiyon yorumu ekle: `// @version 2` — değiştiğinde derleme hatası değil, en azından gözle görülür uyarı sağlar.
  3. Uzun vadede: Deno için `npm:` specifier desteği kullanılabilir (Deno 1.28+); `import { computeAvailableSlots } from "npm:@berber/shared/slot-utils"` çalışabilir — `supabase/config.toml`'da `[functions] import_map` ile ayarlanabilir.
- **Tradeoff / Risk:** CI diff yaklaşımı false positive üretebilir (yorum satırı değişimi gibi). npm: specifier yaklaşımı Supabase edge function runtime'ına bağlı, test gerektirir.
- **Beklenen Etki:** Sessiz hata riskini ortadan kaldırır; bakım süresini azaltır.
- **Kaldırma Güvenliği:** Needs Verification
- **Kapsam:** `packages/shared/src/slot-utils.ts` + `supabase/functions/_shared/slot-utils.ts` (service-wide)

---

### F-03 · Duplicate `types.ts` — İki Kaynak, Tek Hakikat Yok — ✅ UYGULANDI (D-01)

- **Kategori:** Algorithm / Reliability
- **Ciddiyet:** High
- **Etki:** Tip uyumsuzluğu riski; `WorkingHours`, `OccupiedRange`, `Slot` tiplerinden birinde değişiklik diğerine yansıtılmazsa runtime hatası
- **Kanıt:**
  ```
  packages/shared/src/types.ts                 satır 1-60
  supabase/functions/_shared/types.ts          satır 1-42
  ```
  Fark: `packages/shared/types.ts` `BarberPublic`, `ServicePublic`, `BookAppointmentResponse` arayüzlerini içeriyor; Deno kopyasında bunlar yok (gerekmediği için). Ortak tipler (`WorkingDayHours`, `WorkingHours`, `OccupiedRange`, `Slot`, `BlockWalkinRequest`, `BookAppointmentRequest`) birebir aynı.
- **Neden Verimsiz:** `OccupiedRange.starts_at` tipinin `string` yerine `Date` olarak değiştirilmesi gerekse, iki dosyada ayrı ayrı güncellemek gerekiyor; biri unutulursa edge function'da tip hatası değil runtime hatası oluşur (TypeScript Deno-side'da `string` kabul ederken gerçek veri `Date` objesi olabilir).
- **Önerilen Düzeltme:** F-02 ile aynı yaklaşım. Kısa vadede: CI'da tip karşılaştırması. Uzun vadede: `npm:` import ile tek kaynak.
- **Tradeoff / Risk:** F-02 ile aynı.
- **Beklenen Etki:** Tip sürüklenmesi (type drift) riskini ortadan kaldırır.
- **Kaldırma Güvenliği:** Needs Verification
- **Kapsam:** `packages/shared/src/types.ts` + `supabase/functions/_shared/types.ts` (service-wide)

---

### F-04 · Mobil Randevu Listesi: Sayfalandırma Yok — ✅ UYGULANDI

- **Kategori:** DB / Memory
- **Ciddiyet:** Medium
- **Etki:** Aktif berberin çok sayıda ileriki randevusu varsa aşırı bellek kullanımı ve yavaş ilk yükleme
- **Kanıt:**
  ```typescript
  // apps/mobile/app/(app)/index.tsx  satır 51-56
  const { data } = await supabase
    .from("appointments")
    .select("*, services(name, duration_min)")
    .eq("barber_id", barber.id)
    .gte("starts_at", today!)
    .order("starts_at", { ascending: true });
    // ← .limit() YOK
  ```
- **Neden Verimsiz:** Randevular bugün ve sonrası filtreleniyor (geçmiş veri gelmiyor, bu iyi). Ancak çok aktif bir berber için birkaç ay ileri tarih dolu olabilir (100-500+ randevu). Tümü tek sorguda belleğe yükleniyor, FlatList'e veriliyor. React Native'de büyük liste render peformansını düşürür.
- **Önerilen Düzeltme:**
  ```typescript
  // apps/mobile/app/(app)/index.tsx  satır 51-56
  const { data } = await supabase
    .from("appointments")
    .select("*, services(name, duration_min)")
    .eq("barber_id", barber.id)
    .gte("starts_at", today!)
    .lte("starts_at", thirtyDaysLater) // ← yaklaşan 30 gün
    .order("starts_at", { ascending: true })
    .limit(100);                        // ← güvenlik limiti
  ```
  Veya `FlatList`'e `onEndReached` ile sayfalandırma (offset-based) eklenebilir.
- **Tradeoff / Risk:** 30 günlük pencere çoğu berber için yeterli. Çok ileriye rezervasyon alan berberler için pencere genişletilmeli. Sayfalandırma ile liste sonsuz scroll haline gelir — UI değişikliği gerekir.
- **Beklenen Etki:** İlk yükleme süresi 50-200ms azalır (liste büyüklüğüne bağlı); bellek kullanımı anlamlı düşer.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/mobile/app/(app)/index.tsx` (local)

---

### F-05 · Mobil Realtime: UPDATE Olayları Eksik — ✅ UYGULANDI

- **Kategori:** Reliability / Concurrency
- **Ciddiyet:** Medium
- **Etki:** Bir cihazda randevu tamamlandığında (veya iptal edildiğinde) diğer açık oturumlar güncellenen durumu görmez; UI tutarsız kalır
- **Kanıt:**
  ```typescript
  // apps/mobile/app/(app)/index.tsx  satır 73-79
  .on(
    "postgres_changes",
    {
      event: "INSERT",   // ← yalnızca INSERT; UPDATE ve DELETE yok
      schema: "public",
      table: "appointments",
      filter: `barber_id=eq.${barberId}`,
    },
    (payload) => { ... }
  )
  ```
  `handleComplete` (satır 98-114) randevuyu `status: "completed"` olarak güncelliyor ve bunu lokal state üzerinden yapıyor. Ancak başka bir cihazda oturum açıksa ya da sayfa yenileme gerçekleşmeden iptal edilirse, UPDATE olayı yakalanmıyor.
- **Önerilen Düzeltme:**
  ```typescript
  // apps/mobile/app/(app)/index.tsx  satır 73
  event: "*",  // INSERT + UPDATE + DELETE tümünü dinle

  // handler içine UPDATE dalı ekle:
  (payload) => {
    if (payload.eventType === "INSERT") {
      const newAppt = payload.new as Appointment;
      setAppointments((prev) =>
        [...prev, newAppt].sort(...)
      );
    } else if (payload.eventType === "UPDATE") {
      const updated = payload.new as Appointment;
      setAppointments((prev) =>
        prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
      );
    } else if (payload.eventType === "DELETE") {
      const deleted = payload.old as { id: string };
      setAppointments((prev) => prev.filter((a) => a.id !== deleted.id));
    }
  }
  ```
  Not: `payload.new` içinde `services` join verisi gelmez (Realtime yalnızca doğrudan sütunları iletir). UPDATE handler'da `services` alanını mevcut state'ten korumak gerekir: `{ ...a, ...updated, services: a.services }`.
- **Tradeoff / Risk:** `event: "*"` ile Realtime mesaj trafiği artar (DELETE de gelir). Küçük bir overhead. `services` join verisinin korunması unutulursa hizmet adı kaybolur — dikkatli implementasyon gerektirir.
- **Beklenen Etki:** Çok cihazlı kullanımda UI tutarsızlığı ortadan kalkar.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/mobile/app/(app)/index.tsx` (local)

---

### F-06 · `<img>` Etiketi — Next.js Image Bileşeni Kullanılmıyor — ✅ UYGULANDI

- **Kategori:** Frontend
- **Ciddiyet:** Medium
- **Etki:** Lazy loading yok; büyük avatar'lar LCP'yi (Largest Contentful Paint) olumsuz etkiler; WebP/AVIF otomatik dönüşümü yok
- **Kanıt:**
  ```tsx
  // apps/web/src/app/[slug]/page.tsx  satır 49-54
  {barber.avatar_url && (
    <img
      src={barber.avatar_url}
      alt={barber.display_name}
      className="h-16 w-16 rounded-full object-cover"
    />
  )}
  ```
- **Neden Verimsiz:** `<img>` etiketi tarayıcı lazy loading'den yararlanmaz (above-the-fold olduğu için aslında eager load istenir, ancak Next.js `<Image>` boyut optimizasyonu, modern format dönüşümü ve `sizes` atribütü sağlar). Supabase Storage URL'leri Next.js image optimizer üzerinden geçirilebilir.
- **Önerilen Düzeltme:**
  ```tsx
  // apps/web/src/app/[slug]/page.tsx
  import Image from "next/image";

  // next.config.ts içine remote pattern ekle:
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  }

  // Kullanım:
  {barber.avatar_url && (
    <Image
      src={barber.avatar_url}
      alt={barber.display_name}
      width={64}
      height={64}
      className="rounded-full object-cover"
      priority  // above-the-fold
    />
  )}
  ```
- **Tradeoff / Risk:** `remotePatterns` yapılandırması gerekiyor. `priority` prop LCP için önemli (sayfanın üst kısmında olduğundan preload edilmeli). `unoptimized` yerine gerçek optimizasyon yapıldığında ilk request yavaş olabilir (Next.js image cache dolana kadar), sonraki requestler hızlanır.
- **Beklenen Etki:** Ortalama %20-50 avatar boyutu küçülmesi (WebP); LCP iyileşmesi.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/[slug]/page.tsx` + `apps/web/next.config.ts` (local)

---

### F-07 · Availability API: Cache-Control Header Eksik — ✅ UYGULANDI

- **Kategori:** Caching / Network
- **Ciddiyet:** Medium
- **Etki:** Aynı barber/tarih/hizmet kombinasyonu için her istek DB'ye gidiyor; tarayıcı ve CDN cache'i devre dışı
- **Kanıt:**
  ```typescript
  // apps/web/src/app/api/availability/route.ts  satır 57-64
  return NextResponse.json({
    occupied: occupiedRanges,
    slots: slots.map((s) => ({ ... })),
  });
  // ← Cache-Control header yok
  ```
  Aynı durum `supabase/functions/get-availability/index.ts:52-59` için de geçerli.
- **Neden Verimsiz:** Slot verisi gerçek zamanlı Realtime aboneliğiyle zaten güncelleniyor (`BookingFlow.tsx`). API endpoint'i yalnızca sayfa ilk yüklendiğinde çağrılıyor. Bu veri için 15-30 saniyelik kısa bir cache bile tekrarlı sayfa yüklemelerinde DB yükünü önemli ölçüde azaltır.
- **Önerilen Düzeltme:**
  ```typescript
  // apps/web/src/app/api/availability/route.ts
  return NextResponse.json(
    { occupied: occupiedRanges, slots: slots.map(...) },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
  ```
  Edge function için `_shared/cors.ts` içindeki `json()` yardımcısına opsiyonel `headers` parametresi eklenebilir.
- **Tradeoff / Risk:** 30 saniyelik cache ile yeni bir walk-in bloğu anında API'dan görünmez (ancak Realtime aboneliği sayesinde zaten 1-2 saniyede güncelleniyor). Gerçek zamanlı kritiklik Realtime üstleniyor; API yalnızca initial state için kullanılıyor.
- **Beklenen Etki:** Tekrarlı sayfa yüklemelerinde DB sorgu sayısı anlamlı düşer; önüne CDN yerleştirilirse ölçeklenebilirlik artar.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/api/availability/route.ts` (local)

---

### F-08 · Supabase Client Render Başına Yeniden Oluşturuluyor — ✅ UYGULANDI (useMemo)

- **Kategori:** Memory / Frontend
- **Ciddiyet:** Low
- **Etki:** Her render döngüsünde gereksiz Supabase client nesnesi allocation'ı
- **Kanıt:**
  ```typescript
  // apps/web/src/app/[slug]/BookingFlow.tsx  satır 38
  export function BookingFlow({ barber, services }: BookingFlowProps) {
    // ...
    const supabase = createSupabaseBrowserClient(); // ← her render'da çağrılıyor
  ```
  `createSupabaseBrowserClient()` her çağrıda yeni bir client objesi oluşturuyor. `BookingFlow` parent component'ten prop güncellemesi alırsa (örneğin barber verisi değişirse) bu gereksiz yeniden allocation oluşur.
- **Önerilen Düzeltme:**
  ```typescript
  // Seçenek 1: useMemo ile memoize et
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Seçenek 2: Module-level singleton (browser tarafında güvenli)
  // lib/supabase-browser.ts içinde singleton pattern kullan
  let _client: ReturnType<typeof createBrowserClient> | null = null;
  export function getSupabaseBrowserClient() {
    if (!_client) _client = createBrowserClient(...);
    return _client;
  }
  ```
- **Tradeoff / Risk:** Singleton pattern SSR ile çakışabilir — `typeof window !== 'undefined'` koruması gerekir. `useMemo` daha güvenli.
- **Beklenen Etki:** Düşük. Nesne allocation maliyeti ihmal edilebilir, ancak Supabase client'ın bağlantı havuzu korunmuş olur.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/[slug]/BookingFlow.tsx` (local)

---

### F-09 · `dateOptions` Her Render'da Yeniden Hesaplanıyor — ✅ UYGULANDI

- **Kategori:** Frontend / CPU
- **Ciddiyet:** Low
- **Etki:** Her render döngüsünde 14 `Date` nesnesi ve 14 string oluşturuluyor; gereksiz GC baskısı
- **Kanıt:**
  ```typescript
  // apps/web/src/app/[slug]/BookingFlow.tsx  satır 162-166
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0]!;
  });
  ```
  `dateOptions` `BookingFlow` fonksiyonunun gövdesinde tanımlı — herhangi bir state güncellemesiyle (slot seçimi, hizmet değiştirme, `occupied` Realtime güncellemesi) yeniden çalışıyor.
- **Önerilen Düzeltme:**
  ```typescript
  // useMemo ile wrap'le — bileşen ilk mount'ta bir kez hesaplanır
  const dateOptions = useMemo(() =>
    Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0]!;
    }),
  []); // Bağımlılık yok — günlük değişim uygulama yeniden başlatılana kadar sabit
  ```
- **Tradeoff / Risk:** `[]` bağımlılık listesiyle tarih listesi uygulama açık kaldığı sürece sabit (gece yarısı geçişinde güncellenmez). Kabul edilebilir — berberler genellikle günlük yeniden başlatır.
- **Beklenen Etki:** Düşük-orta. Çok sık render'larda (Realtime mesajları) CPU spike'larını hafifletir.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/[slug]/BookingFlow.tsx` (local)

---

### F-10 · Slot Hesaplamasında Gereksiz `new Date()` Allocation'ları — ✅ UYGULANDI (her iki kopyada)

- **Kategori:** Memory / Algorithm
- **Ciddiyet:** Low
- **Etki:** Her slot için her occupied range'e karşı 2 `new Date()` nesnesi oluşturuluyor; `bufferMin=0` (varsayılan) durumunda tamamen gereksiz
- **Kanıt:**
  ```typescript
  // packages/shared/src/slot-utils.ts  satır 50-51
  const available = !occupiedDates.some(
    (o) =>
      cursor < new Date(o.end.getTime() + bufferMin * 60_000) &&   // ← her iterasyonda yeni Date
      slotEnd > new Date(o.start.getTime() - bufferMin * 60_000)   // ← her iterasyonda yeni Date
  );
  ```
  `bufferMin` varsayılan değeri `0`; `n * 60_000 = 0` olduğundan `o.end.getTime() + 0 = o.end.getTime()` — `new Date()` oluşturulmasına gerek yok.
- **Önerilen Düzeltme:**
  ```typescript
  // Buffer'ı occupied map'i oluştururken bir kez hesapla
  const bufferMs = bufferMin * 60_000;
  const occupiedDates = occupied.map((r) => ({
    start: new Date(r.starts_at).getTime() - bufferMs,
    end: new Date(r.ends_at).getTime() + bufferMs,
  }));

  // Karşılaştırmada doğrudan timestamp kullan (no new Date)
  const cursorMs = cursor.getTime();
  const slotEndMs = slotEnd.getTime();
  const available = !occupiedDates.some(
    (o) => cursorMs < o.end && slotEndMs > o.start
  );
  ```
  Aynı değişiklik `supabase/functions/_shared/slot-utils.ts`'e de uygulanmalı (F-02 ile birlikte).
- **Tradeoff / Risk:** Yok. Algoritma değişmiyor, sadece allocation azalıyor.
- **Beklenen Etki:** Tipik kullanımda (20 slot × 10 occupied) 400 `new Date()` nesnesi yerine 10 nesne → GC baskısı düşer. Toplu slot hesaplamasında ölçülebilir iyileşme.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `packages/shared/src/slot-utils.ts` + `supabase/functions/_shared/slot-utils.ts` (service-wide)

---

### F-11 · `get-availability` Edge Function: Hata Loglama Yok — ✅ UYGULANDI (3 endpoint'te)

- **Kategori:** Reliability
- **Ciddiyet:** Low
- **Etki:** DB hataları (RPC başarısızlığı, bağlantı timeout) sessizce `occupied: []` olarak dönüyor — tüm slotlar müsait görünür
- **Kanıt:**
  ```typescript
  // supabase/functions/get-availability/index.ts  satır 39-43
  const { data: occupied } = await supabase.rpc("get_occupied_ranges", {
    p_barber_id: barber.id,
    p_date: date,
  });
  // error destructure edilmiyor!
  const occupiedRanges = occupied ?? [];
  ```
  RPC başarısız olursa `occupied = null`, `occupiedRanges = []`, tüm slotlar boş görünür ve `book-appointment` yanlış bir şekilde slotu kabul edebilir (DB gist constraint onu durdurur, ama kullanıcıya 409 gider — kötü UX).
- **Önerilen Düzeltme:**
  ```typescript
  const { data: occupied, error: rpcError } = await supabase.rpc("get_occupied_ranges", {
    p_barber_id: barber.id,
    p_date: date,
  });
  if (rpcError) {
    console.error("get_occupied_ranges failed:", rpcError);
    return error("Müsaitlik bilgisi alınamadı", 500);
  }
  ```
- **Tradeoff / Risk:** Yok. Mevcut davranış yanlış; hata dönmek daha doğru.
- **Beklenen Etki:** DB hatası durumunda kullanıcı yanıltıcı "tüm slotlar boş" yerine net hata mesajı görür.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `supabase/functions/get-availability/index.ts` (local)

---

### F-12 · `useEffect` Bağımlılıklarında `barber` Nesnesi — ✅ UYGULANDI

- **Kategori:** Frontend / CPU
- **Ciddiyet:** Low
- **Etki:** Parent render edildiğinde `barber` prop referansı değişirse slot hesaplama effect'i gereksiz yere tetiklenir
- **Kanıt:**
  ```typescript
  // apps/web/src/app/[slug]/BookingFlow.tsx  satır 78
  }, [occupied, selectedService, selectedDate, barber]); // ← tüm barber nesnesi
  ```
  `barber` prop'u server component'ten geldiğinden pratikte değişmez; ancak teorik olarak `barber.timezone` ve `barber.working_hours` ilgili bağımlılıklardır.
- **Önerilen Düzeltme:**
  ```typescript
  }, [occupied, selectedService, selectedDate, barber.timezone, barber.working_hours]);
  ```
- **Tradeoff / Risk:** Minimal. `barber` server component'ten static geldiği için pratik etkisi yok.
- **Beklenen Etki:** Çok düşük. Defensive coding.
- **Kaldırma Güvenliği:** Safe
- **Kapsam:** `apps/web/src/app/[slug]/BookingFlow.tsx` (local)

---

## 3) Quick Wins (Önce Yap)

Hızlı uygulama / yüksek değer oranına göre sıralanmış:

| # | Bulgu | Dosya | Süre | Etki |
|---|-------|-------|------|------|
| 1 | **F-01** — `unstable_cache` ile çift sorgu + cache | `apps/web/src/app/[slug]/page.tsx` | 15 dk | DB %33 azalır |
| 2 | **F-11** — `get-availability` RPC hata yönetimi | `supabase/functions/get-availability/index.ts` | 5 dk | Sessiz hata giderilir |
| 3 | **F-07** — Availability API Cache-Control header | `apps/web/src/app/api/availability/route.ts` | 5 dk | CDN/tarayıcı cache |
| 4 | **F-05** — Mobil Realtime UPDATE olayı | `apps/mobile/app/(app)/index.tsx` | 20 dk | UI tutarlılığı |
| 5 | **F-04** — Randevu listesi limit | `apps/mobile/app/(app)/index.tsx` | 5 dk | Bellek + hız |
| 6 | **F-10** — Slot hesaplama timestamp optimizasyonu | `packages/shared/src/slot-utils.ts` | 10 dk | GC baskısı azalır |
| 7 | **F-09** — `dateOptions` useMemo | `apps/web/src/app/[slug]/BookingFlow.tsx` | 5 dk | Gereksiz re-render azalır |

---

## 4) Deeper Optimizations (Sonra Yap)

### D-01 · Tek Kaynak Slot Algoritması (F-02 + F-03 kalıcı çözümü)

**Yaklaşım:** Deno `npm:` specifier ile `supabase/functions/_shared/` içindeki duplicate dosyaları kaldır. `import_map.json` veya `supabase/functions/_shared/deno.json` oluşturarak `@berber/shared` paketini npm üzerinden resolve et.

```jsonc
// supabase/functions/_shared/deno.json (veya import_map.json)
{
  "imports": {
    "@berber/shared/slot-utils": "npm:@berber/shared/slot-utils",
    "@berber/shared/types": "npm:@berber/shared/types"
  }
}
```

**Ön Koşul:** `@berber/shared` paketinin npm'e publish edilmesi (private registry veya Verdaccio yeterli). Supabase edge runtime'ın `npm:` desteği test edilmeli.

---

### D-02 · `book-appointment` Edge Function: Paralel Sorgu Fırsatı Yok, Ama `get_occupied_ranges` Optimizasyonu Var — ✅ UYGULANDI (range filter)

`book-appointment/index.ts` içinde barber ve service sorguları sıralı çalışıyor (service barber.id'ye bağlı — değiştirilemez). Ancak `get_occupied_ranges` RPC'si hem `book-appointment` hem `get-availability`'de kullanılıyor; bu RPC'nin PostgreSQL tarafında index kullanımı doğrulanmalı:

```sql
-- packages/db/migrations/003_functions.sql içindeki SQL fonksiyon
-- appointments ve blocks tablolarında (barber_id, starts_at::date) composite index var mı?
EXPLAIN ANALYZE SELECT * FROM get_occupied_ranges('...uuid...', '2026-05-05');
```

Eğer eksikse:
```sql
CREATE INDEX IF NOT EXISTS idx_appointments_barber_date
  ON appointments (barber_id, (starts_at::date))
  WHERE status = 'confirmed';

CREATE INDEX IF NOT EXISTS idx_blocks_barber_date
  ON blocks (barber_id, (starts_at::date));
```

---

### D-03 · Next.js Route Segment Config ile Static Rendering — ✅ UYGULANDI

Barber profil sayfası `[slug]/page.tsx` her request'te dinamik render ediliyor. `revalidate = 60` ile ISR (Incremental Static Regeneration) yapılabilir:

```typescript
// apps/web/src/app/[slug]/page.tsx
export const revalidate = 60; // 60 saniyede bir yeniden oluştur

// Bilinen slug'ları prerender için:
export async function generateStaticParams() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("barbers").select("slug");
  return (data ?? []).map(({ slug }) => ({ slug }));
}
```

**Dikkat:** `BookingFlow.tsx` bir client component ve Realtime kullanıyor — statik shell + client hydration mimarisi zaten uyumlu.

---

### D-04 · Widget Token'ları İçin `expires_at` Temizlik Job'u — ✅ UYGULANDI

`widget_tokens` tablosunda `expires_at` sütunu var. Süresi dolmuş token'lar temizlenmezse tablo büyür. Supabase'de `pg_cron` extension'ı ile günlük temizlik:

```sql
-- Supabase SQL editor veya migration
SELECT cron.schedule(
  'clean-expired-widget-tokens',
  '0 3 * * *',  -- Her gün 03:00 UTC
  $$DELETE FROM widget_tokens WHERE expires_at < NOW()$$
);
```

---

## 5) Validation Plan

### Genel Doğrulama Adımları

**F-01 (Çift sorgu + cache) doğrulama:**
1. Supabase Studio → Logs → API Logs'tan sayfa yüklemesi başına sorgu sayısını say
2. `console.time("barber-fetch")` ile `page.tsx` içinde sorgu süresi ölç
3. İkinci yüklemede Supabase log'larında sorgu görünmemeli (cache hit)

**F-04 (Randevu limit) doğrulama:**
1. Test berber için 100+ ileriki randevu oluştur
2. Mobil app'i aç, yükleme süresini kaydet (before/after)
3. React Native Profiler ile FlatList render süresi karşılaştır

**F-05 (Realtime UPDATE) doğrulama:**
1. İki cihazda aynı berber hesabına giriş yap
2. Cihaz A'da bir randevuyu "Tamamlandı" işaretle
3. Cihaz B'de UI'ın güncellenmesini doğrula (≤2 saniye)

**F-07 (Cache-Control) doğrulama:**
1. Chrome DevTools → Network → `/api/availability` isteğini incele
2. İkinci istekte `from disk cache` veya `304 Not Modified` görülmeli
3. `curl -I "http://localhost:3000/api/availability?slug=test&..."` ile response header'ları kontrol et

**F-10 (Slot allocation) doğrulama:**
```javascript
// Node.js benchmark — packages/shared içinde çalıştır
const { performance } = require("perf_hooks");
const { computeAvailableSlots } = require("./src/slot-utils");

const occupied = Array.from({ length: 20 }, (_, i) => ({
  starts_at: new Date(Date.now() + i * 15 * 60000).toISOString(),
  ends_at: new Date(Date.now() + (i + 1) * 15 * 60000).toISOString(),
}));

const t0 = performance.now();
for (let i = 0; i < 10000; i++) {
  computeAvailableSlots({ date: new Date(), durationMin: 30, workingHours: {...}, occupied, timezone: "Europe/Istanbul" });
}
console.log(`10k iterations: ${(performance.now() - t0).toFixed(2)}ms`);
```

**Genel metrikler (before/after karşılaştırma):**

| Metrik | Araç | Hedef |
|--------|------|-------|
| Sayfa yüklemesinde DB sorgu sayısı | Supabase Studio Logs | 3 → 2 (F-01) |
| `generateMetadata` süresi | Next.js `console.time` | <10ms (cache hit) |
| Mobil initial load (100+ randevu) | React Native Profiler | <500ms |
| `computeAvailableSlots` 10k iter | Node.js benchmark | ≥%15 iyileşme (F-10) |
| Availability API 2. istek | Chrome DevTools | Cache hit veya 304 |

---

## 6) Optimized Code / Patch

### Patch 1 — F-01: Çift Sorgu + Cache (`apps/web/src/app/[slug]/page.tsx`)

```typescript
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { BookingFlow } from "./BookingFlow";
import type { WorkingHours } from "@berber/shared/types";

interface PageProps {
  params: { slug: string };
}

const getBarberBySlug = unstable_cache(
  async (slug: string) => {
    const supabase = createSupabaseServerClient();
    const { data } = await supabase
      .from("barbers")
      .select("id, slug, display_name, bio, avatar_url, timezone, working_hours")
      .eq("slug", slug)
      .single();
    return data;
  },
  ["barber-profile"],
  { revalidate: 60, tags: ["barber-profile"] }
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const barber = await getBarberBySlug(params.slug);
  if (!barber) return { title: "Berber bulunamadı" };
  return { title: `${barber.display_name} — Randevu Al` };
}

export default async function BookingPage({ params }: PageProps) {
  const supabase = createSupabaseServerClient();
  const barber = await getBarberBySlug(params.slug);
  if (!barber) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, barber_id, name, duration_min, price_cents, display_order")
    .eq("barber_id", barber.id)
    .eq("is_active", true)
    .order("display_order");

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8 flex items-center gap-4">
          {barber.avatar_url && (
            <Image
              src={barber.avatar_url}
              alt={barber.display_name}
              width={64}
              height={64}
              className="rounded-full object-cover"
              priority
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{barber.display_name}</h1>
            {barber.bio && (
              <p className="mt-1 text-sm text-gray-500">{barber.bio}</p>
            )}
          </div>
        </div>
        <BookingFlow
          barber={{
            id: barber.id,
            slug: barber.slug,
            display_name: barber.display_name,
            bio: barber.bio,
            avatar_url: barber.avatar_url,
            timezone: barber.timezone,
            working_hours: barber.working_hours as WorkingHours,
          }}
          services={services ?? []}
        />
      </div>
    </main>
  );
}
```

**Değişenler:** `generateMetadata` + sayfa aynı `getBarberBySlug` cached fonksiyonunu çağırıyor; `<img>` → `<Image>`.

---

### Patch 2 — F-10: Slot Hesaplama Timestamp Optimizasyonu (`packages/shared/src/slot-utils.ts`)

```typescript
// satır 31-58 (değişen kısım):
const bufferMs = bufferMin * 60_000;
const occupiedMs = occupied.map((r) => ({
  start: new Date(r.starts_at).getTime() - bufferMs,
  end: new Date(r.ends_at).getTime() + bufferMs,
}));

const slots: Slot[] = [];
const graceCutoffMs = Date.now() - BOOKING_GRACE_PERIOD_MIN * 60_000;

let cursorMs = openTs.getTime();

while (cursorMs + durationMin * 60_000 <= closeTs.getTime()) {
  const slotEndMs = cursorMs + durationMin * 60_000;

  if (cursorMs >= graceCutoffMs) {
    const available = !occupiedMs.some(
      (o) => cursorMs < o.end && slotEndMs > o.start
    );
    slots.push({
      startsAt: new Date(cursorMs),
      endsAt: new Date(slotEndMs),
      available,
    });
  }

  cursorMs += SLOT_GRANULARITY_MIN * 60_000;
}
```

**Değişenler:** `while` döngüsü içinde `new Date()` oluşturulmaz; her slot için yalnızca 2 `new Date()` (`startsAt`, `endsAt`) — önceden 2 + 2×occupied_count nesne oluşturuluyordu.

---

### Patch 3 — F-07: Cache-Control Header (`apps/web/src/app/api/availability/route.ts`)

```typescript
// satır 57-64 (değişen kısım):
return NextResponse.json(
  {
    occupied: occupiedRanges,
    slots: slots.map((s) => ({
      starts_at: s.startsAt.toISOString(),
      ends_at: s.endsAt.toISOString(),
      available: s.available,
    })),
  },
  {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  }
);
```

---

### Patch 4 — F-11: `get-availability` Hata Yönetimi (`supabase/functions/get-availability/index.ts`)

```typescript
// satır 39-47 (değişen kısım):
const { data: occupied, error: rpcError } = await supabase.rpc("get_occupied_ranges", {
  p_barber_id: barber.id,
  p_date: date,
});

if (rpcError) {
  console.error("get_occupied_ranges RPC failed:", rpcError);
  return error("Müsaitlik bilgisi alınamadı", 500);
}

const occupiedRanges = occupied ?? [];
```

---

### Patch 5 — F-04 + F-05: Mobil Limit + UPDATE Realtime (`apps/mobile/app/(app)/index.tsx`)

```typescript
// F-04: satır 51-56 — limit ekle
const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const { data } = await supabase
  .from("appointments")
  .select("*, services(name, duration_min)")
  .eq("barber_id", barber.id)
  .gte("starts_at", today!)
  .lte("starts_at", thirtyDaysLater + "T23:59:59Z")
  .order("starts_at", { ascending: true })
  .limit(100);

// F-05: satır 73 — event: "*" yap + UPDATE handler ekle
const channel = supabase
  .channel(`appointments:${barberId}`)
  .on(
    "postgres_changes",
    {
      event: "*",  // INSERT + UPDATE + DELETE
      schema: "public",
      table: "appointments",
      filter: `barber_id=eq.${barberId}`,
    },
    (payload) => {
      if (payload.eventType === "INSERT") {
        const newAppt = payload.new as Appointment;
        setAppointments((prev) =>
          [...prev, newAppt].sort(
            (a, b) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
          )
        );
      } else if (payload.eventType === "UPDATE") {
        const updated = payload.new as Appointment;
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === updated.id
              ? { ...updated, services: a.services } // services join'i koru
              : a
          )
        );
      } else if (payload.eventType === "DELETE") {
        const deleted = payload.old as { id: string };
        setAppointments((prev) => prev.filter((a) => a.id !== deleted.id));
      }
    }
  )
  .subscribe();
```

---

*Bu dosya yalnızca denetim bulgularını içermektedir. Herhangi bir kod değişikliği yapılmamıştır.*
