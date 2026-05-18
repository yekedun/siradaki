# 06 — Realtime

> 4 tablo `supabase_realtime` publication'ında. Subscription pattern (web + mobil), filter kuralları, TanStack Query invalidation, connection lifecycle.

Önceki: [`05-edge-functions.md`](./05-edge-functions.md) · Sonraki: [`07-data-fetching.md`](./07-data-fetching.md)

---

## 1. Genel patern

Sıradaki, Supabase Realtime'ı **`postgres_changes`** kanalı üzerinden kullanıyor — broadcast/presence değil. Postgres'in logical replication slot'undan akan INSERT/UPDATE/DELETE event'leri WebSocket üzerinden client'a düşer; client tarafı **payload'a güvenmez**, sadece **invalidation tetikleyicisi** olarak kullanır.

```
Postgres logical replication
        │
        │  appointments / appointment_slots / blocks / block_slots
        │  (publication: supabase_realtime)
        ▼
┌──────────────────────────┐
│  Supabase Realtime gateway│
│  (WebSocket)              │
└──────────┬───────────────┘
           │
           ├──→ Web (anon)        → slot_grid invalidate
           ├──→ Mobil staff (jwt) → agenda invalidate
           └──→ Mobil owner (jwt) → tüm shop invalidate
```

> Tasarım kararı: **payload'tan UI güncellenmez.** Event geldi → ilgili TanStack Query key'i `invalidateQueries` ile geçersiz işaretlenir → otomatik refetch çalışır. Sebep: payload'da PII (customer_name, phone) appointment_slots'a düşmüyor; ayrıca UI state'i her zaman canonical fetch sonucuyla eşitli tutmak daha güvenli.

---

## 2. Publication — 4 tablo

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.appointments,
  public.appointment_slots,
  public.blocks,
  public.block_slots;
```

| Tablo | Kim abone olabilir | Niye |
|---|---|---|
| `appointments` | authenticated (RLS gereği staff/owner) | Mobil ajanda — PII'li tam satır |
| `appointment_slots` | **anon + authenticated** | Web booking flow — slim mirror, public read |
| `blocks` | authenticated | Mobil — walkin/break/personal blokları |
| `block_slots` | **anon + authenticated** | Web booking flow — public mirror |

**Realtime'a girmeyen tablolar:** `staff`, `services`, `shops`, `staff_schedules`, `widget_tokens`, `customer_profiles`. Bu tablolar değişince **UI manuel refetch** etmeli — örneğin owner ekibi düzenlerse staff listesi otomatik yenilenmez, ekran focus event'i yeniler.

> Detay: mirror desenine `04-database.md §5` zaten girdi. Burası **abonenin** ne dinlediğini anlatır.

---

## 3. RLS — realtime'da nasıl uygulanıyor

Realtime gateway her event'i abonenin **kendi RLS bağlamında** filtreler. JWT yoksa `anon`, varsa `authenticated`. Yani:

- **Web (anon)** `appointment_slots`'a abone olursa: tüm satırlar gelir (anon SELECT açık).
- **Web (anon)** `appointments`'a abone olursa: hiç satır gelmez (anon SELECT kapalı) — bu yüzden mirror var.
- **Mobil staff** `appointments`'a abone olursa: kendi `staff_id` satırları + RLS'in geçirdiği diğer satırlar gelir.
- **Mobil owner** `appointments`'a abone olursa: kendi shop'undaki tüm staff'ların satırları gelir.

**Sonuç:** Client tarafında ekstra "bu satır benim mi?" check'i **yapmaya gerek yok** — RLS gateway'de hallediliyor. Filter parametresi (`filter: 'staff_id=eq.<uuid>'`) **performans için** kullanılır, güvenlik için değil.

---

## 4. Channel kurulum şablonu

```ts
// Tek tablo, tek event tipi, opsiyonel filter
const channel = supabase
  .channel(`name-anything-unique`)
  .on(
    'postgres_changes',
    {
      event: '*',                              // INSERT | UPDATE | DELETE | '*'
      schema: 'public',
      table: 'appointment_slots',
      filter: `staff_id=eq.${staffId}`,        // opsiyonel
    },
    (payload) => {
      queryClient.invalidateQueries({ queryKey: ['availability', staffId] });
    }
  )
  .subscribe();

