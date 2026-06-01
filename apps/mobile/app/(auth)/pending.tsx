import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Hourglass, LogOut, RefreshCw } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { determineUserRole, supabase } from '../../lib/supabase';
import { routeForRole } from '../../lib/router-guard';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';

export default function PendingScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const rejected = status === 'rejected';
  const unknown = status === 'unknown';

  const overline = rejected ? 'Başvuru Durumu' : unknown ? 'Durum Kontrolü' : 'İnceleme Sürecinde';
  const titleLine1 = rejected ? 'Başvuru' : unknown ? 'Durum' : 'Başvurun';
  const titleLine2 = rejected ? 'reddedildi.' : unknown ? 'okunamadı.' : 'alındı.';
  const bodyText = rejected
    ? 'Dükkan başvurun onaylanmadı. Detay için destek ekibiyle iletişime geçebilirsin.'
    : unknown
      ? 'Hesap durumun şu anda okunamadı. Bağlantını kontrol edip tekrar giriş yap.'
      : 'Dükkanın inceleme sürecinde. Onaylandıktan sonra bildirim alacaksın. Genellikle 24 saat içinde yanıt verilir.';

  const overlineColor = rejected ? v2Colors.brick : unknown ? v2Colors.ink3 : v2Colors.brass;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  async function handleRefresh() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace('/(auth)/login'); return; }
    const role = await determineUserRole(user.id);
    if (role === 'unknown') {
      Alert.alert('Durum okunamadı', 'Bağlantını veya veritabanı migration durumunu kontrol edip tekrar dene.');
      return;
    }
    router.replace(routeForRole(role) as any);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand mark (top-left) */}
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoChevron}>›</Text>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.brandName}>Sıradaki</Text>
        </View>

        {/* Status art */}
        <View style={styles.artWrap}>
          <View style={styles.artCircle}>
            <Hourglass size={40} color={v2Colors.brass} strokeWidth={1.8} />
          </View>
        </View>

        {/* Copy */}
        <Text style={[styles.overline, { color: overlineColor }]}>{overline}</Text>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{titleLine1}{'\n'}</Text>
          <Text style={[styles.title, styles.titleAccent]}>{titleLine2}</Text>
        </View>
        <Text style={styles.body}>{bodyText}</Text>

        {/* Timeline */}
        {!rejected && !unknown && (
          <View style={styles.timeline}>
            <TimelineStep
              icon={<Check size={16} color={v2Colors.paper} strokeWidth={2.5} />}
              dotColor={v2Colors.spruce}
              label="Hesap oluşturuldu"
              sub="Keskin Berber · berber@dukkan.com"
              subColor={v2Colors.ink3}
              done
            />
            <TimelineLine />
            <TimelineStep
              icon={<View style={styles.dotInner} />}
              dotColor={v2Colors.brass}
              label="İnceleniyor"
              sub="Ekibimiz başvurunu kontrol ediyor"
              subColor={v2Colors.brass}
              active
            />
            <TimelineLine faint />
            <TimelineStep
              icon={<View style={[styles.dotInner, { backgroundColor: v2Colors.ink3 }]} />}
              dotColor={v2Colors.line2}
              label="Panel açılıyor"
              sub="Onaylanınca ajandan hazır olacak"
              subColor={v2Colors.ink3}
            />
          </View>
        )}

        <View style={styles.spacer} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleRefresh} activeOpacity={0.82}>
            <RefreshCw size={18} color={v2Colors.paper} strokeWidth={2} />
            <Text style={styles.primaryText}>Durumu Yenile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout} activeOpacity={0.78}>
            <LogOut size={16} color={v2Colors.ink2} strokeWidth={2} />
            <Text style={styles.secondaryText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineStep({
  icon,
  dotColor,
  label,
  sub,
  subColor,
  done,
  active,
}: {
  icon: React.ReactNode;
  dotColor: string;
  label: string;
  sub: string;
  subColor: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <View style={ts.row}>
      <View style={[ts.dot, { backgroundColor: dotColor }]}>{icon}</View>
      <View style={ts.copy}>
        <Text style={[ts.label, active && ts.labelActive]}>{label}</Text>
        <Text style={[ts.sub, { color: subColor }]}>{sub}</Text>
      </View>
    </View>
  );
}

function TimelineLine({ faint }: { faint?: boolean }) {
  return (
    <View style={[ts.line, faint && ts.lineFaint]} />
  );
}

const ts = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  dot: {
    alignItems: 'center',
    borderRadius: 999,
    flexShrink: 0,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  copy: { flex: 1 },
  label: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },
  labelActive: { color: v2Colors.ink },
  sub: {
    fontFamily: v2Fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  line: {
    backgroundColor: v2Colors.spruce,
    borderRadius: 1,
    height: 20,
    marginLeft: 14,
    width: 1,
  },
  lineFaint: { backgroundColor: v2Colors.line },
});

const styles = StyleSheet.create({
  safe: { backgroundColor: v2Colors.paper, flex: 1 },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
    paddingHorizontal: 28,
    paddingTop: 40,
  },

  brandRow: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 48 },
  logoMark: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 11,
    height: 40,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 40,
  },
  logoChevron: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 26,
    includeFontPadding: false,
    lineHeight: 30,
    marginLeft: -2,
    marginTop: -2,
  },
  logoDot: {
    backgroundColor: v2Colors.ember,
    borderRadius: 999,
    bottom: 7,
    height: 5,
    position: 'absolute',
    right: 7,
    width: 5,
  },
  brandName: { color: v2Colors.ink, fontFamily: v2Fonts.display, fontSize: 22, lineHeight: 26 },

  artWrap: { alignItems: 'flex-start', marginBottom: 28 },
  artCircle: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderRadius: 999,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },

  overline: {
    fontFamily: v2Fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, marginBottom: 12 },
  title: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 42,
    includeFontPadding: false,
    lineHeight: 46,
  },
  titleAccent: {
    color: v2Colors.ink,
    fontStyle: 'normal',
  },
  body: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 32,
  },

  timeline: { gap: 0 },

  dotInner: {
    backgroundColor: v2Colors.paper,
    borderRadius: 999,
    height: 10,
    width: 10,
  },

  spacer: { flex: 1, minHeight: 32 },

  actions: { gap: 12 },
  primaryBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: v2Colors.spruce,
    borderRadius: v2Radii.lg,
    flexDirection: 'row',
    gap: 10,
    height: 54,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  primaryText: { color: v2Colors.paper, fontFamily: v2Fonts.bodyBold, fontSize: 16 },
  secondaryBtn: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: v2Colors.line2,
    borderRadius: v2Radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
  },
  secondaryText: { color: v2Colors.ink2, fontFamily: v2Fonts.bodyBold, fontSize: 15 },
});
