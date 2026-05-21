# AGENTS.md

## Must-follow constraints

- **pnpm only** — `npm` veya `yarn` kullanma. Workspace `pnpm-workspace.yaml` ile yönetiliyor.
- **`@berber/shared` tek kaynak.** Edge fonksiyonları `supabase/functions/import_map.json` üzerinden `@berber/shared/slot-utils`, `@berber/shared/types`, `@berber/shared/constants` aliaslarıyla `packages/shared/src/*` dosyalarını doğrudan import eder. Tek kopyayı `packages/shared/src/`'de güncelle.
- **`database.types.ts` iki kopya** — Supabase generator ürettiği için manuel sync gerekli: `cp packages/db/src/database.types.ts supabase/functions/_shared/database.types.ts`
- **Shared paket dosyalarında relative import'lar `.ts` uzantılı olmak zorundadır** (Deno gereği).
- **`btree_gist` extension** migration'lardan önce aktif olmalı; `20240101000001_initial.sql` bunu içeriyor, kaldırma.
- **`widget_tokens.token_hash`** alanına raw token YAZILMAZ — her zaman SHA256 hash (`sha256()` fonksiyonu `supabase/functions/_shared/supabase-admin.ts`'de).
- **`appointments` tablosuna** doğrudan INSERT olmaz — her zaman `app-book-appointment` veya `widget-book-appointment` edge function (service role) üzerinden.
- **`appointment_slots` mirror tablo** — `appointments`'a INSERT/UPDATE/DELETE olduğunda trigger ile senkronize edilir. Anon Realtime subscription'ları için zorunlu. `appointment_slots`'a manuel INSERT YAPMA — sadece `sync_appointment_slots` trigger'ı yazar.
- Yeni migration eklerken `gist exclude` constraint'lerinin bozulmadığını `supabase db push` ile doğrula.

## Validation before finishing

```bash
supabase db reset                                               # Migration'ları sıfırdan uygula
supabase functions serve block-walkin --env-file .env.local     # Edge fn lokal test
pnpm db:check                                                   # database.types senkron kontrolü
```

## Repo-specific conventions

- Slot granülaritesi `packages/shared/src/constants.ts`'deki `SLOT_GRANULARITY_MIN` sabitiyle değiştirilir, `slot-utils.ts`'e hardcode edilmez.
- `working_hours` JSONB formatı: `{"mon": {"open": "09:00", "close": "19:00", "enabled": true}, ...}`. Ayrı tablo yok.
- Edge functions Deno runtime'da çalışır — Node.js import'ları değil `https://esm.sh/` ve `https://deno.land/std/` kullan.
- Supabase tipleri her şema değişikliğinden sonra **iki yere** üretilir:
  ```bash
  supabase gen types typescript --local > packages/db/src/database.types.ts
  cp packages/db/src/database.types.ts supabase/functions/_shared/database.types.ts
  ```

## Important locations

| Dosya | Açıklama |
|---|---|
| `packages/shared/src/slot-utils.ts` | **Tek kaynak** availability algoritması — tüm edge fn'ler kullanır |
| `packages/shared/src/types.ts` | `WorkingHours`, `Slot`, `OccupiedRange` tipleri |
| `packages/shared/src/constants.ts` | `SLOT_GRANULARITY_MIN`, `MIN_BOOKING_NOTICE_MINUTES` vb. |
| `supabase/functions/import_map.json` | `@berber/shared/*` → `packages/shared/src/*` Deno alias'ı |
| `supabase/functions/_shared/supabase-admin.ts` | Service role client + SHA256 hash helper |
| `supabase/functions/block-walkin/index.ts` | Widget auth + block INSERT |
| `supabase/functions/widget-get-availability/index.ts` | `computeAvailableSlots` çağrısı |
| `packages/db/src/database.types.ts` | Auto-generated Supabase tipleri (kaynak) |
| `supabase/functions/_shared/database.types.ts` | Yukarının kopyası — edge fn'lerin kullandığı |
| `supabase/migrations/` | 30 migration — tüm şema burada |

## Change safety rules

- `slot-utils.ts` değişikliği → `packages/shared/src/slot-utils.ts` güncelle, tüm edge fn'ler etkilenir.
- `appointment_slots` tablo yapısı değişirse: hem trigger fonksiyonunu hem `database.types.ts` (iki kopya) güncelle.
- `barbers.working_hours` JSONB şemasını değiştirirsen `WorkingHours` tipini `packages/shared/src/types.ts`'de güncelle.
- `staff_schedules` değişikliği → `widget-get-availability` ve `get_occupied_ranges` RPC bu tablodan beslenir.
- Edge function JWT verify ayarları `supabase/config.toml`'da: `block-walkin` ve `widget-book-appointment` `verify_jwt = false` (anon/widget auth).

## Known gotchas

- `gist exclude` constraint sadece `status = 'confirmed'` için aktif — `cancelled` randevunun saatine yeni randevu alınabilir (intentional).
- `computeAvailableSlots()` geçmişte kalan slotları `BOOKING_GRACE_PERIOD_MIN` (5 dk) grace period ile filtreler.
- `app-book-appointment` edge fn, PostgreSQL `23P01` error code'u ile gist constraint ihlalini yakalar — bu kodu değiştirme.
- Supabase Realtime subscription'larında VIEW kullanılamaz — `appointment_slots` ayrı tablo + trigger pattern'i bu yüzden var.
- `Intl.DateTimeFormat` `localTimeToUTC()` içinde DST geçişlerini doğru handle eder; manuel offset hesaplamasıyla değiştirme.
- **Duplicate migration timestamp:** `20260519130000_add_staff_slug.sql` ve `20260519130000_shops_unique_owner_user_id.sql` aynı timestamp'e sahip. Supabase alfabetik sırayla uygular (`add_staff_slug` önce). Üretimde uygulandığı için isim değiştirilmemelidir.
