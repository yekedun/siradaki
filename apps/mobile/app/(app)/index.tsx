/**
 * S1 — Ajanda · Günlük Takvim
 * Design: Sıradaki-Final-Staff.html · S1
 * Timeline view: 09:00–20:00 · 64px/hr · now-line · appointment cards · block cards
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ban, CalendarX, CheckCircle2, Coffee, MoreHorizontal, Plane,
  Plus, User,
} from 'lucide-react-native';
import { type LucideIcon } from 'lucide-react-native';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';
import { supabase } from '../../lib/supabase';
import { AppointmentDetailSheet } from '../../components/AppointmentDetailSheet';
import { AddAppointmentModal, ServiceOption } from '../../components/AddAppointmentModal';
import { formatTime } from '../../lib/utils';

/* ── Timeline constants ── */
const TL_START_H = 9;   // 09:00
const TL_END_H   = 20;  // 20:00
const HOUR_PX    = 64;
const PXM        = HOUR_PX / 60;
const TL_HOURS   = Array.from({ length: TL_END_H - TL_START_H + 1 }, (_, i) => TL_START_H + i);
const TL_HEIGHT  = (TL_END_H - TL_START_H) * HOUR_PX;

const TR_DAYS_SHORT  = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'] as const;
const TR_MONTHS_FULL = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'] as const;
const TR_DAYS_FULL   = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'] as const;

const SCREEN_W = Dimensions.get('window').width;

const BLOCK_ICON: Record<string, LucideIcon> = {
  break: Coffee, mola: Coffee,
  personal: User, kisisel: User,
  vacation: Plane, izin: Plane,
  other: MoreHorizontal, diger: MoreHorizontal,
};
const TL_LEFT  = 52;
const TL_RIGHT = 14;

function toMin(date: Date): number { return date.getHours() * 60 + date.getMinutes(); }
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Toast ── */
function Toast({ visible, text }: { visible: boolean; text: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: visible ? 1 : 0, duration: 260, useNativeDriver: true }).start();
  }, [visible]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[a.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[14,0] }) }] }]}
    >
      <CheckCircle2 size={18} color="#9FD9BE" />
      <Text style={a.toastTx}>{text}</Text>
    </Animated.View>
  );
}

interface ApptItem {
  id: string; startMin: number; endMin: number;
  customerName: string; customerPhone: string | null;
  serviceName: string; durationMin: number; status: string; notes?: string | null;
  startsAt: string;
}
interface BlockItem { id: string; startMin: number; endMin: number; reason: string; }

function statusOf(item: ApptItem, isToday: boolean): 'done' | 'now' | 'up' {
  if (!isToday) return item.startMin < toMin(new Date()) ? 'done' : 'up';
  const nowMin = toMin(new Date());
  if (item.endMin <= nowMin) return 'done';
  if (item.startMin <= nowMin && nowMin < item.endMin) return 'now';
  return 'up';
}