// Cleanup — useEffect dönüşünde
return () => { supabase.removeChannel(channel); };
```

### Channel adı kuralı

Channel ismi **client tarafı tekilliği** sağlar — aynı isimle ikinci `.channel()` çağrısı yeni socket açmaz, mevcut handler'ı eskisinin üstüne yazar. Kural:

```
<surface>:<screen>:<scope>
örn:  web:booking:keskin-berber:2026-05-14
      mobile:agenda:<staff_id>:<date>
      mobile:owner-agenda:<shop_id>:<date>
```

### Filter formatı

Supabase Realtime filter sözdizimi PostgREST'in subset'i:

| Operatör | Örnek |
|---|---|
| `eq` | `staff_id=eq.<uuid>` |
| `in` | `staff_id=in.(<uuid1>,<uuid2>)` |
| `gte` / `lte` | `starts_at=gte.2026-05-14T00:00:00Z` |
| `neq` | `status=neq.cancelled` |

> ⚠️ **Tek filter** desteklenir bir channel'da. İki koşul birleştirmek için ya `in.()` kullan ya da channel'ı tablo+filter bazında **böl**.

---

## 5. `useRealtimeInvalidation` hook'u

`packages/shared/src/use-realtime-invalidation.ts` — merkezi hook, 4 kullanım yeri var.

```ts
// İmza
useRealtimeInvalidation({
  client: SupabaseClient,       // supabase client instance (platform bağımsız)
  channelName: string,           // benzersiz kanal adı
  tableFilters: TableFilter[],   // birden fazla tablo + birden fazla filter
  invalidate: () => void,         // event gelince çağrılır (load() veya invalidateQueries)
  enabled?: boolean,              // false → subscribe olmaz (güvenli unmount)
  debounceMs?: number,            // owner ajanda için 300ms
})

// TableFilter tipi
type TableFilter = {
  table: 'appointments' | 'appointment_slots' | 'blocks' | 'block_slots';
  filters?: string[];             // ['staff_id=eq.<uuid>', ...] — boşsa filter yok
};
```

**Çözdüğü sorunlar:**

| Sorun | Çözüm |
|---|---|
| Stale closure — `invalidate` her render'da değişir | `useRef`'e alınır; effect sadece stabil primitiflere bağlanır |
| `tableFilters` her render'da yeni referans | `JSON.stringify(tableFilters)` dep key olarak kullanılır |
| Döngüde hook çağrısı (N staff için N subscription) | Hook içinde `filters: string[]` array'i ile tek kanalda tüm filter'lar |
| React StrictMode double-mount | `removeChannel().catch(() => {})` ile güvenli cleanup |

**Kullanım örneği — owner ajanda:**
```ts
useRealtimeInvalidation({
  client: supabase,
  channelName: `owner-agenda:${shopId}:${selectedDayKey}`,
  tableFilters: [
    { table: 'appointments', filters: staff.map(s => `staff_id=eq.${s.id}`) },
    { table: 'blocks',        filters: staff.map(s => `staff_id=eq.${s.id}`) },
  ],
  invalidate: load,
  debounceMs: 300,
  enabled: !!shopId && staff.length > 0,
});
```

**Kullanım örneği — web booking slot grid:**
```ts
useRealtimeInvalidation({
  client: supabase,
  channelName: `slots:${shop.id}:${selectedStaffId}`,
  tableFilters: [
    { table: 'appointment_slots', filters: selectedStaffId ? [`staff_id=eq.${selectedStaffId}`] : [] },
    { table: 'block_slots',       filters: selectedStaffId ? [`staff_id=eq.${selectedStaffId}`] : [] },
  ],
  invalidate: fetchSlots,
  enabled: step === 'time',
});
```

**Export:** `packages/shared/package.json` exports map'ine eklendi. `peerDependencies`: `@supabase/supabase-js >=2`, `react >=18`.

---

## 6. Yüz bazlı abonelik haritası

### 6.1 — Web booking (anonim, `apps/web`)

Müşteri *"Saat seç"* adımındayken **slot listesinin canlı olması şart** — başka bir müşteri aynı slot'u alırsa anında "dolu" olmalı. Aksi takdirde modal'da `BOOKING_CONFLICT` hatası ile karşılaşır.

| Ekran | Channel | Filter | Invalidate edilen key |
|---|---|---|---|
| `[slug]/BookingFlow.tsx` (slot grid) | `web:booking:<slug>:<date>` | `starts_at=gte.<dayStart>` *(opsiyonel)* | `['availability', staffId, date, serviceId]` |

**Dinlenen tablolar:** `appointment_slots` + `block_slots`. Anon RLS bu iki tabloya açık — `appointments` / `blocks`'a abone olunmaya çalışılırsa **event hiç gelmez** (gateway susar, hata da vermez).

```ts
// apps/web/src/app/[slug]/BookingFlow.tsx (client component)
useRealtimeInvalidation({
  channelName: `web:booking:${slug}:${date}`,
  table: 'appointment_slots',
  filter: staffId ? `staff_id=eq.${staffId}` : undefined,
  invalidate: () => qc.invalidateQueries({ queryKey: ['availability', staffId, date] }),
}, /* enabled */ step === 'time');

