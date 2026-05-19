import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput,
} from "react-native";
import { Key, Lock } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, S } from "../../lib/theme";
import { generateWidgetToken, listWidgetTokens, deleteWidgetToken } from "../../lib/widget-bridge";
import type { WorkingHours } from "@berber/shared/types";
import { WorkingHoursEditor } from "../../components/WorkingHoursEditor";
import { OverlineHeader, SectionLabel, Card, Button } from "../../components/ds";
import { Sheet } from "../../components/ds/Sheet";

interface TokenMeta {
  id: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}
function shortId(id: string): string {
  return `wgt_${id.slice(0, 4)}…${id.slice(-4)}`;
}
function initials(s: string): string {
  return s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
}

export default function OwnerSettingsScreen() {
  const { shopId } = useUserRole();
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [account, setAccount] = useState<{ name: string; email: string }>({ name: "Sahip", email: "" });
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);

  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadAccount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: shop } = await supabase.from("shops").select("display_name, working_hours")
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`).single();
      setAccount({ name: shop?.display_name ?? "Dükkan", email: user.email ?? "" });
      setWorkingHours((shop?.working_hours as unknown as WorkingHours) ?? null);
    } catch {
      // network error — retain defaults
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const data = await listWidgetTokens();
      setTokens((data as TokenMeta[]) ?? []);
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAccount(); loadTokens(); }, [loadAccount, loadTokens]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const token = await generateWidgetToken();
      Alert.alert("Token Oluşturuldu", `Widget'ınıza otomatik yüklendi.\n\nToken ID: ${token.id.slice(0, 8)}…`);
      await loadTokens();
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally { setGenerating(false); }
  }

  function handleDeleteToken(tokenId: string) {
    Alert.alert("Token sil", "Bu token silinirse widget çalışmayı durduracak.", [
      { text: "İptal", style: "cancel" },
      {
        text: "Sil", style: "destructive",
        onPress: async () => {
          try {
            await deleteWidgetToken(tokenId);
            setTokens((prev) => prev.filter((t) => t.id !== tokenId));
          } catch (err) { Alert.alert("Hata", (err as Error).message); }
        },
      },
    ]);
  }

  function handleSignOut() {
    Alert.alert("Çıkış", "Hesaptan çıkmak istediğine emin misin?", [
      { text: "Vazgeç", style: "cancel" },
      { text: "Çıkış yap", style: "destructive", onPress: () => supabase.auth.signOut() },
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
        <OverlineHeader
          eyebrow="DÜKKAN AYARLARI"
          title="Ayarlar"
          meta="Widget tokenlarını yönet ve hesabından çıkış yap."
        />

        {/* Account card */}
        <Card style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(account.name) || "D"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.accountName} numberOfLines={1}>{account.name}</Text>
            <Text style={styles.accountEmail} numberOfLines={1}>{account.email}</Text>
            <Text style={styles.ownerBadge}>Dükkan Sahibi</Text>
          </View>
        </Card>

        {shopId && workingHours !== null && (
          <>
            <SectionLabel>DÜKKAN AYARLARI</SectionLabel>
            <WorkingHoursEditor shopId={shopId} initialHours={workingHours} />
          </>
        )}

        <View style={styles.secHead}>
          <SectionLabel>WIDGET TOKENLARI</SectionLabel>
          <Text style={styles.secCount}>{tokens.length} adet</Text>
        </View>

        <Button variant="accent" size="md" full disabled={generating} onPress={handleGenerate} style={styles.generateBtn}>
          {generating ? "Oluşturuluyor…" : "+ Yeni Token Oluştur"}
        </Button>

        {loading ? (
          <ActivityIndicator color={T.brand600} style={{ marginTop: 12 }} />
        ) : tokens.length === 0 ? (
          <View style={styles.empty}>
            <Lock size={28} color={T.fg4} />
            <Text style={styles.emptyTitle}>Henüz token yok</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {tokens.map((t) => (
              <Card key={t.id} style={styles.tokenRow}>
                <View style={styles.tokenIcon}>
                  <Key size={18} color={T.brand600} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.tokenLabel} numberOfLines={1}>{t.label}</Text>
                  <Text style={styles.tokenMeta} numberOfLines={1}>
                    {shortId(t.id)} · son {t.last_used_at ? fmtDate(t.last_used_at) : fmtDate(t.created_at)}
                  </Text>
                </View>
                <Button variant="danger" size="sm" onPress={() => handleDeleteToken(t.id)}>
                  Sil
                </Button>
              </Card>
            ))}
          </View>
        )}

        <Button variant="danger" size="md" full onPress={handleSignOut} style={styles.signOut}>
          Çıkış yap
        </Button>

        <Button variant="ghost" size="md" full onPress={openDeleteSheet} style={styles.deleteAccount}>
          Hesabı Sil
        </Button>

        <Text style={styles.version}>Berber Panel · Sahip Ekranı</Text>
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
            Dükkanın, tüm personel kayıtları, randevular ve widget tokenları kalıcı olarak silinecek.
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
  accountCard: { marginHorizontal: S.s5, marginBottom: S.s6, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: R.md, backgroundColor: T.brand100, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 16, fontWeight: "700", color: T.brand600 },
  accountName: { fontSize: 14, fontWeight: "600", color: T.fg1 },
  accountEmail: { fontSize: 12, color: T.fg3, marginTop: 2 },
  ownerBadge: { fontSize: 10, fontWeight: "600", color: T.brand600, marginTop: 3 },
  secHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingRight: S.s5 },
  secCount: { fontSize: 11, color: T.fg4, fontWeight: "500" },
  generateBtn: { marginHorizontal: S.s5, marginBottom: 12 },
  tokenRow: { marginHorizontal: S.s5, flexDirection: "row", alignItems: "center", gap: 12 },
  tokenIcon: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: T.bgSunken, alignItems: "center", justifyContent: "center" },
  tokenLabel: { fontSize: 14, fontWeight: "600", color: T.fg1 },
  tokenMeta: { fontSize: 11, color: T.fg3, marginTop: 2 },
  empty: { paddingVertical: 30, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, color: T.fg3 },
  signOut: { marginHorizontal: S.s5, marginTop: 28 },
  deleteAccount: { marginHorizontal: S.s5, marginTop: 8 },
  version: { marginTop: 18, textAlign: "center", fontSize: 11, color: T.fg4 },

  sheetFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  deleteWarning: {
    backgroundColor: T.coral100,
    borderRadius: R.sm,
    padding: 14,
    marginBottom: 16,
    gap: 6,
  },
  deleteWarningTitle: { fontSize: 13, fontWeight: "700", color: T.coral600 },
  deleteWarningText: { fontSize: 13, color: T.coral600, lineHeight: 19 },
  deleteLabel: { fontSize: 12, fontWeight: "600", color: T.fg3, marginBottom: 8 },
  deleteInput: {
    borderWidth: 1.5,
    borderColor: T.coral600,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    color: T.coral600,
    letterSpacing: 2,
  },
});
