import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProvider, useUserRole } from "../lib/user-context";
import { T } from "../lib/theme";

function RouterGuard({ session, ready }: { session: Session | null | undefined; ready: boolean }) {
  const router   = useRouter();
  const segments = useSegments();
  const { role, loading, error } = useUserRole();

  useEffect(() => {
    if (!ready || session === undefined || loading) return;

    const inAuth  = (segments[0] as string) === "(auth)";
    const inApp   = (segments[0] as string) === "(staff)";
    const inOwner = (segments[0] as string) === "(owner)";

    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (role === "owner" && !inOwner) {
      router.replace("/(owner)" as any);
    } else if (role === "staff" && !inApp) {
      router.replace("/(staff)" as any);
    } else if (role === null && (error !== null)) {
      // Profil yüklenirken ağ/DB hatası — kullanıcıyı sonsuz spinner'da
      // bırakmamak için login ekranına düşür ve oturumu kapat.
      void supabase.auth.signOut();
      if (!inAuth) router.replace("/(auth)/login");
    }
    // role === null && error === null → tanımsız kullanıcı (auth user'ı var ama
    // henüz shop/staff oluşmamış); auth screen'inde kalıyor.
  }, [ready, session, role, loading, error, segments, router]);

  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [fontsLoaded] = useFonts({
    "Montserrat":          require("../assets/fonts/Montserrat-Regular.otf"),
    "Montserrat-Medium":   require("../assets/fonts/Montserrat-Medium.otf"),
    "Montserrat-SemiBold": require("../assets/fonts/Montserrat-SemiBold.otf"),
    "Montserrat-Bold":     require("../assets/fonts/Montserrat-Bold.otf"),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const ready = session !== undefined && fontsLoaded;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        {/* Slot her zaman mount edilir — navigator hazır olur, Reanimated root view hatası önlenir */}
        <RouterGuard session={session} ready={ready} />
        <Slot />
        {/* Loading overlay: session ve fontlar hazır olana kadar içeriği gizler */}
        {!ready && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={T.brand600} />
          </View>
        )}
      </UserProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
  },
});
