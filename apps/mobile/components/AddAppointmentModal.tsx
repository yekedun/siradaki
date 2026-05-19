import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { addMinutes, isSameDay } from "date-fns";
import { supabase } from "../lib/supabase";
import { T, R } from "../lib/theme";

interface ServiceRow {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
}

interface EditingAppt {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  service_id: string | null;
  services: { name: string; duration_min: number } | null;
}

interface AddAppointmentModalProps {
  visible: boolean;
  shopId: string;
  staffId: string;
  initialDate?: Date;
  editingAppt?: EditingAppt | null;
  onSaved?: () => void | Promise<void>;
  onClose: () => void;
}


const FALLBACK_DURATIONS = [
  { label: "15 dk", value: 15 },
  { label: "30 dk", value: 30 },
  { label: "45 dk", value: 45 },
  { label: "1 saat", value: 60 },
  { label: "1.5 saat", value: 90 },
  { label: "2 saat", value: 120 },
];

function nextRoundedSlot(base: Date = new Date()): Date {
  const d = new Date(base);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  d.setMinutes(m + (15 - (m % 15 || 15)));
  return d;
}

function nineAM(base: Date): Date {
  const d = new Date(base);
  d.setHours(9, 0, 0, 0);
  return d;
}

function buildInitialStartsAt(initialDate: Date | undefined): Date {
  const target = initialDate ?? new Date();
  const today = new Date();
  if (isSameDay(target, today)) return nextRoundedSlot();
  return nineAM(target);
}

