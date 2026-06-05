# 05 - Ayni Session: Web, Admin, Invite

## Kontroller

- Web route'lari listelendi.
- `apps/web/src/app/admin/actions.ts` incelendi.
- Admin `ADMIN_SECRET_KEY` ile korunuyor.
- Timing-safe compare dogru.
- Pending shop approve ile `active`, reject ile `rejected`.
- Approve sonrasi push bildirimi deneniyor.
- `apps/web/src/app/invite/[token]/page.tsx` valid/invalid/expired/used durumlari dogru.
- Deep link ve store fallback dogru.
- Web smoke testte console/hydration kritik hatasi yok.
- Mobil ve desktop responsive bozulmuyor.

## Rapor

```text
Route inventory:
Admin protection:
Approve/reject:
Invite states:
Deep link/fallback:
Web smoke:
Blockers:
Risks:
```

