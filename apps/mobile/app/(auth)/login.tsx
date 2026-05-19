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
import { supabase } from "../../lib/supabase";
import { T, R, Shadow } from "../../lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert("Giriş Başarısız", error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <BrandMark />

        <Text style={styles.eyebrow}>BERBER · DÜKKAN PANELİ</Text>
        <Text style={styles.title}>Giriş Yap</Text>
        <Text style={styles.lead}>
          Randevu panelini açmak için hesabına giriş yap.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>E-POSTA</Text>
          <TextInput
            style={styles.input}
            placeholder="berber@dukkan.com"
            placeholderTextColor={T.fg4}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>ŞİFRE</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={T.fg4}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (loading || !email || !password) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading || !email || !password}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <View style={styles.spacer} />

        <TouchableOpacity onPress={() => router.push("/(auth)/register" as any)} disabled={loading}>
          <Text style={styles.footer}>
            Hesabın yok mu? <Text style={styles.footerLink}>Kayıt ol</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function BrandMark() {
  // 56×56 navy square with diagonal red stripe overlay
  return (
    <View style={brandStyles.outer}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            brandStyles.stripe,
            { left: -20 + i * 14, transform: [{ rotate: "135deg" }] },
          ]}
        />
      ))}
    </View>
  );
}

const brandStyles = StyleSheet.create({
  outer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: T.brand600,
    overflow: "hidden",
    marginBottom: 24,
    position: "relative",
    ...Shadow.md,
  },
  stripe: {
    position: "absolute",
    top: -20,
    width: 4,
    height: 96,
    backgroundColor: "rgba(220,38,38,0.85)",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 88,
    paddingBottom: 24,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: T.fg3,
    marginBottom: 6,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.68,
    color: T.fg1,
    marginBottom: 8,
  },
  lead: {
    fontSize: 16,
    color: T.fg2,
    lineHeight: 21,
    marginBottom: 32,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.6,
    color: T.fg3,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: T.bgElevated,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: R.md,
    fontSize: 15,
    color: T.fg1,
  },
  button: {
    marginTop: 8,
    width: "100%",
    paddingVertical: 16,
    backgroundColor: T.ink900,
    borderRadius: R.md,
    alignItems: "center",
    justifyContent: "center",
    ...Shadow.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  spacer: { flex: 1 },
  footer: {
    textAlign: "center",
    fontSize: 13,
    color: T.fg3,
    paddingBottom: 16,
  },
  footerLink: {
    color: T.brand600,
    fontWeight: "600",
  },
});
