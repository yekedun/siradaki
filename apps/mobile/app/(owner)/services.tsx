import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Plus, ChevronRight } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, S, Shadow } from "../../lib/theme";
import {
  OverlineHeader,
  SectionLabel,
  Sheet,
  Button,
  TextField,
} from "../../components/ds";

interface Service {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  is_active: boolean;
}

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

function priceDisplay(cents: number): string {
  return `${Math.round(cents / 100).toLocaleString("tr-TR")} ₺`;
}

export default function ServicesScreen() {
  const { shopId } = useUserRole();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);
  const [priceInput, setPriceInput] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    const { data } = await supabase
      .from("services")
      .select("id, name, duration_min, price_cents, is_active")
      .eq("shop_id", shopId)
      .order("created_at");
    setServices((data as Service[]) ?? []);
    setLoading(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setName("");
    setDuration(30);
    setPriceInput("");
    setIsActive(true);
    setDeleteConfirm(false);
    setSheetVisible(true);
  }

  function openEdit(svc: Service) {
    setEditing(svc);
    setName(svc.name);
    setDuration(svc.duration_min);
    setPriceInput(String(Math.round(svc.price_cents / 100)));
    setIsActive(svc.is_active);
    setDeleteConfirm(false);
    setSheetVisible(true);
  }

  async function handleToggle(svc: Service) {
    const { error } = await supabase
      .from("services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (error) { Alert.alert("Hata", error.message); return; }
    await load();
  }

  async function handleSave() {
    const nameTrim = name.trim();
    if (nameTrim.length < 2) { Alert.alert("Geçersiz", "Hizmet adı en az 2 karakter olmalı."); return; }
    const price = Number(priceInput.trim().replace(",", "."));
    if (!Number.isFinite(price) || price < 0) { Alert.alert("Geçersiz", "Geçerli bir fiyat gir."); return; }
    setSaving(true);
    const payload = {
      name: nameTrim,
      duration_min: duration,
      price_cents: Math.round(price * 100),
      is_active: isActive,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("services").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("services").insert({ ...payload, shop_id: shopId }));
    }
    setSaving(false);
    if (error) { Alert.alert("Hata", error.message); return; }
    setSheetVisible(false);
    await load();
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    const { error } = await supabase.from("services").delete().eq("id", editing.id);
    setDeleting(false);
    if (error) { Alert.alert("Hata", error.message); return; }
    setSheetVisible(false);
    await load();
  }

  const canSave = name.trim().length >= 2 && priceInput.trim().length > 0;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <OverlineHeader
          eyebrow="DÜKKAN AYARLARI"
          title="Hizmetler"
          trailing={
            <Button variant="accent" size="sm" onPress={openAdd}>+ Ekle</Button>
          }
        />
        <Text style={styles.hint}>
          Aktif hizmetler müşteri ekranında görünür. Fiyat ve süreyi istediğin zaman güncelleyebilirsin.
        </Text>

        {loading ? (
          <ActivityIndicator color={T.brand600} style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Henüz hizmet yok</Text>
            <Text style={styles.emptyText}>En az bir hizmet tanımlayın.</Text>
            <Button variant="primary" size="md" onPress={openAdd} style={{ marginTop: 16 }}>
              Hizmet Ekle
            </Button>
          </View>
        ) : (
          <View style={styles.list}>
            {services.map((svc) => (
              <Pressable key={svc.id} onPress={() => openEdit(svc)} style={styles.row}>
                <View style={[styles.dot, { backgroundColor: svc.is_active ? T.mint600 : T.slate300 }]} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, !svc.is_active && styles.rowNameMuted]}>
                    {svc.name}
                  </Text>
                  <View style={styles.chipRow}>
                    <View style={styles.chip}>
                      <Text style={styles.chipTxt}>{svc.duration_min} dk</Text>
                    </View>
                    <View style={styles.chip}>
                      <Text style={styles.chipTxt}>{priceDisplay(svc.price_cents)}</Text>
                    </View>
                  </View>
                </View>
                <Switch
                  value={svc.is_active}
                  onValueChange={() => handleToggle(svc)}
                  trackColor={{ true: T.mint600, false: T.border }}
                  thumbColor="#fff"
                />
                <ChevronRight size={16} color={T.slate400} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <Sheet
        visible={sheetVisible}
        onClose={() => { if (!saving && !deleting) setSheetVisible(false); }}
        title={editing ? "Hizmet Düzenle" : "Yeni Hizmet"}
        footer={
          <View style={styles.sheetFooter}>
            {editing && !deleteConfirm && (
              <Button
                variant="danger"
                size="md"
                disabled={deleting}
                onPress={() => setDeleteConfirm(true)}
              >
                Sil
              </Button>
            )}
            {editing && deleteConfirm && (
              <Button
                variant="danger"
                size="md"
                loading={deleting}
                onPress={handleDelete}
              >
                Emin misin? Sil
              </Button>
            )}
            <View style={{ flex: 1 }} />
            <Button
              variant="accent"
              size="md"
              disabled={!canSave}
              loading={saving}
              onPress={handleSave}
            >
              {editing ? "Kaydet" : "Ekle"}
            </Button>
          </View>
        }
      >
        <View style={styles.sheetBody}>
          <TextField
            label="HİZMET ADI"
            value={name}
            onChange={setName}
            placeholder="Saç + Sakal"
          />

          <SectionLabel style={styles.sheetSectionLabel}>SÜRE</SectionLabel>
          <View style={styles.durGrid}>
            {DURATIONS.map((d) => {
              const sel = d === duration;
              return (
                <Pressable
                  key={d}
                  onPress={() => setDuration(d)}
                  style={[styles.durChip, sel && styles.durChipSel]}
                >
                  <Text style={[styles.durTxt, sel && styles.durTxtSel]}>{d} dk</Text>
                </Pressable>
              );
            })}
          </View>

          <TextField
            label="FİYAT (₺)"
            value={priceInput}
            onChange={setPriceInput}
            placeholder="150"
          />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Aktif</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: T.mint600, false: T.border }}
              thumbColor="#fff"
            />
          </View>

          {name.trim().length > 0 && priceInput.trim().length > 0 && (
            <View style={styles.summary}>
              <Text style={styles.summaryTxt}>
                {name.trim()} · {duration} dk · {priceInput.trim()} ₺
              </Text>
            </View>
          )}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 64, paddingBottom: 40 },
  hint: {
    fontSize: 12,
    fontFamily: 'Montserrat',
    color: T.slate500,
    paddingHorizontal: S.s5,
    marginBottom: S.s5,
    lineHeight: 18,
  },

  empty: { paddingTop: 48, alignItems: "center", paddingHorizontal: S.s5 },
  emptyTitle: { fontSize: 17, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  emptyText: { fontSize: 13, fontFamily: 'Montserrat', color: T.fg3, marginTop: 6 },

  list: { paddingHorizontal: S.s5, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    ...Shadow.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },
  rowNameMuted: { opacity: 0.55 },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 4 },
  chip: {
    backgroundColor: T.ink900,
    borderRadius: R.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipTxt: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: T.bgElevated },

  sheetBody: { gap: S.s3 },
  sheetSectionLabel: { marginHorizontal: 0, paddingHorizontal: 0, marginTop: S.s4 },
  sheetFooter: { flexDirection: "row", alignItems: "center" },

  durGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.pill,
  },
  durChipSel: { backgroundColor: T.ink900, borderColor: T.ink900 },
  durTxt: { fontSize: 13, fontFamily: 'Montserrat-Medium', color: T.fg1 },
  durTxtSel: { color: "#fff" },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: S.s3,
  },
  toggleLabel: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },

  summary: {
    backgroundColor: T.accentTint,
    borderRadius: R.sm,
    padding: 12,
    marginTop: S.s2,
  },
  summaryTxt: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: T.brand600 },
});
