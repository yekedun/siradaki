import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { T, R, Shadow } from "../../lib/theme";

const OTP_LENGTH = 8;
const DEV_TEST_EMAIL = process.env.EXPO_PUBLIC_DEV_TEST_LOGIN_EMAIL ?? "";
const DEV_TEST_PASSWORD = process.env.EXPO_PUBLIC_DEV_TEST_LOGIN_PASSWORD ?? "";

function BerberPole() {
  const stripes = [T.red, "#FFFFFF", T.blue, "#FFFFFF"];
  return (
    <View style={styles.pole}>
      {stripes.map((color, i) => (
        <View key={i} style={[styles.stripe, { backgroundColor: color }]} />
      ))}
    </View>
  );
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);
  const router = useRouter();

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("Hatalı giriş", "Geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });
    setLoading(false);

    if (error) {
      Alert.alert("Hata", error.message);
      return;
    }

    router.push({ pathname: "/(auth)/verify", params: { email: trimmed } });
  }

  async function handleDevLogin() {
    if (!__DEV__ || !DEV_TEST_EMAIL || !DEV_TEST_PASSWORD) return;

    setDevLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: DEV_TEST_EMAIL,
      password: DEV_TEST_PASSWORD,
    });
    setDevLoading(false);

    if (error) {
      Alert.alert("Test girişi başarısız", error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <BerberPole />

          <Text style={styles.eyebrow}>MÜŞTERİ GİRİŞİ</Text>
          <Text style={styles.title}>Giriş yap</Text>
          <Text style={styles.subtitle}>
            Randevu almak için e-posta adresinizi girin.
            {"\n"}
            Size {OTP_LENGTH} haneli bir doğrulama kodu göndereceğiz.
          </Text>

          <Text style={styles.label}>E-posta</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@email.com"
            placeholderTextColor={T.mutedAlt}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleSend}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Kodu gönder</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Devam ederek kullanım şartları ve gizlilik politikasını kabul edersiniz.
          </Text>

          {__DEV__ && DEV_TEST_EMAIL && DEV_TEST_PASSWORD ? (
            <TouchableOpacity
              style={[styles.devCta, devLoading && styles.ctaDisabled]}
              onPress={handleDevLogin}
              disabled={devLoading}
              activeOpacity={0.85}
            >
              {devLoading ? (
                <ActivityIndicator color={T.navy} />
              ) : (
                <Text style={styles.devCtaText}>Test hesabıyla giriş</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  kav: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 32,
  },
  pole: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    flexDirection: "row",
    marginBottom: 32,
  },
  stripe: { flex: 1 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    color: T.red,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: T.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: T.muted,
    lineHeight: 20,
    marginBottom: 40,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: T.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.line,
    borderRadius: R.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.ink,
    marginBottom: 24,
  },
  cta: {
    backgroundColor: T.navy,
    borderRadius: R.cta,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.cta,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  disclaimer: {
    marginTop: 16,
    fontSize: 12,
    lineHeight: 18,
    color: T.muted,
  },
  devCta: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: R.cta,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  devCtaText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.navy,
  },
});
