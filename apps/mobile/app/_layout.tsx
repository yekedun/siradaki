import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, determineUserRole } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Montserrat-Regular':  require('../assets/fonts/Montserrat-Regular.otf'),
    'Montserrat-Medium':   require('../assets/fonts/Montserrat-Medium.otf'),
    'Montserrat-SemiBold': require('../assets/fonts/Montserrat-SemiBold.otf'),
    'Montserrat-Bold':     require('../assets/fonts/Montserrat-Bold.otf'),
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded || session === undefined) return;
    SplashScreen.hideAsync();
    const inAuth = segments[0] === '(auth)';
    if (!session) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    // If already in the correct group, don't re-navigate
    const inOwner = segments[0] === '(owner)';
    const inApp = segments[0] === '(app)';
    if (inOwner || inApp) return;
    // Determine role and route
    determineUserRole(session.user.id).then(role => {
      if (role === 'owner') router.replace('/(owner)');
      else if (role === 'staff') router.replace('/(app)');
      else router.replace('/(auth)/login');
    });
  }, [loaded, session, segments]);

  if (!loaded || session === undefined) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
