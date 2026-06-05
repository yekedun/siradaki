# 04 - Ayni Session: Edge Functions

## Uyari

`supabase functions serve` port/env kullanir. Tek basina calistir.

## Komut

```bash
supabase functions serve block-walkin --env-file .env.local
```

## Kontroller

- `verify_jwt=false`: `block-walkin`, `widget-book-appointment`, `widget-get-availability`, `open-invite`.
- CORS preflight dogru.
- Eksik/bozuk JSON 400 doner.
- Auth gereken function'lar auth olmadan reddeder.
- `app-book-appointment` `23P01` conflict yakalar.
- Widget token raw DB'ye yazilmaz, SHA256 hash kullanilir.
- `register-shop` yeni shop'u `pending` baslatir.
- `invite-barber` active olmayan shop'u reddeder ve `42703` fallback korunur.
- `open-invite` valid/used/expired/invalid token ayrimi yapar.
- `accept-invite` idempotent ve duplicate staff uretmez.
- `delete-account` policy'ye uygun siler/anonymize eder.
- Push function'lar invalid token'da sistemi dusurmez.

## Rapor

```text
Function inventory:
JWT config:
CORS:
Validation:
Token safety:
Booking conflict:
Invite flow:
Account deletion:
Blockers:
Risks:
```

