# Sentry React Native Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production-ready Sentry error monitoring to the Expo React Native mobile app for GitHub issue #28.

**Architecture:** Sentry initializes once at the mobile app root before navigation renders, stays disabled when `EXPO_PUBLIC_SENTRY_DSN` is absent, and receives the authenticated Supabase user id from the existing root auth session. Expo/EAS source map upload is configured through the official `@sentry/react-native` Expo integration and EAS environment variables, while route-level crash isolation is handled by Sentry's React error boundary around the app stack.

**Tech Stack:** Expo SDK 51, Expo Router, React Native 0.74, Supabase auth, `@sentry/react-native`, Jest, pnpm workspace.

---

## References

- Expo Sentry guide: https://docs.expo.dev/guides/using-sentry/
- Sentry React Native manual setup: https://docs.sentry.dev/platforms/react-native/manual-setup/
- Issue: https://github.com/yekedun/the-realbarber/issues/28

## File Structure

- Modify: `apps/mobile/package.json`
  - Adds `@sentry/react-native` using pnpm only.
- Modify: `apps/mobile/app.config.ts`
  - Adds the Sentry Expo config plugin.
  - Passes Sentry organization/project values from env when present.
- Modify: `apps/mobile/metro.config.js`
  - Wraps the existing Metro config with Sentry's Metro config helper.
- Create: `apps/mobile/lib/sentry.ts`
  - Owns all Sentry initialization, user binding, and no-op behavior when DSN is missing.
  - Keeps `app/_layout.tsx` small and testable.
- Create: `apps/mobile/lib/__tests__/sentry.test.ts`
  - Unit-tests env-gated initialization and user binding.
- Modify: `apps/mobile/app/_layout.tsx`
  - Calls `initSentry()` once at module load.
  - Calls `setSentryUserFromSession(session)` whenever auth state resolves.
  - Wraps the rendered `<Stack />` in an error boundary.
- Modify: `apps/mobile/eas.json`
  - Documents required env names in profiles only if the existing project already stores env inline; otherwise do not put secrets here.
- Optional local-only file, do not commit unless already tracked: `.env.local`
  - Add `EXPO_PUBLIC_SENTRY_DSN` for local manual testing.

## Required External Setup

- Create a Sentry React Native project.
- Capture these values from Sentry:
  - `EXPO_PUBLIC_SENTRY_DSN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SENTRY_AUTH_TOKEN`
- Store `EXPO_PUBLIC_SENTRY_DSN` as an EAS env var visible to app builds.
- Store `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` as EAS build env vars or CI secrets. Do not commit token values.

### Task 1: Install Sentry Dependency

**Files:**
- Modify: `apps/mobile/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Install with pnpm**

Run from repo root:

```bash
pnpm add @sentry/react-native --filter @berber/mobile
```

Expected: `apps/mobile/package.json` contains `@sentry/react-native`; lockfile updates. Do not use `npm` or `yarn`.

- [ ] **Step 2: Verify dependency tree**

Run:

```bash
pnpm --filter @berber/mobile list @sentry/react-native
```

Expected: package is listed under `@berber/mobile`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/package.json pnpm-lock.yaml
git commit -m "chore(mobile): add sentry react native"
```

### Task 2: Add Test-Covered Sentry Utility

**Files:**
- Create: `apps/mobile/lib/sentry.ts`
- Create: `apps/mobile/lib/__tests__/sentry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/mobile/lib/__tests__/sentry.test.ts`:

```ts
const initMock = jest.fn();
const setUserMock = jest.fn();
const nativeWrapMock = jest.fn((component: unknown) => component);

jest.mock('@sentry/react-native', () => ({
  init: initMock,
  setUser: setUserMock,
  wrap: nativeWrapMock,
  ReactNativeTracing: jest.fn(),
}));

describe('sentry utility', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    initMock.mockClear();
    setUserMock.mockClear();
    nativeWrapMock.mockClear();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not initialize Sentry when DSN is missing', async () => {
    const { initSentry } = await import('../sentry');

    initSentry();
    initSentry();

    expect(initMock).not.toHaveBeenCalled();
  });

  it('initializes Sentry once when DSN is configured', async () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://public@example.ingest.sentry.io/123';
    const { initSentry } = await import('../sentry');

    initSentry();
    initSentry();

    expect(initMock).toHaveBeenCalledTimes(1);
    expect(initMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: 'https://public@example.ingest.sentry.io/123',
        enabled: true,
        enableAutoSessionTracking: true,
      }),
    );
  });

  it('sets a minimal Sentry user from a Supabase session', async () => {
    const { setSentryUserFromSession } = await import('../sentry');

    setSentryUserFromSession({
      user: {
        id: 'user-123',
        email: 'owner@example.com',
      },
    } as any);

    expect(setUserMock).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'owner@example.com',
    });
  });

  it('clears the Sentry user when session is null', async () => {
    const { setSentryUserFromSession } = await import('../sentry');

    setSentryUserFromSession(null);

    expect(setUserMock).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
```

