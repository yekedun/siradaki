# 08 - Farkli Session: Performance

## Uyari

Tek basina calistir. Diger staging testleriyle ayni anda calistirma.

## Testler

- Availability load: 50, 100, 250 eszamanli istek.
- Senaryolar: 1 shop/1 staff, 1 shop/10 staff, yogun randevulu gun, uzun tarih araligi.
- Booking stress: ayni slot ve farkli slotlara coklu booking.
- Push batch: 10 token, 100 token, invalid/expired token.

## Olculer

- p50 latency
- p95 latency
- error rate
- timeout
- DB slow query
- duplicate appointment var mi

## Rapor

```text
Availability p50:
Availability p95:
Error rate:
Booking stress:
Push batch:
DB slow queries:
Blockers:
Risks:
```

