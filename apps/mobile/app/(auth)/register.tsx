import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Lock, Mail, Store } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';
import { v2Colors, v2Fonts } from '../../lib/v2-tokens';

const FN_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const score = value.length >= 12 ? 3 : value.length >= 8 ? 2 : 1;
  const labels = ['ZAYIF', 'ORTA', 'GÜÇLÜ'] as const;
  const barColors = [v2Colors.brick, v2Colors.brass, v2Colors.spruce];
  const activeColor = barColors[score - 1]!;
  return (
    <View style={ps.wrap}>
      <View style={ps.bars}>
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[ps.bar, { backgroundColor: i <= score ? activeColor : v2Colors.line }]}
          />
        ))}
      </View>
      <Text style={[ps.label, { color: activeColor }]}>{labels[score - 1]}</Text>
    </View>
  );
}

const ps = StyleSheet.create({
  wrap: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 6 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { borderRadius: 2, height: 4, width: 28 },
  label: { fontFamily: v2Fonts.bodyBold, fontSize: 10, letterSpacing: 1.4 },
});

export default function RegisterScreen() {
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passConf, setPassConf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = email.length > 0 && !email.includes('@') ? 'Geçerli bir e-posta gir' : null;
  const passError = password.length > 0 && password.length < 8 ? 'En az 8 karakter gerekli' : null;
  const confError = passConf.length > 0 && password !== passConf ? 'Şifreler eşleşmiyor' : null;
  const canRegister = shopName.trim().length >= 2 && email.includes('@') && password.length >= 8 && password === passConf;

  async function handleRegister() {
    if (!canRegister || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (authErr) { setError(authErr.message); return; }
      const userId = authData.user?.id;
      if (!userId) { setError('Kayıt başarısız, tekrar dene.'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Oturum alınamadı.'); return; }

      const res = await fetch(`${FN_BASE}/register-shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: shopName.trim(), phone: '' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Dükkan oluşturulamadı.');
        return;
      }
      trackEvent('register_success');
      router.replace('/(auth)/pending');
    } catch (e: any) {
      setError(e?.message ?? 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Watermark */}
          <ChevronRight color={v2Colors.spruce} size={260} strokeWidth={5} style={styles.watermark} />

          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoChevron}>›</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.brandName}>Sıradaki</Text>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.overline}>Berber · Dükkan Paneli</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Hesap </Text>
              <Text style={styles.titleItalic}>oluştur.</Text>
            </View>
            <Text style={styles.lead}>
              Dükkanını Sıradaki'ye ekle, randevularını online al.
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            {/* Dükkan Adı */}
            <View style={styles.field}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldLabel}>Dükkan Adı</Text>
                <Text style={styles.fieldHint}>Müşteriler bu ismi görecek</Text>
              </View>
              <View style={styles.inputRow}>
                <Store size={16} color={v2Colors.ink3} />
                <TextInput
                  value={shopName}
                  onChangeText={setShopName}
                  placeholder="örn. Keskin Berber"
                  placeholderTextColor={v2Colors.ink3}
                  autoCapitalize="words"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputUnderline} />
            </View>

            {/* E-posta */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={v2Colors.ink3} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="berber@dukkan.com"
                  placeholderTextColor={v2Colors.ink3}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputUnderline, emailError ? { backgroundColor: v2Colors.brick } : null]} />
              {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
            </View>

            {/* Şifre */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={v2Colors.ink3} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="En az 8 karakter"
                  placeholderTextColor={v2Colors.ink3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputUnderline, passError ? { backgroundColor: v2Colors.brick } : null]} />
              {passError ? (
                <Text style={styles.fieldError}>{passError}</Text>
              ) : (
                <PasswordStrength value={password} />
              )}
            </View>

            {/* Şifre Tekrar */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Şifre Tekrar</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={v2Colors.ink3} />
                <TextInput
                  value={passConf}
                  onChangeText={setPassConf}
                  placeholder="Şifreni tekrar gir"
                  placeholderTextColor={v2Colors.ink3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputUnderline, confError ? { backgroundColor: v2Colors.brick } : null]} />
              {confError ? <Text style={styles.fieldError}>{confError}</Text> : null}
            </View>
          </View>

          {/* Fine print */}
          <Text style={styles.finePrint}>
            {'Kayıt olarak '}
            <Text
              style={styles.finePrintLink}
              onPress={() => WebBrowser.openBrowserAsync('https://siradaki.com/kullanim-kosullari')}
            >
              Kullanım Koşulları
            </Text>
            {"'nı ve "}
            <Text
              style={styles.finePrintLink}
              onPress={() => WebBrowser.openBrowserAsync('https://siradaki.com/gizlilik')}
            >
              Gizlilik Politikası
            </Text>
            {"'nı kabul etmiş olursun."}
          </Text>

          <View style={styles.spacer} />

          {/* CTA */}
          <View style={styles.cta}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={!canRegister || loading ? 1 : 0.82}
              disabled={!canRegister || loading}
              onPress={handleRegister}
              style={[styles.primaryBtn, (!canRegister || loading) && styles.primaryBtnDisabled]}
            >
              <Text style={styles.primaryText}>
                {loading ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur →'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Hesabın var mı? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Giriş yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: v2Colors.paper, flex: 1 },
  kav: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 28,
    paddingTop: 40,
  },

  watermark: { opacity: 0.055, position: 'absolute', right: -60, top: 80 },

  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 14, marginBottom: 64 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 11,
    height: 44,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    width: 44,
  },
  logoChevron: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 30,
    includeFontPadding: false,
    lineHeight: 34,
    marginLeft: -2,
    marginTop: -2,
  },
  logoDot: {
    backgroundColor: v2Colors.ember,
    borderRadius: 999,
    bottom: 8,
    height: 5,
    position: 'absolute',
    right: 8,
    width: 5,
  },
  brandName: { color: v2Colors.ink, fontFamily: v2Fonts.display, fontSize: 25, lineHeight: 29 },

  hero: {},
  overline: {
    color: v2Colors.ember,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, marginTop: 12 },
  title: { color: v2Colors.ink, fontFamily: v2Fonts.display, fontSize: 36, includeFontPadding: false, lineHeight: 40 },
  titleItalic: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.display,
    fontSize: 36,
    fontStyle: 'italic',
    includeFontPadding: false,
    lineHeight: 40,
  },
  lead: { color: v2Colors.ink2, fontFamily: v2Fonts.body, fontSize: 15, lineHeight: 23 },

  fields: { gap: 20, marginTop: 28 },
  field: { gap: 0 },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  fieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  fieldHint: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 11 },
  inputRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 8 },
  input: {
    color: v2Colors.ink,
    flex: 1,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 16,
    includeFontPadding: false,
    padding: 0,
  },
  inputUnderline: { backgroundColor: v2Colors.spruce, height: 1 },
  fieldError: {
    color: v2Colors.brick,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    marginTop: 5,
  },

  finePrint: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 16,
  },
  finePrintLink: { color: v2Colors.ember, fontFamily: v2Fonts.bodySemiBold },

  spacer: { flex: 1, minHeight: 24 },

  cta: { alignItems: 'center', gap: 12 },
  error: { color: v2Colors.brick, fontFamily: v2Fonts.bodySemiBold, fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: v2Colors.spruce,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.34,
    shadowRadius: 18,
  },
  primaryBtnDisabled: { backgroundColor: v2Colors.line2, shadowOpacity: 0 },
  primaryText: { color: v2Colors.paper, fontFamily: v2Fonts.bodyBold, fontSize: 16 },

  footerRow: { alignItems: 'center', flexDirection: 'row' },
  footerText: { color: v2Colors.ink2, fontFamily: v2Fonts.body, fontSize: 13 },
  footerLink: { color: v2Colors.spruce, fontFamily: v2Fonts.bodyBold, fontSize: 13 },
});
