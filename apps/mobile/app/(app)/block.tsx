/**
 * S2 — Bloklar · Takvim Bloklama
 * Design: Sıradaki-Final-Staff.html · S2
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Alert, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Ban, CheckCircle2, Coffee, MoreHorizontal, Plane,
  Plus, Trash2, User, type LucideIcon,
} from 'lucide-react-native';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';
import { supabase } from '../../lib/supabase';
import { formatTime } from '../../lib/utils';

const TR_DAYS_SHORT  = ['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'] as const;
const TR_MONTHS      = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'] as const;

type ReasonKey = 'mola' | 'kisisel' | 'izin' | 'diger';
const REASONS: { id: ReasonKey; label: string; Icon: LucideIcon }[] = [
  { id: 'mola',    label: 'Mola',    Icon: Coffee        },
  { id: 'kisisel', label: 'Kişisel', Icon: User          },
  { id: 'izin',    label: 'İzin',    Icon: Plane         },
  { id: 'diger',   label: 'Diğer',   Icon: MoreHorizontal },
];
const REASON_MAP: Record<ReasonKey, string> = { mola: 'break', kisisel: 'personal', izin: 'vacation', diger: 'other' };
// Reverse map: DB value → display info
const REASON_DISPLAY: Record<string, { label: string; Icon: LucideIcon }> = {
  break:    { label: 'Mola',    Icon: Coffee         },
  personal: { label: 'Kişisel', Icon: User           },
  vacation: { label: 'İzin',    Icon: Plane          },
  other:    { label: 'Diğer',   Icon: MoreHorizontal },
  // Turkish keys in case stored that way
  mola:    { label: 'Mola',    Icon: Coffee         },
  kisisel: { label: 'Kişisel', Icon: User           },
  izin:    { label: 'İzin',    Icon: Plane          },
  diger:   { label: 'Diğer',   Icon: MoreHorizontal },
};

interface BlockItem { id: string; startsAt: string; endsAt: string; reason: string; }

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
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
      style={[b.toast, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[14,0] }) }] }]}
    >
      <CheckCircle2 size={17} color="#9FD9BE" />
      <Text style={b.toastTx}>{text}</Text>
    </Animated.View>
  );
}

export default function BlokScreen() {
  const insets = useSafeAreaInsets();
  const [dayIndex, setDayIndex] = useState(2);
  const [blocks, setBlocks] = useState<BlockItem[]>([]);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reason, setReason] = useState<ReasonKey>('mola');
  const [startTime, setStartTime] = useState(nowHHMM());
  const [endTime, setEndTime] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: '' });

  const today = new Date(); today.setHours(0,0,0,0);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - 2 + i); return d; });
  const selectedDate = days[dayIndex];

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('staff').select('id').eq('user_id', user.id).eq('is_active', true).maybeSingle()
        .then(({ data }) => { if (data) setStaffId((data as any).id); });
    });
  }, []);

  useEffect(() => { if (staffId) fetchBlocks(); }, [staffId, dayIndex]);

  async function fetchBlocks() {
    if (!staffId) return;
    const dayStart = new Date(selectedDate); dayStart.setHours(0,0,0,0);
    const dayEnd   = new Date(selectedDate); dayEnd.setDate(selectedDate.getDate()+1); dayEnd.setHours(0,0,0,0);
    const { data } = await supabase
      .from('blocks').select('id, starts_at, ends_at, reason')
      .eq('staff_id', staffId)
      .gte('starts_at', dayStart.toISOString()).lt('starts_at', dayEnd.toISOString())
      .order('starts_at');
    setBlocks((data ?? []).map((row: any) => ({ id: row.id, startsAt: row.starts_at, endsAt: row.ends_at, reason: row.reason })));
  }

  async function handleSaveBlock() {
    if (!staffId) return;
    if (!startTime || !endTime) { Alert.alert('Hata', 'Başlangıç ve bitiş saatini gir.'); return; }
    setSaving(true);
    const d = selectedDate;
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    try {
      const { error } = await supabase.functions.invoke('create-manual-block', {
        body: { staff_id: staffId, date: dateStr, start_time: startTime, end_time: endTime, reason: REASON_MAP[reason], ...(note.trim() ? { note: note.trim() } : {}) },
      });
      if (error) throw error;
      setModalOpen(false); setNote(''); setStartTime(nowHHMM()); setEndTime(''); setReason('mola');
      await fetchBlocks();
      setToast({ visible: true, text: 'Blok eklendi' });
      setTimeout(() => setToast(t => ({ ...t, visible: false })), 2200);
    } catch { Alert.alert('Hata', 'Blok eklenemedi.'); }
    finally { setSaving(false); }
  }

  async function handleDeleteBlock(id: string) {
    Alert.alert('Bloğu Sil', 'Bu bloğu silmek istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        await supabase.from('blocks').delete().eq('id', id);
        await fetchBlocks();
      }},
    ]);
  }

  const dow = selectedDate.getDay();
  const dateLabel = `${TR_DAYS_SHORT[(dow+6)%7]} · ${selectedDate.getDate()} ${TR_MONTHS[selectedDate.getMonth()]}`;

  return (
    <SafeAreaView style={b.safe} edges={['top']}>
      <View style={b.head}>
        <Text style={b.overline}>{dateLabel}</Text>
        <Text style={b.title}>Bloklar</Text>
        <Text style={b.sub}>Mola, izin veya kişisel zamanların için takvimini blokla. Bu aralıklarda randevu alınamaz.</Text>
      </View>

      {/* Day picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={b.dpScroll} contentContainerStyle={b.dpContent}>
        {days.map((d, i) => {
          const dowIdx = (d.getDay() + 6) % 7;
          return (
            <TouchableOpacity key={i} style={[b.dayCell, i===dayIndex && b.dayCellOn]} onPress={() => setDayIndex(i)} activeOpacity={0.8}>
              <Text style={[b.dayDow, i===dayIndex && b.dayDowOn]}>{TR_DAYS_SHORT[dowIdx]}</Text>
              <Text style={[b.dayNum, i===dayIndex && b.dayNumOn]}>{d.getDate()}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={b.metaRow}>
        <Text style={b.metaL}>{blocks.length > 0 ? `${blocks.length} blok` : 'Blok yok'}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={b.listContent} showsVerticalScrollIndicator={false}>
        {blocks.length === 0 ? (
          <View style={b.empty}>
            <View style={b.emptyIc}><Ban size={28} color={v2Colors.line2} /></View>
            <Text style={b.emptyT}>Bu gün blok yok</Text>
            <Text style={b.emptyS}>Aşağıdaki "Blok Ekle" butonuna bas.</Text>
          </View>
        ) : blocks.map(blk => {
          const disp = REASON_DISPLAY[blk.reason] ?? { label: blk.reason, Icon: Ban };
          const BlkIcon = disp.Icon;
          return (
            <View key={blk.id} style={b.blkCard}>
              <View style={b.blkIc}><BlkIcon size={18} color={v2Colors.brass} /></View>
              <View style={b.blkM}>
                <Text style={b.blkReason}>{disp.label}</Text>
                <Text style={b.blkTime}>{formatTime(new Date(blk.startsAt))} – {formatTime(new Date(blk.endsAt))}</Text>
              </View>
              <View style={b.blkTypeBadge}>
                <Text style={b.blkTypeTx}>{disp.label.toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={b.blkDel} onPress={() => handleDeleteBlock(blk.id)} activeOpacity={0.7}>
                <Trash2 size={15} color={v2Colors.ink3} />
              </TouchableOpacity>
            </View>
          );
        })}
        <View style={{ height: 130 }} />
      </ScrollView>

      <TouchableOpacity style={[b.fab, { bottom: insets.bottom + 90 }]} onPress={() => setModalOpen(true)} activeOpacity={0.85}>
        <Plus size={18} color="#fff" />
        <Text style={b.fabTx}>Blok Ekle</Text>
      </TouchableOpacity>

      <Toast visible={toast.visible} text={toast.text} />

      {/* Modal */}
      {modalOpen && (
        <TouchableOpacity style={b.scrim} activeOpacity={1} onPress={() => setModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={b.sheet} onPress={e => e.stopPropagation()}>
            <View style={b.dragWrap}><View style={b.drag} /></View>
            <View style={b.sheetHdr}>
              <TouchableOpacity style={b.sheetBtn} onPress={() => setModalOpen(false)}>
                <Text style={b.sheetBtnTx}>‹</Text>
              </TouchableOpacity>
              <Text style={b.sheetTitle}>Blok Ekle</Text>
              <TouchableOpacity style={b.sheetBtn} onPress={() => setModalOpen(false)}>
                <Text style={b.sheetBtnTx}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={b.sheetBody} showsVerticalScrollIndicator={false}>
              <Text style={b.flabel}>Sebep</Text>
              <View style={b.reasonChips}>
                {REASONS.map(r => (
                  <TouchableOpacity key={r.id} style={[b.chip, reason===r.id && b.chipOn]} onPress={() => setReason(r.id)} activeOpacity={0.8}>
                    <r.Icon size={15} color={reason===r.id ? v2Colors.spruce : v2Colors.ink3} />
                    <Text style={[b.chipTx, reason===r.id && b.chipTxOn]}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={b.flabel}>Zaman Aralığı</Text>
              <View style={b.timePair}>
                <View style={b.timePill}>
                  <Text style={b.timePillL}>Başlangıç</Text>
                  <TextInput style={b.timePillV} value={startTime} onChangeText={setStartTime} keyboardType="numeric" placeholder="09:00" placeholderTextColor={v2Colors.ink3} maxLength={5} />
                </View>
                <Text style={b.timeSep}>→</Text>
                <View style={b.timePill}>
                  <Text style={b.timePillL}>Bitiş</Text>
                  <TextInput style={b.timePillV} value={endTime} onChangeText={setEndTime} keyboardType="numeric" placeholder="10:00" placeholderTextColor={v2Colors.ink3} maxLength={5} />
                </View>
              </View>
              <Text style={b.flabel}>Not (opsiyonel)</Text>
              <TextInput style={b.noteArea} value={note} onChangeText={setNote} placeholder="Öğle molası…" placeholderTextColor={v2Colors.ink3} multiline numberOfLines={2} />
            </ScrollView>
            <View style={[b.sheetFooter, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity style={[b.saveBtn, saving && { opacity:0.6 }]} onPress={handleSaveBlock} disabled={saving} activeOpacity={0.85}>
                <Ban size={18} color="#fff" />
                <Text style={b.saveBtnTx}>{saving ? 'Kaydediliyor…' : 'Bloğu Kaydet'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const b = StyleSheet.create({
  safe: { flex: 1, backgroundColor: v2Colors.paper },
  head: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 4 },
  overline: { fontFamily: v2Fonts.bodySemiBold, fontSize: 11, letterSpacing: 11*0.2, textTransform: 'uppercase', color: v2Colors.ink3 },
  title: { fontFamily: v2Fonts.display, fontSize: 33, lineHeight: 34, letterSpacing: -0.66, color: v2Colors.ink, marginTop: 7 },
  sub: { fontFamily: v2Fonts.body, fontSize: 13.5, lineHeight: 20.9, color: v2Colors.ink2, marginTop: 9 },
  dpScroll: { flexGrow: 0, flexShrink: 0, height: 80 },
  dpContent: { gap: 7, paddingHorizontal: 20, paddingVertical: 8, alignItems: 'center' },
  dayCell: { width: 46, height: 64, borderRadius: 13, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderColor: v2Colors.line2, backgroundColor: v2Colors.paper },
  dayCellOn: { backgroundColor: v2Colors.spruce, borderColor: v2Colors.spruce },
  dayDow: { fontFamily: v2Fonts.bodySemiBold, fontSize: 10, letterSpacing: 10*0.08, textTransform: 'uppercase', color: v2Colors.ink3 },
  dayDowOn: { color: 'rgba(255,255,255,0.7)' },
  dayNum: { fontFamily: v2Fonts.mono, fontSize: 17, color: v2Colors.ink },
  dayNumOn: { color: '#fff' },
  metaRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 6 },
  metaL: { fontFamily: v2Fonts.bodyBold, fontSize: 13, color: v2Colors.ink },
  listContent: { paddingHorizontal: 16, paddingTop: 4, gap: 10 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64, paddingHorizontal: 34 },
  emptyIc: { width: 64, height: 64, borderRadius: 20, backgroundColor: v2Colors.paper2, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyT: { fontFamily: v2Fonts.display, fontSize: 21, color: v2Colors.ink2, marginBottom: 6 },
  emptyS: { fontFamily: v2Fonts.body, fontSize: 13, lineHeight: 19.5, color: v2Colors.ink3, textAlign: 'center' },
  blkCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: v2Colors.card, borderWidth: 1, borderColor: v2Colors.line, borderLeftWidth: 3, borderLeftColor: v2Colors.brass, borderRadius: v2Radii.lg, padding: 13, shadowColor: v2Colors.ink, shadowOffset: { width:0, height:1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  blkIc: { width: 40, height: 40, borderRadius: 12, backgroundColor: v2Colors.brassSoft, alignItems: 'center', justifyContent: 'center' },
  blkM: { flex: 1, minWidth: 0 },
  blkReason: { fontFamily: v2Fonts.bodyBold, fontSize: 14.5, color: v2Colors.ink },
  blkTime: { fontFamily: v2Fonts.mono, fontSize: 11.5, color: v2Colors.ink2, marginTop: 2 },
  blkTypeBadge: { backgroundColor: v2Colors.brassSoft, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'center' },
  blkTypeTx: { fontFamily: v2Fonts.mono, fontSize: 9, fontWeight: '700' as const, letterSpacing: 9 * 0.1, color: v2Colors.brass },
  blkDel: { width: 34, height: 34, borderRadius: 10, backgroundColor: v2Colors.paper2, alignItems: 'center', justifyContent: 'center' },
  fab: { position: 'absolute', right: 18, height: 52, borderRadius: 16, backgroundColor: v2Colors.spruce, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, shadowColor: v2Colors.spruce, shadowOffset: { width:0, height:14 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8, zIndex: 8 },
  fabTx: { fontFamily: v2Fonts.bodyBold, fontSize: 14.5, color: '#fff' },
  toast: { position: 'absolute', left: 18, right: 18, bottom: 110, backgroundColor: v2Colors.ink, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, shadowColor: v2Colors.ink, shadowOffset: { width:0, height:8 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 8, zIndex: 30 },
  toastTx: { fontFamily: v2Fonts.bodySemiBold, fontSize: 13.5, color: '#fff' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(27,24,19,0.42)', zIndex: 20, justifyContent: 'flex-end' },
  sheet: { backgroundColor: v2Colors.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '88%' },
  dragWrap: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  drag: { width: 40, height: 5, borderRadius: 3, backgroundColor: v2Colors.line2 },
  sheetHdr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: v2Colors.line },
  sheetBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: v2Colors.paper2, alignItems: 'center', justifyContent: 'center' },
  sheetBtnTx: { fontFamily: v2Fonts.bodyBold, fontSize: 18, color: v2Colors.ink2 },
  sheetTitle: { flex: 1, textAlign: 'center', fontFamily: v2Fonts.display, fontSize: 19, color: v2Colors.ink },
  sheetBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  flabel: { fontFamily: v2Fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 10.5*0.16, textTransform: 'uppercase', color: v2Colors.ink3, marginBottom: 9 },
  reasonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderColor: v2Colors.line2, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  chipOn: { borderColor: v2Colors.spruce, backgroundColor: v2Colors.spruceSoft },
  chipTx: { fontFamily: v2Fonts.bodyBold, fontSize: 13, color: v2Colors.ink },
  chipTxOn: { color: v2Colors.spruce },
  timePair: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  timePill: { flex: 1, borderWidth: 1.5, borderColor: v2Colors.line2, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: v2Colors.paper },
  timePillL: { fontFamily: v2Fonts.bodySemiBold, fontSize: 9, letterSpacing: 9*0.12, textTransform: 'uppercase', color: v2Colors.ink3 },
  timePillV: { fontFamily: v2Fonts.mono, fontSize: 17, color: v2Colors.ink, marginTop: 2 },
  timeSep: { fontFamily: v2Fonts.bodyBold, fontSize: 16, color: v2Colors.ink3 },
  noteArea: { borderWidth: 1.5, borderColor: v2Colors.line2, borderRadius: 13, padding: 12, fontFamily: v2Fonts.body, fontSize: 14, color: v2Colors.ink, marginBottom: 20, minHeight: 58, lineHeight: 21 },
  sheetFooter: { paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: v2Colors.line, backgroundColor: v2Colors.paper },
  saveBtn: { height: 52, borderRadius: 15, backgroundColor: v2Colors.spruce, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, shadowColor: v2Colors.spruce, shadowOffset: { width:0, height:10 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  saveBtnTx: { fontFamily: v2Fonts.bodyBold, fontSize: 15.5, color: '#fff' },
});
