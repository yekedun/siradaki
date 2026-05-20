import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
} from "react-native";
import Svg, { Rect, Path, Circle } from "react-native-svg";
import { CheckCircle2 } from "lucide-react-native";
import { useRouter } from "expo-router";
import { T, R, S, Shadow } from "../../lib/theme";
import { Button, TextField } from "../../components/ds";

const DURATIONS = [15, 20, 30, 45, 60, 90];

function MarkIcon({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect width="64" height="64" rx="14" fill={T.ink900} />
      <Path
        d="M23 16 L41 32 L23 48"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="46" cy="48" r="2.8" fill={T.brand600} />
    </Svg>
  );
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function DotProgress({ total, current }: { total: number; current: number }) {
  return (
    <View style={progress.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[progress.dot, i === current && progress.dotActive]}
        />
      ))}
    </View>
  );
}

const progress = StyleSheet.create({
  row: { flexDirection: "row", gap: 6, justifyContent: "center", marginBottom: S.s6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.border },
  dotActive: { width: 20, backgroundColor: T.brand600 },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 — Dükkan
  const [shopName, setShopName] = useState("");
  const [city, setCity] = useState("");

  // Step 2 — Hizmet
  const [serviceName, setServiceName] = useState("");
  const [serviceDur, setServiceDur] = useState(30);
  const [servicePrice, setServicePrice] = useState("");

  // Step 3 — Personel
  const [staffName, setStaffName] = useState("");

  const slug = toSlug(shopName);

  function next() { setStep((s) => s + 1); }
  function skip() { setStep((s) => s + 1); }

  function handleFinish() {
    Alert.alert("Kurulum tamamlandı", "Panele yönlendiriliyorsun.", [
      { text: "Tamam", onPress: () => router.replace("/(owner)" as never) },
    ]);
  }

  if (step === 0) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <MarkIcon size={56} />
        <Text style={styles.eyebrow}>BERBER · DÜKKAN PANELİ</Text>
        <Text style={styles.h1}>Sıradaki'ye Hoş Geldin</Text>

        <View style={styles.stepsPreview}>
          {["Dükkanını tanıt", "İlk hizmetini ekle", "Ekibini tanıt"].map((label, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumTxt}>{i + 1}</Text>
              </View>
              <Text style={styles.stepLbl}>{label}</Text>
            </View>
          ))}
        </View>

        <Button variant="primary" size="lg" full onPress={next} style={styles.mainBtn}>
          Kuruluma Başla
        </Button>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login" as never)}>
          <Text style={styles.linkTxt}>Hesabın var mı? <Text style={styles.link}>Giriş yap</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 1) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DotProgress total={3} current={0} />
        <Text style={styles.overline}>Adım 1 / 3</Text>
        <Text style={styles.h2}>Dükkanını tanıt</Text>

        <View style={styles.fields}>
          <TextField
            label="DÜKKAN ADI"
            value={shopName}
            onChange={setShopName}
            placeholder="Ahmet Berber Salonu"
          />
          <TextField
            label="ŞEHİR / İLÇE"
            value={city}
            onChange={setCity}
            placeholder="İstanbul, Kadıköy (opsiyonel)"
          />
        </View>

        {shopName.length >= 2 && (
          <View style={styles.slugBox}>
            <Text style={styles.slugUrl}>siradaki.app/<Text style={styles.slugValue}>{slug}</Text></Text>
          </View>
        )}

        <Button
          variant="primary"
          size="lg"
          full
          disabled={shopName.trim().length < 2}
          onPress={next}
          style={styles.mainBtn}
        >
          Devam Et
        </Button>
      </ScrollView>
    );
  }

  if (step === 2) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DotProgress total={3} current={1} />
        <Text style={styles.overline}>Adım 2 / 3</Text>
        <Text style={styles.h2}>İlk hizmetini ekle</Text>

        <View style={styles.fields}>
          <TextField
            label="HİZMET ADI"
            value={serviceName}
            onChange={setServiceName}
            placeholder="Saç Kesimi"
          />
        </View>

        <Text style={styles.sectionLbl}>SÜRE</Text>
        <View style={styles.durGrid}>
          {DURATIONS.map((d) => {
            const sel = d === serviceDur;
            return (
              <Pressable
                key={d}
                onPress={() => setServiceDur(d)}
                style={[styles.durChip, sel && styles.durChipSel]}
              >
                <Text style={[styles.durTxt, sel && styles.durTxtSel]}>{d} dk</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.fields}>
          <TextField
            label="FİYAT (₺)"
            value={servicePrice}
            onChange={setServicePrice}
            placeholder="150"
          />
        </View>

        <Button
          variant="primary"
          size="lg"
          full
          disabled={serviceName.trim().length < 2 || !servicePrice.trim()}
          onPress={next}
          style={styles.mainBtn}
        >
          Devam Et
        </Button>
        <TouchableOpacity onPress={skip}>
          <Text style={styles.skipTxt}>Şimdilik geç</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 3) {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <DotProgress total={3} current={2} />
        <Text style={styles.overline}>Adım 3 / 3</Text>
        <Text style={styles.h2}>Ekibini tanıt</Text>

        <View style={styles.fields}>
          <TextField
            label="USTA ADI"
            value={staffName}
            onChange={setStaffName}
            placeholder="Ahmet Yılmaz (opsiyonel)"
          />
        </View>

        {staffName.trim().length > 0 && (
          <View style={styles.avatarPreview}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>
                {staffName.trim().split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.avatarName}>{staffName.trim()}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTxt}>
            Birden fazla ustanız varsa Ekip sayfasından daha fazla ekleyebilirsiniz.
          </Text>
        </View>

        <Button variant="primary" size="lg" full onPress={next} style={styles.mainBtn}>
          Kurulumu Tamamla
        </Button>
      </ScrollView>
    );
  }

  // Step 4 — Done
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.checkCircle}>
        <CheckCircle2 size={40} color={T.mint600} />
      </View>
      <Text style={styles.doneTitle}>Kurulum Tamamlandı</Text>
      <Text style={styles.h2}>Hazırsın!</Text>

      <View style={styles.summaryList}>
        <SummaryRow label="Dükkan" value={shopName || "—"} />
        {serviceName.trim() && (
          <SummaryRow label="Hizmet" value={`${serviceName} · ${serviceDur} dk`} />
        )}
        {slug && (
          <SummaryRow label="Link" value={`siradaki.app/${slug}`} />
        )}
      </View>

      <Button variant="primary" size="lg" full onPress={handleFinish} style={styles.mainBtn}>
        Panele Git
      </Button>
    </ScrollView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={summary.row}>
      <Text style={summary.label}>{label}</Text>
      <Text style={summary.value} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const summary = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.divider,
  },
  label: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: T.fg3 },
  value: { fontSize: 13, fontFamily: 'Montserrat-Medium', color: T.fg1, flex: 1, textAlign: "right" },
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: T.bg,
    paddingHorizontal: S.s5,
    paddingTop: 72,
    paddingBottom: 40,
  },

  eyebrow: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.76,
    textTransform: "uppercase",
    color: T.fg3,
    marginTop: 24,
    marginBottom: 10,
  },
  overline: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.76,
    textTransform: "uppercase",
    color: T.fg3,
    marginBottom: 8,
  },
  h1: {
    fontSize: 34,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: -0.68,
    color: T.fg1,
    marginBottom: 32,
    lineHeight: 38,
  },
  h2: {
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: -0.56,
    color: T.fg1,
    marginBottom: 24,
    lineHeight: 32,
  },

  stepsPreview: { gap: 12, marginBottom: 32 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: R.pill,
    backgroundColor: T.brand100,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumTxt: { fontSize: 13, fontFamily: 'Montserrat-Bold', color: T.brand600 },
  stepLbl: { fontSize: 15, fontFamily: 'Montserrat-Medium', color: T.fg1 },

  fields: { gap: 14, marginBottom: 16 },

  slugBox: {
    backgroundColor: T.brand100,
    borderRadius: R.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  slugUrl: { fontSize: 13, fontFamily: 'Montserrat', color: T.fg3 },
  slugValue: { fontFamily: 'Montserrat-SemiBold', color: T.brand600 },

  sectionLbl: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.76,
    color: T.fg3,
    marginBottom: 10,
    marginTop: 4,
  },
  durGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  durChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: T.bgElevated,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: R.pill,
    ...Shadow.xs,
  },
  durChipSel: { backgroundColor: T.ink900, borderColor: T.ink900 },
  durTxt: { fontSize: 13, fontFamily: 'Montserrat-Medium', color: T.fg1 },
  durTxtSel: { color: "#fff" },

  avatarPreview: { alignItems: "center", gap: 8, marginBottom: 16 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: R.pill,
    backgroundColor: T.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: T.ink900 },
  avatarName: { fontSize: 15, fontFamily: 'Montserrat-SemiBold', color: T.fg1 },

  infoBox: {
    backgroundColor: T.bgSunken,
    borderRadius: R.sm,
    padding: 14,
    marginBottom: 20,
  },
  infoTxt: { fontSize: 13, fontFamily: 'Montserrat', color: T.fg3, lineHeight: 18 },

  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: T.mint100,
    borderWidth: 1,
    borderColor: T.mint600,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    alignSelf: "center",
  },
  doneTitle: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: T.mint600, textAlign: "center", marginBottom: 6 },

  summaryList: { gap: 0, marginBottom: 28, borderTopWidth: 1, borderTopColor: T.divider },

  mainBtn: { marginBottom: 12 },
  linkTxt: { fontSize: 13, fontFamily: 'Montserrat', color: T.fg3, textAlign: "center" },
  link: { fontFamily: 'Montserrat-SemiBold', color: T.brand600 },
  skipTxt: { fontSize: 13, fontFamily: 'Montserrat', color: T.fg3, textAlign: "center", paddingVertical: 8 },
});
