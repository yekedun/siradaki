# 06 - Ayni Session: Security

## Kontroller

- Service role key, admin secret, Resend key, Expo token ve raw widget token repo/client bundle'a sizmiyor.
- `SUPABASE_SERVICE_ROLE_KEY` sadece edge/server tarafinda.
- Musteri sadece kendi randevusunu gorur/iptal eder.
- Staff sadece yetkili shop/staff randevusunu gorur/iptal eder.
- Shop owner sadece kendi shop'unu yonetir.
- Admin secret'siz islem yapamaz.
- Widget token sadece ilgili scope icin gecerli.
- `widget_tokens.token_hash` raw token icermez.
- Invite token expire/used kontrolleri dogru.
- SQL injection, XSS, long input, invalid date/time, malformed JSON ve duplicate submit riskleri incelendi.
- Response/log secret, stack trace veya gereksiz PII sizdirmaz.

## Rapor

```text
Secret scan:
Client bundle risk:
Authorization:
Token safety:
Input validation:
Response/log safety:
Blockers:
Risks:
```

