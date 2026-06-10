/**
 * M9 — Staff: Randevular screen
 * Source: screens.jsx → RandevularScreen
 *
 * DS bileşenleri kullanılır (OverlineHeader, DayPicker, AppointmentCard,
 * BlokCard, SectionLabel, Button) — owner ajandasıyla tek doğruluk kaynağı.
 *
 * Layout:
 *   OverlineHeader eyebrow="Berber" title="Randevular" meta="10 Haziran 2026, Çar"
 *   DayPicker (bugünden ileriye 7 gün)
 *   ScrollView (pull-to-refresh): SectionLabel "Tamamlandı" / "Şu Anda" / "Gelecek"
 *     + AppointmentCard / BlokCard listesi
 *   FAB: Button variant="accent" size="lg" "+ Yeni Randevu"
 *
 * Empty state (screen-27 EmptyRandevular):
 *   icon CalendarEmpty (brand-600), title "{tarih} randevu yok"
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { colors } from '../../lib/theme';
import { OverlineHeader } from '../../components/ds/OverlineHeader';
import { DayPicker } from '../../components/ds/DayPicker';
import { AppointmentCard } from '../../components/ds/AppointmentCard';
import { BlokCard } from '../../components/ds/BlokCard';
import { SectionLabel } from '../../components/ds/SectionLabel';
import { Button } from '../../components/ds/Button';
import { AppointmentDetailSheet } from '../../components/AppointmentDetailSheet';
import { AddAppointmentModal, ServiceOption } from '../../components/AddAppointmentModal';
import { supabase } from '../../lib/supabase';
import { createDebounce } from '../../lib/debounce';
import { formatTime, translateReason, formatAgendaMetaDate, formatDayMonth } from '../../lib/utils';
import { appointmentRowToAgendaItem } from '../../lib/appointment-mappers';
import { buildLocalAppointmentTimestamp } from '../../lib/appointment-time';
import type { AppointmentWorkingHours } from '../../lib/appointment-time';
import { parseBookingFunctionError } from '../../lib/booking-errors';

type ApptState = 'upcoming' | 'active' | 'done';

type ListItem =
  | { kind: 'section'; label: string; topMargin?: number }
  | { kind: 'appt'; id: string; time: string; endTime: string; duration: number; name: string; service: string; notes?: string | null; state?: ApptState; isDetail?: boolean }
  | { kind: 'blok'; id: string; time: string; endTime: string; duration: number; label: string };

/* ── CalendarEmpty SVG ──────────────────────────────────────────────
 * Source: screen-27-empty-states.html CalendarEmpty (color = brand-600)
 */
function CalendarEmptyIcon() {
  return (
    <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
      <Rect x="3" y="6" width="26" height="22" rx="4" stroke={colors.brand[600]} strokeWidth="1.8" />
      <Path d="M3 13h26" stroke={colors.brand[600]} strokeWidth="1.6" />
      <Path d="M11 4v4M21 4v4" stroke={colors.brand[600]} strokeWidth="1.8" strokeLinecap="round" />
      <Circle cx="11" cy="20" r="1.5" fill={colors.brand[600]} opacity={0.4} />
      <Circle cx="16" cy="20" r="1.5" fill={colors.brand[600]} opacity={0.4} />
      <Circle cx="21" cy="20" r="1.5" fill={colors.brand[600]} opacity={0.4} />
    </Svg>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────
 * Source: screen-27-empty-states.html EmptyRandevular → EmptyState
 */
function EmptyState({ onCta, dateLabel }: { onCta?: () => void; dateLabel?: string }) {
  const label = dateLabel ?? 'Bugün';
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBox}>
        <CalendarEmptyIcon />
      </View>
      <Text style={styles.emptyTitle}>{label} randevu yok</Text>
      <Text style={styles.emptyBody}>
        {label} için randevu bulunmuyor. Yeni randevu ekleyebilirsiniz.
      </Text>
      {onCta && (
        <Button variant="accent" size="md" onPress={onCta}>
          Yeni Randevu
        </Button>
      )}
    </View>
  );
}

