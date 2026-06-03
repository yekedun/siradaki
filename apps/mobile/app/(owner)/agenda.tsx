import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createDebounce } from '../../lib/debounce';
import { trackEvent } from '../../lib/analytics';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { Move, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { buildLocalAppointmentTimestamp, formatLocalAppointmentDate } from '../../lib/appointment-time';
import type { AppointmentWorkingHours } from '../../lib/appointment-time';
import { appointmentRowToAgendaItem } from '../../lib/appointment-mappers';
import { formatTime, translateReason, AppointmentState as AppState } from '../../lib/utils';
import { AppointmentDetailSheet, AppointmentDetail } from '../../components/AppointmentDetailSheet';
import { useShop } from '../../lib/ShopContext';
import { V2AddAppointmentSheet } from '../../components/v2/V2AddAppointmentSheet';
import type { AppointmentDraft } from '../../lib/appointment-modal-state';
import { v2Colors, v2Fonts, v2Radii, v2Spacing } from '../../lib/v2-tokens';


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

const INIT_COLS: StaffCol[] = [];
const DAY_LABELS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function buildDays() {
  const today = getToday();
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    return day;
  });
}

function isSameLocalDate(left: Date, right: Date): boolean {
  return formatLocalAppointmentDate(left) === formatLocalAppointmentDate(right);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function EmptyDropZone() {
  return (
    <View style={styles.dropZone}>
      <Text style={styles.dropZoneText}>Randevu yok</Text>
    </View>
  );
}

function getToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { shopSlug, workingHours, services, staffList: barberList, reload } = useShop();
  const shopWorkingHours = workingHours as AppointmentWorkingHours | null;

  const [selectedDate, setSelectedDate] = useState<Date>(getToday);
  const [cols, setCols] = useState<StaffCol[]>(INIT_COLS);
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [serverNowMs, setServerNowMs] = useState<number | undefined>(undefined);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentDetail | null>(null);
  const [addDraft, setAddDraft] = useState<AppointmentDraft | null>(null);

  const isMountedRef = useRef(true);
  const days = buildDays();

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
    if (!barbers.length) { setCols([]); return; }

    const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(selectedDate); dayEnd.setDate(dayEnd.getDate()+1); dayEnd.setHours(0,0,0,0);

    const [{ data: appts, error: apptsErr }, { data: blocks, error: blocksErr }] = await Promise.all([
      supabase.from('appointments').select('id, staff_id, customer_name, starts_at, ends_at, status, notes, services(name, duration_min)')
        .in('staff_id', barbers.map((b: any) => b.id))
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString())
        .neq('status', 'cancelled'),
      supabase.from('blocks').select('id, staff_id, starts_at, ends_at, reason')
        .in('staff_id', barbers.map((b: any) => b.id))
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString()),
    ]);
    if (apptsErr) console.warn('[agenda] appointments query error:', apptsErr);
    if (blocksErr) console.warn('[agenda] blocks query error:', blocksErr);

    const now = new Date();
    const newCols: StaffCol[] = (barbers as any[]).map(barber => {
      const barberAppts = (appts ?? []).filter((a: any) => a.staff_id === barber.id);
      const barberBlocks = (blocks ?? []).filter((b: any) => b.staff_id === barber.id);

      const items: ColItem[] = [
        ...barberAppts.map((a: any) => appointmentRowToAgendaItem(a, now)),
        ...barberBlocks.map((b: any) => {
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
  }, [barberList, selectedDate]);

  useEffect(() => {
    if (barberList.length) loadAgenda();
  }, [selectedDate, barberList, loadAgenda]);

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

  function handleAddAppointment() {
    // Sunucu zamanını çek — cihaz saati manipülasyonuna karşı koruma
    supabase.rpc('get_server_time').then(({ data }) => {
      if (data) setServerNowMs(new Date(data as string).getTime());
    });
    setAddDraft({
      customerName: '',
      customerPhone: '',
      serviceId: services[0]?.id ?? null,
      staffId: barberList[0]?.id ?? null,
      date: formatLocalAppointmentDate(selectedDate),
      time: '',
      notes: '',
      gapDurationMin: null,
    });
    setShowAdd(true);
  }

  async function handleOpenDetail(item: AppItem, staffName: string) {
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
      staffName,
      notes: item.notes,
    });
    setShowDetail(true);
  }

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityLabel="Ayarlar ve Profil"
        onPress={() => router.push('/settings' as never)}
        style={[styles.profileFab, { top: insets.top + 16 }]}
      >
        <Text style={styles.profileFabText}>EK</Text>
      </Pressable>
      <View style={[styles.header, { paddingTop: insets.top + v2Spacing[16] }]}>
        <Text style={styles.overline}>Berber · Dükkan Paneli</Text>
        <Text style={styles.title}>Ajanda</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={styles.dayRow}
      >
        {days.map((day) => {
          const active = isSameLocalDate(day, selectedDate);
          return (
            <Pressable
              key={formatLocalAppointmentDate(day)}
              onPress={() => setSelectedDate(day)}
              style={[styles.dayCell, active && styles.dayCellActive]}
            >
              <Text style={[styles.dayName, active && styles.dayTextActive]}>{DAY_LABELS[day.getDay()]}</Text>
              <Text style={[styles.dayNumber, active && styles.dayTextActive]}>{day.getDate()}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.dragHint}>
        <Move size={13} color={v2Colors.spruce} strokeWidth={2.4} />
        <Text style={styles.dragHintText}>Bir randevuyu başka bir ustaya sürükle</Text>
      </View>

      {cols.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Henüz personel veya randevu yok</Text>
        </View>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.colScroll}
        contentContainerStyle={styles.colContent}
      >
        {cols.map(col => (
          <View key={col.id} style={styles.col}>
            <View style={styles.colHeader}>
              <View style={styles.colAvatar}>
                <Text style={styles.colAvatarText}>{getInitials(col.name)}</Text>
              </View>
              <View style={styles.colHeaderCopy}>
                <Text style={styles.colName} numberOfLines={1}>{col.name}</Text>
                <Text style={styles.colMeta}>
                  {col.count} rdv{col.blok > 0 ? ` · ${col.blok} blok` : ''}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.itemContent}
            >
              {col.items.length === 0 ? (
                <EmptyDropZone />
              ) : (
                col.items.map(item =>
                  item.type === 'blok' ? (
                    <View key={item.id} style={styles.blockCard}>
                      <Text style={styles.blockTime}>{item.time} - {item.endTime}</Text>
                      <Text style={styles.blockLabel}>{item.label}</Text>
                    </View>
                  ) : (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.appointmentCard,
                        item.state === 'done' && styles.appointmentCardDone,
                        item.state === 'active' && styles.appointmentCardNow,
                      ]}
                      onPress={() => handleOpenDetail(item, col.name)}
                    >
                      <Text style={styles.appointmentTime}>{item.time} {item.endTime}</Text>
                      <Text style={styles.appointmentName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.appointmentService} numberOfLines={1}>{item.svc}</Text>
                      {item.state === 'active' ? (
                        <View style={styles.nowBadge}>
                          <View style={styles.nowDot} />
                          <Text style={styles.nowText}>Şimdi</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  )
                )
              )}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      <View style={styles.fab}>
        <Pressable
          style={styles.fabButton}
          onPress={handleAddAppointment}
        >
          <Plus size={20} color={v2Colors.paper} strokeWidth={2.8} />
          <Text style={styles.fabText}>Randevu</Text>
        </Pressable>
      </View>

      <AppointmentDetailSheet
        visible={showDetail}
        onClose={() => setShowDetail(false)}
        appointment={selectedAppt}
        onEdit={() => setShowDetail(false)}
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

      <V2AddAppointmentSheet
        visible={showAdd}
        mode="agenda"
        onClose={() => setShowAdd(false)}
        services={services}
        staffList={barberList}
        initialDraft={addDraft}
        workingHours={shopWorkingHours}
        serverNowMs={serverNowMs}
        onSave={async (data) => {
          if (!shopSlug) {
            Alert.alert('Hata', 'Dükkan bilgisi yüklenmedi. Sayfayı yenileyin.');
            return;
          }
          const { error: fnErr } = await supabase.functions.invoke('app-book-appointment', {
            body: {
              shop_slug: shopSlug,
              service_id: data.serviceId,
              staff_id: data.staffId,
              starts_at: buildLocalAppointmentTimestamp(data.date, data.time),
              customer_name: data.customerName,
              customer_phone: data.customerPhone || null,
              ...(data.notes ? { notes: data.notes } : {}),
            },
          });
          if (fnErr) {
            const ctx = (fnErr as any)?.context;
            let status = ctx?.status ?? 0;
            let ctxBody: any = ctx?.body;
            // FunctionsHttpError.context is the Response; body needs to be read
            if (ctx && typeof ctx.json === 'function') {
              try { ctxBody = await ctx.clone().json(); } catch { try { ctxBody = await ctx.clone().text(); } catch {} }
              if (!status) status = ctx.status ?? 0;
            }
            console.warn('[agenda] app-book-appointment error status=', status, 'body=', ctxBody, 'message=', fnErr.message);
            // Backend "error" alanı her zaman gerçek Türkçe mesajı içerir — onu önceliklendiriyoruz
            const serverMsg = (ctxBody && typeof ctxBody === 'object' && typeof ctxBody.error === 'string')
              ? ctxBody.error
              : (typeof ctxBody === 'string' ? ctxBody : '');
            let msg: string;
            if (status === 409) msg = serverMsg || 'Bu saat dolu. Başka bir saat seçin.';
            else if (status === 404) msg = serverMsg || 'Dükkan veya hizmet bulunamadı. Sayfayı yenileyin.';
            else if (status === 429) msg = serverMsg || 'Çok fazla deneme. Birkaç dakika bekleyin.';
            else if (status === 401) msg = 'Oturum gerekli. Tekrar giriş yapın.';
            else if (status === 400) msg = serverMsg || 'Geçersiz bilgi.';
            else msg = `Randevu eklenemedi (HTTP ${status || '?'}): ${serverMsg || fnErr.message || 'bilinmeyen hata'}`;
            Alert.alert('Hata', msg);
            return;
          }
          trackEvent('appointment_created', { shop_slug: shopSlug, service_id: data.serviceId, staff_id: data.staffId });
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
    backgroundColor: v2Colors.paper,
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
  header: {
    paddingBottom: 0,
    paddingHorizontal: v2Spacing[40],
    paddingTop: v2Spacing[28],
  },
  overline: {
    color: v2Colors.ember,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 40,
    includeFontPadding: false,
    lineHeight: 42,
    marginTop: 6,
  },
  dayScroll: {
    flexGrow: 0,
    height: 102,
    maxHeight: 102,
  },
  dayRow: {
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: v2Spacing[40],
    paddingTop: v2Spacing[24],
  },
  dayCell: {
    alignItems: 'center',
    borderColor: v2Colors.line2,
    borderRadius: 14,
    borderWidth: 1,
    height: 66,
    justifyContent: 'center',
    width: 50,
  },
  dayCellActive: {
    backgroundColor: v2Colors.spruce,
    borderColor: v2Colors.spruce,
  },
  dayName: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  dayNumber: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.mono,
    fontSize: 20,
    includeFontPadding: false,
    marginTop: 2,
  },
  dayTextActive: {
    color: v2Colors.paper,
  },
  dragHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingBottom: 14,
    paddingHorizontal: v2Spacing[40],
  },
  dragHintText: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 12,
  },
  colScroll: {
    flex: 1,
  },
  colContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 102,
    paddingHorizontal: v2Spacing[40],
  },
  col: {
    flexDirection: 'column',
    width: 184,
  },
  colHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 12,
    paddingHorizontal: 2,
  },
  colAvatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruceSoft,
    borderColor: v2Colors.line,
    borderRadius: 11,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  colAvatarText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 11,
  },
  colHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  colName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 16,
  },
  colMeta: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 13,
    marginTop: 2,
  },
  itemContent: {
    gap: 12,
    paddingBottom: 4,
  },
  appointmentCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: 15,
    borderWidth: 1,
    minHeight: 108,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  appointmentCardDone: {
    opacity: 0.6,
  },
  appointmentCardNow: {
    borderColor: v2Colors.spruce,
    borderWidth: 1.5,
  },
  appointmentTime: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.mono,
    fontSize: 13,
  },
  appointmentName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 17,
    marginTop: 8,
  },
  appointmentService: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    marginTop: 5,
  },
  nowBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginTop: 5,
  },
  nowDot: {
    backgroundColor: v2Colors.spruce,
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  nowText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  blockCard: {
    backgroundColor: 'rgba(27,24,19,0.025)',
    borderColor: v2Colors.line2,
    borderRadius: 13,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 11,
  },
  blockTime: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 9.5,
  },
  blockLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 9,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  dropZone: {
    alignItems: 'center',
    borderColor: v2Colors.line2,
    borderRadius: 13,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 21,
  },
  dropZoneText: {
    color: v2Colors.line2,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
  },
  fab: {
    bottom: 42,
    right: 40,
    position: 'absolute',
    zIndex: 10,
  },
  fabButton: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 9,
    height: 52,
    justifyContent: 'center',
    minWidth: 132,
    paddingHorizontal: 22,
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  fabText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
});
