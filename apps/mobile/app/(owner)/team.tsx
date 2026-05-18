import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import {
  UserPlus,
  Percent,
  Link,
  Clock,
  PauseCircle,
  PlayCircle,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, Shadow } from "../../lib/theme";
import { StaffScheduleModal } from "../../components/StaffScheduleModal";
import { Sheet } from "../../components/ds/Sheet";
import { StaffRow } from "../../components/ds/StaffRow";
import { TextField } from "../../components/ds/TextField";
import { Button } from "../../components/ds/Button";
import { Card } from "../../components/ds/Card";
import { OverlineHeader } from "../../components/ds/OverlineHeader";

interface Staff {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
  user_id: string | null;
  commission_type: "none" | "percentage";
  commission_rate_bps: number | null;
}

interface StaffCommissionConfig {
  staff_id: string;
  commission_type: "none" | "percentage";
  commission_rate_bps: number | null;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isValidSlug(s: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(s);
}

export default function TeamScreen() {
  const { shopId } = useUserRole();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading]   = useState(true);
  const [inviting, setInviting] = useState(false);
  const [modalStaff, setModalStaff] = useState<Staff | null>(null);
  const [commissionStaff, setCommissionStaff] = useState<Staff | null>(null);
  const [commissionInput, setCommissionInput] = useState("");
  const [commissionOn, setCommissionOn] = useState(false);
  const [savingCommission, setSavingCommission] = useState(false);
  const [addStaffVisible, setAddStaffVisible] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [slugStaff, setSlugStaff] = useState<Staff | null>(null);
  const [slugInput, setSlugInput] = useState("");
  const [savingSlug, setSavingSlug] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    const [{ data }, { data: commissionRows, error: commissionError }] = await Promise.all([
      supabase
        .from("staff")
        .select("id, name, slug, is_active, user_id")
        .eq("shop_id", shopId)
        .order("created_at"),
      supabase.rpc("get_staff_commission_configs", { p_shop_id: shopId }),
    ]);
    if (commissionError) Alert.alert("Hata", commissionError.message);
    const commissionByStaff = new Map(
      ((commissionRows as StaffCommissionConfig[] | null) ?? []).map((row) => [row.staff_id, row])
    );
    setStaffList(
      ((data as Omit<Staff, "commission_type" | "commission_rate_bps">[] | null) ?? []).map((staff) => {
        const commission = commissionByStaff.get(staff.id);
        return {
          ...staff,
          commission_type: commission?.commission_type ?? "none",
          commission_rate_bps: commission?.commission_rate_bps ?? null,
        };
      })
    );
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  async function handleAddStaff(name: string): Promise<boolean> {
    setInviting(true);
    try {
      const baseSlug = toSlug(name);
      // Aynı shop içinde slug çakışması varsa suffix ekle
      const existingSlugs = new Set(staffList.map((s) => s.slug).filter(Boolean));
      let slug = baseSlug;
      let suffix = 2;
      while (slug && existingSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix++}`;
      }
      const { error } = await supabase
        .from("staff")
        .insert({ shop_id: shopId as string, name, slug: slug || null, role: "staff", is_active: true });
      if (error) throw error;
      Alert.alert("Başarılı", `${name} başarıyla eklendi.`);
      await load();
      return true;
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
      return false;
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
          text: staffMember.is_active ? "Pasif yap" : "Aktif yap",
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

  function openCommissionModal(staffMember: Staff) {
    setCommissionStaff(staffMember);
    setCommissionOn(staffMember.commission_type === "percentage");
    setCommissionInput(staffMember.commission_rate_bps != null ? String(staffMember.commission_rate_bps / 100) : "");
  }

  function closeCommissionModal() {
    if (savingCommission) return;
    setCommissionStaff(null);
    setCommissionInput("");
    setCommissionOn(false);
  }

  async function saveCommission() {
    if (!commissionStaff) return;
    if (!commissionOn) {
      await updateCommission(commissionStaff.id, "none", null);
      return;
    }
    const trimmed = commissionInput.trim().replace(",", ".");
    if (!trimmed) {
      Alert.alert("Geçersiz", "Komisyon oranı gir.");
      return;
    }
    const percent = Number(trimmed);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      Alert.alert("Geçersiz", "0 ile 100 arasında oran gir.");
      return;
    }
    await updateCommission(commissionStaff.id, "percentage", Math.round(percent * 100));
  }

  async function updateCommission(
    staffId: string,
    commissionType: "none" | "percentage",
    commissionRateBps: number | null
  ) {
    setSavingCommission(true);
    const { error } = await supabase.rpc("update_staff_commission_config", {
      p_staff_id: staffId,
      p_commission_type: commissionType,
      p_commission_rate_bps: commissionType === "percentage" ? (commissionRateBps ?? undefined) : undefined,
    });
    if (error) {
      Alert.alert("Hata", error.message);
      setSavingCommission(false);
      return;
    }
    await load();
    setSavingCommission(false);
    setCommissionStaff(null);
    setCommissionInput("");
    setCommissionOn(false);
  }

  function openSlugModal(staffMember: Staff) {
    setSlugStaff(staffMember);
    setSlugInput(staffMember.slug ?? "");
  }

  function closeSlugModal() {
    if (savingSlug) return;
    setSlugStaff(null);
    setSlugInput("");
  }

  async function saveSlug() {
    if (!slugStaff) return;
    const trimmed = slugInput.trim().toLowerCase();

    if (trimmed && !isValidSlug(trimmed)) {
      Alert.alert("Geçersiz slug", "Sadece küçük harf, rakam ve tire (-) kullanılabilir.");
      return;
    }

    // Aynı dükkan içinde başka birine ait mi kontrol et
    const conflict = staffList.find((s) => s.id !== slugStaff.id && s.slug === trimmed);
    if (trimmed && conflict) {
      Alert.alert("Çakışma", `Bu slug zaten ${conflict.name} tarafından kullanılıyor.`);
      return;
    }

    setSavingSlug(true);
    const { error } = await supabase
      .from("staff")
      .update({ slug: trimmed || null })
      .eq("id", slugStaff.id);
    if (error) {
      Alert.alert("Hata", error.message);
      setSavingSlug(false);
      return;
    }
    await load();
    setSavingSlug(false);
    setSlugStaff(null);
    setSlugInput("");
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OverlineHeader eyebrow="EKİP YÖNETİMİ" title="Ustalar" />

        <View style={styles.addBtnRow}>
          <Button
            variant="accent"
            size="md"
            full
            onPress={() => {
              setNewStaffName("");
              setAddStaffVisible(true);
            }}
            disabled={inviting}
          >
            {inviting ? "Ekleniyor…" : "Personel ekle"}
          </Button>
        </View>

        {loading ? (
          <ActivityIndicator color={T.brand600} style={{ marginTop: 20 }} />
        ) : staffList.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTxt}>Henüz personel yok. Yeni personel ekleyin.</Text>
          </View>
        ) : (
          <Card padded={false} style={{ marginTop: 8 }}>
            {staffList.map((b) => (
              <StaffRow
                key={b.id}
                name={b.name}
                status={b.is_active ? "Aktif" : "Pasif"}
                meta={[
                  b.slug ? `/${b.slug}` : "slug yok",
                  b.commission_type === "percentage" && b.commission_rate_bps != null
                    ? `%${b.commission_rate_bps / 100} komisyon`
                    : "Komisyon yok",
                ].join(" · ")}
                trailing={
                  <View style={styles.trailingRow}>
                    <Percent
                      size={18}
                      color={T.brand600}
                      onPress={() => openCommissionModal(b)}
                    />
                    <Link
                      size={18}
                      color={b.slug ? T.brand600 : T.fg3}
                      onPress={() => openSlugModal(b)}
                    />
                    <Clock
                      size={18}
                      color={T.brand500}
                      onPress={() => setModalStaff(b)}
                    />
                    {b.is_active ? (
                      <PauseCircle
                        size={22}
                        color={T.fg3}
                        onPress={() => handleToggleActive(b)}
                      />
                    ) : (
                      <PlayCircle
                        size={22}
                        color={T.brand600}
                        onPress={() => handleToggleActive(b)}
                      />
                    )}
                  </View>
                }
              />
            ))}
          </Card>
        )}
      </ScrollView>

      <StaffScheduleModal
        visible={modalStaff !== null}
        staff={modalStaff}
        onClose={() => setModalStaff(null)}
      />

      {/* Personel Ekle Sheet */}
      <Sheet
        visible={addStaffVisible}
        onClose={() => { if (!inviting) setAddStaffVisible(false); }}
        title="Personel ekle"
        footer={
          <View style={styles.sheetFooter}>
            <Button
              variant="secondary"
              size="md"
              onPress={() => { if (!inviting) setAddStaffVisible(false); }}
              disabled={inviting}
            >
              Vazgeç
            </Button>
            <Button
              variant="accent"
              size="md"
              onPress={async () => {
                const name = newStaffName.trim();
                if (name.length < 2) { Alert.alert("Geçersiz", "Geçerli bir ad gir."); return; }
                const created = await handleAddStaff(name);
                if (created) { setAddStaffVisible(false); setNewStaffName(""); }
              }}
              disabled={inviting}
            >
              {inviting ? "Ekleniyor…" : "Ekle"}
            </Button>
          </View>
        }
      >
        <Text style={styles.sheetSubtext}>Randevu alacak usta adını gir.</Text>
        <View style={{ marginTop: 14 }}>
          <TextField
            label="Ad Soyad"
            value={newStaffName}
            onChange={setNewStaffName}
            placeholder="Ad Soyad"
          />
        </View>
      </Sheet>

      {/* Komisyon Sheet */}
      <Sheet
        visible={commissionStaff !== null}
        onClose={closeCommissionModal}
        title="Komisyon Ayarı"
        footer={
          <View style={styles.sheetFooter}>
            <Button
              variant="secondary"
              size="md"
              onPress={closeCommissionModal}
              disabled={savingCommission}
            >
              Vazgeç
            </Button>
            <Button
              variant="accent"
              size="md"
              onPress={saveCommission}
              disabled={savingCommission}
            >
              {savingCommission ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </View>
        }
      >
        <Text style={styles.sheetSubtext}>{commissionStaff?.name} için komisyon ayarı.</Text>
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Komisyon aktif</Text>
          <Switch
            value={commissionOn}
            onValueChange={(v) => {
              setCommissionOn(v);
              if (!v) setCommissionInput("");
            }}
            trackColor={{ true: T.brand600, false: T.border }}
            thumbColor="#fff"
            disabled={savingCommission}
          />
        </View>
        {commissionOn && (
          <View style={{ marginTop: 14 }}>
            <TextField
              label="Komisyon Oranı (%)"
              value={commissionInput}
              onChange={setCommissionInput}
              placeholder="Örn. 50"
            />
          </View>
        )}
      </Sheet>

      {/* Slug Düzenleme Sheet */}
      <Sheet
        visible={slugStaff !== null}
        onClose={closeSlugModal}
        title="Randevu Linki"
        footer={
          <View style={styles.sheetFooter}>
            <Button
              variant="secondary"
              size="md"
              onPress={closeSlugModal}
              disabled={savingSlug}
            >
              Vazgeç
            </Button>
            <Button
              variant="accent"
              size="md"
              onPress={saveSlug}
              disabled={savingSlug}
            >
              {savingSlug ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </View>
        }
      >
        <Text style={styles.sheetSubtext}>
          {slugStaff?.name} için kısa URL parçası gir (sadece harf, rakam, tire). Boş bırakırsan link devre dışı kalır.
        </Text>
        <View style={{ marginTop: 14 }}>
          <TextField
            label="Slug"
            value={slugInput}
            onChange={(v) => setSlugInput(v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="ahmet-usta"
          />
        </View>
        {slugInput.length > 0 && (
          <Text style={styles.slugPreview}>
            siraladaki.app/…/u/{slugInput}
          </Text>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 64, paddingBottom: 40 },

  addBtnRow: { paddingHorizontal: 20, marginBottom: 8 },

  empty: { paddingTop: 40, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: T.fg4 },

  trailingRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: T.fg1,
  },
  slugPreview: { marginTop: 6, fontSize: 11, color: T.fg3, fontStyle: "italic" },

  sheetSubtext: { fontSize: 13, lineHeight: 18, color: T.fg3, marginBottom: 4 },
  sheetFooter: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
