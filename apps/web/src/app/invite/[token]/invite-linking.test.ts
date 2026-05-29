import { describe, it, expect } from 'vitest';
import {
  getInviteDeepLink,
  getInviteIntentUrl,
  getInviteOpenUrl,
  shouldAutoOpen,
  ATTEMPT_KEY_PREFIX,
} from './invite-linking';

const TOKEN = 'abc123-def456';
const ALT_TOKEN = 'xyz789-uvw012';
const FALLBACK = 'https://siradaki.app/invite/abc123-def456';

// ── shouldAutoOpen ─────────────────────────────────────────────

class FakeStorage implements Pick<Storage, 'getItem'> {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function attemptKey(token: string) {
  return `${ATTEMPT_KEY_PREFIX}${token}`;
}

describe('shouldAutoOpen', () => {
  it('returns true when no prior attempt recorded', () => {
    const storage = new FakeStorage();
    expect(shouldAutoOpen(storage, TOKEN)).toBe(true);
  });

  it('returns false when same token already attempted', () => {
    const storage = new FakeStorage();
    storage.setItem(attemptKey(TOKEN), '1');
    expect(shouldAutoOpen(storage, TOKEN)).toBe(false);
  });

  it('returns true for a different token even when another token was attempted', () => {
    const storage = new FakeStorage();
    storage.setItem(attemptKey(TOKEN), '1');
    expect(shouldAutoOpen(storage, ALT_TOKEN)).toBe(true);
  });

  it('returns false for same token, then true for alternate token after cleanup', () => {
    const storage = new FakeStorage();
    storage.setItem(attemptKey(TOKEN), '1');
    expect(shouldAutoOpen(storage, TOKEN)).toBe(false);
    expect(shouldAutoOpen(storage, ALT_TOKEN)).toBe(true);
  });
});

// ── getInviteDeepLink ─────────────────────────────────────────

describe('getInviteDeepLink', () => {
  it('returns siradaki://invite/{token}', () => {
    const link = getInviteDeepLink(TOKEN);
    expect(link).toBe(`siradaki://invite/${encodeURIComponent(TOKEN)}`);
  });

  it('encodes special characters in token', () => {
    const link = getInviteDeepLink('a b/c');
    expect(link).toBe('siradaki://invite/a%20b%2Fc');
  });
});

// ── getInviteIntentUrl ────────────────────────────────────────

describe('getInviteIntentUrl', () => {
  it('returns an intent:// URL for the invite token', () => {
    const url = getInviteIntentUrl(TOKEN, FALLBACK);
    expect(url.startsWith('intent://invite/')).toBe(true);
    expect(url).toContain(encodeURIComponent(TOKEN));
  });

  it('includes scheme=siradaki', () => {
    const url = getInviteIntentUrl(TOKEN, FALLBACK);
    expect(url).toContain('scheme=siradaki');
  });

  it('includes package=com.siradaki.app', () => {
    const url = getInviteIntentUrl(TOKEN, FALLBACK);
    expect(url).toContain('package=com.siradaki.app');
  });

  it('includes encoded S.browser_fallback_url', () => {
    const url = getInviteIntentUrl(TOKEN, FALLBACK);
    const encodedFallback = encodeURIComponent(FALLBACK);
    expect(url).toContain(`S.browser_fallback_url=${encodedFallback}`);
  });
});

// ── getInviteOpenUrl ──────────────────────────────────────────

describe('getInviteOpenUrl', () => {
  describe('Android user agent', () => {
    const androidUA =
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

    it('returns an intent:// URL', () => {
      const url = getInviteOpenUrl(TOKEN, androidUA, FALLBACK);
      expect(url.startsWith('intent://invite/')).toBe(true);
    });

    it('includes scheme=siradaki', () => {
      const url = getInviteOpenUrl(TOKEN, androidUA, FALLBACK);
      expect(url).toContain('scheme=siradaki');
    });

    it('includes package=com.siradaki.app', () => {
      const url = getInviteOpenUrl(TOKEN, androidUA, FALLBACK);
      expect(url).toContain('package=com.siradaki.app');
    });

    it('includes S.browser_fallback_url', () => {
      const url = getInviteOpenUrl(TOKEN, androidUA, FALLBACK);
      expect(url).toContain('S.browser_fallback_url');
    });
  });

  describe('non-Android user agent', () => {
    const iosUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

    it('returns siradaki://invite/{token} for iOS', () => {
      const url = getInviteOpenUrl(TOKEN, iosUA, FALLBACK);
      expect(url).toBe(`siradaki://invite/${encodeURIComponent(TOKEN)}`);
    });

    it('returns siradaki://invite/{token} for desktop Chrome', () => {
      const desktopUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
      const url = getInviteOpenUrl(TOKEN, desktopUA, FALLBACK);
      expect(url).toBe(`siradaki://invite/${encodeURIComponent(TOKEN)}`);
    });
  });
});