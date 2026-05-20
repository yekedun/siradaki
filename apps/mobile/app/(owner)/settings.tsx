import { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView,
  Switch, TextInput,
} from "react-native";
import { Key, Lock, ChevronRight, Clock, Scissors, Check, Percent } from "lucide-react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, S, Shadow } from "../../lib/theme";
import { generateWidgetToken, listWidgetTokens, deleteWidgetToken } from "../../lib/widget-bridge";
import type { WorkingHours } from "@berber/shared/types";
import { WorkingHoursEditor } from "../../components/WorkingHoursEditor";
import { OverlineHeader, SectionLabel, Card, Button, Sheet, TextField } from "../../components/ds";

interface TokenMeta {
  id: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
}

interface ShopProfile {
  name: string;
  address: string;
  phone: string;
  bio: string;
  slug: string;
  visible: boolean;
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
  const router = useRouter();
  const { shopId } = useUserRole();
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workingHours, setWorkingHours] = useState<WorkingHours | null>(null);

  // Profile state
  const [profile, setProfile] = useState<ShopProfile>({ name: "", address: "", phone: "", bio: "", slug: "", visible: true });
  const [email, setEmail] = useState("");
  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [profileSheetVisible, setProfileSheetVisible] = useState(false);
  const [hoursSheetVisible, setHoursSheetVisible] = useState(false);

  // Profile editor sheet fields
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editVisible, setEditVisible] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const loadAccount = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: shop } = await supabase
      .from("shops")
      .select("display_name, working_hours, address, phone, bio, slug, visible, commission_tracking")
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .single();
    setEmail(user.email ?? "");
    setProfile({
      name: shop?.display_name ?? "Dükkan",
      address: shop?.address ?? "",
      phone: shop?.phone ?? "",
      bio: shop?.bio ?? "",
      slug: shop?.slug ?? "",
      visible: shop?.visible ?? true,
    });
    setCommissionEnabled(shop?.commission_tracking ?? false);
    setWorkingHours((shop?.working_hours as unknown as WorkingHours) ?? null);
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

  function openProfileSheet() {
    setEditName(profile.name);
    setEditAddress(profile.address);
    setEditPhone(profile.phone);
    setEditBio(profile.bio);
    setEditVisible(profile.visible);
    setProfileSaved(false);
    setProfileSheetVisible(true);
  }

  async function handleCommissionToggle(value: boolean) {
    setCommissionEnabled(value);
    await supabase.from("shops").update({ commission_tracking: value }).eq("id", shopId!);
  }

  async function handleProfileSave() {
    const nameTrim = editName.trim();
    if (nameTrim.length < 2) { Alert.alert("Geçersiz", "Dükkan adı en az 2 karakter olmalı."); return; }
    setSavingProfile(true);
    const { error } = await supabase
      .from("shops")
      .update({
        display_name: nameTrim,
        address: editAddress.trim() || null,
        phone: editPhone.trim() || null,
        bio: editBio.trim() || null,
        visible: editVisible,
      })
      .eq("id", shopId!);
    setSavingProfile(false);
    if (error) { Alert.alert("Hata", error.message); return; }
    setProfile((prev) => ({ ...prev, name: nameTrim, address: editAddress.trim(), phone: editPhone.trim(), bio: editBio.trim(), visible: editVisible }));
    setProfileSaved(true);
  }

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

  function handleDelete(tokenId: string) {
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

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <OverlineHeader
          eyebrow="DÜKKAN AYARLARI"
          title="Ayarlar"
        />

        {/* HESAP */}
        <SectionLabel>HESAP</SectionLabel>
        <Pressable onPress={openProfileSheet} style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initials(profile.name) || "D"}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.profileName} numberOfLines={1}>{profile.name}</Text>
            <Text style={styles.profileMeta} numberOfLines={1}>{email}</Text>
          </View>
          <Text style={styles.editLabel}>Düzenle ›</Text>
        </Pressable>

        {/* OPERATİF */}
        <SectionLabel>OPERATİF</SectionLabel>
        <View style={styles.opCard}>
          <Pressable style={[styles.opRow, styles.opRowBorder]} onPress={() => setHoursSheetVisible(true)}>
            <View style={styles.opIcon}>
              <Clock size={16} color={T.brand600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opLabel}>Dükkan Saatleri</Text>
              <Text style={styles.opMeta}>Haftalık çalışma saatlerini düzenle</Text>
            </View>
            <ChevronRight size={16} color={T.slate400} />
          </Pressable>
          <Pressable style={[styles.opRow, styles.opRowBorder]} onPress={() => router.push("/(owner)/services" as never)}>
            <View style={styles.opIcon}>
              <Scissors size={16} color={T.brand600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opLabel}>Hizmetler</Text>
              <Text style={styles.opMeta}>Fiyat ve süreleri yönet</Text>
            </View>
            <ChevronRight size={16} color={T.slate400} />
          </Pressable>
          <View style={styles.opRow}>
            <View style={styles.opIcon}>
              <Percent size={16} color={T.brand600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.opLabel}>Komisyon takibi</Text>
              <Text style={styles.opMeta}>Usta bazında kazanç hesapla</Text>
            </View>
            <Switch
              value={commissionEnabled}
              onValueChange={handleCommissionToggle}
              trackColor={{ true: T.brand600, false: T.border }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* WIDGET BAĞLANTILARI */}
        <View style={styles.secHead}>
          <SectionLabel>WIDGET BAĞLANTILARI</SectionLabel>
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
                <Button variant="danger" size="sm" onPress={() => handleDelete(t.id)}>
                  Sil
                </Button>
              </Card>
            ))}
          </View>
        )}

        <Button variant="danger" size="md" full onPress={handleSignOut} style={styles.signOut}>
          Çıkış yap
        </Button>

        <Text style={styles.version}>Berber Panel · Sahip Ekranı</Text>
      </ScrollView>

      {/* Profile Editor Sheet */}
      <Sheet
        visible={profileSheetVisible}
        onClose={() => { if (!savingProfile) { setProfileSheetVisible(false); setProfileSaved(false); } }}
        title="Dükkan Bilgileri"
        footer={!profileSaved ? (
          <Button
            variant="primary"
            size="md"
            full
            disabled={editName.trim().length < 2}
            loading={savingProfile}
            onPress={handleProfileSave}
          >
            Kaydet
          </Button>
        ) : undefined}
      >
        {profileSaved ? (
          <View style={styles.savedState}>
            <View style={styles.savedCheck}>
              <Check size={24} color={T.mint600} />
            </View>
            <Text style={styles.savedTitle}>Kaydedildi</Text>
            <Text style={styles.savedDesc}>
              Dükkan bilgileri güncellendi.{"\n"}Müşteri ekranına yansıması birkaç dakika sürebilir.
            </Text>
            <Button variant="primary" size="lg" full onPress={() => { setProfileSheetVisible(false); setProfileSaved(false); }}>
              Tamam
            </Button>
          </View>
        ) : (
          <View style={styles.sheetBody}>
            {/* Avatar preview */}
            <View style={styles.avatarPreviewRow}>
              <View style={styles.avatarPreviewIcon}>
                <Text style={styles.avatarPreviewTxt}>
                  {initials(editName) || "D"}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.avatarPreviewName} numberOfLines={1}>{editName || "Dükkan Adı"}</Text>
                <Text style={styles.avatarPreviewAddr} numberOfLines={1}>{editAddress.split(",")[0] || "Adres"}</Text>
              </View>
              <View style={styles.previewBadge}>
                <Text style={styles.previewBadgeTxt}>Önizleme</Text>
              </View>
            </View>

            <TextField
              label="DÜKKAN ADI"
              value={editName}
              onChange={setEditName}
              placeholder="örn. Keskin Berber"
            />
            <TextField
              label="ADRES"
              value={editAddress}
              onChange={setEditAddress}
              placeholder="Mahalle, Sokak No, İl"
            />
            <TextField
              label="TELEFON"
              value={editPhone}
              onChange={setEditPhone}
              placeholder="0(2xx) xxx xx xx"
            />

            {/* Bio textarea */}
            <View>
              <Text style={styles.bioLabel}>HAKKINDA</Text>
              <TextInput
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Dükkanınız hakkında kısa bir açıklama..."
                placeholderTextColor={T.fg4}
                multiline
                numberOfLines={3}
                style={styles.bioInput}
                maxLength={200}
              />
              <Text style={styles.bioCount}>{editBio.length}/200 karakter</Text>
            </View>

            {/* Visibility toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Profil Görünür</Text>
                <Text style={styles.toggleMeta}>
                  {editVisible ? "Müşteriler dükkanı bulabilir" : "Dükkan arama sonuçlarında gizli"}
                </Text>
              </View>
              <Switch
                value={editVisible}
                onValueChange={setEditVisible}
                trackColor={{ true: T.brand600, false: T.border }}
                thumbColor="#fff"
              />
            </View>

            {/* Slug info */}
            {profile.slug ? (
              <View style={styles.slugBox}>
                <Text style={styles.slugLabel}>REZERVASYON LİNKİ</Text>
                <Text style={styles.slugValue}>siradaki.app/{profile.slug}</Text>
              </View>
            ) : null}
          </View>
        )}
      </Sheet>

      {/* Working Hours Sheet */}
      {shopId && (
        <Sheet
          visible={hoursSheetVisible}
          onClose={() => setHoursSheetVisible(false)}
          title="Dükkan Saatleri"
        >
          <View style={styles.hoursBody}>
            <WorkingHoursEditor
              shopId={shopId}
              initialHours={workingHours}
              onSaved={() => { loadAccount(); setHoursSheetVisible(false); }}
            />
          </View>
        </Sheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingTop: 64, paddingBottom: 32 },

  profileCard: {
    marginHorizontal: S.s5,
    marginBottom: S.s5,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    padding: 16,
    ...Shadow.sm,
  },
  avatar: { width: 48, height: 48, borderRadius: R.md, backgroundColor: T.brand600, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarTxt: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: "#fff" },
  profileName: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  profileMeta: { fontSize: 12, fontFamily: 'Montserrat', color: T.fg3, marginTop: 3 },
  editLabel: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: T.brand600 },

  opCard: {
    marginHorizontal: S.s5,
    marginBottom: S.s5,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    overflow: "hidden",
    ...Shadow.sm,
  },
  opRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  opRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  opIcon: { width: 32, height: 32, borderRadius: R.sm, backgroundColor: T.brand100, alignItems: "center", justifyContent: "center" },
  opLabel: { fontSize: 15, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },
  opMeta: { fontSize: 12, fontFamily: 'Montserrat', color: T.fg3, marginTop: 2 },

  secHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingRight: S.s5 },
  secCount: { fontSize: 11, fontFamily: 'Montserrat-Medium', color: T.fg4 },
  generateBtn: { marginHorizontal: S.s5, marginBottom: 12 },
  tokenRow: { marginHorizontal: S.s5, flexDirection: "row", alignItems: "center", gap: 12 },
  tokenIcon: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: T.bgSunken, alignItems: "center", justifyContent: "center" },
  tokenLabel: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },
  tokenMeta: { fontSize: 11, fontFamily: 'Montserrat', color: T.fg3, marginTop: 2 },
  empty: { paddingVertical: 30, alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 14, fontFamily: 'Montserrat', color: T.fg3 },
  signOut: { marginHorizontal: S.s5, marginTop: 28 },
  version: { marginTop: 18, fontFamily: 'Montserrat', textAlign: "center", fontSize: 11, color: T.fg4 },

  // Profile sheet
  sheetBody: { gap: S.s4 },
  avatarPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: T.bgSunken,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    padding: 14,
  },
  avatarPreviewIcon: { width: 48, height: 48, borderRadius: R.md, backgroundColor: T.brand600, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarPreviewTxt: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: "#fff" },
  avatarPreviewName: { fontSize: 15, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  avatarPreviewAddr: { fontSize: 12, fontFamily: 'Montserrat', color: T.fg3, marginTop: 2 },
  previewBadge: { backgroundColor: T.brand100, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 4 },
  previewBadgeTxt: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: T.brand600 },

  bioLabel: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', letterSpacing: 1.76, color: T.fg3, marginBottom: 7 },
  bioInput: {
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: T.fg1,
    minHeight: 72,
    textAlignVertical: "top",
  },
  bioCount: { fontSize: 11, fontFamily: 'Montserrat', color: T.fg4, marginTop: 5, textAlign: "right" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.bgSunken,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    padding: 14,
  },
  toggleLabel: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },
  toggleMeta: { fontSize: 12, fontFamily: 'Montserrat', color: T.fg3, marginTop: 2 },

  slugBox: { backgroundColor: T.bgSunken, borderRadius: R.sm, padding: 12 },
  slugLabel: { fontSize: 10, fontFamily: 'Montserrat-SemiBold', letterSpacing: 1.6, color: T.fg4, marginBottom: 4 },
  slugValue: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: T.brand600 },

  // Success state
  savedState: { alignItems: "center", gap: 16, paddingVertical: 16 },
  savedCheck: { width: 52, height: 52, borderRadius: R.pill, backgroundColor: T.mint100, borderWidth: 1, borderColor: T.mint600, alignItems: "center", justifyContent: "center" },
  savedTitle: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  savedDesc: { fontSize: 14, fontFamily: 'Montserrat', color: T.fg3, textAlign: "center", lineHeight: 21 },

  // Hours sheet
  hoursBody: { paddingBottom: S.s4 },
});
