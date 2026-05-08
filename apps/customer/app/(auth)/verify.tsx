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
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { T, R, Shadow } from "../../lib/theme";

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();

  async function handleVerify() {
    if (token.trim().length < 6) {
      Alert.alert("Eksik Kod", "6 haneli kodu eksiksiz girin.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email ?? "",
      token: token.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      Alert.alert("Doğrulama Başarısız", "Kod hatalı veya süresi dolmuş. Tekrar deneyin.");
      setToken("");
    }
    // Başarılı: root layout authState değişimini yakalar, otomatik yönlendirir.
  }

  async function handleResend() {
    setResending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email ?? "",
      options: { shouldCreateUser: true },
    });
    setResending(false);
    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      Alert.alert("Kod Gönderildi", `${email} adresine yeni kod gönderildi.`);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={T.ink} />
          </TouchableOpacity>

          <Text style={styles.eyebrow}>DOĞRULAMA</Text>
          <Text style={styles.title}>Kodunuzu Girin</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.emailHighlight}>{email}</Text>
            {"\n"}adresine 6 haneli bir kod gönderdik.
          </Text>

          <TextInput
            style={styles.otpInput}
            placeholder="------"
            placeholderTextColor={T.mutedAlt}
            value={token}
            onChangeText={(v) => setToken(v.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            returnKeyType="done"
            onSubmitEditing={handleVerify}
          />

          <TouchableOpacity
            style={[styles.cta, (loading || token.length < 6) && styles.ctaDisabled]}
            onPress={handleVerify}
            disabled={loading || token.length < 6}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Doğrula →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resend}
            onPress={handleResend}
            disabled={resending}
            activeOpacity={0.7}
          >
            {resending ? (
              <ActivityIndicator size="small" color={T.navy} />
            ) : (
              <Text style={styles.resendText}>Kodu almadım — tekrar gönder</Text>
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
    paddingTop: 24,
    paddingBottom: 32,
  },

  back: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    marginLeft: -8,
  },

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
  emailHighlight: {
    color: T.navy,
    fontWeight: "600",
  },

  otpInput: {
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.navy,
    borderRadius: R.input,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: "700",
    color: T.ink,
    letterSpacing: 12,
    marginBottom: 28,
  },

  cta: {
    backgroundColor: T.navy,
    borderRadius: R.cta,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    ...Shadow.cta,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  resend: {
    alignItems: "center",
    paddingVertical: 12,
  },
  resendText: {
    fontSize: 14,
    fontWeight: "500",
    color: T.navy,
  },
});
