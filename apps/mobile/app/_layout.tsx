import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AppState } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import type { Href } from 'expo-router';
import { supabase, determineUserRole } from '../lib/supabase';
import { isPublicAuthRoute, routeForRole, shouldSkipRoleRouting } from '../lib/router-guard';
import { initSentry, SentryErrorBoundary, setSentryUserFromSession } from '../lib/sentry';
import { initAnalytics, trackEvent, identifyUser, resetAnalytics } from '../lib/analytics';
import { canUseExpoPushNotifications } from '../lib/notifications';

SplashScreen.preventAutoHideAsync();
initSentry();
initAnalytics();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Montserrat-Regular': require('../assets/fonts/Montserrat-Regular.otf'),
    'Montserrat-Medium': require('../assets/fonts/Montserrat-Medium.otf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.otf'),
    'Montserrat-Bold': require('../assets/fonts/Montserrat-Bold.otf'),
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();
  const firstSegment = segments[0];
  const routedRef = useRef(false);
  const segmentRef = useRef(firstSegment);
  const pendingNotif = useRef(false);

  useEffect(() => { segmentRef.current = firstSegment; }, [firstSegment]);

  // Notification tap → navigate appropriately
  useEffect(() => {
    if (!canUseExpoPushNotifications()) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    Promise.resolve(require('expo-notifications') as typeof import('expo-notifications')).then((Notifications) => {
      if (cancelled) return;

      Notifications.getLastNotificationResponseAsync().then(res => {
        if (res) pendingNotif.current = true;
      });

      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const notifType = response.notification.request.content.data?.type as string | undefined;

      // shop_approved / shop_rejected: rol yeniden sorgula, pending kullanıcıları doğru yönlendir.
      if (notifType === 'shop_approved' || notifType === 'shop_rejected') {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (!user) { router.replace('/(auth)/login' as Href); return; }
          determineUserRole(user.id)
            .then(role => router.replace(routeForRole(role)))
            .catch(() => router.replace('/(auth)/login' as Href));
        });
        return;
      }

      // Varsayılan: günlük özet vb. diğer bildirimler → randevu ekranı.
      const seg = segmentRef.current;
      if (seg === '(owner)') router.push('/(owner)/agenda' as Href);
      else router.push('/(app)/' as Href);
      });
    });

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, []);

  // Track app lifecycle: cold launch + foreground/background transitions
  useEffect(() => {
    trackEvent('app_open');
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') trackEvent('app_background');
      if (state === 'active') trackEvent('app_open');
    });
    return () => sub.remove();
  }, []);

  // Set Sentry user and identify user when auth state changes
  useEffect(() => {
    if (session === undefined) return;
    setSentryUserFromSession(session);
    if (session) {
      identifyUser(session.user.id);
    } else {
      resetAnalytics();
    }
  }, [session]);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => setSession(session))
      .catch(() => setSession(null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, newSession) => {
      routedRef.current = false;
      setSession(newSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded || session === undefined) return;
    SplashScreen.hideAsync();

    if (!session) {
      if (!isPublicAuthRoute(firstSegment)) router.replace('/(auth)/login');
      return;
    }

    if (firstSegment === 'invite') return;
    if (routedRef.current) return;
    routedRef.current = true;

    determineUserRole(session.user.id)
      .then(role => {
        if (!shouldSkipRoleRouting(firstSegment, role)) {
          router.replace(routeForRole(role));
        }
        if (pendingNotif.current) {
          pendingNotif.current = false;
          const target: Href = role === 'owner' ? '/(owner)/agenda' : '/(app)/';
          setTimeout(() => router.push(target), 250);
        }
      })
      .catch(() => router.replace('/(auth)/login' as Href));
  }, [loaded, session, firstSegment]);

  if (!loaded || session === undefined) return null;
  return (
    <SentryErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </SentryErrorBoundary>
  );
}
