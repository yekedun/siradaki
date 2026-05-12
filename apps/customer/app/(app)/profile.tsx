import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { getProfile, upsertProfile } from "../../lib/customer-profiles";
import { T, R, Shadow } from "../../lib/theme";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}

export default function ProfileScreen() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const profile = await getProfile(user.id);
      if (profile) {
        setFullName(profile.full_name);
        setPhone(profile.phone ?? "");
      }
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    if (fullName.trim().length < 2) {
      Alert.alert("Eksik Bilgi", "Ad soyad en az 2 karakter olmalı.");
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    try {
      await upsertProfile(user.id, { full_name: fullName.trim(), phone: phone.trim() || null });
      setDirty(false);
      Alert.alert("Kaydedildi", "Profil bilgileriniz güncellendi.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profil kaydedilemedi.";
      Alert.alert("Hata", message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    Alert.alert("Çıkış Yap", "Hesabınızdan çıkmak istediğinizden emin misiniz?", [
      { text: "Vazgeç", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: () => supabase.auth.signOut(),
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={T.navy} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>PROFİLİM</Text>
          <Text style={styles.title}>Profilim</Text>

          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(fullName)}</Text>
            </View>
            <Text style={styles.emailLabel}>{email}</Text>
          </View>

          <Text style={styles.label}>AD SOYAD</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={(v) => { setFullName(v); setDirty(true); }}
            autoCapitalize="words"
            returnKeyType="next"
            placeholder="Adınız Soyadınız"
            placeholderTextColor={T.mutedAlt}
          />

          <Text style={styles.label}>TELEFON <Text style={styles.optional}>(isteğe bağlı)</Text></Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => { setPhone(v); setDirty(true); }}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSave}
            placeholder="0532 000 00 00"
            placeholderTextColor={T.mutedAlt}
          />

          <TouchableOpacity
            style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!dirty || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Değişiklikleri Kaydet</Text>
            )}
          </TouchableOpacity>

          <View style={styles.spacer} />

          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Berber Müşteri · v1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },

  eyebrow: {
    fontSize: 11, fontWeight: "600", color: T.red,
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 6,
  },
  title: {
    fontSize: 30, fontWeight: "700", color: T.ink,
    letterSpacing: -0.5, marginBottom: 28,
  },

  avatarWrap: { alignItems: "center", marginBottom: 32 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: T.blueSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 26, fontWeight: "700", color: T.navy },
  emailLabel: { fontSize: 13, fontWeight: "500", color: T.muted },

  label: {
    fontSize: 11, fontWeight: "600", color: T.muted,
    letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6,
  },
  optional: { fontSize: 11, fontWeight: "400", color: T.mutedAlt, textTransform: "none", letterSpacing: 0 },
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

  saveBtn: {
    backgroundColor: T.navy,
    borderRadius: R.cta,
    paddingVertical: 16,
    alignItems: "center",
    ...Shadow.cta,
  },
  saveBtnDisabled: { opacity: 0.4, elevation: 0, shadowOpacity: 0 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  spacer: { height: 32 },

  signOutBtn: {
    backgroundColor: T.redSoft,
    borderWidth: 1,
    borderColor: T.redBorder,
    borderRadius: R.card,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  signOutText: { fontSize: 14, fontWeight: "600", color: T.red },

  version: { textAlign: "center", fontSize: 11, color: T.mutedAlt },
});
