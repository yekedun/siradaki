import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { T, R, Shadow } from "../../lib/theme";

const TZ = "Europe/Istanbul";

function fTime(iso: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(new Date(iso));
}

function fDate(iso: string) {
  return format(new Date(iso), "d MMMM yyyy, EEEE", { locale: tr });
}

export default function SuccessScreen() {
  const { sname, bname, slot } = useLocalSearchParams<{
    sname: string;
    bname: string;
    slot: string;
    apptId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.iconWrap}>
          <View style={styles.iconOuter}>
            <View style={styles.iconInner}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={styles.eyebrow}>ONAYLANDI</Text>
        <Text style={styles.title}>Randevun alındı</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.subtitleStrong}>{fDate(slot)}</Text>
          {"\n"}günü saat <Text style={styles.subtitleStrong}>{fTime(slot)}</Text> için kaydın hazır.
        </Text>

        <View style={styles.card}>
          {sname ? (
            <View style={styles.row}>
              <Ionicons name="cut-outline" size={16} color={T.muted} />
              <Text style={styles.rowText}>{sname}</Text>
            </View>
          ) : null}
          {bname ? (
            <View style={styles.row}>
              <Ionicons name="person-outline" size={16} color={T.muted} />
              <Text style={styles.rowText}>{bname}</Text>
            </View>
          ) : null}
          {slot ? (
            <View style={[styles.row, { marginBottom: 0 }]}>
              <Ionicons name="time-outline" size={16} color={T.navy} />
              <Text style={[styles.rowText, styles.rowTime]}>{fTime(slot)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(app)/appointments")}
            activeOpacity={0.88}
          >
            <Text style={styles.primaryBtnText}>Randevularıma git</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/(app)")}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryBtnText}>Ana sayfaya dön</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: "center",
  },
  iconWrap: { marginBottom: 28 },
  iconOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: T.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.navy,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.cta,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: T.red,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: T.ink,
    letterSpacing: -0.3,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: T.muted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  subtitleStrong: { color: T.ink, fontWeight: "700" },
  card: {
    width: "100%",
    backgroundColor: T.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 32,
    ...Shadow.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  rowText: { fontSize: 14, fontWeight: "500", color: T.ink, flex: 1 },
  rowTime: { fontSize: 16, fontWeight: "700", color: T.navy, fontVariant: ["tabular-nums"] },
  actions: { width: "100%", gap: 12 },
  primaryBtn: {
    backgroundColor: T.navy,
    borderRadius: R.cta,
    paddingVertical: 16,
    alignItems: "center",
    ...Shadow.cta,
  },
  primaryBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "500", color: T.navy },
});
