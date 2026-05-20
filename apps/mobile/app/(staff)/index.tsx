import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRealtimeInvalidation } from "@berber/shared/use-realtime-invalidation";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Plus } from "lucide-react-native";
import { addDays, startOfDay, startOfWeek } from "date-fns";
import { DEFAULT_TIMEZONE } from "@berber/shared/constants";
import { getDayBoundsUTC } from "@berber/shared/slot-utils";
import { supabase } from "../../lib/supabase";
import { T, R, Shadow, S } from "../../lib/theme";
import {
  AppointmentCard,
  BlokCard,
  OverlineHeader,
  SectionLabel,
  DayPicker,
  Button,
} from "../../components/ds";
import { AddAppointmentModal } from "../../components/AddAppointmentModal";
import { AppointmentDetailSheet } from "../../components/AppointmentDetailSheet";

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  service_id: string | null;
  services: { name: string; duration_min: number } | null;
}
interface Block {
  id: string;
  starts_at: string;
  ends_at: string;
}
type TimelineItem =
  | { kind: "appt"; key: string; starts_at: string; appt: Appointment }
  | { kind: "block"; key: string; starts_at: string; block: Block };

const TZ = DEFAULT_TIMEZONE;
const DAY_NAMES = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const APPT_COLS =
  "id, customer_name, customer_phone, starts_at, ends_at, status, service_id, services(name, duration_min)";