Expected: FAIL because `apps/mobile/lib/sentry.ts` does not exist.

- [ ] **Step 3: Implement the utility**

Create `apps/mobile/lib/sentry.ts`:

```ts
import type { Session } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';

let initialized = false;

export function initSentry() {
  if (initialized) return;

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  initialized = true;
  Sentry.init({
    dsn,
    enabled: true,
    enableAutoSessionTracking: true,
    tracesSampleRate: 0.1,
  });
}

export function setSentryUserFromSession(session: Session | null) {
  if (!session) {
    Sentry.setUser(null);
    return;
  }

  Sentry.setUser({
    id: session.user.id,
    email: session.user.email ?? undefined,
  });
}

export const SentryErrorBoundary = Sentry.ErrorBoundary;
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/sentry.ts apps/mobile/lib/__tests__/sentry.test.ts
git commit -m "feat(mobile): add sentry utility"
```

### Task 3: Wire Sentry Into Expo Config and Metro

**Files:**
- Modify: `apps/mobile/app.config.ts`
- Modify: `apps/mobile/metro.config.js`

- [ ] **Step 1: Inspect current Metro config**

Run:

```bash
Get-Content apps/mobile/metro.config.js
```

Expected current shape:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

If the file has extra existing customizations, preserve them and wrap the final config.

- [ ] **Step 2: Update Metro config**

Change `apps/mobile/metro.config.js` to:

```js
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
```

- [ ] **Step 3: Add the Sentry Expo plugin**

In `apps/mobile/app.config.ts`, add this plugin entry after `'expo-router'`:

```ts
[
  '@sentry/react-native/expo',
  {
    organization: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
],
```

The `plugins` array should begin like this:

```ts
plugins: [
  'expo-router',
  [
    '@sentry/react-native/expo',
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
  ],
  'expo-secure-store',
  ...
],
```

- [ ] **Step 4: Validate Expo config**

Run:

```bash
pnpm --filter @berber/mobile exec expo config --type public
```

Expected: command exits 0 and lists the app config without plugin resolution errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app.config.ts apps/mobile/metro.config.js
git commit -m "chore(mobile): configure sentry for expo"
```

### Task 4: Wire Root Layout User Context and Error Boundary

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: Add imports and initialize at module load**

Add this import:

```ts
import { initSentry, SentryErrorBoundary, setSentryUserFromSession } from '../lib/sentry';
```

Call initialization after `SplashScreen.preventAutoHideAsync();`:

```ts
SplashScreen.preventAutoHideAsync();
initSentry();
```

- [ ] **Step 2: Set Sentry user when auth state changes**

Add this effect after the auth subscription effect:

```ts
useEffect(() => {
  if (session === undefined) return;
  setSentryUserFromSession(session);
}, [session]);
```

- [ ] **Step 3: Wrap the app stack**

Change the final return from:

```tsx
return <Stack screenOptions={{ headerShown: false }} />;
```

to:

```tsx
return (
  <SentryErrorBoundary>
    <Stack screenOptions={{ headerShown: false }} />
  </SentryErrorBoundary>
);
```

- [ ] **Step 4: Typecheck**

Run:

```bash
pnpm --filter @berber/mobile typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): wire sentry into root layout"
```

### Task 5: Add Manual Verification Screen Hook Without Shipping a Visible Test Button

**Files:**
- Modify: `apps/mobile/lib/sentry.ts`
- Modify: `apps/mobile/lib/__tests__/sentry.test.ts`

- [ ] **Step 1: Add a test for explicit capture**

Extend the mock in `apps/mobile/lib/__tests__/sentry.test.ts`:

```ts
const captureExceptionMock = jest.fn();

