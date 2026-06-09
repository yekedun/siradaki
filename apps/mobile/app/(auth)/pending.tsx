import React, { useEffect, useRef, useState } from 'react';
import { Alert, View, Text, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '../../lib/theme';
import { Button } from '../../components/ds/Button';
import { determineUserRole, supabase } from '../../lib/supabase';
import { routeForRole } from '../../lib/router-guard';

const POLL_INTERVAL_MS = 30_000; // 30 saniye

export default function PendingScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const rejected = status === 'rejected';
  const unknown = status === 'unknown';
  const [secondsLeft, setSecondsLeft] = useState(POLL_INTERVAL_MS / 1000);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (rejected || unknown) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [rejected, unknown, pulseAnim]);

  useEffect(() => {
    if (rejected || unknown) return;
    setSecondsLeft(POLL_INTERVAL_MS / 1000);
    const tick = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) return POLL_INTERVAL_MS / 1000;
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [rejected, unknown]);

  // Sadece onay bekleyen durumda otomatik polling
  useEffect(() => {
    if (rejected || unknown) return;

    const poll = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const role = await determineUserRole(user.id);
      // Hâlâ pending veya okunamadıysa beklemeye devam et
      if (role === 'pending' || role === 'unknown') return;
      router.replace(routeForRole(role) as any);
    };

    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [rejected, unknown]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function handleRefresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    const role = await determineUserRole(user.id);
    if (role === 'unknown') {
      Alert.alert('Durum okunamadı', 'Bağlantını veya veritabanı migration durumunu kontrol edip tekrar dene.');
      return;
    }
    router.replace(routeForRole(role) as any);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[0] }}>
      <View style={styles.screen}>
        <Animated.View
          style={[
            styles.iconWrap,
            rejected
              ? styles.iconWrapDanger
              : unknown
              ? styles.iconWrapWarning
              : styles.iconWrapPending,
            !rejected && !unknown && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <Text style={styles.icon}>
            {rejected ? '✕' : unknown ? '?' : '⏳'}
          </Text>
        </Animated.View>

        <Text style={styles.title}>
          {rejected ? 'Başvuru Reddedildi' : unknown ? 'Durum Kontrol Edilemedi' : 'Başvurun Alındı'}
        </Text>

        <Text style={styles.body}>
          {rejected
            ? 'Dükkan başvurun onaylanmadı. Detay için destek ekibiyle iletişime geçebilirsin.'
            : unknown
              ? 'Hesap durumun şu anda okunamadı. Bağlantını kontrol edip tekrar giriş yap.'
              : 'Dükkanın inceleme sürecinde. Onaylandıktan sonra bildirim alacaksın. 24 saat içinde yanıt verilir.'}
        </Text>

        {!rejected && !unknown && (
          <Text style={styles.pollHint}>
            {secondsLeft} saniye içinde otomatik kontrol ediliyor…
          </Text>
        )}

        <Button variant="primary" size="md" onPress={handleRefresh}>
          Şimdi Kontrol Et
        </Button>
        <Button variant="secondary" size="md" onPress={handleLogout}>
          Çıkış Yap
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  iconWrapPending: {
    backgroundColor: colors.brand[100],
    borderWidth: 2,
    borderColor: colors.brand[100],
  },
  iconWrapDanger: {
    backgroundColor: colors.coral[100],
    borderWidth: 2,
    borderColor: colors.coral[100],
  },
  iconWrapWarning: {
    backgroundColor: colors.slate[100],
    borderWidth: 2,
    borderColor: colors.slate[200],
  },
  icon: { fontSize: 32 },
  pollHint: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[400],
    textAlign: 'center',
    marginTop: -4,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 22,
  },
});
