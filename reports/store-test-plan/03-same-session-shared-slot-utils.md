# 03 - Ayni Session: Shared Slot Utils

## Amac

`packages/shared/src/slot-utils.ts` tek kaynak availability algoritmasini dogrula.

## Kontroller

- Gecmis slotlar filtrelenir.
- `BOOKING_GRACE_PERIOD_MIN` uygulanir.
- `MIN_BOOKING_NOTICE_MINUTES` uygulanir.
- `SLOT_GRANULARITY_MIN` constants'tan okunur.
- Working hours disabled gunlerde slot uretmez.
- Open/close disinda slot uretmez.
- Occupied ranges slotlari dogru kapatir.
- DST/timezone off-by-one hatasi yok.
- Shared relative import'lar `.ts` uzantili.
- Import map aliaslari `packages/shared/src/*` dosyalarina gider.

## Rapor

```text
Slot tests:
Grace/min notice:
Working hours:
Occupied ranges:
DST/timezone:
Deno imports:
Blockers:
Risks:
```

