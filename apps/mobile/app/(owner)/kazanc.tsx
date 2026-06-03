import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { estimatedAppointmentRevenueCents } from '../../lib/revenue-mappers';
import { useShop } from '../../lib/ShopContext';
import { formatCents } from '../../lib/utils';
import { v2Colors, v2Fonts, v2Radii, v2Spacing } from '../../lib/v2-tokens';

interface StaffRow {
  id: string;
  name: string;
  ciro: number;
  pay: number;
}

interface CommissionStaffRow {
  staff_id: string;
  staff_name: string;
  completed_count: number;
  gross_revenue_cents: number;
  commission_cents: number;
  shop_share_cents: number;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
}

function monthLabel() {
  return new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
}

export default function KazancScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { shopId, staffList } = useShop();
  const [refreshing, setRefreshing] = useState(false);
  const [totalCiro, setTotalCiro] = useState(0);
  const [dukkanPay, setDukkanPay] = useState(0);
  const [ustaPay, setUstaPay] = useState(0);
  const [randevuCount, setRandevuCount] = useState(0);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [commRows, setCommRows] = useState<CommissionStaffRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (shopId && staffList.length) load();
    return () => { abortRef.current?.abort(); };
  }, [shopId, staffList]);

  async function load() {
    if (!shopId || !staffList.length) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const now = new Date();
    const since = new Date(now.getFullYear(), now.getMonth(), 1);
    const until = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const barberIds = staffList.map(b => b.id);

    const { data } = await supabase.rpc('get_shop_appointments_revenue', {
      p_shop_id: shopId,
      p_from: since.toISOString(),
      p_to: until.toISOString(),
      p_staff_ids: barberIds,
    });

    if (ctrl.signal.aborted) return;

    if (data) {
      const ciro = data.reduce((s: number, a: any) => s + estimatedAppointmentRevenueCents(a), 0);
      const usta = data.reduce((s: number, a: any) => s + (a.completed_commission_cents ?? 0), 0);
      const dukkan = data.reduce((s: number, a: any) => s + (a.completed_shop_share_cents ?? 0), 0);
      setTotalCiro(ciro);
      setUstaPay(usta);
      setDukkanPay(dukkan);
      setRandevuCount(data.length);

      const byBarber: Record<string, { ciro: number; pay: number }> = {};
      for (const a of data) {
        if (!byBarber[a.staff_id]) byBarber[a.staff_id] = { ciro: 0, pay: 0 };
        byBarber[a.staff_id].ciro += estimatedAppointmentRevenueCents(a);
        byBarber[a.staff_id].pay += a.completed_commission_cents ?? 0;
      }
      setStaffRows(
        staffList
          .filter(b => byBarber[b.id])
          .map(b => ({ id: b.id, name: b.name, ciro: byBarber[b.id]?.ciro ?? 0, pay: byBarber[b.id]?.pay ?? 0 }))
          .sort((a, b) => b.ciro - a.ciro),
      );
    }

    const fromDate = since.toISOString().split('T')[0]!;
    const toDate = until.toISOString().split('T')[0]!;
    const { data: commData, error: commErr } = await supabase.rpc('get_commission_report', {
      p_shop_id: shopId,
      p_from: fromDate,
      p_to: toDate,
    });
    if (ctrl.signal.aborted) return;
    if (!commErr && commData?.staff) setCommRows(commData.staff as CommissionStaffRow[]);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const maxCiro = Math.max(...staffRows.map(r => r.ciro), 1);
  const totalCiroStr = totalCiro === 0 ? '—' : formatCents(totalCiro);
  const dukkanStr = dukkanPay === 0 ? '—' : formatCents(dukkanPay);
  const ustaStr = ustaPay === 0 ? '—' : formatCents(ustaPay);

  // Use commRows if available, fallback to staffRows
  const displayRows: { id: string; name: string; ciro: number; pay: number }[] =
    commRows.length > 0
      ? commRows.map(r => ({ id: r.staff_id, name: r.staff_name, ciro: r.gross_revenue_cents, pay: r.commission_cents }))
      : staffRows;

  return (
    <View style={styles.screenWrap}>
      <Pressable
        accessibilityLabel="Ayarlar ve Profil"
        onPress={() => router.push('/settings' as never)}
        style={[styles.profileFab, { top: insets.top + 16 }]}
      >
        <Text style={styles.profileFabText}>EK</Text>
      </Pressable>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={v2Colors.spruce} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.overline}>Komisyon</Text>
          <Text style={styles.title}>Kazanç</Text>
        </View>
        <Text style={styles.dateText}>{monthLabel()}</Text>
      </View>
      {/* Hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Bu Ay · Toplam Ciro</Text>
        <Text style={styles.heroAmount}>
          <Text style={styles.heroSign}>₺</Text>
          {totalCiroStr}
        </Text>
        <View style={styles.heroSubRow}>
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>Dükkan Payı</Text>
            <Text style={styles.heroSubValBrass}>{dukkanStr}</Text>
          </View>
          <View style={styles.heroSubDivider} />
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>Usta Payı</Text>
            <Text style={styles.heroSubValWhite}>{ustaStr}</Text>
          </View>
          <View style={styles.heroSubDivider} />
          <View style={styles.heroSubCol}>
            <Text style={styles.heroSubLabel}>Randevu</Text>
            <Text style={styles.heroSubValWhite}>{randevuCount}</Text>
          </View>
        </View>
      </View>

      {/* Staff payouts */}
      {displayRows.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Usta Payları</Text>
          <View style={styles.staffCard}>
            {displayRows.map((row, i) => (
              <View key={row.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.staffRow}>
                  <Text style={styles.staffName}>{row.name}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.round((row.ciro / maxCiro) * 100)}%` }]} />
                  </View>
                  <Text style={styles.staffAmount}>
                    {row.ciro === 0 ? '—' : `₺${formatCents(row.ciro)}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {displayRows.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Bu ay henüz veri yok</Text>
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    backgroundColor: v2Colors.paper,
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  profileFab: {
    alignItems: 'center',
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 20,
    borderWidth: 1.5,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    width: 40,
    zIndex: 30,
  },
  profileFabText: {
    backgroundColor: v2Colors.spruce,
    borderRadius: 17,
    color: v2Colors.paper,
    fontFamily: v2Fonts.mono,
    fontSize: 13,
    height: 34,
    lineHeight: 34,
    textAlign: 'center',
    width: 34,
  },
  content: {
    paddingBottom: 120,
  },
  headerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: v2Spacing[22],
  },
  overline: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  title: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 36,
    includeFontPadding: false,
    lineHeight: 38,
    marginTop: 6,
  },
  dateText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.mono,
    fontSize: 11,
    marginBottom: 7,
    textTransform: 'capitalize',
  },

  /* Hero card */
  heroCard: {
    backgroundColor: v2Colors.spruce,
    borderRadius: v2Radii.card,
    marginHorizontal: v2Spacing[16],
    marginTop: v2Spacing[8],
    padding: v2Spacing[20],
  },
  heroLabel: {
    color: 'rgba(251,248,241,0.65)',
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroAmount: {
    color: v2Colors.brass,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 48,
    includeFontPadding: false,
    lineHeight: 52,
    marginTop: 8,
  },
  heroSign: {
    fontSize: 28,
    lineHeight: 48,
  },
  heroSubRow: {
    borderTopColor: 'rgba(251,248,241,0.15)',
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: v2Spacing[16],
    paddingTop: v2Spacing[16],
  },
  heroSubCol: {
    flex: 1,
  },
  heroSubDivider: {
    backgroundColor: 'rgba(251,248,241,0.15)',
    marginHorizontal: v2Spacing[12],
    width: 1,
  },
  heroSubLabel: {
    color: 'rgba(251,248,241,0.55)',
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroSubValBrass: {
    color: v2Colors.brass,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },
  heroSubValWhite: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
    marginTop: 4,
  },

  /* Staff section */
  sectionTitle: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginHorizontal: v2Spacing[16],
    marginTop: v2Spacing[24],
    marginBottom: v2Spacing[10],
    textTransform: 'uppercase',
  },
  staffCard: {
    backgroundColor: v2Colors.card,
    borderRadius: v2Radii.card,
    marginHorizontal: v2Spacing[16],
    overflow: 'hidden',
  },
  staffRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: v2Spacing[12],
    paddingHorizontal: v2Spacing[16],
    paddingVertical: v2Spacing[14],
  },
  staffName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 14,
    width: 110,
  },
  barTrack: {
    backgroundColor: v2Colors.line,
    borderRadius: v2Radii.pill,
    flex: 1,
    height: 6,
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: v2Colors.brass,
    borderRadius: v2Radii.pill,
    height: 6,
  },
  staffAmount: {
    color: v2Colors.brass,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
    minWidth: 60,
    textAlign: 'right',
  },
  divider: {
    backgroundColor: v2Colors.line,
    height: 1,
    marginLeft: v2Spacing[16],
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: v2Spacing[40],
  },
  emptyText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 14,
  },
});
