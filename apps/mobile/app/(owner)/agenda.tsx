import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { addDays, startOfDay, startOfWeek, isSameDay } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { AddAppointmentModal } from "../../components/AddAppointmentModal";
import { T, R, Shadow } from "../../lib/theme";

const TZ = "Europe/Istanbul";
const DAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const CARD_WIDTH = 200;

function fmtHM(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
function durationMin(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

interface Barber { id: string; display_name: string }
interface Appt {
  id: string; barber_id: string;
  customer_name: string; starts_at: string; ends_at: string;
  status: string;
  services: { name: string } | null;
}

export default function OwnerAgenda() {
  const { shopId } = useUserRole();
  const [barbers, setBarbers]   = useState<Barber[]>([]);
  const [appts, setAppts]       = useState<Appt[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [modalBarber, setModalBarber] = useState<Barber | null>(null);

  const weekStart = useMemo(() => startOfWeek(selectedDay, { weekStartsOn: 1 }), [selectedDay]);
  const weekDays  = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    if (!shopId) return;
    const dayStart = startOfDay(selectedDay).toISOString();
    const dayEnd   = addDays(startOfDay(selectedDay), 1).toISOString();

    const { data: barberList } = await supabase
      .from("barbers")
      .select("id, display_name")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("created_at");

    if (!barberList) { setLoading(false); return; }
    setBarbers(barberList);

    const { data: apptList } = await supabase
      .from("appointments")
      .select("id, barber_id, customer_name, starts_at, ends_at, status, services(name)")
      .in("barber_id", barberList.map((b) => b.id))
      .gte("starts_at", dayStart)
      .lt("starts_at", dayEnd)
      .neq("status", "cancelled")
      .order("starts_at");

    setAppts((apptList as unknown as Appt[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [shopId, selectedDay]);

  useEffect(() => { load(); }, [load]);

  function onRefresh() { setRefreshing(true); load(); }

  return (
    <View style={styles.root}>
      {/* Hafta strip */}
      <View style={styles.weekStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
          {weekDays.map((d) => {
            const sel = isSameDay(d, selectedDay);
            const isToday = isSameDay(d, new Date());
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => setSelectedDay(startOfDay(d))}
                style={[styles.dayChip, sel && styles.dayChipSel, isToday && !sel && styles.dayChipToday]}
              >
                <Text style={[styles.dayName, sel && { color: "#fff" }]}>{DAY_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</Text>
                <Text style={[styles.dayNum, sel && { color: "#fff" }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Ustalar yan yana */}
      {loading ? (
        <ActivityIndicator color={T.navy} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.navy} />}
          contentContainerStyle={styles.columnsContainer}
        >
          {barbers.map((barber) => {
            const barberAppts = appts.filter((a) => a.barber_id === barber.id);
            return (
              <View key={barber.id} style={styles.column}>
                {/* Usta başlığı */}
                <View style={styles.colHeader}>
                  <Text style={styles.colName} numberOfLines={1}>{barber.display_name}</Text>
                  <Text style={styles.colCount}>{barberAppts.length} randevu</Text>
                </View>

                {/* Randevular */}
                {barberAppts.length === 0 ? (
                  <View style={styles.emptyCol}>
                    <Text style={styles.emptyTxt}>Randevu yok</Text>
                  </View>
                ) : (
                  barberAppts.map((a) => (
                    <View key={a.id} style={styles.apptCard}>
                      <Text style={styles.apptTime}>{fmtHM(a.starts_at)} · {durationMin(a.starts_at, a.ends_at)} dk</Text>
                      <Text style={styles.apptName} numberOfLines={1}>{a.customer_name}</Text>
                      {a.services && <Text style={styles.apptSvc} numberOfLines={1}>{a.services.name}</Text>}
                    </View>
                  ))
                )}

                {/* Manuel randevu ekle */}
                <Pressable
                  onPress={() => setModalBarber(barber)}
                  style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.addBtnTxt}>+ Randevu Ekle</Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Manuel randevu modal */}
      {modalBarber && shopId && (
        <AddAppointmentModal
          visible={!!modalBarber}
          shopId={shopId}
          barberId={modalBarber.id}
          initialDate={selectedDay}
          onClose={() => { setModalBarber(null); load(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  weekStrip: {
    paddingTop: 56,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.bg,
  },
  weekRow: { paddingHorizontal: 16, gap: 6 },
  dayChip: {
    width: 44, height: 60,
    borderRadius: R.cta,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayChipSel: { backgroundColor: T.navy, borderColor: T.navy },
  dayChipToday: { borderColor: T.red },
  dayName: { fontSize: 10, fontWeight: "600", color: T.muted, textTransform: "uppercase" },
  dayNum: { fontSize: 18, fontWeight: "700", color: T.ink },

  columnsContainer: { padding: 12, gap: 10, alignItems: "flex-start" },
  column: {
    width: CARD_WIDTH,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.card,
    padding: 10,
    gap: 8,
    ...Shadow.card,
  },
  colHeader: { borderBottomWidth: 1, borderBottomColor: T.line, paddingBottom: 8 },
  colName: { fontSize: 14, fontWeight: "700", color: T.navy },
  colCount: { fontSize: 11, color: T.muted, marginTop: 2 },

  emptyCol: { paddingVertical: 20, alignItems: "center" },
  emptyTxt: { fontSize: 12, color: T.mutedAlt },

  apptCard: {
    padding: 8,
    backgroundColor: T.bg,
    borderRadius: R.input,
    borderLeftWidth: 3,
    borderLeftColor: T.navy,
  },
  apptTime: { fontSize: 11, color: T.muted, fontWeight: "500" },
  apptName: { fontSize: 13, fontWeight: "600", color: T.ink, marginTop: 2 },
  apptSvc: { fontSize: 11, color: T.muted, marginTop: 1 },

  addBtn: {
    paddingVertical: 10,
    borderRadius: R.cta,
    borderWidth: 1,
    borderColor: T.navy,
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 4,
  },
  addBtnTxt: { fontSize: 13, fontWeight: "600", color: T.navy },
});
