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
  const router = useRouter();

  async function handleSend() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("Hatalı Giriş", "Geçerli bir e-posta adresi girin.");
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

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <BerberPole />

          <Text style={styles.eyebrow}>BERBER · MÜŞTERİ</Text>
          <Text style={styles.title}>Giriş Yap</Text>
          <Text style={styles.subtitle}>
            Randevu almak için e-posta adresinizi girin.{"\n"}Size 6 haneli bir doğrulama kodu göndereceğiz.
          </Text>

          <Text style={styles.label}>E-POSTA</Text>
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
              <Text style={styles.ctaText}>Kod Gönder →</Text>
            )}
          </TouchableOpacity>
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
    color: T.navy,
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
    marginBottom: 28,
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
});
