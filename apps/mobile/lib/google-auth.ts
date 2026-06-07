import { NativeModules } from 'react-native';
import { supabase } from './supabase';
import { sha256hex } from './sha256';

function getGoogleSignin() {
  if (!NativeModules.RNGoogleSignin) return null;

  try {
    return require('@react-native-google-signin/google-signin').GoogleSignin;
  } catch {
    return null;
  }
}

export function configureGoogleSignIn() {
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) return;

  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
}

function generateNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Decode the JWT payload and return the nonce claim, or null if absent.
function getJwtNonce(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const payload = JSON.parse(atob(base64));
    return typeof payload.nonce === 'string' ? payload.nonce : null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<{ error?: string }> {
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    return {
      error: 'Google girişi bu geliştirme sürümünde hazır değil. Dev client veya yeni native build gerekiyor.',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    let idToken: string | null = null;
    let rawNonceForSupabase: string | undefined;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        // First attempt returned a stale cached token — force a fresh OAuth flow.
        try { await GoogleSignin.revokeAccess(); } catch { /* ignore */ }
        try { await GoogleSignin.signOut(); } catch { /* ignore */ }
      }

      const rawNonce = generateNonce();
      const hashedNonce = sha256hex(rawNonce);

      const userInfo = await GoogleSignin.signIn({ nonce: hashedNonce });
      idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;
      if (!idToken) return { error: 'Google token alınamadı' };

      const jwtNonce = getJwtNonce(idToken);

      if (jwtNonce === null) {
        // JWT has no nonce — don't pass nonce to Supabase either.
        rawNonceForSupabase = undefined;
        break;
      }

      if (jwtNonce === hashedNonce) {
        // Fresh token: JWT nonce matches what we sent.
        rawNonceForSupabase = rawNonce;
        break;
      }

      // JWT carries a stale nonce from a previous cached session.
      // On attempt 0 we loop and retry after clearing the cache.
      // On attempt 1 (after retry) we give up.
      if (attempt === 1) {
        return { error: 'Google kimlik doğrulama başarısız. Lütfen tekrar deneyin.' };
      }
    }

    if (!idToken) return { error: 'Google token alınamadı' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonceForSupabase,
    });
    if (error) return { error: error.message };
    return {};
  } catch (e: unknown) {
    if (e instanceof Error && (e as Error & { code?: string }).code === 'SIGN_IN_CANCELLED') return { error: 'İptal edildi' };
    const code = (e as any)?.code ?? 'no_code';
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    console.error('[GoogleSignIn] error:', code, msg, e);
    return { error: `Hata [${code}]: ${msg || 'boş mesaj'}` };
  }
}
