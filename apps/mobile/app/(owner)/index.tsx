import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronRight, TrendingUp } from 'lucide-react-native';
import { estimatedAppointmentRevenueCents } from '../../lib/revenue-mappers';
import { useShop } from '../../lib/ShopContext';
import { supabase } from '../../lib/supabase';
import { v2Colors, v2Fonts, v2Radii, v2Spacing } from '../../lib/v2-tokens';

interface Insight {
  name: string;
  value: string;
}

const DESIGN_WIDTH = 354;
const OWNER_SCALE = Dimensions.get('window').width / DESIGN_WIDTH;
const dp = (value: number) => Math.round(value * OWNER_SCALE * 100) / 100;
const H_PAD = dp(22);

const CLAUDE_STAFF = [
  { id: 'all', name: 'Tüm Ekip' },
  { id: 'emre', name: 'Emre' },
  { id: 'soner', name: 'Soner' },
  { id: 'murat', name: 'Murat' },
  { id: 'tuna', name: 'Tuna' },
];

const CLAUDE_INITIALS: Record<string, string> = {
  emre: 'EK',
  soner: 'SA',
  murat: 'MD',
  tuna: 'TE',
};


function formatDate(date: Date): string {
  const dayMonth = date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  const weekday = date.toLocaleDateString('tr-TR', { weekday: 'short' });
  return `${dayMonth} · ${weekday}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function KpiHero({
  total,
  completed,
}: {
  total: string;
  completed: string;
}) {
  const waiting = Math.max(0, Number(total) - Number(completed));

  return (
    <View style={styles.heroCard}>
      <ChevronRight
        color="rgba(255,255,255,0.14)"
        size={dp(190)}
        strokeWidth={dp(6)}
        style={styles.heroWatermark}
      />
      <View style={styles.heroTop}>
        <Text style={styles.heroOverline}>Bugünkü Randevu</Text>
      </View>
      <View style={styles.heroTrend}>
        <TrendingUp color="#9FD9BE" size={dp(13)} strokeWidth={dp(2.2)} />
        <Text style={styles.heroTrendText}>+12%</Text>
      </View>
      <Text style={styles.heroNumber}>{total}</Text>
      <Text style={styles.heroSub}>{completed} tamamlandı · {waiting} sırada</Text>
    </View>
  );
}

function SmallKpi({
  label,
  value,
  sub,
  revenue,
}: {
  label: string;
  value: string;
  sub: string;
  revenue?: boolean;
}) {
  return (
    <View style={styles.smallKpi}>
      <Text style={styles.smallKpiLabel}>{label}</Text>
      {revenue ? (
        <Text style={[styles.smallKpiValue, styles.revenueValue]}>
          <Text style={styles.revenueCurrency}>{value.slice(0, 1)}</Text>
          {value.slice(1)}
        </Text>
      ) : (
        <Text style={styles.smallKpiValue}>{value}</Text>
      )}
      <Text style={styles.smallKpiSub}>{sub}</Text>
    </View>
  );
}

export default function OzetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ visual?: string }>();
  const useClaudeFixture =
    __DEV__ && (params.visual === 'claude' || process.env.EXPO_PUBLIC_VISUAL_FIXTURE === 'claude');
  const { shopId, staffList: contextStaff } = useShop();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [kpiTotal, setKpiTotal] = useState('0');
  const [kpiCompleted, setKpiCompleted] = useState('0');
  const [kpiRevenue, setKpiRevenue] = useState('—');
  const [topService, setTopService] = useState<Insight | null>(null);
  const [busiestDay, setBusiestDay] = useState<Insight | null>(null);

  const staffList = useClaudeFixture ? CLAUDE_STAFF : [{ id: 'all', name: 'Tüm Ekip' }, ...contextStaff];
  const displayTotal = useClaudeFixture ? '24' : kpiTotal;
  const displayCompleted = useClaudeFixture ? '16' : kpiCompleted;
  const displayRevenue = useClaudeFixture ? '₺4.250' : kpiRevenue;
  const displayTopService = useClaudeFixture ? { name: 'Saç + Sakal', value: '%34' } : topService;
  const displayBusiestDay = useClaudeFixture ? { name: 'Cumartesi', value: '32 rdv' } : busiestDay;
  const displayDate = useClaudeFixture ? '20 May · Çar' : formatDate(new Date());

  useEffect(() => {
    if (useClaudeFixture) return;
    if (shopId && contextStaff.length) loadSummary();
  }, [filter, shopId, contextStaff, useClaudeFixture]);

  async function loadSummary() {
    if (!shopId || contextStaff.length === 0) return;

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const filteredIds = filter === 'all' ? contextStaff.map((staff) => staff.id) : [filter];
    const { data: appts, error: apptsErr } = await supabase.rpc('get_shop_appointments_revenue', {
      p_shop_id: shopId,
      p_from: dayStart.toISOString(),
      p_to: dayEnd.toISOString(),
      p_staff_ids: filteredIds,
    });

    if (apptsErr) {
      console.warn('[owner-summary] appointments query error:', apptsErr);
      return;
    }

    const dailyRows = (appts ?? []) as any[];
    const completed = dailyRows.filter((row) => row.status === 'completed').length;
    const revenue = dailyRows.reduce((sum, row) => sum + estimatedAppointmentRevenueCents(row), 0);
    setKpiTotal(String(dailyRows.length));
    setKpiCompleted(String(completed));
    setKpiRevenue(revenue === 0 ? '—' : `₺${(revenue / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`);

    const monthStart = new Date();
    monthStart.setDate(monthStart.getDate() - 29);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(dayEnd);
    const allIds = contextStaff.map((staff) => staff.id);
    const { data: monthly } = await supabase.rpc('get_shop_appointments_revenue', {
      p_shop_id: shopId,
      p_from: monthStart.toISOString(),
      p_to: monthEnd.toISOString(),
      p_staff_ids: allIds,
    });

    const rows = (monthly ?? []) as any[];
    if (rows.length === 0) {
      setTopService(null);
      setBusiestDay(null);
      return;
    }

    const serviceCount = new Map<string, number>();
    const staffCount = new Map<string, number>();
    const dayCount = new Array(7).fill(0);
    for (const row of rows) {
      const serviceName = row.service_name ?? 'Bilinmiyor';
      serviceCount.set(serviceName, (serviceCount.get(serviceName) ?? 0) + 1);
      staffCount.set(row.staff_id, (staffCount.get(row.staff_id) ?? 0) + 1);
      dayCount[new Date(row.starts_at ?? row.created_at).getDay()] += 1;
    }

    let topName = '—';
    let topCount = 0;
    serviceCount.forEach((count, name) => {
      if (count > topCount) {
        topName = name;
        topCount = count;
      }
    });
    setTopService({ name: topName, value: `%${Math.round((topCount / rows.length) * 100)}` });

    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const busiestIndex = dayCount.indexOf(Math.max(...dayCount));
    setBusiestDay({ name: dayNames[busiestIndex], value: `${dayCount[busiestIndex]} rdv` });

  }

  async function onRefresh() {
    setRefreshing(true);
    await loadSummary();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityLabel="Ayarlar ve Profil"
        onPress={() => router.push('/settings' as never)}
        style={styles.profileFab}
      >
        <Text style={styles.profileFabText}>EK</Text>
      </Pressable>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.overline}>Dükkan Özet</Text>
            <Text style={styles.title}>Bugün</Text>
          </View>
          <Text style={styles.dateText}>{displayDate}</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {staffList.map((staff) => {
            const selected = filter === staff.id;
            return (
              <Pressable
                key={staff.id}
                onPress={() => setFilter(staff.id)}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                {staff.id !== 'all' ? (
                  <View style={[styles.chipAvatar, selected && styles.chipAvatarSelected]}>
                    <Text style={[styles.chipAvatarText, selected && styles.chipTextSelected]}>
                      {useClaudeFixture ? CLAUDE_INITIALS[staff.id] : initials(staff.name)}
                    </Text>
                  </View>
                ) : null}
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{staff.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <KpiHero total={displayTotal} completed={displayCompleted} />

        <View style={styles.smallKpiRow}>
          <SmallKpi label="Tamamlanan" value={displayCompleted} sub={`/ ${displayTotal} randevu`} />
          <SmallKpi label="Tahmini Gelir" value={displayRevenue} sub="bugün" revenue />
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <Text style={styles.sectionTitle}>Öngörüler</Text>
            <Text style={styles.sectionMeta}>son 30 gün</Text>
          </View>
          <View style={styles.insightRow}>
            <View>
              <Text style={styles.insightLabel}>En Çok Tercih Edilen</Text>
              <Text style={styles.insightValue}>{displayTopService?.name ?? '—'}</Text>
            </View>
            <Text style={styles.insightRight}>{displayTopService?.value ?? '—'}</Text>
          </View>
          <View style={styles.insightRow}>
            <View>
              <Text style={styles.insightLabel}>En Yoğun Gün</Text>
              <Text style={styles.insightValue}>{displayBusiestDay?.name ?? '—'}</Text>
            </View>
            <Text style={styles.insightRight}>{displayBusiestDay?.value ?? '—'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: v2Colors.paper,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: dp(14),
    paddingBottom: dp(120),
  },
  profileFab: {
    alignItems: 'center',
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: dp(20),
    borderWidth: dp(1.5),
    height: dp(40),
    justifyContent: 'center',
    position: 'absolute',
    right: dp(18),
    top: dp(16),
    width: dp(40),
    zIndex: 30,
  },
  profileFabText: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: dp(17),
    color: v2Colors.paper,
    fontFamily: v2Fonts.mono,
    fontSize: 13,
    height: dp(34),
    lineHeight: dp(34),
    textAlign: 'center',
    width: dp(34),
  },
  headerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: dp(15),
    paddingLeft: H_PAD,
    paddingRight: dp(66),
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
    fontSize: 38,
    includeFontPadding: false,
    lineHeight: 38,
    marginTop: dp(8),
  },
  dateText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.mono,
    fontSize: 13,
    marginBottom: dp(7),
  },
  chipRow: {
    gap: dp(8),
    paddingBottom: dp(4),
    paddingHorizontal: H_PAD,
    paddingTop: dp(14),
  },
  chip: {
    alignItems: 'center',
    borderColor: v2Colors.line2,
    borderRadius: v2Radii.pill,
    borderWidth: dp(1),
    flexDirection: 'row',
    gap: dp(7),
    height: dp(34),
    paddingHorizontal: dp(15),
  },
  chipSelected: {
    backgroundColor: v2Colors.ink,
    borderColor: v2Colors.ink,
    minWidth: dp(86),
  },
  chipAvatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruceSoft,
    borderRadius: dp(9),
    height: dp(18),
    justifyContent: 'center',
    width: dp(18),
  },
  chipAvatarSelected: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipAvatarText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 9,
  },
  chipText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 13,
  },
  chipTextSelected: {
    color: v2Colors.paper,
  },
  heroCard: {
    backgroundColor: v2Colors.spruce,
    borderRadius: dp(20),
    marginHorizontal: H_PAD,
    marginTop: dp(16),
    minHeight: dp(153),
    overflow: 'hidden',
    paddingBottom: dp(20),
    paddingHorizontal: dp(22),
    paddingTop: dp(22),
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: dp(20),
  },
  heroWatermark: {
    bottom: dp(-46),
    position: 'absolute',
    right: dp(-20),
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroOverline: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  heroTrend: {
    alignItems: 'center',
    color: '#9FD9BE',
    flexDirection: 'row',
    fontFamily: v2Fonts.mono,
    fontSize: 12,
    gap: dp(4),
    position: 'absolute',
    right: dp(22),
    top: dp(22),
  },
  heroTrendText: {
    color: '#9FD9BE',
    fontFamily: v2Fonts.mono,
    fontSize: 12,
  },
  heroNumber: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.mono,
    fontSize: 62,
    includeFontPadding: false,
    lineHeight: 62,
    marginTop: dp(10),
  },
  heroSub: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 13.5,
    marginTop: dp(6),
  },
  smallKpiRow: {
    flexDirection: 'row',
    gap: dp(12),
    paddingHorizontal: H_PAD,
    paddingTop: dp(12),
  },
  smallKpi: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: dp(16),
    borderWidth: dp(1),
    flex: 1,
    minHeight: dp(116),
    padding: dp(16),
  },
  smallKpiLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  smallKpiValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.mono,
    fontSize: 32,
    marginTop: dp(8),
  },
  revenueValue: {
    color: v2Colors.brass,
  },
  revenueCurrency: {
    color: v2Colors.ink3,
    fontSize: 18,
  },
  smallKpiSub: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 12,
    marginTop: dp(2),
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: v2Spacing[22],
    marginTop: v2Spacing[52],
  },
  sectionTitle: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
  },
  sectionMeta: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 11,
  },
  insightCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: dp(18),
    borderWidth: dp(1),
    marginHorizontal: H_PAD,
    marginTop: dp(14),
    overflow: 'hidden',
    padding: dp(20),
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: dp(4),
  },
  insightRow: {
    alignItems: 'center',
    borderTopColor: v2Colors.line,
    borderTopWidth: dp(1),
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: dp(15),
  },
  insightLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  insightValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 21,
    marginTop: dp(3),
  },
  insightRight: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.mono,
    fontSize: 22,
  },
  staffCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: v2Radii.card,
    borderWidth: 1,
    marginHorizontal: v2Spacing[22],
    marginTop: 10,
    overflow: 'hidden',
  },
  staffRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  staffAvatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderColor: v2Colors.line,
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  staffAvatarPrimary: {
    backgroundColor: v2Colors.spruce,
    borderColor: v2Colors.spruce,
  },
  staffAvatarText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
  },
  staffAvatarTextPrimary: {
    color: v2Colors.paper,
  },
  staffCopy: {
    flex: 1,
  },
  staffName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },
  staffSub: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 11,
    marginTop: 3,
  },
  staffScore: {
    alignItems: 'flex-end',
    gap: 7,
    width: 82,
  },
  staffBarTrack: {
    backgroundColor: v2Colors.line,
    borderRadius: 3,
    height: 5,
    overflow: 'hidden',
    width: 72,
  },
  staffBarFill: {
    backgroundColor: v2Colors.spruce,
    borderRadius: 3,
    height: '100%',
  },
  staffCount: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.mono,
    fontSize: 12,
  },
  emptyText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    padding: 18,
    textAlign: 'center',
  },
});
