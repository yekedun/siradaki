# 02 - Ayni Session: Database ve Migration

## Uyari

`supabase db reset` lokal database'i sifirlar. Tek basina calistir.

## Komutlar

```bash
supabase db reset
pnpm db:check
```

## Kontroller

- Tum migration'lar sifirdan uygulanir.
- `btree_gist` extension aktif.
- `appointments` gist exclude constraint sadece `confirmed` icin calisir.
- Cancelled appointment saatine yeni randevu alinabilir.
- `appointment_slots` trigger ile senkronize olur.
- `packages/db/src/database.types.ts` ve `supabase/functions/_shared/database.types.ts` sync.

## Rapor

```text
Migration reset:
Types sync:
Appointment conflict constraint:
Appointment slots trigger:
Blockers:
Risks:
```

