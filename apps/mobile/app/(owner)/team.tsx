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
import { StaffScheduleModal } from "../../components/StaffScheduleModal";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface Staff {
  id: string;
  name: string;
  is_active: boolean;
  user_id: string | null;
}

function initials(s: string): string {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
}

export default function TeamScreen() {
  const { shopId } = useUserRole();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading]   = useState(true);
  const [inviting, setInviting] = useState(false);
  const [modalStaff, setModalStaff] = useState<Staff | null>(null);

  const load = useCallback(async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from("staff")
      .select("id, name, is_active, user_id")
      .eq("shop_id", shopId)
      .order("created_at");
    setStaffList(data ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  function promptInvite() {
    Alert.prompt(
      "Personel Ekle",
      "Personelin Adı Soyadı",
      (name) => {
        if (!name || name.trim().length < 2) {
          Alert.alert("Geçersiz", "Geçerli bir ad gir.");
          return;
        }
        handleAddStaff(name.trim());
      },
      "plain-text",
      ""
    );
  }

  async function handleAddStaff(name: string) {
    setInviting(true);
    try {
      const { error } = await supabase
        .from("staff")
        .insert({ shop_id: shopId as string, name });
      if (error) throw error;
      Alert.alert("Başarılı", `${name} başarıyla eklendi.`);
      await load();
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally {
      setInviting(false);
    }
  }

  async function handleToggleActive(staffMember: Staff) {
    const action = staffMember.is_active ? "pasif" : "aktif";
    Alert.alert(
      "Durumu Değiştir",
      `${staffMember.name} personelini ${action} yap?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: staffMember.is_active ? "Pasif Yap" : "Aktif Yap",
          style: staffMember.is_active ? "destructive" : "default",
          onPress: async () => {
            const { error } = await supabase
              .from("staff")
              .update({ is_active: !staffMember.is_active })
              .eq("id", staffMember.id);
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
              <Text style={styles.inviteBtnTxt}>Personel Ekle</Text>
            </>
          )}
        </Pressable>

        {loading ? (
          <ActivityIndicator color={T.navy} style={{ marginTop: 20 }} />
        ) : staffList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>Henüz personel yok. Yeni personel ekleyin.</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 8 }}>
            {staffList.map((b) => (
              <View key={b.id} style={[styles.staffCard, !b.is_active && styles.inactiveCard]}>
                <View style={[styles.avatar, !b.is_active && { backgroundColor: T.surfaceAlt }]}>
                  <Text style={[styles.avatarTxt, !b.is_active && { color: T.muted }]}>
                    {initials(b.name)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.staffName, !b.is_active && { color: T.muted }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={[styles.statusChip, b.is_active ? styles.activeChip : styles.inactiveChip]}>
                    {b.is_active ? "Aktif" : "Pasif"}
                  </Text>
                </View>
                {/* Çalışma saatleri butonu */}
                <Pressable
                  onPress={() => setModalStaff(b)}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  <Feather name="clock" size={18} color={T.blue} />
                </Pressable>
                {/* Aktif/Pasif toggle */}
                <Pressable
                  onPress={() => handleToggleActive(b)}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                  hitSlop={8}
                >
                  <Feather name={b.is_active ? "pause-circle" : "play-circle"} size={22} color={b.is_active ? T.muted : T.navy} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Çalışma Saatleri Modalı */}
      <StaffScheduleModal
        visible={modalStaff !== null}
        staff={modalStaff}
        onClose={() => setModalStaff(null)}
      />
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

  staffCard: {
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
  staffName: { fontSize: 14, fontWeight: "600", color: T.ink },
  statusChip: { fontSize: 10, fontWeight: "600", marginTop: 4, alignSelf: "flex-start" },
  activeChip: { color: "#16a34a" },
  inactiveChip: { color: T.muted },

  toggleBtn: { padding: 4 },
  iconBtn:   { padding: 4 },
});
