import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getProfile } from "../lib/customer-profiles";
import { T } from "../lib/theme";

type AuthState = "loading" | "unauthenticated" | "needsSetup" | "ready";

export default function RootLayout() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const router = useRouter();
  const segments = useSegments();

  async function resolveState(session: Session | null) {
    if (!session) {
      setAuthState("unauthenticated");
      return;
    }
    const profile = await getProfile(session.user.id);
    setAuthState(profile ? "ready" : "needsSetup");
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveState(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveState(session);
    });

    return () => subscription.unsubscribe();
  // resolveState değişmez, effect bir kez kurulur
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authState === "loading") return;

    const inAuth = segments[0] === "(auth)";
    const inApp = segments[0] === "(app)";
    const inBooking = segments[0] === "booking";

    if (authState === "unauthenticated" && !inAuth) {
      router.replace("/(auth)/login");
    } else if (authState === "needsSetup" && segments[1] !== "setup") {
      router.replace("/(auth)/setup");
    } else if (authState === "ready" && inAuth) {
      router.replace("/(app)");
    }
    // booking ekranı oturum gerektiriyor ama (app) içinden açılır — redirect yok
    void inApp;
    void inBooking;
  }, [authState, segments, router]);

  if (authState === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={T.navy} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="booking"
          options={{ presentation: "modal", headerShown: false, animation: "slide_from_bottom" }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
