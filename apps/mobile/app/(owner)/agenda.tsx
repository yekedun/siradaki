import { useEffect, useState, useCallback, useMemo } from "react";
import { useRealtimeInvalidation } from "@berber/shared/use-realtime-invalidation";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  PanResponder,
  type PanResponderGestureState,
} from "react-native";
import { Plus } from "lucide-react-native";
import { addDays, startOfDay, startOfWeek, differenceInDays } from "date-fns";
import { DEFAULT_TIMEZONE } from "@berber/shared/constants";
import { getDayBoundsUTC } from "@berber/shared/slot-utils";
import { supabase } from "../../lib/supabase";
import { useUserRole } from "../../lib/user-context";
import { AddAppointmentModal } from "../../components/AddAppointmentModal";
import { T, R, Shadow, Type, S } from "../../lib/theme";
import { DayPicker } from "../../components/ds/DayPicker";
import { AppointmentCard } from "../../components/ds/AppointmentCard";
import { BlokCard } from "../../components/ds/BlokCard";
import { Button } from "../../components/ds/Button";
import { Sheet } from "../../components/ds/Sheet";
import { OverlineHeader } from "../../components/ds";

const TZ = DEFAULT_TIMEZONE;
const CARD_WIDTH = 220;
const COLUMN_GAP = 12;
const COLUMN_PADDING = 16;
const COLUMN_STEP = CARD_WIDTH + COLUMN_GAP;

function fmtHM(iso: string): string {
  return new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
}
function durationMin(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

interface Staff { id: string; name: string }
interface Appt {
  id: string; staff_id: string;
  service_id: string | null;
  customer_name: string; customer_phone: string | null; customer_notes: string | null;
  starts_at: string; ends_at: string;
  status: string;
  services: { name: string; duration_min: number } | null;
}
interface Block {
  id: string; staff_id: string;
  starts_at: string; ends_at: string;
}
type AgendaItem =
  | { kind: "appt"; key: string; starts_at: string; appt: Appt }
  | { kind: "block"; key: string; starts_at: string; block: Block };

interface DraggableAppointmentCardProps {
  appt: Appt;
  dragging: boolean;
  onDragStart: (appt: Appt) => void;
  onDragMove: (gesture: PanResponderGestureState) => void;
  onDragEnd: (appt: Appt, gesture: PanResponderGestureState) => void;
  onDragCancel: () => void;
}

function DraggableAppointmentCard({
  appt,
  dragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: DraggableAppointmentCardProps) {
  const now = new Date();
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => onDragStart(appt),
      onPanResponderMove: (_event, gesture) => onDragMove(gesture),
      onPanResponderRelease: (_event, gesture) => onDragEnd(appt, gesture),
      onPanResponderTerminate: onDragCancel,
    }),
    [appt, onDragCancel, onDragEnd, onDragMove, onDragStart]
  );

  const state = new Date(appt.ends_at) < now ? "done" : "upcoming";

  return (
    <View
      style={[styles.apptWrapper, dragging && styles.apptWrapperDragging]}
      {...panResponder.panHandlers}
    >
      <AppointmentCard
        time={fmtHM(appt.starts_at)}
        duration={appt.services?.duration_min ?? durationMin(appt.starts_at, appt.ends_at)}
        customer={appt.customer_name}
        service={appt.services?.name ?? "Randevu"}
        state={state}
      />
    </View>
  );
}

