/**
 * S3 — Hesabım
 * Design: Sıradaki-Final-Staff.html · S3
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, View, Text, ScrollView, Share,
  TouchableOpacity, Pressable, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell, ChevronRight, Clock, Globe, Link,
  LogOut, Share2, Store, Trash2,
} from 'lucide-react-native';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';
import { supabase } from '../../lib/supabase';
import { buildBarberLink } from '../../lib/onboarding-utils';

interface Profile {
  name: string;
  initials: string;
  email: string;
  shopName: string;
  shopLocation: string;
  barberLink: string | null;
  staffId: string | null;
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/* ── Toggle ── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;
  function toggle() {
    const to = on ? 0 : 1;
    Animated.timing(anim, { toValue: to, duration: 180, useNativeDriver: false }).start();
    onChange(!on);
  }
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: [v2Colors.line2, v2Colors.spruce] });
  const tx = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 20] });
  return (
    <Pressable onPress={toggle} hitSlop={8}>
      <Animated.View style={[s.tog, { backgroundColor: bg as any }]}>
        <Animated.View style={[s.togThumb, { left: tx as any }]} />
      </Animated.View>
    </Pressable>
  );
}

/* ── Row ── */
function Row({
  icon, title, sub, mono, onPress, right,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  mono?: boolean;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={s.row} activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
      <View style={s.rowIc}>{icon}</View>
      <View style={s.rowTx}>
        <Text style={s.rowTitle}>{title}</Text>
        {sub ? <Text style={[s.rowSub, mono && s.rowSubMono]} numberOfLines={1}>{sub}</Text> : null}
      </View>
      {right ?? <ChevronRight size={18} color={v2Colors.line2} />}
    </TouchableOpacity>
  );
}

