# 07 - Farkli Session: Race Condition

## Gereksinim

En az iki ayri auth kullanicisi veya iki ayri terminal/session gerekir.

## Testler

- Ayni staff ve ayni slot icin paralel booking: sadece 1 confirmed appointment olusmali.
- Cakismayan farkli slotlara paralel booking: gecerli booking'ler basarili olmali.
- Ayni invite token iki session ile accept: token tek kez consume edilmeli, duplicate staff olmamali.
- Ayni widget token ile availability/booking concurrency: token dogrulama stabil olmali.

## Rapor

```text
Parallel same-slot booking:
Parallel different-slot booking:
Invite accept race:
Widget token concurrency:
Blockers:
Risks:
```

