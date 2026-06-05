# 01 - Ayni Session: Repo, Statik Kontrol, Build

## Amac

Repo, workspace, install, lint, typecheck, test ve build sagligini dogrula.

## Komutlar

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web build
pnpm --filter mobile expo-doctor
```

## Kontroller

- `pnpm-workspace.yaml`, root `package.json` ve scriptler incelendi.
- `apps/mobile`, `apps/web`, `packages/shared`, `packages/db`, `supabase/functions`, `supabase/migrations` mevcut.
- Lockfile degismedi.
- Lint/typecheck/test geciyor veya eksik scriptler `NOT RUN` raporlandi.
- Web production build basarili.
- Expo doctor kritik hata vermiyor.

## Rapor

```text
Install:
Lint:
Typecheck:
Tests:
Web build:
Expo doctor:
Blockers:
Risks:
```

