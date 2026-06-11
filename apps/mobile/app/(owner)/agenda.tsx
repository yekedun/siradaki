/**
 * M4 · Ajanda Ekranı (Owner)
 * Source: screens.jsx — AjandaScreen() + screen-20-ajanda-v2.html — AjandaDrag()
 *
 * OverlineHeader: eyebrow="Berber · Dükkan Paneli" title="Ajanda"
 * DayPicker: selected index 2 (today = 7 Mayıs 2026, Çarşamba)
 *
 * Two-column layout — flex:1 overflow:auto display:flex gap:12
 * padding:'20px 16px 90px' minWidth:0
 *
 * Column structure (source: flex:'0 0 230px'):
 *   Col header:
 *     name  — 15px bold
 *     meta  — 11px semiBold 0.12em uppercase slate-500 marginTop:4
 *             "{count} randevu[ · {blok} blok]"
 *   Items — gap:10
 *
 * Mehmet: count=5, blok=1
 *   09:00 / 30dk  Can Demir    / Saç kesim · 30dk          (done)
 *   10:30 / 45dk  Ahmet Yılmaz / Saç + Sakal · 45 dk       (upcoming)
 *   13:00 / 45dk  BLOKE · Mola                              (block)
 *   14:30 / 30dk  Kerem Arslan / Saç kesim · 30 dk         (active)
 *   16:00 / 60dk  Ozan Y.      / Saç + Sakal + Boya · 60 dk (upcoming)
 *
 * Can: count=3, blok=0
 *   11:15 / 30dk  Mehmet Kaya / Saç kesim · 30 dk   (upcoming)
 *   15:00 / 45dk  Burak Ş.    / Saç + Sakal · 45 dk (upcoming)
 *
 * Empty drop zone (per AjandaDrag source):
 *   border:'2px dashed var(--brand-600)' borderRadius:10 padding:'20px 10px'
 *   textAlign:'center' fontSize:11 fontWeight:600 color:brand-600
 *   background:'rgba(30,58,138,0.03)' text="Bırak"
 *
 * FAB — position:absolute bottom:90 right:12 (AjandaDrag uses right:12, AjandaScreen uses right:20)
 *   Button variant="accent" size="md" text="Randevu Ekle"
 *   shadow: boxShadow:'0 8px 20px -6px rgba(30,58,138,0.5)'
 *   (screens.jsx uses size="lg" right:20 shadow:'0 12px 24px -10px rgba(30,58,138,0.4)')
 *   → use size="lg" right:20 per screens.jsx (the primary reference)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { createDebounce } from '../../lib/debounce';
import { trackEvent } from '../../lib/analytics';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../lib/theme';
import { OverlineHeader } from '../../components/ds/OverlineHeader';
import { DayPicker } from '../../components/ds/DayPicker';
import { AppointmentCard } from '../../components/ds/AppointmentCard';
import { BlokCard } from '../../components/ds/BlokCard';
import { Button } from '../../components/ds/Button';
import { OwnerSettingsAvatar } from '../../components/ds/OwnerSettingsAvatar';
import { supabase } from '../../lib/supabase';
import {
  buildIstanbulAppointmentDayRange,
  buildLocalAppointmentTimestamp,
  formatLocalAppointmentDate,
} from '../../lib/appointment-time';
import type { AppointmentWorkingHours } from '../../lib/appointment-time';
import { appointmentRowToAgendaItem } from '../../lib/appointment-mappers';
import { formatTime, translateReason, formatAgendaMetaDate, AppointmentState as AppState } from '../../lib/utils';
import { parseBookingFunctionError } from '../../lib/booking-errors';
import { AddAppointmentModal } from '../../components/AddAppointmentModal';
import { AppointmentDetailSheet, AppointmentDetail } from '../../components/AppointmentDetailSheet';
import { AddBlockModal } from '../../components/AddBlockModal';
import { useShop } from '../../lib/ShopContext';
import { useRouter } from 'expo-router';
import { TourTarget, useTourAction } from '../../lib/tour/TourContext';


interface AppItem {
  type: 'appt';
  id: string;
  time: string;
  endTime: string;
  dur: number;
  name: string;
  svc: string;
  notes?: string | null;
  state: AppState;
}
interface BlokItem {
  type: 'blok';
  id: string;
  time: string;
  endTime: string;
  dur: number;
  label: string;
}
type ColItem = AppItem | BlokItem;

interface StaffCol {
  id: string;
  name: string;
  count: number;
  blok: number;
  items: ColItem[];
}

interface EditAppointmentInitialValues {
  id: string;
  customerName: string;
  customerPhone: string | null;
  serviceIds: string[];
  staffId: string | null;
  date: string;
  time: string;
  notes: string | null;
}

const INIT_COLS: StaffCol[] = [];

/* ── Column empty state ──────────────────────────────────────── */
function EmptyDropZone() {
  return (
    <View style={styles.dropZone}>
      <Text style={styles.dropZoneText}>Randevu yok</Text>
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────── */
function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AgendaScreen() {
  const router = useRouter();
  const { shopId, shopSlug, workingHours, services, staffList: barberList, reload } = useShop();
  const shopWorkingHours = workingHours as AppointmentWorkingHours | null;

  const [selectedDate, setSelectedDate] = useState<Date>(getToday);
  const [cols, setCols] = useState<StaffCol[]>(INIT_COLS);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [serverNowMs, setServerNowMs] = useState<number | undefined>(undefined);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [editingAppt, setEditingAppt] = useState<EditAppointmentInitialValues | null>(null);
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);

  useTourAction('owner-open-add-modal', () => {
    handleAddAppointment();
  });
  useTourAction('owner-close-add-modal', () => {
    setShowAdd(false);
    setEditingAppt(null);
  });

  // Refresh context (services + staff) when modal opens so newly added entries appear
  useEffect(() => {
    if (showAdd) reload();
  }, [showAdd]);

  // Cleanup: mark component as unmounted to prevent stale state updates
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const loadAgenda = useCallback(async () => {
    const barbers = barberList;
    if (!barbers.length) { setCols([]); setLoading(false); return; }

    const dayRange = buildIstanbulAppointmentDayRange(selectedDate);

    const [{ data: appts, error: apptsErr }, { data: blocks, error: blocksErr }] = await Promise.all([
      supabase.from('appointments').select('id, staff_id, customer_name, starts_at, ends_at, status, notes, customer_notes, services(name, duration_min), appointment_services(sequence_order, services:service_id(name))')
        .in('staff_id', barbers.map(b => b.id))
        .gte('starts_at', dayRange.start).lt('starts_at', dayRange.end)
        .neq('status', 'cancelled'),
      supabase.from('blocks').select('id, staff_id, starts_at, ends_at, reason')
        .in('staff_id', barbers.map(b => b.id))
        .gte('starts_at', dayRange.start).lt('starts_at', dayRange.end),
    ]);
    if (__DEV__ && apptsErr) console.warn('[agenda] appointments query error:', apptsErr);
    if (__DEV__ && blocksErr) console.warn('[agenda] blocks query error:', blocksErr);

    const now = new Date();
    const newCols: StaffCol[] = barbers.map(barber => {
      const barberAppts = (appts ?? []).filter(a => a.staff_id === barber.id);
      const barberBlocks = (blocks ?? []).filter(b => b.staff_id === barber.id);

      const items: ColItem[] = [
        ...barberAppts.map(a => appointmentRowToAgendaItem(a, now)),
        ...barberBlocks.map(b => {
          const start = new Date(b.starts_at);
          const end = new Date(b.ends_at);
          const dur = Math.round((end.getTime() - start.getTime()) / 60000);
          return { type: 'blok' as const, id: b.id, time: formatTime(start), endTime: formatTime(end), dur, label: `BLOKE · ${translateReason(b.reason)}` };
        }),
      ].sort((a, b) => a.time.localeCompare(b.time));

      return {
        id: barber.id,
        name: barber.name,
        count: barberAppts.length,
        blok: barberBlocks.length,
        items,
      };
    });

    if (!isMountedRef.current) return;
    setCols(newCols);
    setLoading(false);
  }, [barberList, selectedDate]);

  useEffect(() => {
    if (barberList.length) {
      loadAgenda();
    } else if (shopId) {
      // Shop context yüklendi ama personel yok — infinite spinner'ı önle
      setCols([]);
      setLoading(false);
    }
  }, [selectedDate, barberList, shopId, loadAgenda]);

  useFocusEffect(
    useCallback(() => {
      if (barberList.length) loadAgenda();
    }, [barberList.length, loadAgenda]),
  );

  useEffect(() => {
    if (!barberList.length) return;

    const staffIds = barberList.map(b => b.id).join(',');
    const debounced = createDebounce(loadAgenda, 200);
    const dateStr = selectedDate.toISOString().split('T')[0];
    const idHash = barberList.map(b => b.id).sort().join('').replace(/-/g, '').slice(0, 12);

    const apptCh = supabase
      .channel(`agenda-appt-${dateStr}-${idHash}`)
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'appointments', filter: `staff_id=in.(${staffIds})` },
        debounced,
      )
      .subscribe();

    const blockCh = supabase
      .channel(`agenda-block-${dateStr}-${idHash}`)
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'blocks', filter: `staff_id=in.(${staffIds})` },
        debounced,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(apptCh);
      supabase.removeChannel(blockCh);
    };
  }, [barberList, selectedDate, loadAgenda]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAgenda();
    setRefreshing(false);
  }, [loadAgenda]);

  function handleAddAppointment() {
    // Sunucu zamanını çek — cihaz saati manipülasyonuna karşı koruma
    supabase.rpc('get_server_time').then(({ data }) => {
      if (data) setServerNowMs(new Date(data as string).getTime());
    });
    setEditingAppt(null);
    setShowAdd(true);
  }

  async function handleOpenDetail(item: AppItem) {
    const { data } = await supabase
      .from('appointments')
      .select('customer_phone')
      .eq('id', item.id)
      .maybeSingle();
    setSelectedAppt({
      id: item.id,
      time: item.time,
      duration: item.dur,
      customerName: item.name,
      customerPhone: (data as any)?.customer_phone ?? null,
      serviceName: item.svc,
      notes: item.notes,
    });
    setShowDetail(true);
  }

  async function handleEditAppointment(id: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('id, staff_id, service_id, starts_at, customer_name, customer_phone, customer_notes, notes, appointment_services(service_id, sequence_order)')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      if (__DEV__ && error) console.warn('[agenda] appointment edit fetch error:', error);
      Alert.alert('Hata', 'Randevu bilgileri yüklenemedi.');
      return;
    }

    const start = new Date((data as any).starts_at);
    const joinRows = ((data as any).appointment_services ?? []) as { service_id: string; sequence_order: number | null }[];
    const serviceIds = joinRows.length > 0
      ? joinRows
          .slice()
          .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
          .map((r) => r.service_id)
      : ((data as any).service_id ? [(data as any).service_id as string] : []);
    setEditingAppt({
      id: (data as any).id,
      customerName: (data as any).customer_name ?? '',
      customerPhone: (data as any).customer_phone ?? null,
      serviceIds,
      staffId: (data as any).staff_id ?? null,
      date: formatLocalAppointmentDate(start),
      time: formatTime(start),
      notes: (data as any).customer_notes ?? (data as any).notes ?? null,
    });
    setShowAdd(true);
  }

  return (
    <View style={styles.screen}>
      {/* Header */}
      <OverlineHeader
        eyebrow="Dükkan Sahibi"
        title="Ajanda"
        meta={formatAgendaMetaDate(selectedDate)}
        trailing={<OwnerSettingsAvatar />}
      />

      {/* DayPicker — gap:6, padding:'0 16px' — 2 geçmiş gün incelenebilir */}
      <TourTarget id="ajanda-daypicker">
        <DayPicker
          selected={selectedDate}
          pastDays={2}
          onSelect={d => {
            setLoading(true);
            setSelectedDate(d);
          }}
        />
      </TourTarget>

      {/* Agenda body — dış scroll dikey (pull-to-refresh burada), iç scroll yatay kolonlar.
          Dikey scroll dışta olmalı: yoğun günlerde ekran altına taşan randevular
          ancak böyle erişilebilir; RefreshControl da yalnızca dikey scroll'da çalışır. */}
      <TourTarget id="ajanda-timeline" style={{ flex: 1 }}>
        {loading ? (
          <View style={styles.emptyWrap}>
            <ActivityIndicator size="small" color={colors.brand[600]} />
          </View>
        ) : cols.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Henüz personel eklenmedi</Text>
            <Text style={styles.emptySubText}>Randevu alabilmek için önce ekibini tanıt.</Text>
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => router.push('/(owner)/team' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ekip Ekle"
            >
              <Text style={styles.emptyCtaText}>Ekip Ekle →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.vScroll}
            contentContainerStyle={styles.vScrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colContent}
            >
              {cols.map(col => (
                <View key={col.id} style={styles.col}>
                  {/* Column header — padding:'0 4px 4px' */}
                  <View style={styles.colHeader}>
                    <Text style={styles.colName}>{col.name}</Text>
                    <Text style={styles.colMeta}>
                      {col.count} randevu{col.blok > 0 ? ` · ${col.blok} blok` : ''}
                    </Text>
                  </View>

                  {/* Items — gap:10 */}
                  <View style={styles.itemContent}>
                    {col.items.length === 0 ? (
                      <EmptyDropZone />
                    ) : (
                      col.items.map(item =>
                        item.type === 'blok' ? (
                          <BlokCard
                            key={item.id}
                            time={item.time}
                            endTime={item.endTime}
                            duration={item.dur}
                            label={item.label}
                          />
                        ) : (
                          <AppointmentCard
                            key={item.id}
                            time={item.time}
                            endTime={item.endTime}
                            duration={item.dur}
                            name={item.name}
                            service={item.svc}
                            notes={item.notes}
                            state={item.state}
                            onPress={() => handleOpenDetail(item)}
                          />
                        )
                      )
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </ScrollView>
        )}
      </TourTarget>

      {/* FAB group — Randevu Ekle + Blok Ekle */}
      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={styles.blockBtn}
          onPress={() => setShowAddBlock(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Blok Ekle"
        >
          <Text style={styles.blockBtnText}>Blok Ekle</Text>
        </TouchableOpacity>
        <View style={styles.fab}>
          <TourTarget id="ajanda-fab">
            <Button
              variant="accent"
              size="lg"
              onPress={handleAddAppointment}
            >
              + Randevu Ekle
            </Button>
          </TourTarget>
        </View>
      </View>

      <AppointmentDetailSheet
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        appointment={selectedAppt}
        onEdit={handleEditAppointment}
        onCancel={(id) => {
          setCols(prev => prev.map(col => ({
            ...col,
            items: col.items.filter(i => i.id !== id),
            count: col.items.filter(i => i.type === 'appt' && i.id !== id).length,
          })));
        }}
        onComplete={(id) => {
          setCols(prev => prev.map(col => ({
            ...col,
            items: col.items.map(i =>
              i.type === 'appt' && i.id === id ? { ...i, state: 'done' as AppState } : i,
            ),
          })));
        }}
      />

      <AddBlockModal
        visible={showAddBlock}
        onClose={() => setShowAddBlock(false)}
        staffList={barberList.map(b => ({ id: b.id, name: b.name }))}
        onSaved={loadAgenda}
      />

      <AddAppointmentModal
        visible={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingAppt(null);
        }}
        services={services}
        staffList={barberList}
        workingHours={shopWorkingHours}
        serverNowMs={serverNowMs}
        shopId={shopId}
        mode={editingAppt ? 'edit' : 'create'}
        initialValues={editingAppt ? {
          id: editingAppt.id,
          customerName: editingAppt.customerName,
          customerPhone: editingAppt.customerPhone,
          serviceIds: editingAppt.serviceIds,
          staffId: editingAppt.staffId,
          date: editingAppt.date,
          time: editingAppt.time,
          notes: editingAppt.notes,
        } : null}
        onSave={async (data) => {
          if (!shopSlug) {
            Alert.alert('Hata', 'Dükkan bilgisi yüklenmedi. Sayfayı yenileyin.');
            return;
          }
          if (editingAppt) {
            if (!data.staffId || data.serviceIds.length === 0) {
              Alert.alert('Hata', 'Berber ve hizmet seçimi zorunludur.');
              return;
            }
            const { error } = await supabase.rpc('update_appointment_atomic', {
              p_appointment_id: editingAppt.id,
              p_staff_id: data.staffId,
              p_service_id: data.serviceIds[0],
              p_service_ids: data.serviceIds,
              p_starts_at: buildLocalAppointmentTimestamp(data.date, data.time),
              p_customer_name: data.customerName,
              p_customer_phone: data.customerPhone || undefined,
              p_customer_notes: data.notes ?? undefined,
            });
            if (error) {
              if (__DEV__) console.warn('[agenda] update_appointment_atomic error:', error);
              Alert.alert('Hata', error.message || 'Randevu güncellenemedi.');
              return;
            }
            trackEvent('appointment_edited', { service_ids: data.serviceIds.join(','), staff_id: data.staffId });
            setShowAdd(false);
            setEditingAppt(null);
            loadAgenda();
            return;
          }
          const { error: fnErr } = await supabase.functions.invoke('app-book-appointment', {
            body: {
              shop_slug: shopSlug,
              service_id: data.serviceIds[0],
              service_ids: data.serviceIds,
              staff_id: data.staffId,
              starts_at: buildLocalAppointmentTimestamp(data.date, data.time),
              customer_name: data.customerName,
              customer_phone: data.customerPhone || null,
              ...(data.notes ? { notes: data.notes } : {}),
            },
          });
          if (fnErr) {
            Alert.alert('Hata', await parseBookingFunctionError(fnErr));
            return;
          }
          trackEvent('appointment_created', { shop_slug: shopSlug, service_ids: data.serviceIds.join(','), staff_id: data.staffId });
          setShowAdd(false);
          loadAgenda();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },

  /* Outer vertical scroll — pull-to-refresh + tall-day access */
  vScroll: { flex: 1 },
  vScrollContent: {
    flexGrow: 1,
    /* FAB grubu (bottom:90 + ~100px yükseklik) son kartları örtmesin */
    paddingBottom: 150,
  },

  /* Inner horizontal column row — gap:12, padding:'20px 16px' */
  colContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* Each column — flex:'0 0 230px' */
  col: {
    width: 230,
    flexDirection: 'column',
  },

  /* Column header — padding:'0 4px 4px' */
  colHeader: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  colName: {
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
  },
  colMeta: {
    fontSize: 11,
    fontFamily: 'Montserrat-SemiBold',
    letterSpacing: 1.32,           // 0.12em × 11
    textTransform: 'uppercase',
    color: colors.slate[500],
    marginTop: 4,
  },

  /* Item list — gap:10 */
  itemContent: { gap: 10 },

  /* Empty screen state */
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
    color: colors.ink[900],
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCtaBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: {
    fontSize: 14,
    fontFamily: 'Montserrat-SemiBold',
    color: '#ffffff',
  },

  dropZone: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.slate[300],
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  /* slate[500]: slate[400] on slate[50] failed 4.5:1 contrast at 12px */
  dropZoneText: {
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    color: colors.slate[500],
  },

  /* FAB group — sağ alt köşe */
  fabGroup: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 10,
  },

  /* Blok ekle — ghost pill (minHeight 44 = dokunma hedefi kuralı) */
  blockBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.slate[0],
    borderWidth: 1.5,
    borderColor: colors.slate[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  blockBtnText: {
    fontSize: 13,
    fontFamily: 'Montserrat-SemiBold',
    color: colors.ink[900],
  },

  /* FAB — position:absolute bottom:90 right:20
     shadowColor = brand-600 (~rgba(30,58,138,...))
     shadowOffset y:12, opacity:0.4, radius:14 (≈ 24-10 = spread subtraction) */
  fab: {
    shadowColor: colors.brand[600],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
});
