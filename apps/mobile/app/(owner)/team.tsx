/**
 * M5 · Ekip Yönetimi (Team)
 * Pixel-perfect conversion from index.html EkipScreen + StaffScheduleModal
 *
 * Includes:
 *  - OverlineHeader: eyebrow "Ekip Yönetimi", title "Ustalar", trailing "Personel ekle" button
 *  - Staff rows with exact dummy data:
 *      Mehmet Demir · Aktif · %50 komisyon · Pzt–Cmt 09–19
 *      Can Aslan    · Aktif · %50 komisyon · Pzt–Cum 10–20
 *      Ayşe Yılmaz  · Aktif · Komisyon yok · Sal–Cmt 10–18
 *      Burak Şahin  · Pasif · Komisyon yok
 *  - Status toggle with Alert (exact strings: "Durumu Değiştir", "Pasif yap"/"Aktif yap", "Vazgeç")
 *  - Add staff sheet with name + email fields, "Ekle" button
 *  - Commission sheet with commission rate field, "Kaydet" button
 *  - StaffScheduleModal: 7-day tab grid (day tabs), open/closed toggle,
 *      start/end time fields, break fields, "Tüm Günleri Kaydet" button
 *  - Custom Toggle: 44×26, brand-600=on / slate-200=off, white thumb 22×22, Animated
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Pencil, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';
import { buildOwnerRoleFilter, isMissingColumnError } from '../../lib/supabase-role';
import { StaffEditSheet, type StaffMember as EditableStaffMember } from '../../components/StaffEditSheet';

const FN_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';
import {
  rowsToStaffSchedule,
  staffScheduleToRows,
  type UiStaffScheduleDay,
} from '../../lib/staff-schedule';

/* ─── Data ──────────────────────────────────────────────────── */

interface StaffMember {
  id: string;
  name: string;
  status: 'Aktif' | 'Pasif';
  meta: string;
  _role?: string | null;
  _phone?: string | null;
  _is_active?: boolean;
}

interface StaffRow {
  id: string;
  name: string | null;
  phone?: string | null;
  role: string | null;
  is_active: boolean;
}

interface CommissionRow {
  staff_id: string;
  commission_type: string | null;
  commission_rate_bps: number | null;
}

const INIT_STAFF: StaffMember[] = [];

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

const DEFAULT_SCHEDULE = TR_DAYS.map((d, i) => ({
  day: d,
  open: i >= 1 && i <= 6,
  start: '09:00',
  end: '19:00',
  breakStart: '',
  breakEnd: '',
}));

/* ─── Toggle ────────────────────────────────────────────────── */

interface ToggleProps {
  on: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ on, onChange }: ToggleProps) {
  const anim = useRef(new Animated.Value(on ? 1 : 0)).current;

  function handlePress() {
    const toVal = on ? 0 : 1;
    Animated.timing(anim, {
      toValue: toVal,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onChange(!on);
  }

  const bgColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [v2Colors.line, v2Colors.spruce],
  });
  const thumbLeft = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 20],
  });

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={[styles.toggleTrack, { backgroundColor: bgColor }]}>
        <Animated.View style={[styles.toggleThumb, { left: thumbLeft }]} />
      </Animated.View>
    </Pressable>
  );
}

/* ─── StaffScheduleModal ────────────────────────────────────── */

interface StaffScheduleModalProps {
  open: boolean;
  onClose: () => void;
  staffId: string | null;
  staffName: string;
  onSaved?: () => void;
}