export function AddAppointmentModal({
  visible,
  shopId,
  staffId,
  initialDate,
  editingAppt,
  onSaved,
  onClose,
}: AddAppointmentModalProps) {
  const isEdit = !!editingAppt;
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState<Date>(() => buildInitialStartsAt(initialDate));
  const [duration, setDuration] = useState<number>(30);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [customServiceName, setCustomServiceName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  // Reset / hydrate on open
  useEffect(() => {
    if (!visible) return;
    if (editingAppt) {
      setName(editingAppt.customer_name);
      setPhone(editingAppt.customer_phone ?? "");
      setStartsAt(new Date(editingAppt.starts_at));
      const dur =
        editingAppt.services?.duration_min ??
        Math.max(
          15,
          Math.round(
            (new Date(editingAppt.ends_at).getTime() -
              new Date(editingAppt.starts_at).getTime()) /
              60000
          )
        );
      setDuration(dur);
      setServiceId(editingAppt.service_id);
      setCustomServiceName(editingAppt.services?.name ?? "");
    } else {
      setName("");
      setPhone("");
      setStartsAt(buildInitialStartsAt(initialDate));
      setDuration(30);
      setServiceId(null);
      setCustomServiceName("");
    }
    setShowDate(false);
    setShowTime(false);
  }, [visible, editingAppt, initialDate]);

  // Load barber services on mount
  const loadServices = useCallback(async () => {
    const { data } = await supabase
      .from("services")
      .select("id, name, duration_min, price_cents")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    setServices(data ?? []);
  }, [shopId]);

  useEffect(() => {
    if (!visible) return;
    loadServices();
  }, [visible, loadServices]);

  const endsAt = useMemo(() => addMinutes(startsAt, duration), [startsAt, duration]);
  const hasServices = services.length > 0;

  function handleClose() {
    if (loading) return;
    onClose();
  }

  function onDateChange(_e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowDate(false);
    if (!selected) return;
    const merged = new Date(startsAt);
    merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    setStartsAt(merged);
  }

  function onTimeChange(_e: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShowTime(false);
    if (!selected) return;
    const merged = new Date(startsAt);
    merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    setStartsAt(merged);
  }

  function pickService(s: ServiceRow) {
    setServiceId(s.id);
    setDuration(s.duration_min);
    setCustomServiceName(s.name);
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      Alert.alert("Eksik", "Müşteri adı en az 2 karakter olmalı");
      return;
    }
    if (phone.trim().length < 10) {
      Alert.alert("Eksik", "Telefon numarası zorunlu");
      return;
    }
    if (!hasServices) {
      Alert.alert("Eksik", "Randevu eklemek için önce aktif bir hizmet tanımlanmalı.");
      return;
    }
    if (!serviceId) {
      Alert.alert("Eksik", "Kayıtlı bir hizmet seçmelisin");
      return;
    }
    if (!isEdit && startsAt.getTime() < Date.now() - 60_000) {
      Alert.alert("Geçersiz Saat", "Geçmiş bir saate randevu eklenemez");
      return;
    }

    setLoading(true);
    const { error } = isEdit
      ? await supabase.rpc("update_appointment_atomic" as never, {
          p_appointment_id: editingAppt!.id,
          p_staff_id: staffId,
          p_service_id: serviceId,
          p_starts_at: startsAt.toISOString(),
          p_customer_name: name.trim(),
          p_customer_phone: phone.trim(),
          p_customer_notes: null,
        } as never)
      : await supabase.rpc("create_appointment_atomic" as never, {
          p_shop_slug: null,
          p_shop_id: shopId,
          p_service_id: serviceId,
          p_staff_id: staffId,
          p_starts_at: startsAt.toISOString(),
          p_customer_name: name.trim(),
          p_customer_phone: phone.trim(),
          p_customer_notes: null,
          p_customer_user_id: null,
        } as never);
    setLoading(false);

    if (error) {
      if (error.code === "23P01" || error.code === "P0001") {
        Alert.alert("Çakışma", error.message || "Bu saat artık müsait değil. Farklı bir saat seç.");
      } else {
        Alert.alert("Hata", error.message);
      }
      return;
    }
    await onSaved?.();
    onClose();
  }

  const dateLabel = startsAt.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeLabel = startsAt.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endLabel = endsAt.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: T.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Text style={styles.headerCancel}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEdit ? "Randevuyu Düzenle" : "Yeni Randevu"}
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={loading || !hasServices}>
            {loading ? (
              <ActivityIndicator color={T.brand600} />
            ) : (
              <Text style={styles.headerSave}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Müşteri Adı</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Örn. Ahmet Yılmaz"
            placeholderTextColor={T.fg3}
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="0(5xx) xxx xx xx"
            placeholderTextColor={T.fg3}
            style={styles.input}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Hizmet</Text>
          {hasServices ? (
            <View style={styles.serviceGrid}>
              {services.map((s) => {
                const sel = s.id === serviceId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => pickService(s)}
                    style={[styles.serviceChip, sel && styles.serviceChipSel]}
                  >
                    <Text style={[styles.serviceName, sel && { color: T.brand600 }]}>{s.name}</Text>
                    <Text style={styles.serviceMeta}>
                      {s.duration_min} dk
                      {s.price_cents != null ? ` · ${Math.round(s.price_cents / 100)}₺` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyServices}>
              <Text style={styles.emptyServicesTitle}>Aktif hizmet yok</Text>
              <Text style={styles.emptyServicesText}>
                Randevu eklemek için önce hizmet tanımlanmalı.
              </Text>
            </View>
          )}

          <Text style={styles.label}>Tarih</Text>
          <TouchableOpacity
            onPress={() => setShowDate(true)}
            style={styles.pickerRow}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerValue}>{dateLabel}</Text>
            <Text style={styles.pickerChevron}>›</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Saat</Text>
          <TouchableOpacity
            onPress={() => setShowTime(true)}
            style={styles.pickerRow}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerValue}>{timeLabel}</Text>
            <Text style={styles.pickerChevron}>›</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && showDate && (
            <DateTimePicker
              value={startsAt}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              minimumDate={isEdit ? undefined : new Date()}
              locale="tr-TR"
            />
          )}
          {Platform.OS === "ios" && showTime && (
            <DateTimePicker
              value={startsAt}
              mode="time"
              display="spinner"
              onChange={onTimeChange}
              minuteInterval={5}
              locale="tr-TR"
              is24Hour
            />
          )}
          {Platform.OS === "android" && showDate && (
            <DateTimePicker
              value={startsAt}
              mode="date"
              display="default"
              onChange={onDateChange}
              minimumDate={isEdit ? undefined : new Date()}
            />
          )}
          {Platform.OS === "android" && showTime && (
            <DateTimePicker
              value={startsAt}
              mode="time"
              display="default"
              onChange={onTimeChange}
              minuteInterval={5}
              is24Hour
            />
          )}

          <Text style={styles.label}>Süre</Text>
          {hasServices ? (
            <View style={styles.durationInfo}>
              <Text style={styles.durationInfoText}>Süre seçilen hizmetten gelir: {duration} dk</Text>
            </View>
          ) : (
            <View style={styles.durRow}>
              {FALLBACK_DURATIONS.map((d) => {
                const sel = duration === d.value;
                return (
                  <View
                    key={d.value}
                    style={[styles.durChip, sel && styles.durChipSel, styles.durChipDisabled]}
                  >
                    <Text style={[styles.durText, sel && { color: T.brand600, fontWeight: "700" }]}>
                      {d.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>ÖZET</Text>
            <Text style={styles.previewText}>
              {customServiceName || "Hizmet"} · {dateLabel} · {timeLabel}
            </Text>
            <Text style={styles.previewSub}>
              Bitiş: {endLabel} ({duration} dk)
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    backgroundColor: T.bg,
  },
  headerCancel: { fontSize: 15, color: T.fg3, minWidth: 60 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: T.fg1 },
  headerSave: {
    fontSize: 15,
    fontWeight: "700",
    color: T.brand600,
    minWidth: 60,
    textAlign: "right",
  },
  content: { padding: 20, paddingBottom: 60 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: T.fg3,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: T.bg,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: T.fg1,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.bg,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerValue: { fontSize: 14, color: T.fg1, fontWeight: "600" },
  pickerChevron: { fontSize: 22, color: T.fg3, fontWeight: "400" },

  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  serviceChip: {
    width: "48%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: T.bgElevated,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: R.sm,
  },
  serviceChipSel: { borderColor: T.brand600, backgroundColor: T.accentTint },
  serviceName: { fontSize: 13, fontWeight: "600", color: T.fg1 },
  serviceMeta: { fontSize: 11, color: T.fg3, marginTop: 2 },
  emptyServices: {
    padding: 14,
    backgroundColor: T.bgElevated,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: R.sm,
  },
  emptyServicesTitle: { fontSize: 13, fontWeight: "700", color: T.fg1 },
  emptyServicesText: { marginTop: 4, fontSize: 12, color: T.fg3, lineHeight: 17 },

  durRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  durChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.bgElevated,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: R.sm,
  },
  durChipSel: { borderColor: T.brand600, backgroundColor: T.accentTint },
  durChipDisabled: { opacity: 0.55 },
  durText: { fontSize: 13, color: T.fg1, fontWeight: "500" },
  durationInfo: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: T.bgElevated,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: R.sm,
  },
  durationInfoText: { fontSize: 13, color: T.fg3, fontWeight: "600" },

  preview: {
    marginTop: 24,
    padding: 14,
    backgroundColor: T.accentTint,
    borderRadius: R.sm,
    borderLeftWidth: 4,
    borderLeftColor: T.brand600,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: T.brand600,
    marginBottom: 4,
  },
  previewText: { fontSize: 14, color: T.fg1, fontWeight: "600" },
  previewSub: { marginTop: 2, fontSize: 12, color: T.fg3 },
});