jest.mock('@sentry/react-native', () => ({
  init: initMock,
  setUser: setUserMock,
  wrap: nativeWrapMock,
  captureException: captureExceptionMock,
  ReactNativeTracing: jest.fn(),
}));
```

Add:

```ts
it('captures manual verification errors', async () => {
  const { captureSentryVerificationError } = await import('../sentry');

  captureSentryVerificationError();

  expect(captureExceptionMock).toHaveBeenCalledWith(expect.any(Error));
  expect(captureExceptionMock.mock.calls[0][0].message).toBe('Sentry mobile verification error');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
```

Expected: FAIL because `captureSentryVerificationError` is not exported.

- [ ] **Step 3: Implement explicit capture helper**

Add to `apps/mobile/lib/sentry.ts`:

```ts
export function captureSentryVerificationError() {
  Sentry.captureException(new Error('Sentry mobile verification error'));
}
```

Do not add a permanent visible button to production UI. For manual verification, temporarily call this helper from a local-only debug action, confirm the event arrives in Sentry, then remove the call before committing.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/sentry.ts apps/mobile/lib/__tests__/sentry.test.ts
git commit -m "test(mobile): add sentry verification helper"
```

### Task 6: EAS Environment and Source Map Verification

**Files:**
- Read: `apps/mobile/eas.json`
- No secret files committed.

- [ ] **Step 1: Inspect EAS profiles**

Run:

```bash
Get-Content apps/mobile/eas.json
```

Expected: identify production and preview profiles without adding secrets to git.

- [ ] **Step 2: Set EAS environment variables**

Run these with real values from Sentry:

```bash
pnpm --filter @berber/mobile exec eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value "<dsn>" --environment production --visibility plaintext
pnpm --filter @berber/mobile exec eas env:create --name SENTRY_ORG --value "<org-slug>" --environment production --visibility plaintext
pnpm --filter @berber/mobile exec eas env:create --name SENTRY_PROJECT --value "<project-slug>" --environment production --visibility plaintext
pnpm --filter @berber/mobile exec eas env:create --name SENTRY_AUTH_TOKEN --value "<auth-token>" --environment production --visibility secret
```

If the team manages EAS env vars through the dashboard, record the same four names there instead.

- [ ] **Step 3: Run local typecheck and focused tests**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
pnpm --filter @berber/mobile typecheck
```

Expected: both PASS.

- [ ] **Step 4: Create a preview or production build after EAS quota allows it**

Run one of:

```bash
pnpm --filter @berber/mobile build:android
pnpm --filter @berber/mobile build:ios
```

Expected: EAS build completes, Sentry source map upload logs appear, and Sentry release is created.

- [ ] **Step 5: Manual event verification**

Temporarily trigger:

```ts
captureSentryVerificationError();
```

Expected: Sentry shows an issue named `Sentry mobile verification error` with app version, platform, and user id when authenticated. Remove the temporary call before committing.

- [ ] **Step 6: Commit any non-secret config updates**

```bash
git status --short
git add apps/mobile/eas.json
git commit -m "chore(mobile): document sentry eas setup"
```

Only run this commit if `apps/mobile/eas.json` changed. Do not commit `.env.local` or Sentry token values.

### Task 7: Close GitHub Issue

**Files:**
- No code files.

- [ ] **Step 1: Confirm final status**

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
pnpm --filter @berber/mobile typecheck
git status --short
```

Expected: tests and typecheck PASS; working tree contains only intentional changes.

- [ ] **Step 2: Comment on issue #28**

Run:

```bash
gh issue comment 28 --repo yekedun/the-realbarber --body "Implemented Sentry React Native setup for the Expo mobile app: SDK install, Expo plugin, Metro config, root initialization, auth user binding, error boundary, focused tests, and EAS env/source-map setup notes. Verification: pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand; pnpm --filter @berber/mobile typecheck."
```

- [ ] **Step 3: Close issue #28**

Run:

```bash
gh issue close 28 --repo yekedun/the-realbarber --comment "Sentry mobile error monitoring setup is complete."
```

## Validation Before Finishing

Run:

```bash
pnpm --filter @berber/mobile exec jest sentry.test.ts --runInBand
pnpm --filter @berber/mobile typecheck
pnpm --filter @berber/mobile exec expo config --type public
```

Expected:

- Focused Sentry tests pass.
- TypeScript passes.
- Expo config resolves the Sentry plugin.

Do not run `supabase db reset` for this issue unless database files changed. This issue only touches the Expo mobile app and does not affect migrations, shared slot logic, edge functions, or database generated types.

## Self-Review Notes

- Spec coverage: all issue #28 checklist items are covered except the external Sentry project creation, which is explicitly listed under required external setup.
- Placeholder scan: no implementation step relies on unspecified code; secret values are intentionally represented as operator-supplied inputs.
- Type consistency: `initSentry`, `setSentryUserFromSession`, `SentryErrorBoundary`, and `captureSentryVerificationError` are defined before use.
