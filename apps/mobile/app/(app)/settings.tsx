import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Clipboard,
} from "react-native";
import { supabase } from "../../lib/supabase";
import {
  generateWidgetToken,
  listWidgetTokens,
  deleteWidgetToken,
} from "../../lib/widget-bridge";

interface TokenMeta {
  id: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
}

export default function SettingsScreen() {
  const [tokens, setTokens] = useState<TokenMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadTokens = useCallback(async () => {
    try {
      const data = await listWidgetTokens();
      setTokens(data ?? []);
    } catch (err) {
      Alert.alert("Hata", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  async function handleGenerate() {
    Alert.alert(
      "Widget Token Oluştur",
      "Yeni bir token oluşturulacak. Bu token telefon widget'ınıza otomatik yüklenir. Devam?",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Oluştur",
          onPress: async () => {
            setGenerating(true);
            try {
              const token = await generateWidgetToken();
              Alert.alert(
                "Token Oluşturuldu ✓",
                `Widget'ınıza otomatik yüklendi.\n\nToken ID: ${token.id.slice(0, 8)}…`
              );
              await loadTokens();
            } catch (err) {
              Alert.alert("Hata", (err as Error).message);
            } finally {
              setGenerating(false);
            }
          },
        },
      ]
    );
  }

  async function handleDelete(tokenId: string) {
    Alert.alert(
      "Token Sil",
      "Bu token silinirse widget çalışmayı durduracak.",
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWidgetToken(tokenId);
              setTokens((prev) => prev.filter((t) => t.id !== tokenId));
            } catch (err) {
              Alert.alert("Hata", (err as Error).message);
            }
          },
        },
      ]
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Widget Tokens */}
      <Text style={styles.sectionTitle}>Widget Token'ları</Text>
      <Text style={styles.sectionDesc}>
        Widget'ınız randevu takvimini güncellemek için bu token'ları kullanır.
        Telefonunuzu değiştirdiğinizde yeni bir token oluşturun.
      </Text>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color="#2563eb" />
      ) : (
        <>
          {tokens.length === 0 ? (
            <Text style={styles.emptyText}>Henüz token oluşturulmadı.</Text>
          ) : (
            tokens.map((token) => (
              <View key={token.id} style={styles.tokenCard}>
                <View style={styles.tokenInfo}>
                  <Text style={styles.tokenLabel}>{token.label}</Text>
                  <Text style={styles.tokenMeta}>
                    Oluşturuldu:{" "}
                    {new Date(token.created_at).toLocaleDateString("tr-TR")}
                  </Text>
                  {token.last_used_at && (
                    <Text style={styles.tokenMeta}>
                      Son kullanım:{" "}
                      {new Date(token.last_used_at).toLocaleDateString("tr-TR")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(token.id)}
                  style={styles.deleteBtn}
                >
                  <Text style={styles.deleteBtnText}>Sil</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <TouchableOpacity
            style={[styles.generateBtn, generating && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.generateBtnText}>+ Yeni Token Oluştur</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, gap: 0 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyText: { fontSize: 14, color: "#9ca3af", marginBottom: 12 },
  tokenCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tokenInfo: { flex: 1 },
  tokenLabel: { fontSize: 14, fontWeight: "600", color: "#374151" },
  tokenMeta: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  deleteBtnText: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  generateBtn: {
    borderWidth: 1.5,
    borderColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 32,
    backgroundColor: "#eff6ff",
  },
  btnDisabled: { opacity: 0.5 },
  generateBtnText: { color: "#2563eb", fontWeight: "600", fontSize: 15 },
  signOutBtn: {
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  signOutText: { color: "#6b7280", fontSize: 15, fontWeight: "500" },
});
