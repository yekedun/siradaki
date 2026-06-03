/**
 * Şifremi Unuttum ekranı.
 * Kullanıcı e-posta girer → Supabase şifre sıfırlama e-postası gönderir.
 * Linke tıklayınca siradaki.app/auth/reset-password'a yönlendirilir.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors } from '../../lib/theme';
import { Button } from '../../components/ds/Button';
import { TextField } from '../../components/ds/TextField';
import { supabase } from '../../lib/supabase';
import { isValidEmail } from '../../lib/validation';

const RESET_REDIRECT = 'https://siradaki.app/auth/reset-password';

export default function ForgotPasswordScreen() {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [sent,    setSent]    = useState(false);

  const canSubmit = isValidEmail(email.trim());

  async function handleSend() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { error: authErr } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: RESET_REDIRECT },
      );
      if (authErr) {
        setError('E-posta gönderilemedi. Lütfen tekrar dene.');
        return;
      }
      setSent(true);
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.slate[0] }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topArea}>
            <View style={styles.mark}><Text style={styles.markLetter}>S</Text></View>
            <Text style={styles.overline}>Berber · Dükkan Paneli</Text>
            <Text style={styles.title}>Şifremi Unuttum</Text>
            {sent ? (
              <Text style={styles.successBody}>
                Şifre sıfırlama bağlantısı <Text style={styles.emailHighlight}>{email.trim()}</Text> adresine gönderildi.{'\n\n'}
                E-postadaki bağlantıya tıkla ve yeni şifreni belirle.
              </Text>
            ) : (
              <Text style={styles.lead}>
                E-posta adresini gir, sana sıfırlama bağlantısı gönderelim.
              </Text>
            )}
          </View>

          {!sent && (
            <View style={styles.fields}>
              <TextField
                label="E-posta"
                value={email}
                onChangeText={setEmail}
                placeholder="berber@dukkan.com"
                keyboardType="email-address"
              />
            </View>
          )}

          <View style={{ flex: 1, minHeight: 24 }} />

          <View style={styles.cta}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {sent ? (
              <Button variant="primary" size="lg" full onPress={() => router.back()}>
                Giriş Ekranına Dön
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  full
                  disabled={!canSubmit || loading}
                  onPress={handleSend}
                >
                  {loading ? 'Gönderiliyor…' : 'Sıfırlama Bağlantısı Gönder'}
                </Button>
                <Button variant="secondary" size="md" onPress={() => router.back()}>
                  Geri Dön
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 28 },
  topArea: { marginTop: 60 },
  mark: {
    width: 48,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.ink[900],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  markLetter: { fontSize: 22, fontFamily: 'Montserrat-Bold', color: '#fff' },
  overline: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.76,
    textTransform: 'uppercase',
    color: colors.slate[500],
  },
  title: {
    fontSize: 34,
    fontFamily: 'Montserrat-Bold',
    letterSpacing: -0.68,
    lineHeight: 36,
    color: colors.ink[900],
    marginTop: 14,
    marginBottom: 10,
  },
  lead: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    lineHeight: 25,
    color: colors.slate[700],
  },
  successBody: {
    fontSize: 15,
    fontFamily: 'Montserrat-Regular',
    lineHeight: 24,
    color: colors.slate[700],
  },
  emailHighlight: {
    fontFamily: 'Montserrat-SemiBold',
    color: colors.ink[900],
  },
  fields: { marginTop: 32, gap: 14 },
  cta: { gap: 14, alignItems: 'center' },
  errorText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: colors.coral[600],
    textAlign: 'center',
  },
});
