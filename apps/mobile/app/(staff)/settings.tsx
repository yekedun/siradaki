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
  TextInput,
} from "react-native";
import { Copy } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, Shadow, Type } from "../../lib/theme";
import { OverlineHeader, SectionLabel, Card, Button } from "../../components/ds";
import { Sheet } from "../../components/ds/Sheet";

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

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  function openDeleteSheet() {
    setDeleteConfirm("");
    setDeleteSheetVisible(true);
  }

  async function handleDeleteAccount() {
    if (deleteConfirm.trim().toUpperCase() !== "SİL") {
      Alert.alert("Hatalı Onay", "Onaylamak için tam olarak «SİL» yazmalısın.");
      return;
    }
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Silme başarısız.");
      }
      await supabase.auth.signOut();
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <OverlineHeader eyebrow="AYARLAR" title="Hesabım" />

        <Card style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(account.name) || "U"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
          </View>
        </Card>

        {bookingLink && (
          <>
            <SectionLabel>RANDEVU LİNKİM</SectionLabel>

            <View style={styles.linkRow}>
              <Text style={styles.linkText} numberOfLines={1}>{bookingLink}</Text>
              <Pressable onPress={handleCopyLink} style={styles.iconBtn}>
                <Copy size={16} color={T.brand600} />
              </Pressable>
            </View>

            <Button variant="secondary" size="md" full onPress={() => setQrVisible(true)} style={{ marginTop: 8 }}>
              QR Kodu Göster
            </Button>

            <Button variant="accent" size="md" full onPress={handleShareLink} style={{ marginTop: 8 }}>
              Linki Paylaş
            </Button>
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

        <Button variant="danger" size="md" full onPress={handleSignOut} style={styles.signOut}>
          Çıkış Yap
        </Button>

        <Button variant="ghost" size="md" full onPress={openDeleteSheet} style={styles.deleteAccount}>
          Hesabı Sil
        </Button>

        <Text style={styles.version}>Berber Panel · Usta Ekranı</Text>
      </ScrollView>

      <Sheet
        visible={deleteSheetVisible}
        onClose={() => { if (!deleting) setDeleteSheetVisible(false); }}
        title="Hesabı Sil"
        footer={
          <View style={styles.sheetFooter}>
            <Button variant="secondary" size="md" onPress={() => setDeleteSheetVisible(false)} disabled={deleting}>
              Vazgeç
            </Button>
            <Button variant="danger" size="md" onPress={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Siliniyor…" : "Kalıcı Olarak Sil"}
            </Button>
          </View>
        }
      >
        <View style={styles.deleteWarning}>
          <Text style={styles.deleteWarningTitle}>⚠️ Bu işlem geri alınamaz</Text>
          <Text style={styles.deleteWarningText}>
            Hesabın silinecek. Usta kaydın dükkan listesinde kalır ama hesabına erişim kapanır.
          </Text>
        </View>
        <Text style={styles.deleteLabel}>Onaylamak için «SİL» yaz:</Text>
        <TextInput
          style={styles.deleteInput}
          value={deleteConfirm}
          onChangeText={setDeleteConfirm}
          placeholder="SİL"
          placeholderTextColor={T.fg4}
          autoCapitalize="characters"
          editable={!deleting}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingTop: 64, paddingBottom: 32 },

  accountCard: {
    marginTop: 22,
    marginHorizontal: 20,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: T.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 16, fontFamily: Type.family, fontWeight: "700", color: T.brand600 },
  accountName: { fontSize: 14, fontFamily: Type.family, fontWeight: "600", color: T.fg1 },
  accountEmail: { fontSize: 12, fontFamily: Type.family, color: T.fg3, marginTop: 2 },

  signOut: { marginTop: 28, marginHorizontal: 20 },
  deleteAccount: { marginTop: 4, marginHorizontal: 20 },

  version: { marginTop: 18, textAlign: "center", fontSize: 11, fontFamily: Type.family, color: T.fg4 },

  linkRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: T.bgElevated, borderWidth: 1, borderColor: T.border,
    borderRadius: R.md, paddingVertical: 12, paddingHorizontal: 14,
    marginHorizontal: 20,
    ...Shadow.sm,
  },
  linkText: { flex: 1, fontSize: 12, fontFamily: Type.family, color: T.brand600, fontWeight: "500" },
  iconBtn: { padding: 4 },

  qrOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  qrCard: {
    width: 290, backgroundColor: T.bgElevated, borderRadius: R.md,
    padding: 24, alignItems: "center", gap: 14, ...Shadow.sm,
  },
  qrTitle: { fontSize: 16, fontFamily: Type.family, fontWeight: "700", color: T.fg1 },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  qrHint: { fontSize: 11, fontFamily: Type.family, color: T.fg3, textAlign: "center" },
  qrClose: {
    paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: T.brand600, borderRadius: R.md,
  },
  qrCloseText: { color: "#fff", fontFamily: Type.family, fontSize: 13, fontWeight: "600" },

  sheetFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  deleteWarning: {
    backgroundColor: T.coral100,
    borderRadius: R.sm,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  deleteWarningTitle: { fontSize: 13, fontFamily: Type.family, fontWeight: "700", color: T.coral600 },
  deleteWarningText: { fontSize: 13, fontFamily: Type.family, color: T.coral600, lineHeight: 19 },
  deleteLabel: { fontSize: 12, fontFamily: Type.family, fontWeight: "600", color: T.fg3, marginBottom: 8 },
  deleteInput: {
    borderWidth: 1.5,
    borderColor: T.coral600,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Type.family,
    fontWeight: "700",
    color: T.coral600,
    letterSpacing: 2,
  },
});
