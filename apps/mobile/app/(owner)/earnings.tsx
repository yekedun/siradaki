import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Lock, TrendingUp, Percent, CreditCard, LucideIcon } from "lucide-react-native";
import { addDays, format, startOfDay } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { R, Shadow, T } from "../../lib/theme";

type RangeKey = "today" | "week" | "month";

interface StaffReportRow {
  staff_id: string;
  staff_name: string;
  completed_count: number;
  gross_revenue_cents: number;
  commission_cents: number;
  shop_share_cents: number;
}

interface CommissionReport {
  total_revenue_cents: number;
  total_commission_cents: number;
  total_shop_share_cents: number;
  staff: StaffReportRow[];
}

function money(cents: number): string {
  return `${Math.round(cents / 100).toLocaleString("tr-TR")} TL`;
}

function rangeDates(range: RangeKey): { from: Date; to: Date } {
  const today = startOfDay(new Date());
  if (range === "week") return { from: addDays(today, -6), to: today };
  if (range === "month") return { from: addDays(today, -29), to: today };
  return { from: today, to: today };
}

export default function OwnerEarningsScreen() {
  const { shopId } = useUserRole();
  const [range, setRange] = useState<RangeKey>("today");
  const [enabled, setEnabled] = useState(false);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("commission_enabled")
      .eq("id", shopId)
      .single();
    if (shopError) {
      Alert.alert("Hata", shopError.message);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const isEnabled = Boolean(shop?.commission_enabled);
    setEnabled(isEnabled);
    if (!isEnabled) {
      setReport(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { from, to } = rangeDates(range);
    const { data, error } = await supabase.rpc("get_commission_report", {
      p_shop_id: shopId,
      p_from: format(from, "yyyy-MM-dd"),
      p_to: format(to, "yyyy-MM-dd"),
    });
    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      setReport(data as unknown as CommissionReport);
    }
    setLoading(false);
    setRefreshing(false);
  }, [range, shopId]);

  useEffect(() => {
    load();
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand600} />}
      >
        <Text style={styles.eyebrow}>KOMİSYON</Text>
        <Text style={styles.title}>Kazanç</Text>

        <View style={styles.rangeRow}>
          {[
            ["today", "Bugün"],
            ["week", "7 gün"],
            ["month", "30 gün"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setRange(key as RangeKey)}
              style={[styles.rangeBtn, range === key && styles.rangeBtnActive]}
            >
              <Text style={[styles.rangeText, range === key && styles.rangeTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color={T.brand600} style={{ marginTop: 40 }} />
        ) : !enabled ? (
          <View style={styles.empty}>
            <Lock size={24} color={T.fg4} />
            <Text style={styles.emptyTitle}>Komisyon takibi kapalı</Text>
            <Text style={styles.emptyText}>Ayarlardan açılınca kazanç raporu görünür.</Text>
          </View>
        ) : report ? (
          <>
            <View style={styles.kpiGrid}>
              <Kpi label="Tamamlanan ciro" value={money(report.total_revenue_cents)} icon={TrendingUp} />
              <Kpi label="Usta komisyonu" value={money(report.total_commission_cents)} icon={Percent} />
              <Kpi label="Dükkan payı" value={money(report.total_shop_share_cents)} icon={CreditCard} />
            </View>

            <Text style={styles.sectionLabel}>PERSONEL DAĞILIMI</Text>
            <View style={{ gap: 10 }}>
              {report.staff.map((row) => (
                <View key={row.staff_id} style={styles.staffRow}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.staffName} numberOfLines={1}>{row.staff_name}</Text>
                    <Text style={styles.staffMeta}>{row.completed_count} tamamlanan randevu</Text>
                  </View>
                  <View style={styles.amounts}>
                    <Text style={styles.amountPrimary}>{money(row.commission_cents)}</Text>
                    <Text style={styles.amountMeta}>Ciro {money(row.gross_revenue_cents)}</Text>
                    <Text style={styles.amountMeta}>Pay {money(row.shop_share_cents)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Icon size={18} color={T.brand600} />
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { paddingTop: 64, paddingHorizontal: 20, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', letterSpacing: 1.4, textTransform: "uppercase", color: T.coral600, marginBottom: 6 },
  title: { fontSize: 30, fontFamily: 'Montserrat-Bold', color: T.fg1, marginBottom: 18 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  rangeBtn: { flex: 1, paddingVertical: 10, borderRadius: R.pill, borderWidth: 1, borderColor: T.border, alignItems: "center", backgroundColor: T.bgElevated },
  rangeBtnActive: { backgroundColor: T.brand600, borderColor: T.brand600 },
  rangeText: { fontSize: 12, fontFamily: 'Montserrat-Bold', color: T.fg3 },
  rangeTextActive: { color: "#fff" },
  kpiGrid: { gap: 10 },
  kpi: { padding: 14, borderRadius: R.md, borderWidth: 1, borderColor: T.border, backgroundColor: T.bgElevated, ...Shadow.sm },
  kpiLabel: { marginTop: 8, fontSize: 12, fontFamily: 'Montserrat-SemiBold', color: T.fg3 },
  kpiValue: { marginTop: 2, fontSize: 22, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  sectionLabel: { marginTop: 24, marginBottom: 10, fontSize: 11, fontFamily: 'Montserrat-Bold', color: T.fg3, letterSpacing: 0.6 },
  staffRow: { padding: 12, borderRadius: R.md, borderWidth: 1, borderColor: T.border, backgroundColor: T.bgElevated, flexDirection: "row", gap: 12, ...Shadow.sm },
  staffName: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  staffMeta: { marginTop: 3, fontSize: 11, fontFamily: 'Montserrat', color: T.fg3 },
  amounts: { alignItems: "flex-end" },
  amountPrimary: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: T.brand600 },
  amountMeta: { marginTop: 2, fontSize: 10, fontFamily: 'Montserrat', color: T.fg3 },
  empty: { marginTop: 36, alignItems: "center", gap: 8, padding: 20 },
  emptyTitle: { fontSize: 15, fontFamily: 'Montserrat-Bold', color: T.fg1 },
  emptyText: { fontSize: 12, fontFamily: 'Montserrat', color: T.fg3, textAlign: "center" },
});