function fMin(m: number) { return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`; }

/* ── Appointment card (positioned absolute in timeline) ── */
function ApptCard({ item, status, onPress }: { item: ApptItem; status: 'done'|'now'|'up'; onPress: () => void }) {
  const top    = Math.max(0, (item.startMin - TL_START_H * 60) * PXM);
  const height = Math.max(36, (item.endMin - item.startMin) * PXM - 2);
  const bgColor = status === 'now' ? v2Colors.emberSoft : v2Colors.card;
  const borderColor = status === 'now' ? v2Colors.ember : status === 'done' ? v2Colors.line2 : v2Colors.spruce;
  const opacity = status === 'done' ? 0.72 : 1;
  const tall = height >= 50;
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[a.appt, { top, height, backgroundColor: bgColor, borderLeftColor: borderColor, opacity }]}
    >
      <View style={a.apptTop}>
        <Text style={[a.apptName, status==='done' && a.apptNameDone]} numberOfLines={1}>{item.customerName}</Text>
        {status === 'now' ? (
          <View style={a.flagNow}><Text style={a.flagNowTx}>Devam Ediyor</Text></View>
        ) : status === 'done' ? (
          <View style={a.flagDone}><Text style={a.flagDoneTx}>✓ Bitti</Text></View>
        ) : (
          <Text style={a.apptTime}>{fMin(item.startMin)}–{fMin(item.endMin)}</Text>
        )}
      </View>
      {tall && (
        <Text style={a.apptSvc} numberOfLines={1}>{item.serviceName} · {fMin(item.startMin)}–{fMin(item.endMin)}</Text>
      )}
    </TouchableOpacity>
  );
}

/* ── Block card (absolute) ── */
function BlockCard({ item }: { item: BlockItem }) {
  const top    = Math.max(0, (item.startMin - TL_START_H * 60) * PXM);
  const height = Math.max(28, (item.endMin - item.startMin) * PXM - 2);
  const BlkIcon = BLOCK_ICON[item.reason] ?? Ban;
  return (
    <View style={[a.blkCard, { top, height }]}>
      <BlkIcon size={15} color={v2Colors.ink3} />
      <Text style={a.blkTx} numberOfLines={1}>{item.reason}</Text>
      <Text style={a.blkTime}>{fMin(item.startMin)}–{fMin(item.endMin)}</Text>
    </View>
  );
}

export default function AjandaScreen() {
  const insets = useSafeAreaInsets();
  const [dayIndex, setDayIndex] = useState(2);
  const [appts, setAppts]   = useState<ApptItem[]>([]);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [staffId,       setStaffId]       = useState<string | null>(null);
  const [staffName,     setStaffName]     = useState('');
  const [staffShopSlug, setStaffShopSlug] = useState<string | null>(null);
  const [services,      setServices]      = useState<ServiceOption[]>([]);
  const [showDetail,    setShowDetail]    = useState(false);
  const [selAppt,       setSelAppt]       = useState<import('../../components/AppointmentDetailSheet').AppointmentDetail | null>(null);
  const [showAdd,       setShowAdd]       = useState(false);
  const [toast,         setToast]         = useState({ visible: false, text: '' });
  const [nowMin,        setNowMin]        = useState(toMin(new Date()));

  const today = new Date(); today.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - 2 + i); return d; });
  const selectedDate = days[dayIndex];
  const isToday = dayIndex === 2;

  /* update now-line every minute */
  useEffect(() => {
    const id = setInterval(() => setNowMin(toMin(new Date())), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('staff').select('id, name, shop_id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
        .then(({ data }) => {
          if (!data) return;
          const row = data as any;
          setStaffId(row.id);
          setStaffName(row.name ?? '');
          supabase.from('shops').select('slug').eq('id', row.shop_id).maybeSingle()
            .then(({ data: sd }) => { if (sd) setStaffShopSlug((sd as any).slug); });
          supabase.from('services').select('id, name, duration_min, price_cents').eq('shop_id', row.shop_id).eq('is_active', true)
            .then(({ data: svcs }) => {
              if (svcs) setServices((svcs as any[]).map(s => ({ id: s.id, label: s.name, dur: s.duration_min, price: `${Math.round(s.price_cents/100)}₺` })));
            });
        });
    });
  }, []);

  const fetchDay = useCallback(async () => {
    if (!staffId) return;
    const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(selectedDate); dayEnd.setDate(selectedDate.getDate()+1); dayEnd.setHours(0,0,0,0);
    const [{ data: apptRows }, { data: blkRows }] = await Promise.all([
      supabase.from('appointments').select('id, customer_name, service_name, starts_at, duration_min, status, notes')
        .eq('staff_id', staffId).neq('status','cancelled')
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString()).order('starts_at'),
      supabase.from('blocks').select('id, starts_at, ends_at, reason')
        .eq('staff_id', staffId)
        .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString()),
    ]);
    setAppts((apptRows ?? []).map((r: any) => {
      const start = new Date(r.starts_at);
      const startMin = toMin(start);
      const endMin   = startMin + (r.duration_min ?? 30);
      return { id: r.id, startMin, endMin, customerName: r.customer_name, customerPhone: null, serviceName: r.service_name, durationMin: r.duration_min ?? 30, status: r.status, notes: r.notes ?? null, startsAt: r.starts_at };
    }));
    setBlocks((blkRows ?? []).map((r: any) => {
      const start = new Date(r.starts_at);
      const end   = new Date(r.ends_at);
      return { id: r.id, startMin: toMin(start), endMin: toMin(end), reason: r.reason };
    }));
  }, [staffId, dayIndex]);

  useEffect(() => { if (staffId) fetchDay(); }, [fetchDay]);

  async function openDetail(item: ApptItem) {
    const { data } = await supabase.from('appointments').select('customer_phone').eq('id', item.id).maybeSingle();
    setSelAppt({
      id: item.id,
      time: formatTime(new Date(item.startsAt)),
      duration: item.durationMin,
      customerName: item.customerName,
      customerPhone: (data as any)?.customer_phone ?? null,
      serviceName: item.serviceName,
      notes: item.notes,
    });
    setShowDetail(true);
  }

  const nowTop = Math.max(0, (nowMin - TL_START_H * 60) * PXM);
  const apptCount = appts.length;
  const dow = selectedDate.getDay();
  const overlineLabel = `${TR_DAYS_FULL[dow]} · ${selectedDate.getDate()} ${TR_MONTHS_FULL[selectedDate.getMonth()]}`;

  return (
    <SafeAreaView style={a.safe} edges={['top']}>
      {/* Header */}
      <View style={a.head}>
        <Text style={a.overline}>{overlineLabel}</Text>
        <Text style={a.title}>Ajanda</Text>
      </View>

      {/* Day picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={a.dpScroll} contentContainerStyle={a.dpContent}>
        {days.map((d, i) => {
          const dowIdx = (d.getDay() + 6) % 7;
          const dayAppts = i === dayIndex ? apptCount : 0;
          return (
            <TouchableOpacity key={i} style={[a.dayCell, i===dayIndex && a.dayCellOn]} onPress={() => setDayIndex(i)} activeOpacity={0.8}>
              <Text style={[a.dayDow, i===dayIndex && a.dayDowOn]}>{TR_DAYS_SHORT[dowIdx]}</Text>
              <Text style={[a.dayNum, i===dayIndex && a.dayNumOn]}>{d.getDate()}</Text>
              {dayAppts > 0 && <View style={[a.cdot, i===dayIndex && a.cdotOn]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Meta row */}
      <View style={a.metaRow}>
        <Text style={a.metaL}>
          {apptCount === 0 && blocks.length === 0
            ? 'Boş gün'
            : [apptCount > 0 && `${apptCount} randevu`, blocks.length > 0 && `${blocks.length} blok`].filter(Boolean).join(' · ')}
        </Text>
        {staffName ? <Text style={a.metaR}>{staffName}</Text> : null}
      </View>

      {/* Timeline */}
      {appts.length === 0 && blocks.length === 0 ? (
        <View style={a.empty}>
          <View style={a.emptyIc}><CalendarX size={28} color={v2Colors.line2} /></View>
          <Text style={a.emptyT}>Bu gün boş</Text>
          <Text style={a.emptyS}>Henüz randevu veya blok yok.</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          <View style={[a.timeline, { height: TL_HEIGHT + 64 }]}>
            {/* Hour rows */}
            {TL_HOURS.map(h => (
              <View key={h} style={[a.tlRow, { top: (h - TL_START_H) * HOUR_PX }]}>
                <Text style={a.tlHour}>{String(h).padStart(2,'0')}:00</Text>
                <View style={a.tlLine} />
              </View>
            ))}

            {/* Now line */}
            {isToday && nowMin >= TL_START_H*60 && nowMin <= TL_END_H*60 && (
              <View style={[a.nowLine, { top: nowTop }]}>
                <View style={a.nowDot} />
                <Text style={a.nowLbl}>{fMin(nowMin)}</Text>
              </View>
            )}

            {/* Events */}
            <View style={a.tlTrack} pointerEvents="box-none">
              {blocks.map(blk => <BlockCard key={blk.id} item={blk} />)}
              {appts.map(ap => (
                <ApptCard
                  key={ap.id}
                  item={ap}
                  status={statusOf(ap, isToday)}
                  onPress={() => openDetail(ap)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity style={[a.fab, { bottom: insets.bottom + 90 }]} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
        <Plus size={18} color="#fff" />
        <Text style={a.fabTx}>Randevu Ekle</Text>
      </TouchableOpacity>

      <Toast visible={toast.visible} text={toast.text} />

      {/* Detail sheet */}
      <AppointmentDetailSheet
        visible={showDetail}
        onClose={() => { setShowDetail(false); setSelAppt(null); }}
        appointment={selAppt}
        onEdit={() => {}}
        onCancel={fetchDay}
        onComplete={fetchDay}
      />

      {/* Add appointment */}
      <AddAppointmentModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (data) => {
          if (!staffShopSlug || !staffId) { Alert.alert('Hata', 'Oturum bilgisi eksik.'); return; }
          try {
            const { error } = await supabase.functions.invoke('app-book-appointment', {
              body: {
                shop_slug: staffShopSlug,
                service_id: data.serviceId,
                staff_id: data.staffId ?? staffId,
                starts_at: `${data.date}T${data.time}:00`,
                customer_name: data.customerName,
                customer_phone: data.customerPhone || null,
                ...(data.notes ? { notes: data.notes } : {}),
              },
            });
            if (error) throw error;
            setShowAdd(false);
            fetchDay();
            setToast({ visible: true, text: 'Randevu oluşturuldu' });
            setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
          } catch { Alert.alert('Hata', 'Randevu eklenemedi. Slot dolu olabilir.'); }
        }}
        services={services}
      />
    </SafeAreaView>
  );
}

const a = StyleSheet.create({
  safe: { flex: 1, backgroundColor: v2Colors.paper },
  head: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 4 },
  overline: { fontFamily: v2Fonts.bodySemiBold, fontSize: 11, letterSpacing: 11*0.2, textTransform: 'uppercase', color: v2Colors.ink3 },
  title: { fontFamily: v2Fonts.display, fontSize: 33, lineHeight: 34, letterSpacing: -0.66, color: v2Colors.ink, marginTop: 7 },
  dpScroll: { flexGrow: 0, flexShrink: 0, height: 80 },
  dpContent: { gap: 7, paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center' },
  dayCell: { width: 46, height: 64, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: v2Colors.line2, backgroundColor: v2Colors.paper, position: 'relative', gap: 2 },
  dayCellOn: { backgroundColor: v2Colors.spruce, borderColor: v2Colors.spruce },
  dayDow: { fontFamily: v2Fonts.bodySemiBold, fontSize: 10, letterSpacing: 10*0.08, textTransform: 'uppercase', color: v2Colors.ink3 },
  dayDowOn: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { fontFamily: v2Fonts.mono, fontSize: 17, color: v2Colors.ink },
  dayNumOn: { color: '#fff' },
  cdot: { position: 'absolute', top: 5, right: 7, width: 5, height: 5, borderRadius: 999, backgroundColor: v2Colors.spruce },
  cdotOn: { backgroundColor: v2Colors.ember },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 2, paddingBottom: 8 },
  metaL: { fontFamily: v2Fonts.bodyBold, fontSize: 13, color: v2Colors.ink },
  metaR: { fontFamily: v2Fonts.mono, fontSize: 11, color: v2Colors.ink3 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34 },
  emptyIc: { width: 64, height: 64, borderRadius: 20, backgroundColor: v2Colors.paper2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyT: { fontFamily: v2Fonts.display, fontSize: 21, color: v2Colors.ink2, marginBottom: 6 },
  emptyS: { fontFamily: v2Fonts.body, fontSize: 13, lineHeight: 19.5, color: v2Colors.ink3, textAlign: 'center' },

  /* Timeline */
  timeline: { position: 'relative', paddingLeft: TL_LEFT, paddingRight: TL_RIGHT, marginBottom: 8, marginTop: 10 },
  tlRow: { position: 'absolute', left: 0, right: TL_RIGHT, height: HOUR_PX, flexDirection: 'row', alignItems: 'flex-start' },
  tlHour: { width: TL_LEFT - 4, textAlign: 'right', fontFamily: v2Fonts.mono, fontSize: 11, color: v2Colors.ink3, transform: [{ translateY: -7 }] },
  tlLine: { flex: 1, borderTopWidth: 1, borderTopColor: v2Colors.line, height: 1 },
  nowLine: {
    position: 'absolute', left: TL_LEFT, right: TL_RIGHT,
    height: 0, borderTopWidth: 2, borderTopColor: v2Colors.ember, zIndex: 4,
  },
  nowDot: {
    position: 'absolute', left: -4, top: -4,
    width: 7, height: 7, borderRadius: 999, backgroundColor: v2Colors.ember,
  },
  nowLbl: { position: 'absolute', right: 0, top: -17, fontFamily: v2Fonts.mono, fontSize: 9, color: v2Colors.ember, backgroundColor: v2Colors.paper, paddingHorizontal: 4 },
  tlTrack: { position: 'absolute', top: 0, left: TL_LEFT, right: TL_RIGHT, bottom: 0 },

  /* Appointment card */
  appt: {
    position: 'absolute', left: 6, right: 6,
    borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: v2Colors.line, borderLeftWidth: 3,
    shadowColor: v2Colors.ink, shadowOffset: { width:0, height:1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  apptTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  apptName: { fontFamily: v2Fonts.bodyBold, fontSize: 14, color: v2Colors.ink, flex: 1 },
  apptNameDone: { color: v2Colors.ink2 },
  apptTime: { fontFamily: v2Fonts.mono, fontSize: 10.5, color: v2Colors.ink3 },
  apptSvc: { fontFamily: v2Fonts.body, fontSize: 11.5, color: v2Colors.ink2, marginTop: 2 },
  flagNow: { backgroundColor: v2Colors.ember, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  flagNowTx: { fontFamily: v2Fonts.bodySemiBold, fontSize: 8.5, letterSpacing: 8.5*0.08, textTransform: 'uppercase', color: '#fff' },
  flagDone: { backgroundColor: v2Colors.spruceSoft, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  flagDoneTx: { fontFamily: v2Fonts.bodySemiBold, fontSize: 8.5, letterSpacing: 8.5*0.08, textTransform: 'uppercase', color: v2Colors.spruce },

  /* Block card */
  blkCard: {
    position: 'absolute', left: 6, right: 6,
    borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: v2Colors.paper2,
    borderWidth: 1, borderColor: v2Colors.line2, borderStyle: 'dashed',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  blkTx: { fontFamily: v2Fonts.bodyBold, fontSize: 12.5, color: v2Colors.ink2, flex: 1 },
  blkTime: { fontFamily: v2Fonts.mono, fontSize: 10, color: v2Colors.ink3 },

  /* FAB */
  fab: { position: 'absolute', right: 18, height: 52, borderRadius: 16, backgroundColor: v2Colors.spruce, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, shadowColor: v2Colors.spruce, shadowOffset: { width:0, height:14 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, zIndex: 8 },
  fabTx: { fontFamily: v2Fonts.bodyBold, fontSize: 14.5, color: '#fff' },

  /* Toast */
  toast: { position: 'absolute', left: 18, right: 18, bottom: 110, backgroundColor: v2Colors.ink, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: v2Colors.ink, shadowOffset: { width:0, height:8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, zIndex: 30 },
  toastTx: { fontFamily: v2Fonts.bodySemiBold, fontSize: 13.5, color: '#fff' },
});
