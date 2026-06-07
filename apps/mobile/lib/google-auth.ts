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


export async function signInWithGoogle(): Promise<{ error?: string }> {
  const GoogleSignin = getGoogleSignin();
  if (!GoogleSignin) {
    return {
      error: 'Google girişi bu geliştirme sürümünde hazır değil. Dev client veya yeni native build gerekiyor.',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Clear any cached Google session so a fresh token with the new nonce is issued.
    // Without this, iOS can return a cached token signed with a different nonce.
    try { await GoogleSignin.signOut(); } catch { /* ignore if not signed in */ }

    const rawNonce = generateNonce();
    const hashedNonce = sha256hex(rawNonce);

    const userInfo = await GoogleSignin.signIn({ nonce: hashedNonce });
    const idToken = userInfo.data?.idToken ?? (userInfo as any).idToken;
    if (!idToken) return { error: 'Google token alınamadı' };

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      nonce: rawNonce,
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
