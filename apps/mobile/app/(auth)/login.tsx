import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Lock, Mail } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase, determineUserRole } from '../../lib/supabase';
import { registerForPushNotifications } from '../../lib/notifications';
import { configureGoogleSignIn, signInWithGoogle } from '../../lib/google-auth';
import { routeForRole } from '../../lib/router-guard';
import { trackEvent } from '../../lib/analytics';
import { v2Colors, v2Fonts } from '../../lib/v2-tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { configureGoogleSignIn(); }, []);

  const canSubmit = email.trim().length > 0 && password.length > 0;

  async function handleLogin() {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (authError) {
        trackEvent('login_fail', { method: 'email', code: authError.status ?? 'unknown' });
        setError(authError.message);
        return;
      }
      if (!data.user) return;
      trackEvent('login_success', { method: 'email' });
      const role = await determineUserRole(data.user.id);
      registerForPushNotifications().catch(() => {});
      router.replace(routeForRole(role) as any);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        trackEvent('login_fail', { method: 'google', code: 'google_auth_error' });
        setError(result.error);
      } else {
        trackEvent('login_success', { method: 'google' });
      }
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
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Watermark */}
          <ChevronRight
            color={v2Colors.spruce}
            size={260}
            strokeWidth={5}
            style={styles.watermark}
          />

          {/* Brand */}
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Text style={styles.logoChevron}>›</Text>
              <View style={styles.logoDot} />
            </View>
            <Text style={styles.brandName}>Sıradaki</Text>
          </View>

          {/* Hero copy */}
          <View style={styles.hero}>
            <Text style={styles.overline}>Berber · Dükkan Paneli</Text>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Sıra </Text>
              <Text style={styles.titleItalic}>sende.</Text>
            </View>
            <Text style={styles.lead}>
              Randevu panelini açmak için hesabına giriş yap.
            </Text>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>E-posta</Text>
              <View style={styles.inputRow}>
                <Mail size={16} color={v2Colors.ink3} style={styles.inputIcon} />
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
              <View style={styles.inputUnderline} />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Şifre</Text>
              <View style={styles.inputRow}>
                <Lock size={16} color={v2Colors.ink3} style={styles.inputIcon} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={v2Colors.ink3}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputUnderline} />
            </View>
          </View>

          <View style={styles.spacer} />

          {/* CTA */}
          <View style={styles.cta}>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              activeOpacity={!canSubmit || loading ? 1 : 0.82}
              disabled={!canSubmit || loading}
              onPress={handleLogin}
              style={[styles.primaryBtn, (!canSubmit || loading) && styles.primaryBtnDisabled]}
            >
              <Text style={styles.primaryText}>
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap →'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={loading ? 1 : 0.78}
              disabled={loading}
              onPress={handleGoogleLogin}
              style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
            >
              <Text style={styles.googleMark}>G</Text>
              <Text style={styles.googleText}>
                {loading ? 'Giriş yapılıyor…' : 'Google ile Giriş Yap'}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Hesabın yok mu? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.footerLink}>Kayıt ol</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: v2Colors.paper,
    flex: 1,
  },
  kav: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
    paddingHorizontal: 28,
    paddingTop: 40,
  },

  /* Watermark */
  watermark: {
    opacity: 0.055,
    position: 'absolute',
    right: -60,
    top: 80,
  },

  /* Brand */
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    marginBottom: 96,
  },
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
  brandName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 25,
    lineHeight: 29,
  },

  /* Hero */
  hero: {},
  overline: {
    color: v2Colors.ember,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    marginTop: 12,
  },
  title: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 40,
    includeFontPadding: false,
    lineHeight: 44,
  },
  titleItalic: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.displayItalic,
    fontSize: 40,
    includeFontPadding: false,
    lineHeight: 44,
  },
  lead: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 290,
  },

  /* Fields */
  fields: {
    gap: 22,
    marginTop: 36,
  },
  field: {
    gap: 0,
  },
  fieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.7,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  inputIcon: {
    flexShrink: 0,
  },
  input: {
    color: v2Colors.ink,
    flex: 1,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 16,
    includeFontPadding: false,
    padding: 0,
  },
  inputUnderline: {
    backgroundColor: v2Colors.spruce,
    height: 1,
  },

  spacer: {
    flex: 1,
    minHeight: 32,
  },

  /* CTA */
  cta: {
    alignItems: 'center',
    gap: 12,
  },
  error: {
    color: v2Colors.brick,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 13,
    textAlign: 'center',
  },
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
  primaryBtnDisabled: {
    backgroundColor: v2Colors.line2,
    shadowOpacity: 0,
  },
  primaryText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 16,
  },
  googleBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: v2Colors.line2,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    height: 52,
    justifyContent: 'center',
  },
  googleBtnDisabled: {
    opacity: 0.55,
  },
  googleMark: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
  googleText: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
  footerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  footerText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 13,
  },
  footerLink: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
  },
});
