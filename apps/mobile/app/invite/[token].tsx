import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { colors } from '../../lib/theme';
import { Button } from '../../components/ds/Button';
import { supabase } from '../../lib/supabase';
import { inviteAcceptedRoute } from '../../lib/router-guard';

WebBrowser.maybeCompleteAuthSession();

const FN_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [state, setState] = useState<'checking' | 'ready' | 'signing' | 'error'>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    validateToken();
  }, [token]);

  async function validateToken() {
    if (!token) {
      setState('error');
      setMessage('Davet linki geçersiz.');
      return;
    }
    try {
      const res = await fetch(`${FN_BASE}/open-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState('error');
        setMessage(data.error ?? 'Davet linki geçersiz.');
        return;
      }
      setState('ready');
    } catch {
      setState('error');
      setMessage('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
    }
  }

  async function handleGoogleSignIn() {
    setState('signing');

    // Web-based OAuth — bypasses iOS Keychain caching that causes nonce mismatches
    // with the native @react-native-google-signin flow.
    const redirectTo = Linking.createURL('/');

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data.url) {
      setState('error');
      setMessage(oauthError?.message ?? 'Google oturumu başlatılamadı.');
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'cancel') {
      setState('ready');
      return;
    }

    if (result.type !== 'success') {
      setState('error');
      setMessage('Google girişi tamamlanamadı.');
      return;
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
    if (exchangeError) {
      setState('error');
      setMessage(exchangeError.message);
      return;
    }

    const session = (await supabase.auth.getSession()).data.session;
    if (!session) {
      setState('error');
      setMessage('Oturum alınamadı, tekrar deneyin.');
      return;
    }

    try {
      const res = await fetch(`${FN_BASE}/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setState('error');
        setMessage(d.error ?? 'Davet kabul edilemedi');
        return;
      }
    } catch {
      setState('error');
      setMessage('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
      return;
    }

    router.replace(inviteAcceptedRoute());
  }

  if (state === 'checking') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.sub}>Davet kontrol ediliyor…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>❌</Text>
        <Text style={styles.title}>Geçersiz Davet</Text>
        <Text style={styles.sub}>{message}</Text>
      </View>
    );
  }

  if (state === 'signing') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.brand[600]} />
        <Text style={styles.sub}>Giriş yapılıyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.mark}><Text style={styles.markLetter}>S</Text></View>
      <Text style={styles.title}>Berber Olarak Katıl</Text>
      <Text style={styles.sub}>
        Sıradaki'ye berber olarak eklendiniz. Devam etmek için Google hesabınızla giriş yapın.
      </Text>
      <Button variant="primary" size="lg" full onPress={handleGoogleSignIn}>
        Google ile Devam Et
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.slate[0],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  mark: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  markLetter: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
    textAlign: 'center',
  },
  sub: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
