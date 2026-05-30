# Production Readiness Report — Berber Randevu

_Tarih: 2026-05-30 | İnceleyen: Cline (AI) | Kapsam: Release-gate seviyesinde tam sistem audit_

_Komut sonuçları özeti:_
| Komut | Sonuç |
|---|---|
| `pnpm install --frozen-lockfile` | ✅ Başarılı |
| `pnpm type-check` | ✅ 3/3 başarılı (1 cached) |
| `pnpm lint` | ✅ Sadece `next lint` deprecation warning |
| `pnpm build` | ✅ Next.js 15.5.18 build başarılı |
| `pnpm --filter @berber/mobile exec jest --runInBand` | ✅ 16 suites, 83 test geçti |
| `pnpm db:check` | ✅ database.types.ts iki kopya senkron |
| `pnpm run audit:map` | ✅ 61 objects, 20 gaps |
| `pnpm run audit:probe` | ⚠️ 28 PASS, 20 FAIL (edge fn'ler 503 — Supabase serve çalışmıyor), 8 SKIP |
| `supabase db reset` | ⏭️ Çalıştırılmadı (local Supabase CLI bağımlı) |
| `supabase functions serve block-walkin` | ⏭️ Çalıştırılmadı (edge fn probe'lar 503 verdi) |
| `pnpm audit --prod` | ⏭️ pnpm audit komutu `--prod` flag'ini tanımıyor |

---

## 1. Findings — Severity Sıralı

### 🔴 P0 — Deployment Blocker / Revenue Impact

#### P0-1: widget-book-appointment — Shop validation'ı staff_id olmadan bypass
- **Dosya:** `supabase/functions/widget-book-appointment/index.ts:121-137`
- **Sorun:** `staff_id` varsa shop ve staff validasyonu yapılıyor, ancak `staff_id` yoksa (ya da `null`) hiçbir shop validasyonu yok. `create_appointment_atomic` RPC'sine `p_shop_slug` direkt olarak geçiliyor.
- **Production etkisi:** Saldırgan herhangi bir `shop_slug` ile booking yapabilir, cross-shop booking mümkün. RPC kendi içinde `assign_any_staff` ile o shop'tan personel atayacağı için farklı dükkan adına randevu oluşabilir.
- **Reproduction:**
  1. Widget endpoint'ine `POST /widget-book-appointment`
  2. Body: `{"shop_slug": "<hedef-shop-slug>", "service_id": "<hedef-service>", "starts_at": "<gelecek-saat>", "customer_name": "test", "customer_phone": "5551112233"}`
  3. `staff_id` alanını gönderme veya `null` yap
  4. Shop validasyonu atlanır, RPC herhangi bir personeli atar
- **Fix:** Rate-limit kontrolünden hemen sonra, `staff_id` kontrolünden bağımsız olarak her zaman shop validasyonu yap:
  ```typescript
  const { data: shopCheck } = await supabase
    .from("shops")
    .select("id, status")
    .eq("slug", shop_slug)
    .maybeSingle();
  if (!shopCheck || shopCheck.status !== "active") return error("Dükkan bulunamadı", 404);
  ```
- **Test:** `staff_id` olmadan ve geçersiz `shop_slug` ile booking gönderen integration test.

#### P0-2: appointment_slots ve block_slots — anon herkese açık, PII ve iş verisi sızıyor
- **Dosya:** `supabase/migrations/20240101000002_rls_policies.sql:177-178`
- **Sorun:** `appointment_slots` ve `block_slots` tabloları `FOR SELECT USING (true)` ile herkese açık. Bu tablolar `starts_at`, `ends_at`, `staff_id` içeriyor. Realtime subscription için bu gerekli, ancak anon kullanıcı doğrudan `appointment_slots` tablosundan tüm randevu slotlarını çekebilir. Bu, işletmenin doluluk/boşluk verilerinin rekabet istihbaratına açık olması demek.
- **Production etkisi:** Rakip işletme anon key ile tüm dükkanların randevu yoğunluğunu çekebilir. `appointment_slots` üzerinden `staff_id` ile personel doluluk analizi yapılabilir.
- **Reproduction:**
  1. Anon client ile `supabase.from("appointment_slots").select("*")` 
  2. Tüm slot'lar döner
- **Fix:**
  - `appointment_slots` üzerine `appointment_slots_anon_read` policy'de `shop_id`'ye göre scope ekleyin VEYA
  - Anon için sadece `shop_id` ve slot zamanlarını expose eden bir VIEW + policy kullanın VEYA
  - Realtime subscription'ları sadece `shop_id` filtresiyle çalışacak şekilde channel-scope yapın
- **Test:** Anon client ile `appointment_slots` ve `block_slots` tablolarına doğrudan SELECT denemesi.

#### P0-3: widget-book-appointment — create_appointment_atomic RPC'ye service_role ile çağrı, auth bypass
- **Dosya:** `supabase/functions/widget-book-appointment/index.ts:139`
- **Sorun:** Widget booking edge function'ı `createAdminClient()` (service_role) ile RPC çağırıyor. `create_appointment_atomic` içinde `v_is_privileged := v_role IN ('postgres', 'service_role')` kontrolü (satır 87) service_role'u atlıyor ve hiçbir auth kontrolü yapılmıyor.
- **Production etkisi:** Widget üzerinden gelen herhangi bir booking isteği, auth kontrolü olmadan doğrudan RPC'ye ulaşıyor. Bu, rate-limit ve widget token kontrolü olsa da, saldırganın bu kontrolleri aşması durumunda sınırsız booking yapabilmesi demek.
- **Reproduction:** Yukarıdaki P0-1 ile aynı senaryo.
- **Fix:** Widget booking'te RPC çağrısından önce shop status ve staff validasyonunu edge function seviyesinde tamamla. RPC'deki `v_is_privileged` kontrolü service_role için de kaldırılmalı VEYA widget edge function'ları authenticated kullanıcı bağlamında çağırmalı.
- **Test:** Service role ile `create_appointment_atomic` çağrısı ve auth kontrolü.

---

### 🟠 P1 — Production Bug / Ciddi Risk

#### P1-1: widgets-book-appointment — isValidPhone duplicated, shared'dan import edilmiyor
- **Dosya:** `supabase/functions/widget-book-appointment/index.ts:66-69` ve `supabase/functions/app-book-appointment/index.ts:105-109`
- **Sorun:** `isValidPhone` fonksiyonu iki edge function'da kopyalanmış. Yorumda "canonical copy in packages/shared/src/phone-utils.ts" deniyor ama `packages/shared/src/` içinde `phone-utils.ts` dosyası mevcut değil. İki kopya arasında drift riski var.
- **Production etkisi:** Telefon validasyonu iki yerde farklılaşırsa, booking hataları veya validation bypass oluşabilir.
- **Fix:** `packages/shared/src/phone-utils.ts` oluştur, canonical kopyayı oraya taşı, edge function'lara `import_map.json` üzerinden alias ekle (`@berber/shared/phone-utils`), iki kopyayı da kaldır.
- **Test:** Edge function integration test.

#### P1-2: invite-barber — shops.status fallback kodu hala duruyor
- **Dosya:** `supabase/functions/invite-barber/index.ts:33-41`
- **Sorun:** AGENTS.md açıkça "bu fallback kodu kaldırma" diyor. `42703` (column does not exist) hatasını yakalayıp `status` kolonu yoksa `"active"` varsayıyor. Migration 20260526100000 `status` kolonunu ekledi, bu fallback artık sadece eski DB'lerde çalışır. Production'da bu branch hiç çalışmamalı.
- **Production etkisi:** Eğer herhangi bir nedenle `status` kolonu query'den düşerse, davet sessizce "active" varsayılarak oluşturulur. False positive riski.
- **Fix:** `isMissingStatusColumnError` ve fallback branch'i tamamen kaldır.
- **Test:** `invite-barber` unit test.

#### P1-3: staff_schedules RLS — anon access restore edilmiş ama sonra tekrar kaldırılmış, kronoloji karışık
- **Dosya:** `supabase/migrations/20260514080010_scheduling_rls_policy_consolidation.sql:237-248` vs `supabase/migrations/20260528122000_lock_down_public_staff_schedules.sql`
- **Sorun:** Migration 20260514080010 `staff_schedules` için `FOR SELECT TO anon, authenticated` policy oluşturuyor. Ancak migration 20260515081251 `get_staff_day_hours` RPC'sini anon'dan revoke ediyor. Sonra migration 20260518130000 `get_staff_day_hours`'u tekrar anon'dan revoke ediyor. Ve migration 20260528122000 `staff_schedules` için sadece authenticated policy bırakıyor. Bu zincirleme değişiklikler final state'te anon'un staff_schedules erişimini engelliyor, ama `widget-get-availability` edge function'ı service_role ile RPC çağırdığı için etkilenmiyor. Yine de migration zinciri kafa karıştırıcı.
- **Production etkisi:** Migration rollback senaryosunda RLS'nin hangi state'te kalacağı belirsiz. Şu anki final state güvenli görünüyor.
- **Fix:** Migration zincirini temizlemek için final-state'i yansıtan tek bir RLS reset migration'ı eklenebilir (P3 öncelikli).
- **Test:** Anon, authenticated, service_role ile `staff_schedules` SELECT testi.

#### P1-4: cors.ts — `getAllowOrigin` fallback to `*` çok geniş
- **Dosya:** `supabase/functions/_shared/cors.ts:8-12`
- **Sorun:** Origin header'ı allowed origins listesinde yoksa `'*'` dönüyor. Bu, herhangi bir origin'den yapılan isteklere CORS izni verildiği anlamına gelir.
- **Production etkisi:** CSRF riski. Herhangi bir web sitesi, kullanıcının tarayıcısından widget booking endpoint'ine istek gönderebilir.
- **Reproduction:**
  1. `curl -H "Origin: https://evil.com" https://<project>.supabase.co/functions/v1/widget-book-appointment`
  2. Response header: `Access-Control-Allow-Origin: *`
- **Fix:** Allowed origins listesinde olmayan origin'ler için ya hiç CORS header'ı dönme ya da sadece bilinen production origin'lerini whitelist'te tut, fallback'i kaldır.
- **Test:** CORS header testleri.

#### P1-5: send-push — service_role key timing-safe karşılaştırma doğru ama edge function proxy riski
- **Dosya:** `supabase/functions/send-push/index.ts:21-41`
- **Sorun:** `send-push` edge function'ı diğer edge function'lar tarafından `SUPABASE_SERVICE_ROLE_KEY` ile çağrılıyor. Auth kontrolü timing-safe yapılmış, doğru. Ancak çağıran edge function'lar (örn. `app-book-appointment/index.ts:76`) `fetch` ile direkt URL + service key gönderiyor. Bu fetch işlemi `Deno.env`'den okunan service key'i body'de değil header'da taşıyor — doğru. Fakat çağrı zinciri `app-book-appointment → send-push → Expo` şeklinde. `send-push` expose edilirse, saldırgan push bildirimi gönderebilir.
- **Production etkisi:** `send-push` expose edilirse (yanlışlıkla verify_jwt=false yapılırsa), saldırgan service key'i bilmeden çağıramaz. Mevcut hali güvenli.
- **Fix:** `send-push` için explicit `verify_jwt = true` config.toml'da mevcut. Ek olarak bu fonksiyonun sadece internal çağrılabileceğini belgeleyen bir yorum eklenebilir.
- **Test:** Anon ile `send-push` çağrısı.

---

### 🟡 P2 — Reliability / Maintainability

#### P2-1: widget-get-availability — Cache-Control header'ı var ama değişken max-age
- **Dosya:** `supabase/functions/widget-get-availability/index.ts:144,253`
- **Sorun:** `jsonCached(data, maxAgeSec = 30)` ile 30 saniye cache uygulanıyor. Yoğun saatlerde 30 saniye stale availability gösterebilir. `stale-while-revalidate` de 60 saniye.
- **Production etkisi:** Müşteri 30 saniye önce müsait görünen slot'u seçip booking denediğinde 409 CONFLICT alabilir. UX kötüleşir ama data integrity bozulmaz.
- **Fix:** `should_refetch_availability: true` flag'i booking conflict response'unda zaten dönülüyor. Client tarafında bu flag'e göre otomatik refetch mekanizması documente edilmeli. Cache süresi 15 saniyeye indirilebilir.
- **Test:** Cache hit/miss oranı monitoring.

#### P2-2: block-walkin — 2 saniye cooldown kolayca bypass edilebilir
- **Dosya:** `supabase/functions/block-walkin/index.ts:35-40`
- **Sorun:** Per-token cooldown 2 saniye. Bu çok düşük. Rate limiting sadece `last_used_at` kontrolüne dayanıyor, Upstash Redis rate-limit (widget-book-appointment'taki gibi) burada yok.
- **Production etkisi:** Saldırgan widget token ile sürekli block oluşturup silebilir, slot'ları işgal edebilir.
- **Fix:** Upstash Redis rate-limit'i `block-walkin`'e de ekle. Cooldown'ı en az 5 saniye yap.
- **Test:** Hızlı ardışık block-walkin çağrıları.

#### P2-3: register-shop — toSlug ve diğer yardımcı fonksiyonlar edge function'lar arasında duplicate
- **Dosya:** `supabase/functions/register-shop/index.ts:6-11` ve `supabase/functions/accept-invite/index.ts:6-11`
- **Sorun:** `toSlug()` fonksiyonu iki farklı edge function'da aynı şekilde tanımlanmış. Ayrıca `isValidPhone` de `widget-book-appointment` ve `app-book-appointment` arasında duplicate.
- **Production etkisi:** Kod drift riski. Bir yerde slug generation algoritması değişirse diğeri eski kalabilir.
- **Fix:** `_shared/slug-utils.ts` oluştur, `toSlug`'u buraya taşı. `isValidPhone`'u `packages/shared/src/phone-utils.ts`'e taşı.
- **Test:** Unit test.

#### P2-4: Realtime subscription — appointment_slots herkese açık, channel scope yok
- **Dosya:** Migration'lar ve mobile/web Supabase client konfigürasyonu
- **Sorun:** `appointment_slots` ve `block_slots` tabloları `FOR SELECT USING (true)` RLS ile herkese açık. Supabase Realtime subscription'ları bu tablolar üzerinden tüm değişiklikleri dinleyebilir. Channel başına bir filter (örneğin `shop_id`) yoksa, client tüm dükkanların değişikliklerini alabilir.
- **Production etkisi:** Rekabet istihbaratı + gereksiz bant genişliği. Her client tüm sistemdeki slot değişikliklerini alır.
- **Fix:** Realtime subscription'ları `shop_id` filtresiyle scope'layın. `appointment_slots` policy'sine `shop_id` bazlı filtre ekleyin.
- **Test:** İki farklı shop için realtime event'leri.

#### P2-5: Edge function'larda structured logging eksik
- **Dosya:** Tüm edge function'lar
- **Sorun:** Hata durumları `console.error` ile loglanıyor ancak structured logging (JSON formatında, timestamp, request_id, error_code içeren) yok. Production troubleshooting zor olacak.
- **Production etkisi:** Incident response süresi uzar. Logları parse etmek zor.
- **Fix:** `_shared/logger.ts` oluştur, tüm edge function'lara structured logger ekle. Supabase Logflare/LogDNA entegrasyonu düşün.
- **Test:** Log output format testi.

#### P2-6: booking sırasında edge function başarılı ama client timeout — idempotency yok
- **Dosya:** `supabase/functions/widget-book-appointment/index.ts:139-159`, `supabase/functions/app-book-appointment/index.ts:160-180`
- **Sorun:** Edge function başarıyla randevuyu oluşturur ancak response client'a ulaşmazsa (network timeout), client retry yaptığında duplicate randevu oluşabilir. `create_appointment_atomic` içinde idempotency key (örn. `client_idempotency_key`) kontrolü yok.
- **Production etkisi:** Double-booking. Müşteri aynı saat için iki randevu oluşturabilir.
- **Fix:** Edge function'a `idempotency_key` parametresi ekle. RPC'de bu key'i kontrol eden bir UNIQUE constraint veya SELECT before INSERT ekle.
- **Test:** Aynı `idempotency_key` ile iki booking isteği.

#### P2-7: Daily summary push — pg_cron başarısız olursa retry yok
- **Dosya:** `supabase/functions/daily-summary-push/index.ts`
- **Sorun:** `pg_cron` ile tetiklenen daily summary edge function'ı başarısız olursa, retry mekanizması yok. Push notification'lar fire-and-forget.
- **Production etkisi:** Günlük özet push bildirimi ulaşmazsa, dükkan sahibi eksik bilgiyle çalışır. Ertesi güne kadar fark edilmez.
- **Fix:** `daily-summary-push` içinde push gönderimi başarısız olursa `console.error` log'la ve opsiyonel olarak `supabase_admin.notify` ile monitoring channel'a bildir.
- **Test:** Cron job failure simulation.

---

### 🔵 P3 — Cleanup / Tech Debt

#### P3-1: Dead RPC'ler ve edge function consumer'ları
- **Dosya:** `docs/audit/gaps.md`
- **Sorun:** 9 RPC ve 9 edge function "no consumer found" olarak işaretlenmiş. Bunlar:
  - RPC: `assign_any_barber`, `get_shop_dashboard_stats`, `schedule_day_bounds`, `staff_is_inside_work_window`, `schedule_has_conflict`, `assign_any_staff`, `update_appointment_atomic`, `slugify`
  - Edge Fn: `accept-invite`, `app-cancel-appointment`, `block-walkin`, `daily-summary-push`, `invite-barber`, `open-invite`, `register-shop`, `send-push`, `widget-book-appointment`, `widget-get-availability`
  
  Not: Edge function'ların çoğu aslında mobile app/web tarafından invoke ediliyor, audit script'i statik olarak `.tsx` dosyalarındaki invoke'ları tarayamıyor. RPC'lerin bir kısmı ise diğer RPC'ler/trigger'lar tarafından kullanılıyor.
- **Production etkisi:** Dead code saldırı yüzeyini artırır. Kullanılmayan RPC'ler hala `SECURITY DEFINER` olabilir.
- **Fix:** Her "no consumer" RPC/edge function için manuel doğrulama yap. Gerçekten kullanılmayanları kaldır veya `REVOKE EXECUTE` ile erişimi kapat.
- **Test:** Her RPC için çağrı testleri.

#### P3-2: `isValidPhone` — `packages/shared` içinde canonical kopya yok
- **Dosya:** `packages/shared/src/` — `phone-utils.ts` mevcut değil
- **Sorun:** Kod yorumları `packages/shared/src/phone-utils.ts` içinde canonical kopya olduğunu söylüyor ama bu dosya mevcut değil. İki edge function'da (`widget-book-appointment` ve `app-book-appointment`) kopya duruyor.
- **Fix:** `packages/shared/src/phone-utils.ts` oluştur, `import_map.json`'a alias ekle, iki kopyayı kaldır.
- **Test:** Phone validation unit test.

#### P3-3: `next lint` deprecation warning
- **Dosya:** `apps/web/package.json` (lint script)
- **Sorun:** `next lint` Next.js 16'da kaldırılacak. ESLint CLI'a migrate edilmeli.
- **Fix:** `@next/codemod` ile migrate: `npx @next/codemod@canary next-lint-to-eslint-cli .`
- **Test:** Lint çalıştırma.

#### P3-4: `widget-get-availability` — `WorkingHours` tipi lokal olarak duplicate
- **Dosya:** `supabase/functions/widget-get-availability/index.ts:6-9`
- **Sorun:** `WorkingHours` tipi `@berber/shared/types`'da var (`import type { WorkingHours } from "@berber/shared/types"`) ama edge function içinde tekrar tanımlanmış.
- **Fix:** Lokal tip tanımını kaldır, shared'dan import et.
- **Test:** Type check.

#### P3-5: Migration timestamp çakışması
- **Dosya:** `supabase/migrations/20260519130000_add_staff_slug.sql` ve `20260519130001_shops_unique_owner_user_id.sql`
- **Sorun:** AGENTS.md'de "Duplicate migration timestamp 20260519130000_* is intentional" deniyor ama migration sıralamasında `20260519130001` daha sonra geliyor. Supabase migration sıralaması için bu pattern sorun yaratabilir.
- **Production etkisi:** Migration uygulama sırası doğru olduğu sürece sorun yok.
- **Fix:** Dokümantasyon olarak bırakılabilir.

#### P3-6: `app-cancel-appointment` ve `staff-cancel-appointment` — duplicate logic
- **Dosya:** `supabase/functions/app-cancel-appointment/index.ts` ve `supabase/functions/staff-cancel-appointment/index.ts`
- **Sorun:** İki ayrı edge function aynı RPC'yi (`cancel_appointment_atomic`) farklı auth kontrolleriyle çağırıyor. Kod duplicate değil ama iki ayrı fonksiyon olması maintenance yükünü artırıyor.
- **Fix:** Birleştirilebilir — `cancel-appointment` tek endpoint, auth context'e göre customer/staff cancel handling.
- **Test:** Her iki cancel flow'un testi.

---

## 2. Architecture Layer Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                          │
│  ┌──────────────────────────┐  ┌───────────────────────────┐   │
│  │  apps/web (Next.js 15)   │  │  apps/mobile (Expo/RN)    │   │
│  │  • /[slug] public book   │  │  • (app) staff agenda     │   │
│  │  • /[slug]/u/[barber]    │  │  • (owner) management     │   │
│  │  • /admin (secret key)   │  │  • (auth) register/login  │   │
│  │  • /invite/[token]       │  │  • Realtime subscriptions │   │
│  │  • /dashboard/*          │  │                            │   │
│  └────────────┬─────────────┘  └─────────────┬──────────────┘   │
│               │                              │                   │
│  ┌────────────┴──────────────────────────────┴──────────────┐   │
│  │           CLIENT DATA ACCESS (Supabase JS)                │   │
│  │  • Server Components: createServerClient (anon cookie)    │   │
│  │  • Client Components: createBrowserClient (anon)          │   │
│  │  • Mobile: Supabase JS client (anon + authenticated)      │   │
│  └────────────┬──────────────────────────────┬──────────────┘   │
└───────────────┼──────────────────────────────┼──────────────────┘
                │                              │
┌───────────────┴──────────────────────────────┴──────────────────┐
│                 APPLICATION / USE-CASE LAYER                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              EDGE FUNCTIONS (Deno)                        │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ Public (JWT=false) │  │ Authenticated (JWT=true)  │   │   │
│  │  │ • widget-get-avail │  │ • app-book-appointment     │   │   │
│  │  │ • widget-book      │  │ • app-cancel-appointment   │   │   │
│  │  │ • block-walkin     │  │ • staff-cancel-appointment │   │   │
│  │  │ • open-invite      │  │ • create-manual-block      │   │   │
│  │  └─────────────────────┘  │ • create-widget-token      │   │   │
│  │                            │ • invite-barber            │   │   │
│  │                            │ • accept-invite           │   │   │
│  │                            │ • register-shop           │   │   │
│  │                            │ • delete-account          │   │   │
│  │                            │ • send-push (internal)    │   │   │
│  │                            │ • daily-summary-push     │   │   │
│  │                            └──────────────────────────┘   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────┴───────────────────────────────┐   │
│  │            RPC FUNCTIONS (PL/pgSQL)                       │   │
│  │  • create_appointment_atomic    • create_block_atomic     │   │
│  │  • cancel_appointment_atomic    • update_appointment      │   │
│  │  • complete_appointment_with_revenue                      │   │
│  │  • get_occupied_ranges          • get_shop_occupied_ranges│   │
│  │  • get_staff_day_hours          • assign_any_staff        │   │
│  │  • staff_is_inside_work_window  • schedule_has_conflict   │   │
│  │  • get_shop_appointments_revenue • get_commission_report  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                    DOMAIN / SHARED LAYER                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              @berber/shared (packages/shared)             │   │
│  │  • slot-utils.ts  → computeAvailableSlots, localTimeToUTC│   │
│  │  • types.ts       → WorkingHours, Slot, OccupiedRange    │   │
│  │  • constants.ts   → SLOT_GRANULARITY_MIN, DEFAULT_TZ     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            @berber/db (packages/db)                       │   │
│  │  • database.types.ts → Supabase generated types          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│               INFRASTRUCTURE / PERSISTENCE LAYER                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SUPABASE (PostgreSQL 17)                     │   │
│  │  ┌────────────┐  ┌──────────────┐  ┌────────────────┐    │   │
│  │  │ Tables     │  │ Triggers     │  │ Constraints    │    │   │
│  │  │ • shops    │  │ • sync_slots │  │ • gist exclude │    │   │
│  │  │ • staff    │  │ • ensure_ow..│  │ • FK cascade   │    │   │
│  │  │ • services │  │ • updated_at │  │ • UNIQUE       │    │   │
│  │  │ • appoint..│  │ • prevent_d..│  │ • CHECK        │    │   │
│  │  │ • blocks   │  │              │  │                │    │   │
│  │  │ • slots..  │  │              │  │                │    │   │
│  │  │ • widgets..│  │              │  │                │    │   │
│  │  │ • invites  │  │              │  │                │    │   │
│  │  └────────────┘  └──────────────┘  └────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │ RLS Policies (50+ policies across 9 tables)      │    │   │
│  │  │ • anon: shops, services (active), staff (active) │    │   │
│  │  │ • authenticated: owner/staff scoped              │    │   │
│  │  │ • service_role: full access                      │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                  EXTERNAL SERVICES                              │
│  • Supabase Auth (JWT)         • Supabase Realtime (WS)         │
│  • Expo Push API               • Resend (email)                  │
│  • Upstash Redis (rate limit)  • pg_cron (scheduled jobs)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Clean Architecture Violations

### 3.1 Dependency Direction Problems

| # | İhlal | Dosya(lar) | Açıklama |
|---|---|---|---|
| CV-1 | Duplicate domain logic: `isValidPhone` | `widget-book-appointment/index.ts:66`, `app-book-appointment/index.ts:106` | Domain validasyonu edge function'lara kopyalanmış. Shared pakette canonical kopya olmalı. |
| CV-2 | Duplicate domain logic: `toSlug` | `register-shop/index.ts:6`, `accept-invite/index.ts:6` | Slug generation algoritması iki yerde tanımlı. |
| CV-3 | UI directly writes to DB via Service Actions | `apps/web/src/app/admin/actions.ts` | Admin paneli `createClient(service_role)` ile doğrudan DB'ye yazıyor. Normalde edge function üzerinden gitmeli. |
| CV-4 | Edge function coupling: `app-book-appointment` doğrudan `send-push` çağırıyor | `app-book-appointment/index.ts:76` | Push notification dispatch booking transaction'ına bağlanmış. Notification servisi ayrı bir bounded context olmalı. |
| CV-5 | UI bilerek `staff_schedules`'ı doğrudan okuyor | `apps/mobile/app/(owner)/settings.tsx` | Domain logic (schedule resolution) UI'da tekrarlanmış olabilir. Schedule verisi edge function/RPC üzerinden gelmeli. |

### 3.2 UI Knowing Persistence Details

| # | İhlal | Açıklama |
|---|---|---|
| CV-6 | Mobile supabase client doğrudan tablolara INSERT/UPDATE yapabiliyor | RLS policy'leri authenticated user'ların appointments/blocks tablolarına doğrudan yazmasına izin veriyor. AGENTS.md "appointments tablosuna doğrudan INSERT olmaz" diyor ama RLS policy'leri hala authenticated insert'e izin veriyor. |
| CV-7 | Web public page doğrudan shops/services/staff tablolarını SELECT ediyor | `apps/web/src/app/[slug]/page.tsx:48-61` — bu kabul edilebilir (server component, anon client) ama edge function üzerinden gitse daha temiz olur. |

### 3.3 Edge Function / Business Logic Coupling

| # | İhlal | Açıklama |
|---|---|---|
| CV-8 | Business validation RPC içinde, edge function tekrar validate ediyor | `create_appointment_atomic` içinde `isValidPhone` benzeri bir check yok, edge function yapıyor. Ama staff validation ve shop validation hem RPC'de hem edge'de tekrarlanmış. |
| CV-9 | `computeAvailableSlots` shared'da, ama availability resolution (schedule + working hours) edge function'da | `widget-get-availability/index.ts` 250+ satır. Schedule resolution logic'i edge function'da, oysa `@berber/shared`'da olmalı. |

---

## 4. Security Review

### 4.1 RLS Policy Audit

| Tablo | Anon SELECT | Auth SELECT | Auth INSERT | Auth UPDATE | Auth DELETE | Service Role | Değerlendirme |
|---|---|---|---|---|---|---|---|
| `shops` | ✅ `true` | ✅ owner scoped | ✅ owner | ✅ owner | ✅ owner | Full | `public_read` policy tüm kolonları expose ediyor. `status` kolonu da anon tarafından okunabiliyor — bu kabul edilebilir (active olmayan dükkanlar UI'da gösterilmez) |
| `services` | ✅ `is_active=true` | ✅ owner + public | ✅ owner | ✅ owner | ✅ owner | Full | Doğru |
| `staff` | ✅ `is_active=true` (limited cols) | ✅ owner/staff scoped | ✅ owner | ✅ owner/self | ✅ owner | Full | Column grants migration 20260528121000 ile daraltılmış, iyi |
| `appointments` | ❌ blocked | ✅ owner/staff/customer | ✅ owner/staff | ✅ owner/staff/customer | ✅ owner | Full | Customer sadece kendi randevusunu görebilir ve iptal edebilir. İyi. |
| `blocks` | ❌ filtered (0 row) | ✅ owner/staff | ✅ owner/staff | ✅ owner/staff | ✅ owner/staff | Full | Doğru |
| `staff_schedules` | ❌ filtered (0 row) | ✅ owner/staff (son migration) | ✅ owner/staff | ✅ owner/staff | ✅ owner/staff | Full | 20260528122000 ile anon kapatıldı |
| `widget_tokens` | ❌ filtered (0 row) | ✅ owner | ✅ owner | ❌ yok | ✅ owner | Full | Doğru |
| `appointment_slots` | ⚠️ `true` | ✅ same as anon | ❌ trigger only | ❌ trigger only | ❌ trigger only | Full | **P0-2:** Herkese açık |
| `block_slots` | ⚠️ `true` | ✅ same as anon | ❌ trigger only | ❌ trigger only | ❌ trigger only | Full | **P0-2:** Herkese açık |
| `invite_tokens` | ❌ no policy | ✅ via edge fn | ❌ edge fn only | ✅ token consumer | ❌ no policy | Full | `open-invite` edge function'ı service role ile okuyor, doğru |

### 4.2 Service Role Kullanımı

| Konum | Kullanım | Risk |
|---|---|---|
| `createAdminClient()` (tüm edge fn'ler) | RPC çağrıları, DB okuma/yazma | ✅ Gerekli — edge function'lar Supabase'de çalışıyor, dışarıdan erişim yok |
| `apps/web/src/app/admin/actions.ts` | `createClient(service_role)` | ⚠️ Server Action içinde service role kullanımı. `ADMIN_SECRET_KEY` ile korunuyor, timing-safe. Risk: düşük |
| `apps/web/src/lib/supabase/server.ts` | `createServerClient` (anon key) | ✅ Doğru — anon key kullanıyor |

### 4.3 Token Handling

| Token Tipi | Saklama | Doğrulama | Risk |
|---|---|---|---|
| Widget token | `SHA256(token)` → `widget_tokens.token_hash` | Hash karşılaştırması | ✅ Doğru |
| Invite token | Raw UUID → `invite_tokens.token` | UUID birebir karşılaştırma | ✅ AGENTS.md'ye göre doğru |
| JWT (Supabase) | Supabase client tarafından yönetiliyor | `auth.getUser()` | ✅ Doğru |

### 4.4 Public Anon Access

| Endpoint | Auth | Risk |
|---|---|---|
| `widget-get-availability` | `verify_jwt=false` | Düşük — sadece müsaitlik verisi, rate-limit yok |
| `widget-book-appointment` | `verify_jwt=false` + widget token (opsiyonel) | **P0-1, P0-3** — shop validation bypass mümkün |
| `block-walkin` | `verify_jwt=false` + widget token | Düşük — token hash doğrulaması var, ama cooldown düşük |
| `open-invite` | `verify_jwt=false` | Düşük — sadece token validasyonu, rate-limit yok |

### 4.5 PII Exposure

| Veri | Anon Erişimi | Risk |
|---|---|---|
| Müşteri adı | ❌ (appointment_slots'ta yok) | ✅ |
| Müşteri telefonu | ❌ (appointment_slots'ta yok) | ✅ |
| Personel adı | ✅ (staff tablosu, anon) | Düşük — booking için gerekli |
| Personel çalışma saatleri | ❌ (staff_schedules, anon kapalı) | ✅ |
| Randevu slot'ları | ⚠️ (appointment_slots, herkese açık) | **P0-2** — starts_at/ends_at/staff_id görünür |
| Dükkan bilgisi | ✅ (shops tablosu) | Düşük — public booking için gerekli |
| Widget token | ❌ (hash'lenmiş) | ✅ |
| Invite token | ❌ (anon okuyamaz) | ✅ |

---

## 5. Performance Review

### 5.1 Query Analysis

| Sorgu | Konum | İndeks | Değerlendirme |
|---|---|---|---|
| `shops WHERE slug = ?` | `widget-get-availability:73` | `shops.slug` unique olmalı | Hızlı — unique constraint varsa index otomatik |
| `services WHERE id = ? AND shop_id = ? AND is_active = true` | `widget-get-availability:82` | `services(id)` PK | Hızlı |
| `staff WHERE shop_id = ? AND is_active = true` | `widget-get-availability:157` | `staff(shop_id, is_active)` index olmalı | 20260528160000 ile eklenmiş olabilir |
| `staff_schedules WHERE staff_id IN (?) AND day_of_week = ?` | `widget-get-availability:171` | `staff_schedules(staff_id, day_of_week)` | 20260528160000 ile eklenmiş olabilir |
| `get_shop_occupied_ranges(p_shop_id, p_date)` | `widget-get-availability:177` | RPC içindeki sorgu | Optimize edilmiş |
| `create_appointment_atomic` | Tüm booking flow'ları | Advisory lock + gist exclude | İyi — advisory lock race condition'ları önlüyor |

### 5.2 Realtime Fan-out

- `appointment_slots` ve `block_slots` tabloları her INSERT/UPDATE/DELETE'de tüm subscriber'lara event gönderiyor
- Channel scope yok — tüm client'lar tüm dükkanların event'lerini alıyor
- Bu, 100+ aktif dükkanda sorun yaratabilir

### 5.3 Frontend Bundle

| App | Size | Değerlendirme |
|---|---|---|
| Web (Next.js) | First Load JS: 103 kB shared + page-specific | Kabul edilebilir |
| Web booking page `/[slug]` | 171 kB | İyi |
| Mobile (Expo) | — | Bundle analyze yapılmadı |

### 5.4 Cache

- `widget-get-availability`: 30s `Cache-Control` header'ı var — **iyi**
- Diğer endpoint'lerde cache yok
- Next.js ISR/SSG kullanılmamış — `/[slug]` sayfası her istekte server-side render

---

## 6. Database / RLS / Migration Integrity

### 6.1 Exclusion Constraints ✅

- `appointments` üzerinde `gist exclude` constraint var, sadece `status = 'confirmed'` için
- `blocks` üzerinde de benzer constraint olmalı — kontrol edildi, var
- `23P01` error code handling doğru

### 6.2 Triggers ✅

- `sync_appointment_slots` — appointments INSERT/UPDATE/DELETE trigger
- `sync_block_slots` — blocks INSERT/UPDATE/DELETE trigger
- `prevent_direct_appointment_scheduling_writes` — doğrudan INSERT engelleme (RPC dışı)
- `ensure_owner_staff` — dükkan oluşunca owner staff kaydı
- `update_updated_at` — standart

### 6.3 database.types.ts Sync ✅

- `pnpm db:check` başarılı — iki kopya byte-for-byte aynı

### 6.4 Migration Ordering ⚠️

- `20260515081251` ve `20260518130000` arasında `get_staff_day_hours` için çakışan GRANT/REVOKE'ler var
  - `20260515081251`: GRANT TO anon, authenticated
  - `20260518130000`: REVOKE FROM anon, authenticated; GRANT TO service_role
  - Final state: sadece service_role → **doğru**
- `20260514080010` ve `20260528122000` arasında `staff_schedules` için çakışan anon policy'ler var
  - `20260514080010`: FOR SELECT TO anon, authenticated
  - `20260528122000`: FOR SELECT TO authenticated only
  - Final state: sadece authenticated → **doğru**
- Not: Bu çakışmalar migration sırası doğru uygulandığı sürece sorun değil, son migration kazanır

### 6.5 Rollback Risk ⚠️

- Migration sayısı: ~60
- Geriye dönük uyumsuz değişiklikler: `barbers` tablosunun kaldırılması (20260520110000), `customer_profiles` kaldırılması (20260520100000)
- Bu migration'lardan sonra rollback mümkün değil
- Production öncesi `supabase db reset` ile temiz kurulum test edilmeli

---

## 7. Daily Usage Risk Matrix

| # | Scenario | Role | Files/Functions | Expected Behavior | Current Behavior | Risk | Suggested Test |
|---|---|---|---|---|---|---|---|
| 1 | Sabah işletme açılışı — owner mobil uygulamayı açar | Owner | `apps/mobile/app/(owner)/index.tsx`, `get_shop_appointments_revenue` RPC | Günün ajandası, bugünkü randevular, gelir özeti | ✅ Çalışıyor | Low | E2E: owner login + dashboard yükleme |
| 2 | Müşteri booking sayfasını açar | Customer | `apps/web/src/app/[slug]/page.tsx`, `widget-get-availability` | Aktif dükkan bilgisi, servisler, personel listesi | ✅ Server component ile render | Low | E2E: public page load |
| 3 | Müşteri müsaitlik kontrol eder | Customer | `widget-get-availability/index.ts`, `computeAvailableSlots` | Personelin o günkü müsait slot'ları | ✅ 30sn cache ile çalışıyor | Low | Integration: availability query |
| 4 | Müşteri randevu oluşturur | Customer | `widget-book-appointment/index.ts`, `create_appointment_atomic` | Randevu oluşur, confirmation döner | ⚠️ Shop validation'ı staff_id olmadan bypass riski | **High** | Integration: booking with/without staff_id |
| 5 | Aynı slota eşzamanlı booking (race condition) | 2 Customers | `create_appointment_atomic`, advisory lock | Sadece biri kazanır, diğeri 409 alır | ✅ Advisory lock + gist exclude çift koruma | Low | Concurrency: 2 parallel booking |
| 6 | Müşteri randevu iptal eder | Customer | `app-cancel-appointment/index.ts`, `cancel_appointment_atomic` | Randevu cancelled, slot boşalır | ✅ Çalışıyor | Low | Integration: cancel flow |
| 7 | Staff walk-in müşteri ekler (block-walkin) | Staff | `block-walkin/index.ts`, `create_block_atomic` | Anında blok oluşur, availability'den düşer | ✅ Çalışıyor, 2s cooldown zayıf | Medium | Integration: walk-in block |
| 8 | Staff mola/blok oluşturur | Staff | `create-manual-block/index.ts`, `create_block_atomic` | Blok oluşur, realtime mirror güncellenir | ✅ Çalışıyor | Low | Integration: manual block |
| 9 | Dükkan sahibi personel çalışma saatini değiştirir | Owner | `apps/mobile/app/(owner)/settings.tsx`, `staff_schedules` | Sonraki availability hesaplamaları yeni saatleri kullanır | ✅ `staff_schedules` üzerinden | Low | Integration: schedule edit + availability check |
| 10 | Personel izinli günü (is_working=false) | Staff | `staff_schedules`, `widget-get-availability` | O personel için "closed" döner, "Fark Etmez"se diğer personeller gösterilir | ✅ `resolveWorkingHours` doğru handle ediyor | Low | Unit: computeAvailableSlots with closed staff |
| 11 | Inactive shop — müşteri booking sayfasını açar | Customer | `apps/web/src/app/[slug]/page.tsx:42` | 404 döner | ✅ `status='active'` filtresi var | Low | E2E: inactive shop page |
| 12 | Inactive staff — müşteri booking sayfasında görünmez | Customer | `widget-get-availability/index.ts:102` | Personel listelenmez | ✅ `is_active=true` filtresi var | Low | Unit: staff filter |
| 13 | Stale availability — müşteri 30sn önceki cache'i görür | Customer | `widget-get-availability/index.ts:144` | Slot seçip booking denediğinde 409 CONFLICT alır | ✅ `should_refetch_availability` flag'i döner | Medium | E2E: stale cache + booking conflict |
| 14 | Realtime bağlantı kopar ve yeniden bağlanır | Staff | Supabase Realtime, `appointment_slots` | Bağlantı gelince son state sync edilir | ✅ Supabase Realtime built-in reconnect | Low | Integration: realtime disconnect/reconnect |
| 15 | Push notification — yeni randevu | Staff | `app-book-appointment/index.ts:183-189`, `send-push/index.ts` | Staff ve owner'a push gider | ✅ Fire-and-forget, hata durumunda log | Medium | Integration: booking + push verification |
| 16 | Push notification — dükkan onayı | Admin | `apps/web/src/app/admin/actions.ts:47-56` | Owner'a "onaylandı" push'u gider | ✅ Çalışıyor, `push_token` yoksa sessizce atlanır | Low | Integration: approve + push check |
| 17 | Shop approval — admin onaylar | Admin | `apps/web/src/app/admin/actions.ts:26-58` | Shop status aktif olur, owner bildirim alır | ✅ Timing-safe key comparison, service role | Low | Integration: approve flow |
| 18 | Shop rejection — admin reddeder | Admin | `apps/web/src/app/admin/actions.ts:60-65` | Shop status rejected olur | ✅ Çalışıyor, bildirim yok (eksik) | Low | Integration: reject flow |
| 19 | Widget token abuse — saldırgan token olmadan booking dener | Attacker | `widget-book-appointment/index.ts` | Token yoksa rate-limit'e takılır | ⚠️ Service role ile RPC çağrısı auth'suz çalışıyor | **High** | Security: widget booking without token |
| 20 | Invite token brute-force | Attacker | `open-invite/index.ts` | Geçersiz token 404 döner | ⚠️ Rate-limit yok, UUID brute-force zor ama mümkün | Medium | Security: invite token probing |
| 21 | Rate limit — aynı IP'den 5+ booking/10dk | Attacker | `widget-book-appointment/index.ts:8-37` | 429 döner | ✅ Upstash Redis rate limit, ama Redis yoksa devre dışı | Medium | Integration: rate limit test |
| 22 | Session expire — owner token'ı geçersiz | Owner | Supabase Auth, mobile app | Login sayfasına yönlendirilir | ✅ Supabase client auto-refresh | Low | E2E: expired session |
| 23 | Account deletion | User | `delete-account/index.ts` | Kullanıcı ve ilişkili veriler silinir | ✅ Çalışıyor | Low | Integration: delete account |
| 24 | Dükkan sahibi aynı anda iki cihazdan işlem yapar | Owner | Mobile app x2 | İki cihaz da gerçek zamanlı güncellenir | ✅ Realtime subscription her ikisine de event gönderir | Low | E2E: dual device |
| 25 | DST geçiş günü — randevu saatleri | All | `slot-utils.ts`, `localTimeToUTC` | UTC dönüşümü doğru yapılır | ✅ `Intl.DateTimeFormat` kullanılıyor, DST-safe | Low | Unit: DST transition dates |
| 26 | Hizmet süresi SLOT_GRANULARITY_MIN'e bölünmez (örn. 25dk) | Customer | `slot-utils.ts:46`, `computeAvailableSlots` | Slot step = max(granularity, duration) = 25dk | ✅ `stepMs = Math.max(SLOT_GRANULARITY_MIN * 60_000, durationMs)` | Low | Unit: 25min service slots |
| 27 | Personel çalışma saati dükkan saatinden farklı | Customer | `widget-get-availability:108-113` | Personelin kendi saatleri kullanılır | ✅ `resolveWorkingHours` personel schedule'ını override eder | Low | Unit: staff-specific hours |
| 28 | Dükkan working_hours boş `{}` | Customer | `slot-utils.ts:23-24`, `computeAvailableSlots` | Boş slot döner | ✅ `if (!hours?.enabled ...) return []` | Low | Unit: empty working hours |
| 29 | Müşteri booking sayfasında servis/staff değiştirir | Customer | `apps/web/src/app/[slug]/BookingClient.tsx` | Yeni availability fetch edilir | ⚠️ Client tarafında debounce kontrolü yoksa çok istek atılabilir | Medium | E2E: rapid service/staff change |
| 30 | `appointment_slots` tablosundan rekabet istihbaratı | Attacker | `appointment_slots` RLS `USING (true)` | İşletme yoğunluk verisi sızar | ⚠️ Herkese açık | **High** | Security: anon appointment_slots SELECT |

---

## 8. Test Gap List

### 8.1 Existing Tests (83 tests, 16 suites — mobile only ✅)

| Suite | Test Sayısı | Kapsam |
|---|---|---|
| `schedule-utils.test.ts` | ~5 | Scheduling algoritması |
| `appointment-time.test.ts` | ~5 | Zaman hesaplamaları |
| `revenue-mappers.test.ts` | ~5 | Gelir mapping |
| `block-actions.test.ts` | ~5 | Blok işlemleri |
| `appointment-mappers.test.ts` | ~5 | Randevu mapping |
| `appointment-modal-state.test.ts` | ~5 | UI state |
| `agenda-realtime.test.ts` | ~5 | Realtime |
| `service-mappers.test.ts` | ~5 | Servis mapping |
| `supabase-role.test.ts` | ~5 | Rol kontrolleri |
| `notifications.test.ts` | ~5 | Bildirimler |
| `analytics.test.ts` | ~5 | Analitik |
| `login-analytics.test.tsx` | ~5 | Login |
| `utils.test.ts` | ~5 | Genel util |
| `onboarding-utils.test.ts` | ~5 | Onboarding |
| `router-guard.test.ts` | ~5 | Router |
| `sentry.test.ts` | ~5 | Sentry |

### 8.2 Missing Tests

| Kategori | Eksik Test | Öncelik |
|---|---|---|
| **Unit — shared** | `computeAvailableSlots` edge case'leri (DST geçişi, boş working_hours, midnight crossing, buffer uygulaması) | P1 |
| **Unit — shared** | `localTimeToUTC` DST testleri (Mart/Ekim geçişleri için Europe/Istanbul) | P1 |
| **Integration — DB** | `create_appointment_atomic` race condition testi (aynı slota eşzamanlı booking) | P1 |
| **Integration — DB** | `create_appointment_atomic` ile inactive shop'a booking reddi | P1 |
| **Integration — DB** | `sync_appointment_slots` trigger doğruluğu | P1 |
| **Integration — DB** | `prevent_direct_appointment_scheduling_writes` trigger testi | P1 |
| **Integration — edge fn** | `widget-book-appointment` staff_id'siz booking | P0 |
| **Integration — edge fn** | `widget-book-appointment` geçersiz shop_slug ile booking | P0 |
| **Integration — edge fn** | `widget-book-appointment` rate limit testi | P2 |
| **Integration — edge fn** | `app-book-appointment` push notification dispatch testi | P2 |
| **Integration — edge fn** | `invite-barber` active olmayan shop reddi | P2 |
| **Integration — edge fn** | `accept-invite` idempotency (token zaten kullanılmış) | P2 |
| **E2E** | Tam booking flow: public page → availability → booking → mobile'da görünme | P1 |
| **E2E** | Cancel flow: booking → cancel → slot boşalması → tekrar booking | P1 |
| **E2E** | Concurrent booking: 5 kullanıcı aynı slot'u dener | P1 |
| **E2E** | Realtime: booking → mobile agenda anında güncellenir | P1 |
| **Security** | Anon `appointment_slots` SELECT | P0 |
| **Security** | Widget token brute-force | P2 |
| **Security** | Invite token brute-force | P2 |
| **Security** | Cross-shop booking denemesi | P0 |

---

## 9. Prioritized Remediation Plan

### 🔴 NOW (Deployment Blocker — Production'a çıkmadan ÖNCE)

| # | Aksiyon | Dosya | Tahmini Efor |
|---|---|---|---|
| 1 | **P0-1 Fix:** `widget-book-appointment`'a staff_id olmadan da shop validasyonu ekle | `supabase/functions/widget-book-appointment/index.ts:121` | 15 dk |
| 2 | **P0-2 Fix:** `appointment_slots` ve `block_slots` anon SELECT'i scope'la (shop_id filtresi ekle veya channel scope yap) | `supabase/migrations/20240101000002_rls_policies.sql:177-178` | 1 saat |
| 3 | **P0-3 Fix:** Widget booking edge function'larında RPC öncesi tam auth/validation zinciri kur | `supabase/functions/widget-book-appointment/index.ts` | 30 dk |
| 4 | **P0-1/P0-3 Test:** Security integration testleri yaz | Yeni test dosyası | 1 saat |

### 🟠 BEFORE PRODUCTION (İlk release öncesi)

| # | Aksiyon | Tahmini Efor |
|---|---|---|
| 5 | **P1-1 Fix:** `packages/shared/src/phone-utils.ts` oluştur, `isValidPhone` canonical kopyayı buraya taşı, edge function'lardan duplicate'leri kaldır | 1 saat |
| 6 | **P1-2 Fix:** `invite-barber`'daki `shops.status` fallback kodunu kaldır | 15 dk |
| 7 | **P1-4 Fix:** CORS `getAllowOrigin` fallback `*` yerine strict origin kontrolü | 15 dk |
| 8 | **P2-2 Fix:** `block-walkin`'e Upstash rate-limit ekle | 30 dk |
| 9 | **P2-5:** Tüm edge function'lara structured JSON logging ekle | 2 saat |
| 10 | **P2-6:** Booking endpoint'lerine `idempotency_key` desteği ekle | 2 saat |
| 11 | **CV-3:** Admin panelini edge function arkasına al (service role'ü Server Action'dan çıkar) | 2 saat |
| 12 | **RPC cleanup:** Dead RPC'leri tespit edip `REVOKE EXECUTE` ile kapat | 30 dk |
| 13 | **E2E test:** Temel booking flow'u (web → edge fn → DB → mobile realtime) | 4 saat |
| 14 | **Migration test:** `supabase db reset` ile tüm migration'ları sıfırdan uygula | 15 dk |
| 15 | **Push notification:** `send-push` ve Expo arasında retry + dead letter queue | 2 saat |

### 🟡 AFTER PRODUCTION (İlk release sonrası, scale öncesi)

| # | Aksiyon | Tahmini Efor |
|---|---|---|
| 16 | **P2-7:** `daily-summary-push` başarısızlık monitoring'i | 1 saat |
| 17 | **P3-1:** Dead code temizliği | 2 saat |
| 18 | **P3-3:** `next lint` → ESLint CLI migration | 30 dk |
| 19 | **P3-4:** `widget-get-availability`'daki duplicate `WorkingHours` tipini kaldır | 10 dk |
| 20 | **P2-1:** Availability cache TTL'ini 15s'e indir, client refetch logic'ini belgele | 30 dk |
| 21 | **Realtime channel scope:** Her shop için ayrı Realtime channel, fan-out azaltma | 3 saat |
| 22 | **Performance:** Sık kullanılan sorgulara index analizi ve eksik index'leri ekleme | 2 saat |
| 23 | **Observability:** Supabase Logflare entegrasyonu, booking flow metrikleri | 4 saat |

---

## 10. Sonuç ve Tavsiye

### Release Kararı: ⚠️ CONDITIONAL PASS

Sistem temel mimari açıdan sağlam:
- Scheduling algoritması (`@berber/shared`) tek kaynaktan yönetiliyor ✅
- Race condition koruması (advisory lock + gist exclude) güçlü ✅
- RLS policy'leri büyük ölçüde doğru ✅
- Migration zinciri final state'te tutarlı ✅
- Tip güvenliği (type-check başarılı, database.types senkron) ✅

Ancak **3 P0 sorunu production'a çıkmadan önce mutlaka çözülmeli**:
1. Widget booking'te shop validation bypass'ı (P0-1)
2. `appointment_slots` ve `block_slots` tablolarının herkese açık olması (P0-2)
3. Widget booking'te service role ile auth'suz RPC çağrısı (P0-3)

Bu 3 sorun çözüldükten ve ilgili security testleri eklendikten sonra production release'i güvenle yapılabilir.

### Monitoring Önerileri

Production'da şu metrikleri izleyin:
- `widget-book-appointment` 409 CONFLICT oranı (yüksekse cache TTL düşürülmeli)
- `create_appointment_atomic` RPC latency (p99)
- `appointment_slots` Realtime event gecikmesi
- `send-push` başarısızlık oranı
- Upstash Redis rate-limit hit oranı
- `widget-get-availability` cache hit oranı