export default function OwnerAgenda() {
  const { shopId } = useUserRole();
  const [staff, setStaff]       = useState<Staff[]>([]);
  const [appts, setAppts]       = useState<Appt[]>([]);
  const [blocks, setBlocks]     = useState<Block[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [modalStaff, setModalStaff] = useState<Staff | null>(null);
  const [staffPickerVisible, setStaffPickerVisible] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragTargetStaffId, setDragTargetStaffId] = useState<string | null>(null);
  const [scrollX, setScrollX] = useState(0);

  const weekStart = useMemo(() => startOfWeek(selectedDay, { weekStartsOn: 1 }), [selectedDay]);
  const selectedIndex = useMemo(() => differenceInDays(selectedDay, weekStart), [selectedDay, weekStart]);
  const selectedDayKey = useMemo(() => selectedDay.toISOString(), [selectedDay]);
  const itemsByStaff = useMemo(() => {
    const grouped = new Map<string, AgendaItem[]>();
    for (const appt of appts) {
      const group = grouped.get(appt.staff_id);
      const item: AgendaItem = { kind: "appt", key: appt.id, starts_at: appt.starts_at, appt };
      if (group) {
        group.push(item);
      } else {
        grouped.set(appt.staff_id, [item]);
      }
    }
    for (const block of blocks) {
      const group = grouped.get(block.staff_id);
      const item: AgendaItem = { kind: "block", key: `block-${block.id}`, starts_at: block.starts_at, block };
      if (group) {
        group.push(item);
      } else {
        grouped.set(block.staff_id, [item]);
      }
    }
    for (const group of grouped.values()) {
      group.sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    }
    return grouped;
  }, [appts, blocks]);

  const load = useCallback(async () => {
    if (!shopId) return;
    const { start, end } = getDayBoundsUTC(selectedDay, TZ);
    const dayStart = start.toISOString();
    const dayEnd = end.toISOString();

    const { data: staffData } = await supabase
      .from("staff")
      .select("id, name")
      .eq("shop_id", shopId);

    if (!staffData) { setLoading(false); setRefreshing(false); return; }
    setStaff((prev) => {
      if (
        prev.length === staffData.length &&
        prev.every((s, i) => s.id === staffData[i]!.id && s.name === staffData[i]!.name)
      ) return prev;
      return staffData;
    });
    const staffIds = staffData.map((b) => b.id);

    if (staffIds.length === 0) {
      setAppts([]);
      setBlocks([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const [{ data: apptList }, { data: blockList }] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, staff_id, service_id, customer_name, customer_phone, customer_notes, starts_at, ends_at, status, services(name, duration_min)")
        .in("staff_id", staffIds)
        .gte("starts_at", dayStart)
        .lt("starts_at", dayEnd)
        .neq("status", "cancelled")
        .order("starts_at"),
      supabase
        .from("blocks")
        .select("id, staff_id, starts_at, ends_at")
        .in("staff_id", staffIds)
        .gte("starts_at", dayStart)
        .lt("starts_at", dayEnd)
        .order("starts_at"),
    ]);

    setAppts((apptList as unknown as Appt[]) ?? []);
    setBlocks((blockList as Block[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [shopId, selectedDay]);

  useEffect(() => { load(); }, [load]);

  const agendaTableFilters = useMemo(() => [
    { table: "appointment_slots" as const, filters: staff.map(m => `staff_id=eq.${m.id}`) },
    { table: "block_slots" as const,       filters: staff.map(m => `staff_id=eq.${m.id}`) },
  ], [staff]);

  useRealtimeInvalidation({
    client: supabase,
    channelName: `owner-agenda:${shopId}:${selectedDayKey}`,
    tableFilters: agendaTableFilters,
    invalidate: load,
    enabled: !!shopId && staff.length > 0,
    debounceMs: 300,
  });

  function onRefresh() { setRefreshing(true); load(); }

  function handleFabPress() {
    if (staff.length === 0) return;
    if (staff.length === 1) {
      setModalStaff(staff[0]!);
    } else {
      setStaffPickerVisible(true);
    }
  }

  const resolveDropStaff = useCallback((moveX: number): Staff | null => {
    const contentX = scrollX + moveX - COLUMN_PADDING;
    const index = Math.floor(contentX / COLUMN_STEP);
    return staff[index] ?? null;
  }, [scrollX, staff]);

  const moveAppointment = useCallback(async (appt: Appt, targetStaff: Staff) => {
    if (!appt.service_id) {
      Alert.alert("Taşınamadı", "Bu randevunun kayıtlı hizmeti yok.");
      return;
    }
    if (targetStaff.id === appt.staff_id) return;

    setAppts((current) =>
      current.map((item) => item.id === appt.id ? { ...item, staff_id: targetStaff.id } : item)
    );

    const { error } = await supabase.rpc("update_appointment_atomic" as never, {
      p_appointment_id: appt.id,
      p_staff_id: targetStaff.id,
      p_service_id: appt.service_id,
      p_starts_at: appt.starts_at,
      p_customer_name: appt.customer_name,
      p_customer_phone: appt.customer_phone,
      p_customer_notes: appt.customer_notes,
    } as never);

    if (error) {
      await load();
      if (error.code === "23P01" || error.code === "P0001") {
        Alert.alert("Çakışma", error.message || "Hedef personelde bu saat artık müsait değil.");
      } else {
        Alert.alert("Taşınamadı", error.message);
      }
      return;
    }

    await load();
  }, [load]);

  const handleDragStart = useCallback((appt: Appt) => {
    setDraggingId(appt.id);
    setDragTargetStaffId(appt.staff_id);
  }, []);

  const handleDragMove = useCallback((gesture: PanResponderGestureState) => {
    const targetStaff = resolveDropStaff(gesture.moveX);
    setDragTargetStaffId(targetStaff?.id ?? null);
  }, [resolveDropStaff]);

  const handleDragCancel = useCallback(() => {
    setDraggingId(null);
    setDragTargetStaffId(null);
  }, []);

  const handleDragEnd = useCallback((appt: Appt, gesture: PanResponderGestureState) => {
    const targetStaff = resolveDropStaff(gesture.moveX);
    setDraggingId(null);
    setDragTargetStaffId(null);
    if (!targetStaff) return;
    void moveAppointment(appt, targetStaff);
  }, [moveAppointment, resolveDropStaff]);

  return (
    <View style={styles.root}>
      <OverlineHeader eyebrow="BERBER · DÜKKAN PANELİ" title="Ajanda" />

      <DayPicker
        value={selectedIndex}
        onChange={(i) => setSelectedDay(startOfDay(addDays(weekStart, i)))}
        days={7}
        startDate={weekStart}
      />

      {loading ? (
        <ActivityIndicator color={T.brand600} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => setScrollX(event.nativeEvent.contentOffset.x)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.brand600} />}
          contentContainerStyle={styles.columnsContainer}
        >
          {staff.map((st) => {
            const staffItems = itemsByStaff.get(st.id) ?? [];
            const apptCount = staffItems.filter((item) => item.kind === "appt").length;
            const blockCount = staffItems.length - apptCount;
            const countLabel = blockCount > 0 ? `${apptCount} randevu · ${blockCount} blok` : `${apptCount} randevu`;
            return (
              <View key={st.id} style={[styles.column, dragTargetStaffId === st.id && styles.columnDropTarget]}>
                {/* Usta başlığı */}
                <View style={styles.colHeader}>
                  <Text style={styles.colName} numberOfLines={1}>{st.name}</Text>
                  <Text style={styles.colCount}>{countLabel}</Text>
                </View>

                {/* Randevular */}
                {staffItems.length === 0 ? (
                  <View style={styles.emptyCol}>
                    <Text style={styles.emptyTxt}>Randevu yok</Text>
                  </View>
                ) : (
                  staffItems.map((item) =>
                    item.kind === "appt" ? (
                      <DraggableAppointmentCard
                        key={item.key}
                        appt={item.appt}
                        dragging={draggingId === item.appt.id}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                      />
                    ) : (
                      <BlokCard
                        key={item.key}
                        time={fmtHM(item.block.starts_at)}
                        duration={durationMin(item.block.starts_at, item.block.ends_at)}
                        label="Bloke"
                      />
                    )
                  )
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Floating accent button — Randevu Ekle */}
      {!loading && staff.length > 0 && (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <Button
            variant="accent"
            size="lg"
            onPress={handleFabPress}
            style={styles.fab}
          >
            <Plus size={18} color="#fff" strokeWidth={2} />
            Randevu Ekle
          </Button>
        </View>
      )}

      {/* Staff picker sheet (multi-staff) */}
      <Sheet
        visible={staffPickerVisible}
        onClose={() => setStaffPickerVisible(false)}
        title="Usta Seç"
      >
        <View style={styles.staffPickerList}>
          {staff.map((st) => (
            <Button
              key={st.id}
              variant="secondary"
              size="md"
              full
              onPress={() => {
                setStaffPickerVisible(false);
                setModalStaff(st);
              }}
              style={styles.staffPickerBtn}
            >
              {st.name}
            </Button>
          ))}
        </View>
      </Sheet>

      {/* Randevu ekleme modal */}
      {modalStaff && shopId && (
        <AddAppointmentModal
          visible={!!modalStaff}
          shopId={shopId}
          staffId={modalStaff.id}
          initialDate={selectedDay}
          onSaved={load}
          onClose={() => setModalStaff(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },

  columnsContainer: { padding: COLUMN_PADDING, gap: COLUMN_GAP, alignItems: "flex-start", paddingBottom: 110 },
  column: {
    width: CARD_WIDTH,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.md,
    padding: 10,
    gap: 8,
    ...Shadow.sm,
  },
  columnDropTarget: {
    borderColor: T.brand600,
    backgroundColor: T.accentTint,
  },
  colHeader: { borderBottomWidth: 1, borderBottomColor: T.border, paddingBottom: 8 },
  colName: {
    fontSize: 15,
    fontFamily: Type.family,
    fontWeight: Type.weight.bold,
    color: T.fg1,
  },
  colCount: {
    fontSize: 11,
    fontFamily: Type.family,
    fontWeight: Type.weight.semibold,
    letterSpacing: 0.48,
    textTransform: "uppercase",
    color: T.slate500,
    marginTop: 4,
  },

  emptyCol: { paddingVertical: 20, alignItems: "center" },
  emptyTxt: { fontSize: 12, fontFamily: Type.family, color: T.fg4 },

  apptWrapper: {},
  apptWrapperDragging: {
    opacity: 0.65,
    transform: [{ scale: 0.98 }],
  },

  fabWrap: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 20,
  },
  fab: {
    ...Shadow.md,
  },

  staffPickerList: { gap: 10, paddingBottom: 8 },
  staffPickerBtn: { marginBottom: 0 },
});
