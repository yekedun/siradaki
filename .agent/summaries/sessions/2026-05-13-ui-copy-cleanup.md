# 2026-05-13 UI Copy Cleanup

## Summary

- Reviewed current dirty workspace state without scanning the full repo.
- Kept existing user changes and only polished visible copy in changed customer/mobile files.
- Fixed remaining inconsistent title-case labels and verified Turkish copy no longer shows encoding drift in the reviewed files.

## Validation

- `git diff --check` passed; only Git CRLF warnings were reported.
- `pnpm --filter @berber/customer type-check` passed.
- `pnpm --filter @berber/mobile type-check` passed.

## Follow-Up

- Workspace still contains intentional uncommitted customer/mobile UI copy changes plus agent state summaries.
