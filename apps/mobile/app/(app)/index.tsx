import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { supabase } from "../../lib/supabase";
import type { Database } from "@berber/db/src/database.types";

type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  services: { name: string; duration_min: number } | null;
};

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Onaylı",
  cancelled: "İptal",
  completed: "Tamamlandı",
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#2563eb",
  cancelled: "#dc2626",
  completed: "#16a34a",
};

export default function AppointmentsScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);

  const fetchBarberAndAppointments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!barber) return;
    setBarberId(barber.id);

    // F-04: 30 günlük pencere + 100 limit (sayfalandırma için güvenlik şeridi)
    const today = new Date().toISOString().split("T")[0];
    const horizon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString();

    const { data } = await supabase
      .from("appointments")
      .select("*, services(name, duration_min)")
      .eq("barber_id", barber.id)
      .gte("starts_at", today!)
      .lte("starts_at", horizon)
      .order("starts_at", { ascending: true })
      .limit(100);

    setAppointments((data as unknown as Appointment[]) ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchBarberAndAppointments();
  }, [fetchBarberAndAppointments]);

  // Realtime: new appointment notification
  useEffect(() => {
    if (!barberId) return;

    // F-05: INSERT + UPDATE + DELETE — çok cihazlı kullanımda UI tutarlılığı için
    const channel = supabase
      .channel(`appointments:${barberId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAppt = payload.new as Appointment;
            setAppointments((prev) =>
              [...prev, newAppt].sort(
                (a, b) =>
                  new Date(a.starts_at).getTime() -
                  new Date(b.starts_at).getTime()
              )
            );
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Appointment;
            // Realtime payload `services` join verisini taşımaz; mevcutu koru
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === updated.id
                  ? { ...updated, services: a.services }
                  : a
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setAppointments((prev) => prev.filter((a) => a.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId]);

  async function handleComplete(appointmentId: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", appointmentId);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    setAppointments((prev) =>
      prev.map((a) =>
        a.id === appointmentId ? { ...a, status: "completed" } : a
      )
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Yaklaşan randevu yok</Text>
        <Text style={styles.emptySubtext}>
          Müşterileriniz randevu aldığında burada görünür.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={appointments}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchBarberAndAppointments();
          }}
        />
      }
      renderItem={({ item }) => {
        const date = new Date(item.starts_at);
        const dateLabel = date.toLocaleDateString("tr-TR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
        const timeLabel = date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTime}>
                {dateLabel} · {timeLabel}
              </Text>
              <Text
                style={[
                  styles.cardStatus,
                  { color: STATUS_COLORS[item.status] ?? "#666" },
                ]}
              >
                {STATUS_LABELS[item.status] ?? item.status}
              </Text>
            </View>
            <Text style={styles.cardName}>{item.customer_name}</Text>
            {item.services && (
              <Text style={styles.cardService}>
                {item.services.name} · {item.services.duration_min} dk
              </Text>
            )}
            {item.customer_phone && (
              <Text style={styles.cardPhone}>{item.customer_phone}</Text>
            )}
            {item.status === "confirmed" && (
              <TouchableOpacity
                style={styles.completeBtn}
                onPress={() => handleComplete(item.id)}
              >
                <Text style={styles.completeBtnText}>Tamamlandı İşaretle</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyText: { fontSize: 17, fontWeight: "600", color: "#374151" },
  emptySubtext: { marginTop: 6, fontSize: 14, color: "#9ca3af", textAlign: "center" },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  cardTime: { fontSize: 13, color: "#6b7280" },
  cardStatus: { fontSize: 12, fontWeight: "600" },
  cardName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardService: { marginTop: 3, fontSize: 13, color: "#6b7280" },
  cardPhone: { marginTop: 2, fontSize: 13, color: "#6b7280" },
  completeBtn: {
    marginTop: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  completeBtnText: { fontSize: 13, fontWeight: "600", color: "#16a34a" },
});
