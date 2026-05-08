import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserProvider, useUserRole } from "../lib/user-context";
import { T } from "../lib/theme";

function RouterGuard({ session }: { session: Session | null | undefined }) {
  const router   = useRouter();
  const segments = useSegments();
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (session === undefined || loading) return;

    const inAuth  = segments[0] === "(auth)";
    const inApp   = segments[0] === "(app)";
    const inOwner = segments[0] === "(owner)";

    if (!session) {
      if (!inAuth) router.replace("/(auth)/login");
      return;
    }

    if (role === "owner" && !inOwner) {
      router.replace("/(owner)");
    } else if (role === "barber" && !inApp) {
      router.replace("/(app)");
    }
    // role === null → loading veya tanımsız kullanıcı (oturum açık ama DB'de yok)
  }, [session, role, loading, segments, router]);

  return null;
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <RouterGuard session={session} />
        {session === undefined ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.bg }}>
            <ActivityIndicator color={T.navy} />
          </View>
        ) : (
          <Slot />
        )}
      </UserProvider>
    </GestureHandlerRootView>
  );
}
