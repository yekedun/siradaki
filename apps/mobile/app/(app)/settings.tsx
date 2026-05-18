import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  Share,
  Modal,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, Shadow } from "../../lib/theme";

const WEB_BASE = "https://siraladaki.app";

function initials(s: string): string {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
}

export default function SettingsScreen() {
  const { shopId } = useUserRole();
  const [account, setAccount] = useState<{ name: string; email: string }>({
    name: "Usta",
    email: "",
  });
  const [bookingLink, setBookingLink] = useState<string | null>(null);
  const [qrVisible, setQrVisible] = useState(false);

  const loadAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: staffRow } = await supabase
      .from("staff")
      .select("name, slug, shop_id")
      .eq("user_id", user.id)
      .single();

    setAccount({ name: staffRow?.name ?? "Usta", email: user.email ?? "" });

    if (staffRow?.slug && staffRow?.shop_id) {
      const { data: shop } = await supabase
        .from("shops")
        .select("slug")
        .eq("id", staffRow.shop_id)
        .single();
      if (shop?.slug) {
        setBookingLink(`${WEB_BASE}/${shop.slug}/u/${staffRow.slug}`);
      }
    }
  }, [shopId]);

  useEffect(() => { loadAccount(); }, [loadAccount]);

  async function handleCopyLink() {
    if (!bookingLink) return;
    await Clipboard.setStringAsync(bookingLink);
    Alert.alert("Kopyalandı", "Randevu linkin panoya kopyalandı.");
  }

  async function handleShareLink() {
    if (!bookingLink) return;
    await Share.share({
      message: `${account.name} olarak randevu almak için: ${bookingLink}`,
      url: bookingLink,
    });
  }

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

        {bookingLink && (
          <>
            <View style={styles.secHead}>
              <Text style={styles.secLabel}>RANDEVU LİNKİM</Text>
            </View>

            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>{bookingLink}</Text>
              <Pressable onPress={handleCopyLink} style={styles.iconBtn}>
                <Feather name="copy" size={16} color={T.navy} />
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [styles.linkActionBtn, pressed && { opacity: 0.85 }]}
              onPress={() => setQrVisible(true)}
            >
              <Feather name="grid" size={15} color={T.navy} />
              <Text style={styles.linkActionText}>QR Kodu Göster</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.storyBtn, pressed && { opacity: 0.85 }]}
              onPress={handleShareLink}
            >
              <Feather name="share-2" size={15} color="#fff" />
              <Text style={styles.storyBtnText}>Linki Paylaş</Text>
            </Pressable>
          </>
        )}

        <Modal visible={qrVisible} transparent animationType="fade">
          <Pressable style={styles.qrOverlay} onPress={() => setQrVisible(false)}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Randevu QR Kodun</Text>
              {bookingLink && (
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(bookingLink)}` }}
                  style={styles.qrImage}
                />
              )}
              <Text style={styles.qrHint} numberOfLines={2}>{bookingLink}</Text>
              <Pressable style={styles.qrClose} onPress={() => setQrVisible(false)}>
                <Text style={styles.qrCloseText}>Kapat</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

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

  secHead: { marginTop: 26, marginBottom: 12, flexDirection: "row", alignItems: "baseline" },
  secLabel: { fontSize: 11, fontWeight: "600", color: T.muted, letterSpacing: 0.6, textTransform: "uppercase" },

  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.line,
    borderRadius: R.card, paddingVertical: 12, paddingHorizontal: 14, ...Shadow.card,
  },
  linkText: { flex: 1, fontSize: 12, color: T.navy, fontWeight: "500" },
  iconBtn: { padding: 4 },

  linkActionBtn: {
    marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, backgroundColor: T.surfaceAlt,
    borderWidth: 1, borderColor: T.line, borderRadius: R.card,
  },
  linkActionText: { fontSize: 13, fontWeight: "600", color: T.navy },

  storyBtn: {
    marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, backgroundColor: T.navy, borderRadius: R.cta, ...Shadow.cta,
  },
  storyBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },

  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  qrCard: {
    width: 290, backgroundColor: T.surface, borderRadius: R.card,
    padding: 24, alignItems: "center", gap: 14, ...Shadow.card,
  },
  qrTitle: { fontSize: 16, fontWeight: "700", color: T.ink },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  qrHint: { fontSize: 11, color: T.muted, textAlign: "center" },
  qrClose: {
    paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: T.navy, borderRadius: R.cta,
  },
  qrCloseText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
