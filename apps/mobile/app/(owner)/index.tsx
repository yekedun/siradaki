import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { estimatedAppointmentRevenueCents } from '../../lib/revenue-mappers';
import { useShop } from '../../lib/ShopContext';
import { supabase } from '../../lib/supabase';
import { v2Colors, v2Fonts, v2Radii, v2Spacing } from '../../lib/v2-tokens';

interface Insight {
  name: string;
  value: string;
}


function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
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
  return (
    <View style={styles.heroCard}>
      <ChevronRight
        color="rgba(255,255,255,0.14)"
        size={168}
        strokeWidth={7}
        style={styles.heroWatermark}
      />
      <View style={styles.heroTop}>
        <Text style={styles.heroOverline}>Bugünkü Randevu</Text>
        <Text style={styles.heroTrend}>+12%</Text>
      </View>
      <Text style={styles.heroNumber}>{total}</Text>
      <Text style={styles.heroSub}>{completed} tamamlandı · {total} sırada</Text>
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
      <Text style={[styles.smallKpiValue, revenue && styles.revenueValue]}>{value}</Text>
      <Text style={styles.smallKpiSub}>{sub}</Text>
    </View>
  );
}

export default function OzetScreen() {
  const insets = useSafeAreaInsets();
  const { shopId, staffList: contextStaff } = useShop();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [kpiTotal, setKpiTotal] = useState('0');
  const [kpiCompleted, setKpiCompleted] = useState('0');
  const [kpiRevenue, setKpiRevenue] = useState('—');
  const [topService, setTopService] = useState<Insight | null>(null);
  const [busiestDay, setBusiestDay] = useState<Insight | null>(null);

  const staffList = [{ id: 'all', name: 'Tüm Ekip' }, ...contextStaff];

  useEffect(() => {
    if (shopId && contextStaff.length) loadSummary();
  }, [filter, shopId, contextStaff]);

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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.overline}>Dükkan Özet</Text>
          <Text style={styles.title}>Bugün</Text>
        </View>
        <Text style={styles.dateText}>{formatDate(new Date())}</Text>
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
                    {initials(staff.name)}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{staff.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <KpiHero total={kpiTotal} completed={kpiCompleted} />

      <View style={styles.smallKpiRow}>
        <SmallKpi label="Tamamlanan" value={kpiCompleted} sub={`/ ${kpiTotal} randevu`} />
        <SmallKpi label="Tahmini Gelir" value={kpiRevenue} sub="bugün" revenue />
      </View>

      <View style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <Text style={styles.sectionTitle}>Öngörüler</Text>
          <Text style={styles.sectionMeta}>son 30 gün</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.insightRow}>
          <View>
            <Text style={styles.insightLabel}>En Çok Tercih Edilen</Text>
            <Text style={styles.insightValue}>{topService?.name ?? '—'}</Text>
          </View>
          <Text style={styles.insightRight}>{topService?.value ?? '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.insightRow}>
          <View>
            <Text style={styles.insightLabel}>En Yoğun Gün</Text>
            <Text style={styles.insightValue}>{busiestDay?.name ?? '—'}</Text>
          </View>
          <Text style={styles.insightRight}>{busiestDay?.value ?? '—'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: v2Colors.paper,
    flex: 1,
  },
  content: {
    paddingBottom: 124,
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
  },
  chipRow: {
    gap: 8,
    paddingHorizontal: v2Spacing[22],
    paddingTop: v2Spacing[14],
  },
  chip: {
    alignItems: 'center',
    borderColor: v2Colors.line2,
    borderRadius: v2Radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 7,
    height: 32,
    paddingHorizontal: 13,
  },
  chipSelected: {
    backgroundColor: v2Colors.ink,
    borderColor: v2Colors.ink,
  },
  chipAvatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruceSoft,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  chipAvatarSelected: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  chipAvatarText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 8,
  },
  chipText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 12.5,
  },
  chipTextSelected: {
    color: v2Colors.paper,
  },
  heroCard: {
    backgroundColor: v2Colors.spruce,
    borderRadius: v2Radii.xl,
    marginHorizontal: v2Spacing[22],
    marginTop: v2Spacing[18],
    minHeight: 134,
    overflow: 'hidden',
    paddingHorizontal: v2Spacing[20],
    paddingVertical: v2Spacing[18],
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  heroWatermark: {
    bottom: -24,
    position: 'absolute',
    right: -20,
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
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  heroTrend: {
    color: '#9FD9BE',
    fontFamily: v2Fonts.mono,
    fontSize: 11,
  },
  heroNumber: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.mono,
    fontSize: 58,
    includeFontPadding: false,
    lineHeight: 64,
    marginTop: 8,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 13,
  },
  smallKpiRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: v2Spacing[22],
    paddingTop: 12,
  },
  smallKpi: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: v2Radii.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 90,
    padding: 14,
  },
  smallKpiLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  smallKpiValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.mono,
    fontSize: 30,
    marginTop: 8,
  },
  revenueValue: {
    color: v2Colors.brass,
  },
  smallKpiSub: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 11,
    marginTop: 3,
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
    fontSize: 10,
  },
  insightCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: v2Radii.card,
    borderWidth: 1,
    marginHorizontal: v2Spacing[22],
    marginTop: v2Spacing[16],
    overflow: 'hidden',
  },
  insightHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  insightRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  insightLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  insightValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 20,
    marginTop: 5,
  },
  insightRight: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.mono,
    fontSize: 18,
  },
  divider: {
    backgroundColor: v2Colors.line,
    height: 1,
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
