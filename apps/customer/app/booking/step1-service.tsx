import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase, SHOP_SLUG } from "../../lib/supabase";
import { T, R, Shadow } from "../../lib/theme";

interface Service {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
}

function formatPrice(cents: number | null): string {
  if (!cents) return "Fiyat Sor";
  return `₺${Math.round(cents / 100)}`;
}

export default function Step1Service() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("slug", SHOP_SLUG)
        .single();
      if (!shop) { setLoading(false); return; }

      const { data } = await supabase
        .from("services")
        .select("id, name, duration_min, price_cents")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("display_order");
      setServices(data ?? []);
      setLoading(false);
    })();
  }, []);

  function selectService(s: Service) {
    router.push({
      pathname: "/booking/step2-barber",
      params: {
        sid: s.id,
        sname: s.name,
        sdur: String(s.duration_min),
        sprice: String(s.price_cents ?? 0),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={T.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Hizmet Seç</Text>
          <Text style={styles.headerStep}>1 / 4</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: "25%" }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.question}>Hangi hizmeti istiyorsunuz?</Text>

        {loading ? (
          <ActivityIndicator color={T.navy} style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <Text style={styles.empty}>Henüz hizmet eklenmemiş.</Text>
        ) : (
          services.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.serviceCard}
              onPress={() => selectService(s)}
              activeOpacity={0.82}
            >
              <View style={styles.serviceIconWrap}>
                <Ionicons name="cut-outline" size={20} color={T.navy} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceMeta}>{s.duration_min} dakika</Text>
              </View>
              <View style={styles.serviceRight}>
                <Text style={styles.servicePrice}>{formatPrice(s.price_cents)}</Text>
                <Ionicons name="chevron-forward" size={16} color={T.mutedAlt} style={{ marginTop: 2 }} />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.line,
    backgroundColor: T.bg,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: T.ink },
  headerStep: { fontSize: 11, fontWeight: "600", color: T.muted, marginTop: 1 },

  progressTrack: { height: 3, backgroundColor: T.line },
  progressFill: { height: 3, backgroundColor: T.navy },

  content: { paddingHorizontal: 20, paddingTop: 24 },
  question: {
    fontSize: 20,
    fontWeight: "700",
    color: T.ink,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: T.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
    ...Shadow.card,
  },
  serviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: "600", color: T.ink, marginBottom: 3 },
  serviceMeta: { fontSize: 12, fontWeight: "500", color: T.muted },
  serviceRight: { alignItems: "flex-end", gap: 2 },
  servicePrice: { fontSize: 14, fontWeight: "700", color: T.blue },

  empty: { fontSize: 14, color: T.muted, textAlign: "center", paddingTop: 32 },
});
