# Store Test Plan Index

Bu klasordeki her dosya Claude Code'a ayri session olarak verilebilir.

## Ayni Anda Baslat

- `01-same-session-repo-static.md`
- `03-same-session-shared-slot-utils.md`
- `05-same-session-web-admin.md`
- `06-same-session-security.md`
- `10-store-console.md`
- `11-privacy-account-deletion.md`

## Tek Basina Calistir

- `02-same-session-database.md`
- `04-same-session-edge-functions.md`
- `08-cross-session-performance.md`
- `12-release-gate.md`

## Faz 1 Bittikten Sonra Ayni Anda Baslat

- `07-cross-session-race-tests.md`
- `09-cross-session-mobile-devices.md`

## En Son

- `12-release-gate.md`

## Genel Kurallar

- Sadece `pnpm` kullan.
- `npm` veya `yarn` kullanma.
- Production DB, store console veya production env degisikligi yapmadan once onay iste.
- Her raporda `PASS`, `FAIL`, `BLOCKED`, `NOT RUN` kullan.
- Basarisiz testte komut, dosya/satir ve kok neden yaz.

