import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { supabase } from "../../lib/supabase";

const DURATIONS = [
  { label: "15 dk", value: 15 },
  { label: "30 dk", value: 30 },
  { label: "45 dk", value: 45 },
  { label: "1 saat", value: 60 },
  { label: "1.5 saat", value: 90 },
  { label: "2 saat", value: 120 },
];

const REASONS = [
  { label: "Yürüyerek Gelen Müşteri", value: "walkin" as const },
  { label: "Mola", value: "break" as const },
  { label: "Kişisel", value: "personal" as const },
];

export default function BlockScreen() {
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedReason, setSelectedReason] = useState<"walkin" | "break" | "personal">("walkin");
  const [loading, setLoading] = useState(false);

  async function handleBlock() {
    if (!selectedDuration) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı");

      const { data: barber } = await supabase
        .from("barbers")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!barber) throw new Error("Berber profili bulunamadı");

      const now = new Date();
      const endsAt = new Date(now.getTime() + selectedDuration * 60_000);

      const { error } = await supabase.from("blocks").insert({
        barber_id: barber.id,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        reason: selectedReason,
        created_via: "app",
      });

      if (error) {
        if (error.code === "23P01") {
          Alert.alert("Çakışma", "Bu saatte zaten bir randevu veya blok var.");
        } else {
          throw error;
        }
        return;
      }

      const endLabel = endsAt.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      Alert.alert("Blok Eklendi", `Saat ${endLabel}'e kadar takvim kapalı.`);
      setSelectedDuration(null);
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Süre</Text>
      <View style={styles.grid}>
        {DURATIONS.map((d) => (
          <TouchableOpacity
            key={d.value}
            style={[
              styles.chip,
              selectedDuration === d.value && styles.chipSelected,
            ]}
            onPress={() => setSelectedDuration(d.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedDuration === d.value && styles.chipTextSelected,
              ]}
            >
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Sebep</Text>
      <View style={styles.reasonList}>
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.reasonRow,
              selectedReason === r.value && styles.reasonRowSelected,
            ]}
            onPress={() => setSelectedReason(r.value)}
          >
            <View
              style={[
                styles.radio,
                selectedReason === r.value && styles.radioSelected,
              ]}
            />
            <Text style={styles.reasonText}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          (!selectedDuration || loading) && styles.buttonDisabled,
        ]}
        onPress={handleBlock}
        disabled={!selectedDuration || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {selectedDuration
              ? `Şu andan itibaren ${DURATIONS.find((d) => d.value === selectedDuration)?.label} blokla`
              : "Süre Seçin"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: "#374151", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  chipSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  chipText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  chipTextSelected: { color: "#2563eb" },
  reasonList: { gap: 10 },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    gap: 12,
  },
  reasonRowSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#d1d5db",
  },
  radioSelected: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  reasonText: { fontSize: 14, color: "#374151" },
  button: {
    marginTop: 32,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
