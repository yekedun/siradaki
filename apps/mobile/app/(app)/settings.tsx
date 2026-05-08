import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { T, R, Shadow } from "../../lib/theme";

function initials(s: string): string {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
}

export default function SettingsScreen() {
  const [account, setAccount] = useState<{ name: string; email: string }>({
    name: "Usta",
    email: "",
  });

  const loadAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: barber } = await supabase
      .from("barbers")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    setAccount({ name: barber?.display_name ?? "Usta", email: user.email ?? "" });
  }, []);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  function handleSignOut() {
    Alert.alert("Çıkış", "Hesaptan çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış Yap", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>AYARLAR</Text>
        <Text style={styles.title}>Hesabım</Text>

        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(account.name) || "U"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOut, pressed && { opacity: 0.9 }]}
          onPress={handleSignOut}
        >
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </Pressable>

        <Text style={styles.version}>Berber Panel · Usta Ekranı</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 32 },

  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase", color: T.red, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: T.ink, marginBottom: 8 },

  accountCard: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...Shadow.card,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: T.avatarFrom,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "700", color: T.navy },
  accountName: { fontSize: 14, fontWeight: "600", color: T.ink },
  accountEmail: { fontSize: 12, color: T.muted, marginTop: 2 },

  signOut: {
    marginTop: 28,
    paddingVertical: 14,
    backgroundColor: T.redSoft,
    borderWidth: 1,
    borderColor: T.redBorder,
    borderRadius: R.card,
    alignItems: "center",
  },
  signOutText: { color: T.red, fontSize: 14, fontWeight: "600" },

  version: { marginTop: 18, textAlign: "center", fontSize: 11, color: T.mutedAlt },
});
