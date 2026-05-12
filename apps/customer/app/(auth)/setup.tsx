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
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { upsertProfile } from "../../lib/customer-profiles";
import { T, R, Shadow } from "../../lib/theme";

export default function SetupScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleContinue() {
    if (fullName.trim().length < 2) {
      Alert.alert("Eksik bilgi", "Ad soyad en az 2 karakter olmalı.");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await upsertProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });
      await supabase.auth.refreshSession();
      router.replace("/(app)");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profil kaydedilemedi.";
      Alert.alert("Hata", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>A</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>PROFİL KURULUM</Text>
          <Text style={styles.title}>Profilinizi tamamlayın</Text>
          <Text style={styles.subtitle}>
            Randevularınızı takip edebilmek için kısa bir profil oluşturun.
          </Text>

          <Text style={styles.label}>Ad soyad</Text>
          <TextInput
            style={styles.input}
            placeholder="Adınız Soyadınız"
            placeholderTextColor={T.mutedAlt}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>
            Telefon <Text style={styles.optional}>(isteğe bağlı)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="0532 000 00 00"
            placeholderTextColor={T.mutedAlt}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />

          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleContinue}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.ctaText}>Devam et</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  kav: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
  },
  avatarWrap: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 28, fontWeight: "700", color: T.navy },
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
    marginBottom: 36,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: T.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  optional: {
    fontSize: 11,
    fontWeight: "400",
    color: T.mutedAlt,
    textTransform: "none",
    letterSpacing: 0,
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
    marginTop: 8,
    ...Shadow.cta,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