/* ── ErrorState — yüklenemedi + tekrar dene ─────────────────────── */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <Text style={styles.emptyTitle}>Randevular yüklenemedi</Text>
      <Text style={styles.emptyBody}>
        Bağlantını kontrol edip tekrar deneyebilirsin.
      </Text>
      <Button variant="secondary" size="md" onPress={onRetry}>
        Tekrar Dene
      </Button>
    </View>
  );
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── SCREEN ──────────────────────────────────────────────────────── */
export default function RandevularScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(getToday);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<import('../../components/AppointmentDetailSheet').AppointmentDetail | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffShopId, setStaffShopId] = useState<string | null>(null);
  const [staffShopSlug, setStaffShopSlug] = useState<string | null>(null);
  const [workingHours, setWorkingHours] = useState<AppointmentWorkingHours | null>(null);
  const [serverNowMs, setServerNowMs] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<ListItem[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const isEmpty = !loading && !loadError && items.length === 0;

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!isMounted || !user) { setLoading(false); return; }
      supabase.from('staff').select('id, shop_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
        .then(({ data }) => {
          if (!isMounted || !data) { setLoading(false); return; }
          setStaffId((data as any).id);
          setStaffShopId((data as any).shop_id);
          supabase.from('shops').select('slug, working_hours').eq('id', (data as any).shop_id).maybeSingle()
            .then(({ data: shopData }) => {
              if (!isMounted || !shopData) return;
              setStaffShopSlug((shopData as any).slug);
              setWorkingHours(((shopData as any).working_hours as AppointmentWorkingHours | null) ?? null);
            });
          supabase.from('services').select('id, name, duration_min, price_cents').eq('shop_id', (data as any).shop_id).eq('is_active', true)
            .then(({ data: svcs }) => {
              if (!isMounted) return;
              if (svcs) setServices((svcs as any[]).map(s => ({ id: s.id, label: s.name, dur: s.duration_min, price: `${Math.round(s.price_cents / 100)}₺`, priceValue: Math.round(s.price_cents / 100) })));
            });
        });
    });
    return () => { isMounted = false; };
  }, []);

  const fetchAppointments = useCallback(async () => {
    if (!staffId) return;

    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart); dayEnd.setDate(dayStart.getDate() + 1);

    const [{ data: appts, error: apptsErr }, { data: blocks, error: blocksErr }] = await Promise.all([
      supabase.from('appointments').select('id, customer_name, starts_at, ends_at, status, notes, customer_notes, services(name, duration_min), appointment_services(sequence_order, services:service_id(name))')
        .eq('staff_id', staffId).neq('status', 'cancelled')
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString()).order('starts_at'),
      supabase.from('blocks').select('id, starts_at, ends_at, reason')
        .eq('staff_id', staffId)
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString()),
    ]);

    if (!isMountedRef.current) return;

    // Hata sessizce yutulursa kullanıcı sahte "randevu yok" boş durumu görür
    if (apptsErr || blocksErr) {
      if (__DEV__) console.warn('[staff-agenda] fetch error:', apptsErr ?? blocksErr);
      setLoadError(true);
      setLoading(false);
      return;
    }
    setLoadError(false);

    const now = new Date();
    const done: ListItem[] = [];
    const active: ListItem[] = [];
    const upcoming: (ListItem & { _startMs: number })[] = [];

    for (const a of ((appts ?? []) as any[])) {
      const mapped = appointmentRowToAgendaItem(a, now);
      const item: ListItem = { kind: 'appt', id: mapped.id, time: mapped.time, endTime: mapped.endTime, duration: mapped.dur, name: mapped.name, service: mapped.svc, notes: mapped.notes, state: mapped.state, isDetail: mapped.state !== 'done' };
      if (mapped.state === 'done') done.push(item);
      else if (mapped.state === 'active') active.push(item);
      else upcoming.push({ ...item, _startMs: new Date(a.starts_at).getTime() } as any);
    }

    for (const b of ((blocks ?? []) as any[])) {
      const start = new Date(b.starts_at);
      const end = new Date(b.ends_at);
      const dur = Math.round((end.getTime() - start.getTime()) / 60000);
      const label = translateReason(b.reason);
      upcoming.push({ kind: 'blok', id: b.id, time: formatTime(start), endTime: formatTime(end), duration: dur, label: `BLOKE · ${label}`, _startMs: start.getTime() } as any);
    }

    upcoming.sort((a, b) => (a as any)._startMs - (b as any)._startMs);

    const result: ListItem[] = [];
    if (done.length) { result.push({ kind: 'section', label: 'Tamamlandı', topMargin: 0 }); result.push(...done); }
    if (active.length) { result.push({ kind: 'section', label: 'Şu Anda', topMargin: 12 }); result.push(...active); }
    if (upcoming.length) {
      result.push({ kind: 'section', label: 'Gelecek', topMargin: 12 });
      result.push(...upcoming.map(({ _startMs, ...i }: any) => i));
    }

    setItems(result);
    setLoading(false);
  }, [staffId, selectedDate]);

  useEffect(() => {
    if (!staffId) return;
    fetchAppointments();
  }, [staffId, selectedDate, fetchAppointments]);

  useFocusEffect(
    useCallback(() => {
      if (staffId) fetchAppointments();
    }, [staffId, fetchAppointments]),
  );

  useEffect(() => {
    if (!staffId) return;

    const debounced = createDebounce(fetchAppointments, 200);
    const apptCh = supabase
      .channel(`staff-appt-${staffId}`)
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'appointments', filter: `staff_id=eq.${staffId}` },
        debounced,
      )
      .subscribe();

    const blockCh = supabase
      .channel(`staff-block-${staffId}`)
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'blocks', filter: `staff_id=eq.${staffId}` },
        debounced,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(apptCh);
      supabase.removeChannel(blockCh);
    };
  }, [staffId, fetchAppointments]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    if (isMountedRef.current) setRefreshing(false);
  }, [fetchAppointments]);

  function handleAddAppointment() {
    // Sunucu zamanını çek — cihaz saati manipülasyonuna karşı koruma
    supabase.rpc('get_server_time').then(({ data }) => {
      if (data && isMountedRef.current) setServerNowMs(new Date(data as string).getTime());
    });
    setShowAdd(true);
  }

  async function openDetail(item: ListItem & { kind: 'appt' }) {
    const { data } = await supabase
      .from('appointments')
      .select('customer_phone')
      .eq('id', item.id)
      .maybeSingle();
    setSelectedAppt({
      id: item.id,
      time: item.time,
      duration: item.duration,
      customerName: item.name,
      customerPhone: (data as any)?.customer_phone ?? null,
      serviceName: item.service,
      notes: item.notes,
    });
    setShowDetail(true);
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <OverlineHeader eyebrow="Berber" title="Randevular" meta={formatAgendaMetaDate(selectedDate)} />

      {/* DayPicker */}
      <DayPicker
        selected={selectedDate}
        onSelect={d => {
          setLoading(true);
          setSelectedDate(d);
        }}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.brand[600]} />
        </View>
      ) : loadError ? (
        <ErrorState onRetry={() => { setLoading(true); fetchAppointments(); }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, isEmpty && styles.scrollContentEmpty]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {isEmpty ? (
            <EmptyState
              onCta={handleAddAppointment}
              dateLabel={formatDayMonth(selectedDate)}
            />
          ) : (
            items.map((item, idx) => {
              if (item.kind === 'section') {
                return (
                  <SectionLabel
                    key={`section-${item.label}-${idx}`}
                    style={{ paddingHorizontal: 0, marginTop: item.topMargin ?? 0, marginBottom: 4, color: colors.slate[500] }}
                  >
                    {item.label}
                  </SectionLabel>
                );
              }
              if (item.kind === 'blok') {
                return (
                  <BlokCard
                    key={item.id}
                    time={item.time}
                    endTime={item.endTime}
                    duration={item.duration}
                    label={item.label}
                  />
                );
              }
              return (
                <AppointmentCard
                  key={item.id}
                  time={item.time}
                  endTime={item.endTime}
                  duration={item.duration}
                  name={item.name}
                  service={item.service}
                  notes={item.notes}
                  state={item.state}
                  onPress={item.isDetail ? () => openDetail(item) : undefined}
                />
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <View style={styles.fab}>
        <Button variant="accent" size="lg" onPress={handleAddAppointment}>
          + Yeni Randevu
        </Button>
      </View>

      {/* Appointment detail sheet */}
      <AppointmentDetailSheet
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelectedAppt(null); }}
        appointment={selectedAppt}
        onEdit={() => {}}
        showEdit={false}
        onCancel={() => fetchAppointments()}
        onComplete={() => fetchAppointments()}
      />

      {/* Add appointment modal */}
      <AddAppointmentModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        services={services}
        workingHours={workingHours}
        serverNowMs={serverNowMs}
        shopId={staffShopId}
        onSave={async (data) => {
          if (!staffShopSlug || !staffId) {
            Alert.alert('Hata', 'Oturum bilgisi eksik.');
            return;
          }
          const { error } = await supabase.functions.invoke('app-book-appointment', {
            body: {
              shop_slug: staffShopSlug,
              service_id: data.serviceIds[0],
              service_ids: data.serviceIds,
              staff_id: data.staffId ?? staffId,
              starts_at: buildLocalAppointmentTimestamp(data.date, data.time),
              customer_name: data.customerName,
              customer_phone: data.customerPhone || null,
              ...(data.notes ? { notes: data.notes } : {}),
            },
          });
          if (error) {
            Alert.alert('Hata', await parseBookingFunctionError(error));
            return;
          }
          setShowAdd(false);
          fetchAppointments();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate[50],
    position: 'relative',
  },

  scroll: { flex: 1 },
  /* ScrollView content: padding '20px 20px 100px', gap 10 */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    gap: 10,
  },
  /* Boş durumda da pull-to-refresh çalışsın diye liste yerine flexGrow */
  scrollContentEmpty: {
    flexGrow: 1,
    paddingBottom: 0,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* EmptyState (screen-27 EmptyRandevular) */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.brand[100],
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 17,
    letterSpacing: 17 * -0.01,
    color: colors.ink[900],
    lineHeight: 20.4,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    color: colors.slate[500],
    lineHeight: 20.15,
    textAlign: 'center',
    marginBottom: 24,
  },

  /* FAB — owner ajandasıyla aynı gölge/pozisyon */
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 10,
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
});