function fmtHM(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
function durationMin(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
function getApptState(appt: Appointment, now: Date): "done" | "active" | "upcoming" {
  if (appt.status === "completed" || appt.status === "cancelled") return "done";
  const start = new Date(appt.starts_at);
  const end = new Date(appt.ends_at);
  if (now >= start && now < end) return "active";
  if (now >= end) return "done";
  return "upcoming";
}

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const reqIdRef = useRef(0);

  const weekStart = useMemo(() => startOfWeek(selectedDay, { weekStartsOn: 1 }), [selectedDay]);
  const selectedDayIndex = useMemo(() => {
    const diffMs = startOfDay(selectedDay).getTime() - weekStart.getTime();
    const idx = Math.round(diffMs / (24 * 60 * 60 * 1000));
    return Math.max(0, Math.min(6, idx));
  }, [selectedDay, weekStart]);

  const handleDayPickerChange = useCallback(
    (index: number) => setSelectedDay(startOfDay(addDays(weekStart, index))),
    [weekStart]
  );

  const [shopId, setShopId] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: staff } = await supabase
      .from("staff").select("id, shop_id").eq("user_id", user.id).single();
    if (staff) { setStaffId(staff.id); setShopId(staff.shop_id); }
  }, []);

  const fetchDay = useCallback(async (bid: string, day: Date) => {
    const reqId = ++reqIdRef.current;
    const { start, end } = getDayBoundsUTC(day, TZ);
    const [{ data: appts }, { data: blks }] = await Promise.all([
      supabase.from("appointments").select(APPT_COLS)
        .eq("staff_id", bid)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at", { ascending: true }),
      supabase.from("blocks").select("id, starts_at, ends_at")
        .eq("staff_id", bid)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString()),
    ]);
    if (reqId !== reqIdRef.current) return;
    setAppointments((appts as unknown as Appointment[]) ?? []);
    setBlocks((blks as Block[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => {
    if (!staffId) return;
    setLoading(true);
    fetchDay(staffId, selectedDay);
  }, [staffId, selectedDay, fetchDay]);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const realtimeTableFilters = useMemo(() => staffId ? [
    { table: "appointments" as const, filters: [`staff_id=eq.${staffId}`] },
    { table: "blocks" as const,       filters: [`staff_id=eq.${staffId}`] },
  ] : [], [staffId]);

  useRealtimeInvalidation({
    client: supabase,
    channelName: `appointments:${staffId ?? "none"}`,
    tableFilters: realtimeTableFilters,
    invalidate: () => { if (staffId) void fetchDay(staffId, selectedDay); },
    enabled: !!staffId,
  });

  const onRefresh = useCallback(() => {
    if (!staffId) return;
    setRefreshing(true);
    fetchDay(staffId, selectedDay);
  }, [staffId, selectedDay, fetchDay]);

  const dateLabel = `${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()]} ${selectedDay.getFullYear()}, ${DAY_NAMES[(selectedDay.getDay() + 6) % 7]}`;

  const doneItems = useMemo(
    () => appointments.filter((a) => getApptState(a, now) === "done").sort((x, y) => x.starts_at.localeCompare(y.starts_at)),
    [appointments, now]
  );
  const activeItems = useMemo(
    () => appointments.filter((a) => getApptState(a, now) === "active").sort((x, y) => x.starts_at.localeCompare(y.starts_at)),
    [appointments, now]
  );
  const upcomingItems = useMemo(
    () => appointments.filter((a) => getApptState(a, now) === "upcoming").sort((x, y) => x.starts_at.localeCompare(y.starts_at)),
    [appointments, now]
  );
  const upcomingMixed: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [
      ...upcomingItems.map((a): TimelineItem => ({ kind: "appt", key: a.id, starts_at: a.starts_at, appt: a })),
      ...blocks.map((b): TimelineItem => ({ kind: "block", key: `block-${b.id}`, starts_at: b.starts_at, block: b })),
    ];
    return items.sort((x, y) => x.starts_at.localeCompare(y.starts_at));
  }, [upcomingItems, blocks]);

  const isEmpty = doneItems.length === 0 && activeItems.length === 0 && upcomingMixed.length === 0;

  return (
    <View style={styles.root}>
      <OverlineHeader
        eyebrow="BERBER · DÜKKAN PANELİ"
        title="Randevular"
        meta={dateLabel}
      />
      <DayPicker
        value={selectedDayIndex}
        onChange={handleDayPickerChange}
        days={7}
        startDate={weekStart}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.brand600} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand600} />
          }
        >
          {doneItems.length > 0 && (
            <>
              <SectionLabel>Tamamlandı</SectionLabel>
              {doneItems.map((appt) => {
                const dur = appt.services?.duration_min ?? durationMin(appt.starts_at, appt.ends_at);
                return (
                  <View key={appt.id} style={styles.cardWrap}>
                    <AppointmentCard
                      time={fmtHM(appt.starts_at)}
                      duration={dur}
                      customer={appt.customer_name}
                      service={`${appt.services?.name ?? "Randevu"} · ${dur}dk`}
                      state="done"
                    />
                  </View>
                );
              })}
            </>
          )}

          {activeItems.length > 0 && (
            <>
              <SectionLabel>Şu Anda</SectionLabel>
              {activeItems.map((appt) => {
                const dur = appt.services?.duration_min ?? durationMin(appt.starts_at, appt.ends_at);
                return (
                  <View key={appt.id} style={styles.cardWrap}>
                    <AppointmentCard
                      time={fmtHM(appt.starts_at)}
                      duration={dur}
                      customer={appt.customer_name}
                      service={`${appt.services?.name ?? "Randevu"} · ${dur}dk`}
                      state="active"
                      onPress={() => setDetailAppt(appt)}
                    />
                  </View>
                );
              })}
            </>
          )}

          {upcomingMixed.length > 0 && (
            <>
              <SectionLabel>Gelecek</SectionLabel>
              {upcomingMixed.map((item) => {
                if (item.kind === "appt") {
                  const appt = item.appt;
                  const dur = appt.services?.duration_min ?? durationMin(appt.starts_at, appt.ends_at);
                  return (
                    <View key={item.key} style={styles.cardWrap}>
                      <AppointmentCard
                        time={fmtHM(appt.starts_at)}
                        duration={dur}
                        customer={appt.customer_name}
                        service={`${appt.services?.name ?? "Randevu"} · ${dur}dk`}
                        state="upcoming"
                        onPress={() => setDetailAppt(appt)}
                      />
                    </View>
                  );
                } else {
                  const block = item.block;
                  const dur = durationMin(block.starts_at, block.ends_at);
                  return (
                    <View key={item.key} style={styles.cardWrap}>
                      <BlokCard time={fmtHM(block.starts_at)} duration={dur} label="Bloke" />
                    </View>
                  );
                }
              })}
            </>
          )}

          {isEmpty && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Henüz randevu yok</Text>
              <Text style={styles.emptyText}>
                {`${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()]} için randevu bulunmuyor.\nYeni Randevu butonuna basarak ekleyebilirsiniz.`}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {staffId && (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <Button
            variant="accent"
            size="lg"
            full
            onPress={() => setAddModalVisible(true)}
            style={styles.fabBtn}
          >
            <Plus size={18} color="#fff" strokeWidth={2} />
            Yeni Randevu
          </Button>
        </View>
      )}

      {staffId && shopId && (
        <AddAppointmentModal
          visible={addModalVisible || !!editingAppt}
          shopId={shopId}
          staffId={staffId}
          initialDate={selectedDay}
          editingAppt={editingAppt}
          onSaved={() => fetchDay(staffId, selectedDay)}
          onClose={() => { setAddModalVisible(false); setEditingAppt(null); }}
        />
      )}

      <AppointmentDetailSheet
        appt={detailAppt}
        onClose={() => setDetailAppt(null)}
        onAction={async (action) => {
          if (!detailAppt) return;
          if (statusActionLoading && (action === "complete" || action === "cancel")) return;
          if (action === "complete") {
            setStatusActionLoading(true);
            const { error } = await supabase.rpc("complete_appointment_with_revenue", {
              p_appointment_id: detailAppt.id,
            });
            setStatusActionLoading(false);
            if (error) { Alert.alert("Hata", error.message || "Randevu tamamlanamadi."); return; }
            if (staffId) await fetchDay(staffId, selectedDay);
            setDetailAppt(null);
            return;
          }
          if (action === "cancel") {
            setStatusActionLoading(true);
            const { error } = await supabase.rpc("cancel_appointment_atomic" as never, {
              p_appointment_id: detailAppt.id,
            } as never);
            setStatusActionLoading(false);
            if (error) { Alert.alert("Hata", error.message || "Randevu iptal edilemedi."); return; }
            if (staffId) await fetchDay(staffId, selectedDay);
            setDetailAppt(null);
            return;
          }
          if (action === "edit") {
            const target = detailAppt;
            setDetailAppt(null);
            setTimeout(() => setEditingAppt(target), 220);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1, backgroundColor: T.bg },
  scrollContent: { paddingTop: 8, paddingBottom: 110 },
  cardWrap: { paddingHorizontal: S.s4, marginBottom: 8 },

  emptyWrap: { paddingHorizontal: S.s4, paddingTop: 48, alignItems: "center", gap: 8 },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Montserrat-SemiBold',
    color: T.fg1,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Montserrat',
    color: T.fg3,
    textAlign: "center",
    lineHeight: 20,
  },

  fabWrap: { position: "absolute", left: S.s4, right: S.s4, bottom: 24, zIndex: 20 },
  fabBtn: { ...Shadow.md },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
});
