import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, Shadow } from "../../lib/theme";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface Barber {
  id: string;
  display_name: string;
  invite_email: string | null;
  is_active: boolean;
  user_id: string | null;
}

function initials(s: string): string {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
}

export default function TeamScreen() {
  const { shopId } = useUserRole();
  const [barbers, setBarbers]   = useState<Barber[]>([]);
  const [loading, setLoading]   = useState(true);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from("barbers")
      .select("id, display_name, invite_email, is_active, user_id")
      .eq("shop_id", shopId)
      .order("created_at");
    setBarbers((data as Barber[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  function promptInvite() {
    let email = "";
    let name  = "";
    Alert.prompt(
      "Usta Davet Et",
      "Adı Soyadı",
      (text) => {
        name = text ?? "";
        Alert.prompt(
          "Usta Davet Et",
          "E-posta adresi",
          (text2) => {
            email = text2 ?? "";
            if (name.trim().length < 2 || !email.includes("@")) {
              Alert.alert("Geçersiz", "Geçerli bir ad ve e-posta gir.");
              return;
            }
            handleInvite(name.trim(), email.trim().toLowerCase());
          },
          "plain-text",
          "",
          "email-address"
        );
      },
      "plain-text",
      ""
    );
  }

  async function handleInvite(displayName: string, email: string) {
    setInviting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("Oturum bulunamadı");

      const res = await fetch(`${SUPABASE_URL}/functions/v1/invite-barber`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, display_name: displayName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Davet başarısız");

      Alert.alert("Davet Gönderildi", `${displayName} adresine davet e-postası gönderildi.`);
      await load();
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(barber: Barber) {
    const action = barber.is_active ? "pasif" : "aktif";
    Alert.alert(
      "Durumu Değiştir",
      `${barber.display_name} ustayı ${action} yap?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: barber.is_active ? "Pasif Yap" : "Aktif Yap",
          style: barber.is_active ? "destructive" : "default",
          onPress: async () => {
            const { error } = await supabase
              .from("barbers")
              .update({ is_active: !barber.is_active })
              .eq("id", barber.id);
            if (error) { Alert.alert("Hata", error.message); return; }
            await load();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>EKİP YÖNETİMİ</Text>
        <Text style={styles.title}>Ustalar</Text>

        <Pressable
          onPress={promptInvite}
          disabled={inviting}
          style={({ pressed }) => [styles.inviteBtn, (pressed || inviting) && { opacity: 0.8 }]}
        >
          {inviting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={styles.inviteBtnTxt}>Usta Davet Et</Text>
            </>
          )}
        </Pressable>

        {loading ? (
          <ActivityIndicator color={T.navy} style={{ marginTop: 20 }} />
        ) : barbers.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>Henüz usta yok. Davet et.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {barbers.map((b) => (
              <View key={b.id} style={[styles.barberCard, !b.is_active && styles.inactiveCard]}>
                <View style={[styles.avatar, !b.is_active && { backgroundColor: T.surfaceAlt }]}>
                  <Text style={[styles.avatarTxt, !b.is_active && { color: T.muted }]}>
                    {initials(b.display_name)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.barberName, !b.is_active && { color: T.muted }]} numberOfLines={1}>
                    {b.display_name}
                  </Text>
                  <Text style={styles.barberEmail} numberOfLines={1}>
                    {b.invite_email ?? "—"}
                  </Text>
                  <Text style={[styles.statusChip, b.is_active ? styles.activeChip : styles.inactiveChip]}>
                    {b.user_id ? (b.is_active ? "Aktif" : "Pasif") : "Davet Bekleniyor"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleToggleActive(b)}
                  style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.7 }]}
                >
                  <Feather name={b.is_active ? "pause-circle" : "play-circle"} size={22} color={b.is_active ? T.muted : T.navy} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40 },

  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase", color: T.red, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: T.ink, marginBottom: 16 },

  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: T.navy,
    borderRadius: R.cta,
    marginBottom: 20,
    ...Shadow.cta,
  },
  inviteBtnTxt: { color: "#fff", fontSize: 14, fontWeight: "600" },

  empty: { paddingTop: 40, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: T.mutedAlt },

  barberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    ...Shadow.card,
  },
  inactiveCard: { opacity: 0.65 },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: T.avatarFrom,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontWeight: "700", color: T.navy },
  barberName: { fontSize: 14, fontWeight: "600", color: T.ink },
  barberEmail: { fontSize: 12, color: T.muted, marginTop: 1 },
  statusChip: { fontSize: 10, fontWeight: "600", marginTop: 4, alignSelf: "flex-start" },
  activeChip: { color: "#16a34a" },
  inactiveChip: { color: T.muted },

  toggleBtn: { padding: 4 },
});
