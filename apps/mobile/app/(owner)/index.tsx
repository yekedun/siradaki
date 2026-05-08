import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { startOfDay, addDays } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { T, R, Shadow } from "../../lib/theme";

const TZ = "Europe/Istanbul";

interface DayStats {
  total: number;
  completed: number;
  cancelled: number;
  barberStats: { name: string; count: number }[];
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}

export default function OwnerDashboard() {
  const { shopId } = useUserRole();
  const [stats, setStats]       = useState<DayStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const today = startOfDay(new Date());

  const load = useCallback(async () => {
    if (!shopId) return;
    const dayStart = today.toISOString();
    const dayEnd   = addDays(today, 1).toISOString();

    // Tüm ustaları al
    const { data: barbers } = await supabase
      .from("barbers")
      .select("id, display_name")
      .eq("shop_id", shopId)
      .eq("is_active", true);

    if (!barbers) { setLoading(false); return; }

    // Bugünün randevularını al
    const { data: appts } = await supabase
      .from("appointments")
      .select("id, barber_id, status")
      .in("barber_id", barbers.map((b) => b.id))
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd);

    const list = appts ?? [];
    const barberStats = barbers.map((b) => ({
      name: b.display_name,
      count: list.filter((a) => a.barber_id === b.id && a.status !== "cancelled").length,
    }));

    setStats({
      total:     list.filter((a) => a.status !== "cancelled").length,
      completed: list.filter((a) => a.status === "completed").length,
      cancelled: list.filter((a) => a.status === "cancelled").length,
      barberStats,
    });
    setLoading(false);
    setRefreshing(false);
  }, [shopId]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.navy} />}
      >
        <Text style={styles.eyebrow}>DÜKKAN ÖZET</Text>
        <Text style={styles.title}>Bugün</Text>
        <Text style={styles.subtitle}>{fmtDate(today)}</Text>

        {loading ? (
          <ActivityIndicator color={T.navy} style={{ marginTop: 40 }} />
        ) : stats ? (
          <>
            <View style={styles.kpiRow}>
              <KpiCard icon="calendar" label="Toplam Randevu" value={stats.total} color={T.navy} />
              <KpiCard icon="check-circle" label="Tamamlanan" value={stats.completed} color="#16a34a" />
              <KpiCard icon="x-circle" label="İptal" value={stats.cancelled} color={T.red} />
            </View>

            <Text style={styles.sectionLabel}>USTA BAZINDA</Text>
            {stats.barberStats.map((b) => (
              <View key={b.name} style={styles.barberRow}>
                <View style={styles.barberDot} />
                <Text style={styles.barberName}>{b.name}</Text>
                <Text style={styles.barberCount}>{b.count} randevu</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function KpiCard({ icon, label, value, color }: {
  icon: string; label: string; value: number; color: string;
}) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Feather name={icon as never} size={18} color={color} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40 },

  eyebrow: { fontSize: 11, fontWeight: "600", letterSpacing: 1.4, textTransform: "uppercase", color: T.red, marginBottom: 6 },
  title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5, color: T.ink },
  subtitle: { fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 24 },

  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 28 },
  kpiCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    alignItems: "center",
    gap: 6,
    ...Shadow.card,
  },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  kpiLabel: { fontSize: 10, color: T.muted, textAlign: "center", fontWeight: "500" },

  sectionLabel: { fontSize: 11, fontWeight: "600", color: T.muted, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 },
  barberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    marginBottom: 8,
    ...Shadow.card,
  },
  barberDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.navy },
  barberName: { flex: 1, fontSize: 14, fontWeight: "600", color: T.ink },
  barberCount: { fontSize: 13, color: T.muted, fontWeight: "500" },
});