export default function HesabimScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifOn, setNotifOn] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('staff')
        .select('id, name, slug, notification_prefs, shops(name, address)')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const row = data as any;
          const shopName = row?.shops?.name ?? '';
          const shopAddr = row?.shops?.address ?? '';
          const shopLocation = [shopName, shopAddr].filter(Boolean).join(' · ');
          const staffSlug = row?.slug ?? null;
          const shopSlug = null; // resolved via shops relation above if needed
          const barberLink = buildBarberLink(shopSlug, staffSlug);
          const name = row?.name ?? user.email?.split('@')[0] ?? '—';
          const prefs = row?.notification_prefs ?? {};
          setNotifOn(prefs.daily_summary !== false);
          setProfile({
            name,
            initials: initials(name),
            email: user.email ?? '—',
            shopName,
            shopLocation,
            barberLink,
            staffId: row?.id ?? null,
          });
        });
    });
  }, []);

  async function updateNotif(v: boolean) {
    setNotifOn(v);
    if (!profile?.staffId) return;
    const { data: current } = await supabase.from('staff').select('notification_prefs').eq('id', profile.staffId).maybeSingle();
    const merged = { ...(current as any)?.notification_prefs, daily_summary: v };
    await supabase.from('staff').update({ notification_prefs: merged } as any).eq('id', profile.staffId);
  }

  async function handleShare() {
    if (!profile?.barberLink) return;
    try { await Share.share({ message: profile.barberLink }); } catch {}
  }

  function handleSignOut() {
    Alert.alert('Çıkış Yap', 'Hesaptan çıkmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert('Hesabı Sil', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        const { error } = await supabase.functions.invoke('delete-account');
        if (error) { Alert.alert('Hata', 'Hesap silinemedi.'); return; }
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
      }},
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.head}>
          <Text style={s.overline}>Profil &amp; Ayarlar</Text>
          <Text style={s.title}>Hesabım</Text>
        </View>

        {/* Profile hero */}
        <View style={s.hero}>
          <View style={s.heroAv}>
            <Text style={s.heroAvTx}>{profile?.initials ?? '—'}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.heroName}>{profile?.name ?? '—'}</Text>
            <View style={s.heroRole}><Text style={s.heroRoleTx}>Usta</Text></View>
            {profile?.shopLocation ? (
              <View style={s.heroShop}>
                <Store size={13} color={v2Colors.ink3} />
                <Text style={s.heroShopTx} numberOfLines={1}>{profile.shopLocation}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Çalışma section */}
        <Text style={s.sectionLabel}>Çalışma</Text>
        <View style={s.list}>
          <Row
            icon={<Clock size={16} color={v2Colors.spruce} />}
            title="Çalışma Saatlerim"
            sub="Pzt–Cmt · 09:00–19:00"
            onPress={() => router.push('/(app)/working-hours')}
          />
          <Row
            icon={<Link size={16} color={v2Colors.spruce} />}
            title="Randevu Linkim"
            sub={profile?.barberLink ?? 'siradaki.app/…'}
            mono
            onPress={handleShare}
            right={<Share2 size={18} color={v2Colors.line2} />}
          />
        </View>

        {/* Tercihler section */}
        <Text style={s.sectionLabel}>Tercihler</Text>
        <View style={s.list}>
          <Row
            icon={<Bell size={16} color={v2Colors.spruce} />}
            title="Bildirimler"
            sub="Yeni randevu &amp; hatırlatma"
            right={<Toggle on={notifOn} onChange={updateNotif} />}
          />
          <Row
            icon={<Globe size={16} color={v2Colors.spruce} />}
            title="Dil"
            sub="Türkçe"
          />
        </View>

        {/* Danger */}
        <View style={s.danger}>
          <TouchableOpacity style={s.outBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <LogOut size={17} color={v2Colors.ink2} />
            <Text style={s.outBtnTx}>Çıkış Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.delBtn} onPress={handleDeleteAccount} activeOpacity={0.8}>
            <Trash2 size={15} color={v2Colors.brick} />
            <Text style={s.delBtnTx}>Hesabı Sil</Text>
          </TouchableOpacity>
          <Text style={s.version}>Sıradaki · v1.0.0</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: v2Colors.paper },
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  head: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 2 },
  overline: { fontFamily: v2Fonts.bodySemiBold, fontSize: 11, letterSpacing: 11 * 0.2, textTransform: 'uppercase', color: v2Colors.ink3 },
  title: { fontFamily: v2Fonts.display, fontSize: 33, lineHeight: 34, letterSpacing: -0.66, color: v2Colors.ink, marginTop: 7 },

  /* Hero */
  hero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    margin: 6, marginHorizontal: 22,
    backgroundColor: v2Colors.card,
    borderWidth: 1, borderColor: v2Colors.line,
    borderRadius: v2Radii.xl, padding: 18,
    shadowColor: v2Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  heroAv: {
    width: 58, height: 58, borderRadius: 17,
    backgroundColor: v2Colors.spruce,
    alignItems: 'center', justifyContent: 'center',
  },
  heroAvTx: { fontFamily: v2Fonts.mono, fontSize: 19, color: '#fff' },
  heroName: { fontFamily: v2Fonts.bodyBold, fontSize: 19, color: v2Colors.ink },
  heroRole: {
    alignSelf: 'flex-start',
    backgroundColor: v2Colors.spruceSoft, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, marginTop: 6,
  },
  heroRoleTx: { fontFamily: v2Fonts.bodySemiBold, fontSize: 9, letterSpacing: 9 * 0.1, textTransform: 'uppercase', color: v2Colors.spruce },
  heroShop: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  heroShopTx: { fontFamily: v2Fonts.body, fontSize: 12.5, color: v2Colors.ink3, flex: 1 },

  /* Section */
  sectionLabel: {
    fontFamily: v2Fonts.bodySemiBold, fontSize: 10,
    letterSpacing: 10 * 0.16, textTransform: 'uppercase',
    color: v2Colors.ink3, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8,
  },
  list: {
    marginHorizontal: 22,
    backgroundColor: v2Colors.card, borderWidth: 1, borderColor: v2Colors.line,
    borderRadius: v2Radii.lg, overflow: 'hidden',
    shadowColor: v2Colors.ink, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderTopWidth: 1, borderTopColor: v2Colors.line },
  rowIc: { width: 34, height: 34, borderRadius: 10, backgroundColor: v2Colors.paper2, alignItems: 'center', justifyContent: 'center' },
  rowTx: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: v2Fonts.bodyBold, fontSize: 14.5, color: v2Colors.ink },
  rowSub: { fontFamily: v2Fonts.body, fontSize: 11.5, color: v2Colors.ink3, marginTop: 2 },
  rowSubMono: { fontFamily: v2Fonts.mono },

  /* Danger */
  danger: { paddingHorizontal: 22, paddingTop: 18, gap: 9 },
  outBtn: {
    height: 50, borderRadius: 14,
    borderWidth: 1.5, borderColor: v2Colors.line2,
    backgroundColor: v2Colors.card,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
  },
  outBtnTx: { fontFamily: v2Fonts.bodyBold, fontSize: 14.5, color: v2Colors.ink },
  delBtn: {
    height: 46, borderRadius: 13,
    borderWidth: 1.5, borderColor: '#E4C9C3',
    backgroundColor: v2Colors.brickSoft,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  delBtnTx: { fontFamily: v2Fonts.bodyBold, fontSize: 13, color: v2Colors.brick },
  version: { fontFamily: v2Fonts.mono, fontSize: 10, color: v2Colors.ink3, textAlign: 'center', paddingVertical: 14 },

  /* Toggle */
  tog: { width: 42, height: 25, borderRadius: 999 },
  togThumb: {
    position: 'absolute', top: 3,
    width: 19, height: 19, borderRadius: 999, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 2,
  },
});
