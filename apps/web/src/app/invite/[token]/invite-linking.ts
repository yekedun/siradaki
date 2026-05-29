/**
 * Internal-only deep link helpers for the invite page.
 * These URLs MUST NOT be rendered in the UI — they are only used
 * for navigation via window.location / Intent.
 */

const IOS_CUSTOM_SCHEME = 'siradaki';
const ANDROID_PACKAGE = 'com.siradaki.app';
const DEEP_LINK_PREFIX = `${IOS_CUSTOM_SCHEME}://invite/`;

export const ATTEMPT_KEY_PREFIX = 'invite-open-attempted:';

/**
 * Returns whether the automatic app-open should proceed for this token.
 * Reads a marker from `storage` (sessionStorage in the browser).
 *
 * @returns `true` if no prior attempt was recorded for this token.
 */
export function shouldAutoOpen(
  storage: Pick<Storage, 'getItem'>,
  token: string,
): boolean {
  const key = `${ATTEMPT_KEY_PREFIX}${token}`;
  return storage.getItem(key) === null;
}

/** Returns the raw custom scheme deep link `siradaki://invite/{token}`. */
export function getInviteDeepLink(token: string): string {
  return `${DEEP_LINK_PREFIX}${encodeURIComponent(token)}`;
}

/**
 * Builds an Android Chrome intent:// URL that will open the app
 * or fall back to `fallbackUrl` if the app is not installed.
 *
 * @see https://developer.chrome.com/docs/multidevice/android/intents/
 */
export function getInviteIntentUrl(token: string, fallbackUrl: string): string {
  const parts = [
    `scheme=${IOS_CUSTOM_SCHEME}`,
    `package=${ANDROID_PACKAGE}`,
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}`,
  ];

  return `intent://invite/${encodeURIComponent(token)}#Intent;${parts.join(';')};end`;
}

/**
 * Returns the appropriate URL to open the app for the given user agent.
 *
 * - Android → Chrome intent:// URL
 * - iOS / other → custom scheme `siradaki://invite/{token}`
 *
 * @param token      Raw invite UUID token.
 * @param userAgent  `navigator.userAgent` value.
 * @param fallbackUrl Web page URL to return to when the app cannot open.
 */
export function getInviteOpenUrl(
  token: string,
  userAgent: string,
  fallbackUrl: string,
): string {
  const isAndroid = /android/i.test(userAgent);

  if (isAndroid) {
    return getInviteIntentUrl(token, fallbackUrl);
  }

  return getInviteDeepLink(token);
}