function StaffScheduleModal({ open, onClose, staffId, staffName, onSaved }: StaffScheduleModalProps) {
  const [schedule, setSchedule] = useState<UiStaffScheduleDay[]>(DEFAULT_SCHEDULE);
  const [selDay,   setSelDay]   = useState(1);
  const [saving, setSaving] = useState(false);
  const day = schedule[selDay];

  useEffect(() => {
    if (!open) return;
    setSelDay(1);
    if (!staffId) {
      setSchedule(DEFAULT_SCHEDULE);
      return;
    }
    supabase
      .from('staff_schedules')
      .select('day_of_week, is_working, work_start, work_end, break_start, break_end')
      .eq('staff_id', staffId)
      .then(({ data, error }) => {
        if (error) {
          Alert.alert('Hata', 'Çalışma saatleri yüklenemedi.');
          return;
        }
        setSchedule(rowsToStaffSchedule((data ?? []) as any));
      });
  }, [open, staffId]);

  function updateDay(field: keyof UiStaffScheduleDay, val: string | boolean) {
    setSchedule((s) => s.map((d, i) => i === selDay ? { ...d, [field]: val } : d));
  }

  async function handleSave() {
    if (!staffId) {
      Alert.alert('Hata', 'Personel bilgisi bulunamadı.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff_schedules')
        .upsert(staffScheduleToRows(staffId, schedule) as any, { onConflict: 'staff_id,day_of_week' });
      if (error) {
        Alert.alert('Hata', 'Çalışma saatleri kaydedilemedi.');
        return;
      }
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title */}
            <View style={styles.scheduleHeaderBlock}>
              <Text style={styles.scheduleEyebrow}>Çalışma Saatleri</Text>
              <Text style={styles.scheduleTitle}>{staffName || 'Personel'}</Text>
            </View>

            {/* Day tabs */}
            <View style={styles.dayTabsRow}>
              {schedule.map((d, i) => {
                const isSel = selDay === i;
                return (
                  <TouchableOpacity
                    key={d.day}
                    onPress={() => setSelDay(i)}
                    style={[
                      styles.dayTab,
                      isSel
                        ? styles.dayTabSel
                        : d.open
                          ? styles.dayTabOpen
                          : styles.dayTabClosed,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        isSel
                          ? styles.dayTabTextSel
                          : d.open
                            ? styles.dayTabTextOpen
                            : styles.dayTabTextClosed,
                      ]}
                    >
                      {d.day}
                    </Text>
                    <View
                      style={[
                        styles.dayTabDot,
                        {
                          backgroundColor: d.open
                            ? isSel
                              ? 'rgba(255,255,255,0.45)'
                              : v2Colors.spruce
                            : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Open toggle */}
            <View style={styles.openToggleCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openToggleTitle}>Çalışıyor</Text>
                  <Text style={styles.openToggleSub}>
                    {day.open ? 'Bu gün aktif' : 'Bu gün tatil / kapalı'}
                  </Text>
                </View>
                <Toggle on={day.open} onChange={(v) => updateDay('open', v)} />
              </View>
            </View>

            {day.open && (
              <>
                {/* Çalışma Saatleri */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionLabel}>Çalışma Saatleri</Text>
                  <View style={styles.timeGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Açılış</Text>
                      <TextInput
                        value={day.start}
                        onChangeText={(v) => updateDay('start', v)}
                        placeholder="09:00"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Kapanış</Text>
                      <TextInput
                        value={day.end}
                        onChangeText={(v) => updateDay('end', v)}
                        placeholder="19:00"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                  </View>
                </View>

                {/* Mola */}
                <View style={styles.timeSection}>
                  <Text style={styles.timeSectionLabel}>Mola (Opsiyonel)</Text>
                  <View style={styles.timeGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Mola Başlangıç</Text>
                      <TextInput
                        value={day.breakStart}
                        onChangeText={(v) => updateDay('breakStart', v)}
                        placeholder="--:--"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Mola Bitiş</Text>
                      <TextInput
                        value={day.breakEnd}
                        onChangeText={(v) => updateDay('breakEnd', v)}
                        placeholder="--:--"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                  </View>
                  <View style={styles.breakHintBox}>
                    <Text style={styles.breakHintText}>
                      Mola saatleri müşteri randevu ekranında otomatik kapalı görünür.
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              style={styles.primaryBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Tüm Günleri Kaydet</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Add Staff Sheet ───────────────────────────────────────── */

interface AddStaffSheetProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, commissionRate: number | null) => void;
}

function AddStaffSheet({ open, onClose, onAdd }: AddStaffSheetProps) {
  const [name,  setName]  = useState('');
  const [commInput, setCommInput] = useState('');

  function handleAdd() {
    if (name.trim().length < 2) {
      Alert.alert('Geçersiz', 'Geçerli bir ad gir.');
      return;
    }
    const rate = commInput.trim() ? parseFloat(commInput) : null;
    if (rate !== null && (isNaN(rate) || rate < 0 || rate > 100)) {
      Alert.alert('Geçersiz', 'Komisyon 0-100 arasında olmalı.');
      return;
    }
    onAdd(name.trim(), rate);
    setName(''); setCommInput('');
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Personel Ekle</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.sheetCancelBtn}>İptal</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ad Soyad */}
            <View>
              <Text style={styles.fieldLabel}>Ad Soyad</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ad Soyad"
                placeholderTextColor={v2Colors.ink3}
                autoCorrect={false}
                spellCheck={false}
                style={styles.textInput}
              />
            </View>

            {/* Komisyon */}
            <View>
              <Text style={styles.fieldLabel}>Komisyon Oranı (%)</Text>
              <TextInput
                value={commInput}
                onChangeText={setCommInput}
                placeholder="Örn. 50"
                placeholderTextColor={v2Colors.ink3}
                keyboardType="numeric"
                style={styles.textInput}
              />
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              style={[styles.primaryBtn, name.trim().length < 2 && styles.primaryBtnDisabled]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Ekle</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── Commission Sheet ──────────────────────────────────────── */

interface CommissionSheetProps {
  open: boolean;
  onClose: () => void;
  staffName: string;
  onSave: (rate: number) => void;
}

function CommissionSheet({ open, onClose, staffName, onSave }: CommissionSheetProps) {
  const [commInput, setCommInput] = useState('');

  function handleSave() {
    const val = parseFloat(commInput);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert('Geçersiz', '0 ile 100 arasında oran gir.');
      return;
    }
    onSave(val);
    setCommInput('');
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Komisyon Oranı</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.sheetCancelBtn}>İptal</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sheetBodyContent}>
            {staffName ? (
              <Text style={styles.commDesc}>{staffName} için yüzde oran gir.</Text>
            ) : null}
            <View>
              <Text style={styles.fieldLabel}>Oran (%)</Text>
              <TextInput
                value={commInput}
                onChangeText={setCommInput}
                placeholder="Örn. 50"
                placeholderTextColor={v2Colors.ink3}
                keyboardType="numeric"
                style={styles.textInput}
              />
            </View>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.primaryBtn, { marginTop: 8 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── StaffRow ──────────────────────────────────────────────── */

interface StaffRowItemProps {
  member: StaffMember;
  index: number;
  onRowPress: () => void;
  onChevronPress: () => void;
}

function StaffRowItem({ member, index, onRowPress, onChevronPress }: StaffRowItemProps) {
  const initials = member.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const isOwner = member._role === 'admin';
  const isActive = member.status === 'Aktif';
  const statusLabel = isActive ? 'Aktif' : 'Bekliyor';
  const metaText = isOwner
    ? 'Sen · tüm yetkiler'
    : isActive
      ? (index % 2 === 0 ? '10:00 – 20:00 · Sal-Paz' : '09:00 – 19:00 · Pzt-Cmt')
      : 'Davet bekleniyor';

  return (
    <TouchableOpacity
      onPress={onRowPress}
      style={styles.staffRow}
      activeOpacity={0.75}
    >
      <View style={[styles.staffAvatar, isOwner ? styles.staffAvatarOwner : styles.staffAvatarStaff]}>
        <Text style={[styles.staffAvatarText, isOwner && styles.staffAvatarOwnerText]}>{initials}</Text>
      </View>

      <View style={styles.staffBody}>
        <View style={styles.staffNameRow}>
          <Text style={styles.staffName}>{member.name}</Text>
          <View style={[styles.roleBadge, isOwner ? styles.ownerBadge : styles.staffBadge]}>
            <Text style={[styles.roleBadgeText, isOwner ? styles.ownerBadgeText : styles.staffBadgeText]}>
              {isOwner ? 'Sahip' : 'Usta'}
            </Text>
          </View>
        </View>
        <Text style={styles.staffMeta} numberOfLines={1}>{metaText}</Text>
      </View>

      <View style={styles.staffRight}>
        <View style={styles.staffStatus}>
          <View style={[styles.statusDot, isActive ? styles.statusDotActive : styles.statusDotPending]} />
          <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextPending]}>
            {statusLabel}
          </Text>
        </View>
        {!isOwner && (
          <TouchableOpacity onPress={onChevronPress} hitSlop={10} style={styles.editIconBtn} activeOpacity={0.8}>
            <Pencil size={17} color={v2Colors.ink3} strokeWidth={2.2} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

/* ─── Main Screen ───────────────────────────────────────────── */

export default function TeamScreen() {
  const router = useRouter();
  const [staff,          setStaff]          = useState<StaffMember[]>(INIT_STAFF);
  const [addOpen,        setAddOpen]        = useState(false);
  const [scheduleOpen,   setScheduleOpen]   = useState(false);
  const [commOpen,       setCommOpen]       = useState(false);
  const [selectedId,     setSelectedId]     = useState<string | null>(null);
  const [shopId,         setShopId]         = useState<string | null>(null);
  const [inviteLoading,  setInviteLoading]  = useState(false);
  const [editStaff,      setEditStaff]      = useState<EditableStaffMember | null>(null);
  const [editVisible,    setEditVisible]    = useState(false);

  const selected = staff.find((s) => s.id === selectedId);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr) console.warn('[team] auth error:', authErr);
    if (!user) { console.warn('[team] no user — not logged in'); return; }
    const { data: shopData, error: shopErr } = await supabase
      .from('shops')
      .select('id')
      .or(buildOwnerRoleFilter(user.id))
      .maybeSingle();
    if (shopErr) { console.warn('[team] shops error:', shopErr); Alert.alert('Hata', `Dükkan yüklenemedi: ${shopErr.message}`); return; }
    if (!shopData) { console.warn('[team] no shop for user', user.id); return; }
    setShopId(shopData.id);
    // Commission columns are not directly SELECTable (see migration 20260518120000);
    // owners must read them via the get_staff_commission_configs RPC.
    const [staffResult, { data: commData, error: commErr }] = await Promise.all([
      supabase
        .from('staff')
        .select('id, name, is_active, phone, role')
        .eq('shop_id', shopData.id)
        .order('created_at'),
      supabase.rpc('get_staff_commission_configs', { p_shop_id: shopData.id }),
    ]);
    let data: StaffRow[] | null = staffResult.data as StaffRow[] | null;
    let staffErr = staffResult.error;
    if (isMissingColumnError(staffErr, 'staff.phone')) {
      const fallback = await supabase
        .from('staff')
        .select('id, name, is_active, role')
        .eq('shop_id', shopData.id)
        .order('created_at');
      data = fallback.data as StaffRow[] | null;
      staffErr = fallback.error;
    }
    if (staffErr) { console.warn('[team] staff error:', staffErr); Alert.alert('Hata', `Personel listesi yüklenemedi: ${staffErr.message}`); return; }
    if (commErr) console.warn('[team] commission RPC error:', commErr);
    const commByStaff = new Map<string, { type: string | null; bps: number | null }>();
    (commData as CommissionRow[] | null ?? []).forEach((c) => commByStaff.set(c.staff_id, { type: c.commission_type, bps: c.commission_rate_bps }));
    console.log('[team] loaded', (data ?? []).length, 'staff for shop', shopData.id);
    const mapped = (data ?? []).map((s) => {
      const c = commByStaff.get(s.id);
      return {
        id: s.id,
        name: s.name?.trim() || 'İsimsiz personel',
        status: (s.is_active ? 'Aktif' : 'Pasif') as 'Aktif' | 'Pasif',
        meta: c?.type === 'percentage' && c.bps
          ? `%${Math.round(c.bps / 100)} komisyon`
          : 'Komisyon yok',
        _role: s.role as string | null,
        _phone: s.phone as string | null,
        _is_active: s.is_active as boolean,
      };
    });
    const sorted = mapped.sort((a, b) => {
      if (a._role === 'admin') return -1;
      if (b._role === 'admin') return 1;
      return (a.name ?? '').localeCompare(b.name ?? '', 'tr');
    });
    setStaff(sorted);
  }

  function handleToggleStatus(s: StaffMember) {
    const verb = s.status === 'Aktif' ? 'pasif yap' : 'aktif yap';
    Alert.alert(
      'Durumu Değiştir',
      `${s.name} personelini ${verb}?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: s.status === 'Aktif' ? 'Pasif yap' : 'Aktif yap',
          onPress: async () => {
            const newIsActive = s.status === 'Aktif' ? false : true;
            await supabase.from('staff').update({ is_active: newIsActive }).eq('id', s.id);
            setStaff((prev) =>
              prev.map((p) =>
                p.id === s.id
                  ? { ...p, status: p.status === 'Aktif' ? 'Pasif' : 'Aktif' }
                  : p,
              ),
            );
          },
        },
      ],
    );
  }

  async function handleAddStaff(name: string, commissionRate: number | null) {
    if (!shopId) {
      Alert.alert('Hata', 'Dükkan bilgisi yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }

    const { data, error: insertErr } = await supabase
      .from('staff')
      .insert({
        shop_id: shopId,
        name: name.trim(),
        role: 'staff',
        is_active: true,
      } as any)
      .select('id, name, is_active')
      .single();

    if (insertErr || !data) {
      console.warn('[team] add-staff failed:', insertErr);
      const msg = (insertErr as any)?.message ?? 'bilinmeyen hata';
      Alert.alert('Hata', `Personel eklenemedi: ${msg}`);
      return;
    }
    console.log('[team] added staff', (data as any).id);

    // Commission is owner-scoped; must go through the SECURITY DEFINER RPC.
    if (commissionRate !== null) {
      const { error: commErr } = await supabase.rpc('update_staff_commission_config', {
        p_staff_id: (data as any).id,
        p_commission_type: 'percentage',
        p_commission_rate_bps: Math.round(commissionRate * 100),
      });
      if (commErr) {
        console.warn('[team] commission update failed:', commErr);
        Alert.alert('Uyarı', `Personel eklendi ama komisyon kaydedilemedi: ${commErr.message}`);
      }
    }

    setStaff((prev) => [
      ...prev,
      {
        id: (data as any).id,
        name: (data as any).name,
        status: 'Aktif',
        meta: commissionRate !== null ? `%${commissionRate} komisyon` : 'Komisyon yok',
      },
    ]);
    setAddOpen(false);
  }

  async function handleSaveCommission(rate: number) {
    if (selectedId) {
      const { error: commErr } = await supabase.rpc('update_staff_commission_config', {
        p_staff_id: selectedId,
        p_commission_type: 'percentage',
        p_commission_rate_bps: Math.round(rate * 100),
      });
      if (commErr) {
        console.warn('[team] commission update failed:', commErr);
        Alert.alert('Hata', `Komisyon kaydedilemedi: ${commErr.message}`);
        return;
      }
    }
    setStaff((prev) =>
      prev.map((p) =>
        p.id === selectedId
          ? { ...p, meta: p.meta.replace(/(?:Komisyon yok|%\d+ komisyon)/, `%${rate} komisyon`) }
          : p,
      ),
    );
    setCommOpen(false);
  }

  async function handleInvite() {
    setInviteLoading(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) {
        Alert.alert('Hata', 'Oturum süresi doldu, tekrar giriş yap.');
        return;
      }
      const res = await fetch(`${FN_BASE}/invite-barber`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        Alert.alert('Hata', d.error ?? 'Davet linki oluşturulamadı');
        return;
      }
      const { invite_link } = await res.json();
      if (!invite_link) { Alert.alert('Hata', 'Davet linki alınamadı'); return; }

      await Share.share({
        message: `Sıradaki uygulamasına berber olarak katılmak için:\n${invite_link}`,
        url: invite_link, // iOS'ta ayrıca URL olarak gösterilir
      });
    } catch (e: any) {
      // Kullanıcı share sheet'i kapattıysa hata verme
      if (e?.name !== 'AbortError') {
        Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
      }
    } finally {
      setInviteLoading(false);
    }
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
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Dükkan Personeli</Text>
          <Text style={styles.pageTitle}>Ekip</Text>
        </View>

        <View style={styles.inviteCard}>
          <Text style={styles.inviteEyebrow}>Yeni Berber</Text>
          <Text style={styles.inviteTitle}>Ekibe usta ekle</Text>
          <Text style={styles.inviteBody}>
            Davet linki oluştur, berber uygulamadan{'\n'}
            katılsın. Link 48 saat geçerli.
          </Text>
          <TouchableOpacity
            style={[styles.inviteButton, inviteLoading && { opacity: 0.65 }]}
            onPress={handleInvite}
            disabled={inviteLoading}
            activeOpacity={0.84}
          >
            <UserPlus size={17} color={v2Colors.spruce} strokeWidth={2.25} />
            <Text style={styles.inviteButtonText}>
              {inviteLoading ? 'Oluşturuluyor' : 'Davet Et'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.inviteWatermark}>›</Text>
        </View>

        <View style={styles.staffSectionHeader}>
          <Text style={styles.sectionLabel}>Ustalar</Text>
          <Text style={styles.staffCount}>{`${staff.length} kişi`}</Text>
        </View>

        {staff.length === 0 ? (
          <Text style={styles.emptyText}>Henüz personel yok. Davet linki oluşturarak usta ekleyebilirsiniz.</Text>
        ) : (
          <View style={styles.staffList}>
            {staff.map((s, i) => (
              <StaffRowItem
                key={s.id}
                member={s}
                index={i}
                onRowPress={() => {
                  setEditStaff({
                    id: s.id,
                    name: s.name,
                    phone: s._phone ?? undefined,
                    is_active: s._is_active ?? s.status === 'Aktif',
                    role: s._role ?? undefined,
                  });
                  setEditVisible(true);
                }}
                onChevronPress={() => {
                  setSelectedId(s.id);
                  setScheduleOpen(true);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add staff sheet */}
      <AddStaffSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddStaff}
      />

      {/* Commission sheet */}
      <CommissionSheet
        open={commOpen}
        onClose={() => setCommOpen(false)}
        staffName={selected?.name ?? ''}
        onSave={handleSaveCommission}
      />

      {/* Schedule sheet */}
      <StaffScheduleModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        staffId={selected?.id ?? null}
        staffName={selected?.name ?? ''}
        onSaved={loadStaff}
      />

      {/* Edit staff sheet */}
      <StaffEditSheet
        staff={editStaff}
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onSaved={loadStaff}
      />
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────── */

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
    top: 16,
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

  /* Header */
  header: {
    paddingBottom: 29,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: v2Colors.ember,
  },
  pageTitle: {
    fontSize: 39,
    lineHeight: 42,
    fontFamily: v2Fonts.display,
    color: v2Colors.ink,
    marginTop: 1,
  },
  headerAddBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 4,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  headerAddBtnPlus: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
    lineHeight: 16,
  },
  headerAddBtnText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 13,
  },

  /* List */
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 40,
    paddingTop: 92,
    paddingBottom: 128,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: v2Fonts.bodyMedium,
    color: v2Colors.ink3,
    marginTop: 10,
    textAlign: 'center',
  },

  inviteCard: {
    minHeight: 212,
    backgroundColor: v2Colors.spruce,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    overflow: 'hidden',
    marginBottom: 32,
    shadowColor: '#184A3A',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  inviteEyebrow: {
    fontSize: 10,
    lineHeight: 13,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 2.1,
    textTransform: 'uppercase',
    color: 'rgba(251,248,241,0.62)',
  },
  inviteTitle: {
    marginTop: 5,
    fontSize: 22,
    lineHeight: 26,
    fontFamily: v2Fonts.display,
    color: v2Colors.card,
  },
  inviteBody: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 19,
    fontFamily: v2Fonts.bodyBold,
    color: 'rgba(251,248,241,0.72)',
  },
  inviteButton: {
    marginTop: 20,
    height: 43,
    alignSelf: 'flex-start',
    paddingHorizontal: 17,
    borderRadius: 12,
    backgroundColor: v2Colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  inviteButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.spruce,
  },
  inviteWatermark: {
    position: 'absolute',
    right: 4,
    bottom: -23,
    fontSize: 180,
    lineHeight: 180,
    fontFamily: v2Fonts.bodyMedium,
    color: 'rgba(255,255,255,0.1)',
  },
  staffSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: v2Colors.ink3,
  },
  staffCount: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink3,
  },

  /* Staff card */
  staffCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: v2Radii.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  staffList: {
    gap: 13,
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: v2Colors.line,
    backgroundColor: v2Colors.card,
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  staffRowBorder: {
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
  },
  staffAvatar: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  staffAvatarOwner: {
    backgroundColor: v2Colors.spruce,
  },
  staffAvatarStaff: {
    backgroundColor: v2Colors.paper2,
  },
  staffAvatarPasif: {
    backgroundColor: v2Colors.paper2,
  },
  staffAvatarText: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.spruce,
  },
  staffAvatarOwnerText: {
    color: v2Colors.card,
  },
  staffBody: {
    flex: 1,
    minWidth: 0,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    flexWrap: 'nowrap',
  },
  staffName: {
    fontSize: 17,
    lineHeight: 20,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink,
    flexShrink: 1,
  },
  staffMeta: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: v2Fonts.mono,
    color: v2Colors.ink3,
    marginTop: 3,
  },
  roleBadge: {
    height: 20,
    borderRadius: 7,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerBadge: {
    backgroundColor: v2Colors.brassSoft,
  },
  staffBadge: {
    backgroundColor: v2Colors.spruceSoft,
  },
  roleBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ownerBadgeText: {
    color: v2Colors.brass,
  },
  staffBadgeText: {
    color: v2Colors.spruce,
  },
  staffRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 12,
    minWidth: 74,
  },
  staffStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  statusDotActive: {
    backgroundColor: v2Colors.spruce,
  },
  statusDotPending: {
    backgroundColor: v2Colors.brass,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: v2Fonts.bodyBold,
  },
  statusTextActive: {
    color: v2Colors.spruce,
  },
  statusTextPending: {
    color: v2Colors.brass,
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: v2Colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: v2Colors.card,
  },
  pasifBadge: {
    backgroundColor: v2Colors.paper2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pasifBadgeText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
  },
  chevronBtn: { padding: 4 },
  chevronWrap: { alignItems: 'center', height: 16, justifyContent: 'center', width: 16 },
  chevronLine1: {
    backgroundColor: v2Colors.ink3,
    borderRadius: 1,
    height: 1.6,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }, { translateY: -3 }],
    width: 8,
  },
  chevronLine2: {
    backgroundColor: v2Colors.ink3,
    borderRadius: 1,
    height: 1.6,
    position: 'absolute',
    transform: [{ rotate: '45deg' }, { translateY: 3 }],
    width: 8,
  },

  /* Toggle */
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 999,
    flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },

  /* Sheet shared */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.38)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: v2Colors.paper,
    borderTopLeftRadius: v2Radii.sheet,
    borderTopRightRadius: v2Radii.sheet,
    elevation: 16,
    maxHeight: '88%',
    paddingBottom: 32,
    shadowColor: v2Colors.ink,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
  },
  sheetHandle: {
    alignSelf: 'center',
    backgroundColor: v2Colors.line2,
    borderRadius: 3,
    height: 5,
    marginBottom: 6,
    marginTop: 11,
    width: 38,
  },
  sheetHeader: {
    alignItems: 'center',
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  sheetTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 20,
  },
  sheetCancelBtn: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
  sheetBody: { flexShrink: 1 },
  sheetBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 16,
  },

  /* Schedule sheet */
  scheduleHeaderBlock: {
    marginBottom: 16,
  },
  scheduleEyebrow: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.2,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scheduleTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 22,
  },

  /* Day tabs */
  dayTabsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 18,
  },
  dayTab: {
    flex: 1,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
  },
  dayTabSel: {
    backgroundColor: v2Colors.ink,
    borderColor: v2Colors.ink,
  },
  dayTabOpen: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
  },
  dayTabClosed: {
    backgroundColor: v2Colors.paper2,
    borderColor: v2Colors.line2,
  },
  dayTabText: {
    fontFamily: v2Fonts.bodyBold,
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dayTabTextSel: { color: v2Colors.paper },
  dayTabTextOpen: { color: v2Colors.ink },
  dayTabTextClosed: { color: v2Colors.ink3 },
  dayTabDot: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },

  /* Open toggle card */
  openToggleCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  openToggleTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 15,
  },
  openToggleSub: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },

  /* Time section */
  timeSection: {
    gap: 8,
  },
  timeSectionLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  timeGrid: { flexDirection: 'row', gap: 10 },
  timeFieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  timeInput: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 10,
    borderWidth: 1,
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  breakHintBox: {
    backgroundColor: v2Colors.paper2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  breakHintText: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    lineHeight: 17,
  },

  fieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 10,
    borderWidth: 1,
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  primaryBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 15,
  },

  commDesc: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 14,
  },

  addButton: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 15,
  },

  inviteBox: {
    backgroundColor: v2Colors.paper2,
    borderRadius: v2Radii.sm,
    marginTop: 8,
    padding: 12,
  },
  inviteText: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.mono,
    fontSize: 12,
  },
});