useRealtimeInvalidation({
  channelName: `web:booking:${slug}:${date}:blocks`,
  table: 'block_slots',
  filter: staffId ? `staff_id=eq.${staffId}` : undefined,
  invalidate: () => qc.invalidateQueries({ queryKey: ['availability', staffId, date] }),
}, step === 'time');
```

**"Fark Etmez" senaryosu** (`staffId = 'any'`): filter atılır, tüm shop'un slot'ları akar — payload üzerinde shop_id filtresi yok (mirror tabloda kolon yok), ama her event refetch tetikliyor; refetch zaten doğru shop'u sorguluyor.

### 6.2 — Mobil staff (`apps/mobile/app/(app)/`)

Staff sadece **kendi** randevularını ve bloklarını görür. Channel filter'ı zaten `staff_id=eq.<self>` ile sınırlanır.

| Ekran | Channel | Tablo + filter | Invalidate |
|---|---|---|---|
| `M3` (Randevular) | `mobile:staff-agenda:<staff_id>:<date>` | `appointments` filter `staff_id=eq.<self>` | `['appointments', staffId, date]` |
| `M3` (Randevular) | `mobile:staff-blocks:<staff_id>:<date>` | `blocks` filter `staff_id=eq.<self>` | `['blocks', staffId, date]` |
| `M4` (Blok) | abone olmaz | — | mutation sonrası kendisi `invalidateQueries` |

> Staff appointments'a abone olabilir (RLS'i `staff.user_id = auth.uid()` kuralı ile geçer) — mirror tablolara gerek yok. Mobilde `appointments` tablosu kullanılıyor.

### 6.3 — Mobil owner (`apps/mobile/app/(owner)/`)

Owner **tüm shop'a** abone — `staff_id` filter'ı yok, çünkü shop'taki her staff'ın değişikliği ekrana yansımalı.

| Ekran | Channel | Tablo + filter | Invalidate |
|---|---|---|---|
| `O2` (Ajanda) | `mobile:owner-agenda:<shop_id>:<date>` | `appointments` (filter yok — RLS shop'a sınırlıyor) | `['appointments', shopId, date]` |
| `O2` (Ajanda) | `mobile:owner-blocks:<shop_id>:<date>` | `blocks` | `['blocks', shopId, date]` |
| `O1` (Özet) | `mobile:owner-summary:<shop_id>` | `appointments` filter `starts_at=gte.<todayStart>` | `['kpi', shopId, today]` |

> ⚠️ **Owner'da `starts_at` filter'ı kritik** — özet ekranı geçmiş randevulara abone olursa pg_cron temizlik işleri 03:00'da güncelleme fırtınası yaratır. Bugünden sonrasını dinle.

---

## 7. Connection lifecycle

### 7.1 — Mount / unmount

`useEffect` cleanup'ında `supabase.removeChannel(channel)` **mutlaka** çağrılmalı. Aksi takdirde:
- Aynı channel ismi tekrar `.channel()` ile açılırsa eski handler **sessizce kaybolur**.
- Memory leak — channel referansı GC'lenmez.

### 7.2 — Screen focus (mobil özel)

Expo Router'da kullanıcı tab değiştirince ekran **unmount olmaz**, sadece blur olur. İki seçenek:

1. **Useless invalidations'a izin ver** — abone kal, arka planda event gelmeye devam etsin (TanStack Query refetch'ler `staleTime` ile zaten çoğunu yutar). Bugünkü pattern.
2. **`useFocusEffect` ile pause** — blur'da `removeChannel`, focus'ta yeniden `channel()`. Battery + bandwidth için daha temiz; trade-off: focus geri geldiğinde refetch elle tetiklenmeli.

> **Öneri:** Owner ajanda gibi ağır invalidate path'leri için `useFocusEffect` aç; staff randevular gibi tek-key invalidate'ler için bırak.

### 7.3 — Auth state değişimi

Kullanıcı logout olursa `supabase.auth.onAuthStateChange` `SIGNED_OUT` event'i atar. Bu durumda **mevcut tüm channel'lar invalid** — JWT artık geçersiz, RLS gateway susar.

`AuthProvider` (web) ve `_layout.tsx` (mobil) `SIGNED_OUT` görünce:
```ts
supabase.removeAllChannels();
queryClient.clear();
```

### 7.4 — App background (mobil)

iOS / Android, app background'a girince WebSocket'i ~30 saniye sonra kapatır. Foreground'a dönünce Supabase client **otomatik reconnect** eder; ama bu süre içinde kaçırılan event'leri **getirmez** (gap). Çözüm:

```ts
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    queryClient.invalidateQueries();   // tüm key'leri refetch et
  }
});
```

> Web tarafında `document.visibilitychange` + `window.online` ile aynı pattern. TanStack Query'nin `refetchOnWindowFocus: true` default'u bu işi zaten yapar — mobilde manuel.

---

## 8. Reconnection & kaçırılan event

Supabase Realtime **at-least-once** garantisi vermez. Network drop / token expiry / server restart sırasında event kaybolur. Tek korunma:

1. **Hiçbir UI state realtime payload'tan türetilmez** — payload sadece "invalidate" sinyali.
2. **Ekran açılışında her zaman fresh fetch** — TanStack Query `staleTime: 0` (booking flow), `staleTime: 30s` (ajanda).
3. **Background → foreground** geçişlerinde global invalidate (§7.4).

> Yani realtime "live" hissi verir, ama doğruluk **canonical fetch**'in elinde.

---

## 9. Event tipine göre davranış

`event: '*'` çoğu durumda doğru, ama bazı ekranlar daha dar dinleyebilir:

| Ekran | Önerilen event | Sebep |
|---|---|---|
| Web booking slot grid | `INSERT`, `DELETE` | Slot dolma/boşalma — UPDATE (status changes) zaten mirror trigger ile INSERT/DELETE'e dönüşür |
| Mobil ajanda | `*` | Status update'leri (`cancelled` → strikethrough) UI'da görünür |
| Owner özet | `INSERT`, `UPDATE` | Yeni randevu sayar, cancel olunca KPI günceller |

**Mirror tabloda UPDATE gerçekten geliyor** — `sync_appointment_slots` trigger'ı `TG_OP = 'UPDATE'` durumunda mirror tabloya gerçek bir `UPDATE` yazıyor (DELETE + INSERT değil). `block_slots` trigger'ı da aynı pattern. Bu nedenle `appointment_slots` / `block_slots` kanallarında da `event: '*'` kullanmak doğru ve güvenli seçim — `INSERT + DELETE` ile sınırlamak randevu zamanı değiştirildiğinde (UPDATE) event'i kaçırır.

---

## 10. Performans notları

- **Filter atmak ucuz, channel açmak değil.** Aynı tablo + farklı filter için ayrı channel açmak yerine geniş filter + client-side ayıklama (`payload.new.staff_id === self`) tercih edilebilir — ama `useRealtimeInvalidation` zaten `invalidateQueries`'i kör çağırıyor, ayıklama gereksiz.
- **Channel sayısı ekran başına 2–3'ü geçmesin.** Booking flow'da `appointment_slots` + `block_slots` = 2 channel. Ajanda'da `appointments` + `blocks` = 2 channel.
- **`removeAllChannels()`** — logout, deep-link navigation gibi rotanın komple değiştiği yerlerde reset için kullanılır. Normal unmount'ta tek tek `removeChannel`.

---

## 11. Test edilebilirlik

Realtime mock'lamak için iki opsiyon:

1. **`@supabase/supabase-js` mock** — `supabase.channel().on().subscribe()` zinciri mock'lanır, test runner manuel event tetikler.
2. **Gerçek Supabase + test schema** — Playwright / Detox e2e testlerinde gerçek WS açılır; iki tarayıcı sekme açıp birinde booking yapıp diğerinde slot'un kaybolduğunu doğrulamak.

> Şu an repoda test framework yok (bkz. `00-overview.md §8`). Test stratejisi eklenince **realtime senaryolarının e2e'ye girmesi şart** — unit test bu davranışı yakalayamaz.

---

## 12. Açık konular

- ✅ ~~**Merkezi `useRealtimeInvalidation` yok**~~ — `packages/shared/src/use-realtime-invalidation.ts` olarak tamamlandı. 4 kullanım yeri, ~80 satır tekrar eden kod silindi. **Kapatıldı.**
- ✅ ~~**Channel isim çakışmaları**~~ — sabit string kullanımı yok. Her channel template literal + ID içeriyor. **Kapatıldı.**
- ✅ ~~**Owner KPI realtime'ı yok**~~ — `owner-kpi:${shopId}` kanalı eklendi; yeni randevu gelince KPI otomatik güncelleniyor. **Kapatıldı.**
- ⚠️ **AppState listener yok** — `AppState` import veya listener repoda hiçbir yerde mevcut değil. TanStack Query da kurulu olmadığından `refetchOnWindowFocus` şu an anlamsız. Background → foreground geçişinde stale veri kalır. TQ kurulunca önce çözülmesi gereken bağımlılık bu.
- ⚠️ **Logout sonrası `removeAllChannels` eksik — gerçek risk.** Doğrulandı:
  ```ts
  // apps/mobile/app/_layout.tsx:44 — BUGÜN (eksik)
  supabase.auth.onAuthStateChange((_e, s) => setSession(s));

  // OLMASI GEREKEN
  supabase.auth.onAuthStateChange((_e, s) => {
    if (!s) supabase.removeAllChannels();
    setSession(s);
  });
  ```
  Web tarafında `apps/web/src/components/AuthProvider.tsx` dosyası **mevcut bile değil**. Mobilde her login-logout döngüsünde kanal nesneleri bellekte birikir.
- 🚧 **Broadcast / presence kullanımı yok** — multi-staff ajanda'da "şu an X düzenliyor" göstergesi için Supabase broadcast kanalı eklenebilir. Şu an roadmap dışı.
- ✅ ~~**Mirror trigger UPDATE davranışı**~~ — `sync_appointment_slots` trigger'ı `TG_OP = 'UPDATE'`'de gerçek UPDATE yazıyor (DELETE + INSERT değil). `block_slots` aynı. Web booking kanalı `event: '*'` dinlediğinden bugün de yakalanıyor. **§9 güncellendi, kapatıldı.**

---

**Sonraki:** [`07-data-fetching.md`](./07-data-fetching.md) — Web (Server Components + TanStack Query) + Mobil (TanStack Query baştan sona) örnekleri, cache key kuralları, prefetch pattern'leri.

