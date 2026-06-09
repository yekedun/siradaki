import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';
import { sha256hex } from './sha256';

function generateNonce(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function signInWithApple(): Promise<{ error?: string }> {
  const rawNonce = generateNonce();
  const hashedNonce = sha256hex(rawNonce);

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { error: 'Apple token alınamadı' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) return { error: error.message };
    return {};
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === 'ERR_REQUEST_CANCELED') return { error: 'İptal edildi' };
    const msg = e instanceof Error ? e.message : JSON.stringify(e);
    return { error: `Apple giriş hatası: ${msg}` };
  }
}
