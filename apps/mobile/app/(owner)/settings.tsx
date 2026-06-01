/**
 * M6 · Ayarlar (Settings)
 * Pixel-perfect conversion combining:
 *   - index.html AyarlarScreen (M6)
 *   - screen-30-profile-editor.html (ProfileEditorSheet)
 *   - screen-23-hours.html (HoursEditorSheet)
 *
 * Includes:
 *  - OverlineHeader: eyebrow "Dükkan Ayarları", title "Ayarlar",
 *      meta "Widget bağlantılarını yönet ve hesabından çıkış yap."
 *  - Account info card: "Dükkan Sahibi" overline, "Keskin Berber", "berber@keskin.com"
 *  - Profile card (clickable → ProfileEditorSheet):
 *      48×48 brand-600 avatar (initials "KB"), shop name, city · slug, "Düzenle" + chevron
 *  - "Operasyon" section:
 *      - Komisyon takibi row with custom Toggle
 *          on:  "Kazanç raporu açık."
 *          off: "Randevu akışı değişmez."
 *      - Dükkan Saatleri row → HoursEditorSheet
 *          subtitle: "Pzt–Cum 09:00–19:00 · Cmt 10:00–17:00 · Paz kapalı"
 *  - "Widget Bağlantıları" section:
 *      - Existing link card: "wgt_a4f9…2b1c" mono, "Son 3 May 2026", "Sil" danger button
 *      - "+ Yeni Bağlantı" secondary button
 *  - "Çıkış yap" danger button → Alert
 *      "Çıkış Yap", "Hesaptan çıkmak istediğine emin misin?", "Vazgeç" / "Çıkış yap"
 *
 * ProfileEditorSheet (from screen-30):
 *  - Sheet title "Dükkan Bilgileri" + İptal
 *  - Avatar preview card with initials, "Önizleme" badge
 *  - Fields: Dükkan Adı (hint), Adres, Telefon (hint)
 *  - Hakkında textarea (bio.length/200 karakter)
 *  - "Profil Görünür" toggle ("Müşteriler dükkanı bulabilir" / "Dükkan arama sonuçlarında gizli")
 *  - Rezervasyon Linki info box: "siradaki.app/keskin-berber"
 *  - "Kaydet" primary btn
 *  - Success state: mint circle, "Kaydedildi", success text, "Tamam"
 *
 * HoursEditorSheet (from screen-23):
 *  - "Dükkan Saatleri" overline, "Çalışma Saatleri" title,
 *    "Keskin Berber · Müşteri randevu ekranında görünür" subtitle
 *  - 7-day tab grid (Pzt–Paz) with mint dot for open days
 *  - "Açık" toggle ("Bu gün hizmet veriliyor" / "Bu gün kapalı")
 *  - When open: "Çalışma Saatleri" grid (Açılış / Kapanış), "Mola" field
 *    mola hint text, preview row ("{day} önizleme" · "HH:MM–HH:MM")
 *  - "Tüm Günleri Kaydet" primary btn
 *
 * Custom Toggle: 44×26, brand-600=on / slate-200=off, white thumb 22×22, Animated
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
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { ChevronRight, Clock, Code2, Copy, Mail, MapPin, Scissors, Store } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { v2Colors, v2Fonts, v2Radii } from '../../lib/v2-tokens';
import {
  shopHoursScheduleFromWorkingHours,
  shopHoursScheduleToRows,
  shopHoursScheduleToWorkingHours,
} from '../../lib/staff-schedule';

/* ─── Constants ─────────────────────────────────────────────── */

const INIT_SCHEDULE = [
  { id: 'pzt', label: 'Pzt', open: true,  start: '09:00', end: '19:00', brk: '' },
  { id: 'sal', label: 'Sal', open: true,  start: '09:00', end: '19:00', brk: '' },
  { id: 'car', label: 'Çar', open: true,  start: '09:00', end: '19:00', brk: '13:00' },
  { id: 'per', label: 'Per', open: true,  start: '09:00', end: '19:00', brk: '' },
  { id: 'cum', label: 'Cum', open: true,  start: '09:00', end: '19:00', brk: '' },
  { id: 'cmt', label: 'Cmt', open: true,  start: '10:00', end: '17:00', brk: '' },
  { id: 'paz', label: 'Paz', open: false, start: '',      end: '',      brk: '' },
];

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

/* ─── ShareLinkBox ──────────────────────────────────────────── */

interface ShareLinkBoxProps {
  slug: string;
}

function ShareLinkBox({ slug }: ShareLinkBoxProps) {
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const url = slug ? `https://siradaki.app/${slug}` : '';
  const disabled = !slug;

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  async function handleCopy() {
    if (disabled) return;
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      Alert.alert('Hata', 'Link panoya kopyalanamadı.');
    }
  }

  async function handleShare() {
    if (disabled) return;
    try {
      await Share.share({ message: url });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <View style={styles.slugBox}>
      <Text style={styles.slugLabel}>Rezervasyon Linki</Text>
      <Text style={styles.slugValue} numberOfLines={1} ellipsizeMode="middle">
        {disabled ? 'siradaki.app/—' : `siradaki.app/${slug}`}
      </Text>
      <View style={styles.slugBtnRow}>
        <TouchableOpacity
          onPress={handleCopy}
          disabled={disabled}
          style={[styles.slugSecondaryBtn, disabled && styles.slugBtnDisabled]}
          activeOpacity={0.75}
        >
          <Text style={[styles.slugSecondaryBtnText, copied && styles.slugBtnTextActive]}>
            {copied ? 'Kopyalandı!' : 'Kopyala'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleShare}
          disabled={disabled}
          style={[styles.slugPrimaryBtn, disabled && styles.slugBtnDisabled]}
          activeOpacity={0.8}
        >
          <Text style={styles.slugPrimaryBtnText}>Paylaş</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── ProfileEditorSheet ────────────────────────────────────── */

interface ProfileEditorSheetProps {
  open: boolean;
  onClose: () => void;
  shopId: string | null;
  initialName: string;
  initialAddress: string;
  initialBio: string;
  initialPhone: string;
  slug: string;
  onSaved?: (data: { name: string; address: string; bio: string; phone: string }) => void;
}

function ProfileEditorSheet({ open, onClose, shopId, initialName, initialAddress, initialBio, initialPhone, slug, onSaved }: ProfileEditorSheetProps) {
  const [name,    setName]    = useState(initialName);
  const [address, setAddress] = useState(initialAddress);
  const [bio,     setBio]     = useState(initialBio);
  const [phone,   setPhone]   = useState(initialPhone);
  const [visible, setVisible] = useState(true);
  const [saved,   setSaved]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync state when initial values change (after shop data loads)
  useEffect(() => {
    if (open) {
      setName(initialName);
      setAddress(initialAddress);
      setBio(initialBio);
      setPhone(initialPhone);
      setSaved(false);
    }
  }, [open, initialName, initialAddress, initialBio, initialPhone]);

  const canSave = name.trim().length >= 2;

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function handleSave() {
    if (!canSave) return;
    if (!shopId) {
      Alert.alert('Lütfen bekleyin', 'Dükkan bilgileri yükleniyor.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('shops').update({ name: name.trim(), address, bio }).eq('id', shopId);
      if (error) throw error;
      const { error: phoneError } = await supabase.from('shops').update({ phone } as any).eq('id', shopId);
      if (phoneError) console.warn('[settings] phone update skipped:', phoneError);
      onSaved?.({ name: name.trim(), address, bio, phone });
      setSaved(true);
    } catch {
      Alert.alert('Hata', 'Bilgiler kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setSaved(false);
    onClose();
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={handleClose}>
        <Pressable style={styles.sheetContainer} onPress={() => {}}>
          {/* Drag handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Dükkan Bilgileri</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={8}>
              <Text style={styles.sheetCancelBtn}>İptal</Text>
            </TouchableOpacity>
          </View>

          {saved ? (
            /* Success state */
            <View style={styles.profileSavedContainer}>
              <View style={styles.profileSavedCircle}>
                <Text style={styles.profileSavedCheck}>✓</Text>
              </View>
              <Text style={styles.profileSavedTitle}>Kaydedildi</Text>
              <Text style={styles.profileSavedBody}>
                Dükkan bilgileri güncellendi.{'\n'}Müşteri ekranına yansıması birkaç dakika sürebilir.
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.primaryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryBtnText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.sheetBody}
              contentContainerStyle={styles.sheetBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Avatar preview */}
              <View style={styles.profileAvatarCard}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileAvatarName}>{name || 'Dükkan Adı'}</Text>
                  <Text style={styles.profileAvatarCity}>
                    {address.split(',')[0]}
                  </Text>
                </View>
                <View style={styles.profilePreviewBadge}>
                  <Text style={styles.profilePreviewBadgeText}>Önizleme</Text>
                </View>
              </View>

              {/* Dükkan Adı */}
              <View>
                <Text style={styles.fieldLabel}>Dükkan Adı</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="örn. Keskin Berber"
                  placeholderTextColor={v2Colors.ink3}
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.textInput}
                />
                <Text style={styles.fieldHint}>
                  Müşteri rezervasyon ekranında görünür
                </Text>
              </View>

              {/* Adres */}
              <View>
                <Text style={styles.fieldLabel}>Adres</Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Mahalle, Sokak No, İl"
                  placeholderTextColor={v2Colors.ink3}
                  autoCorrect={false}
                  spellCheck={false}
                  style={styles.textInput}
                />
              </View>

              {/* Telefon */}
              <View>
                <Text style={styles.fieldLabel}>Telefon</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="0(2xx) xxx xx xx"
                  placeholderTextColor={v2Colors.ink3}
                  keyboardType="phone-pad"
                  style={styles.textInput}
                />
                <Text style={styles.fieldHint}>
                  Opsiyonel — müşteri detay sayfasında gösterilir
                </Text>
              </View>

              {/* Hakkında */}
              <View>
                <Text style={styles.fieldLabel}>Hakkında</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Dükkanınız hakkında kısa bir açıklama..."
                  placeholderTextColor={v2Colors.ink3}
                  multiline
                  numberOfLines={3}
                  autoCorrect={false}
                  spellCheck={false}
                  style={[styles.textInput, styles.textArea]}
                />
                <Text style={styles.fieldHint}>{bio.length}/200 karakter</Text>
              </View>

              {/* Profil Görünür toggle */}
              <View style={styles.sheetToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleRowTitle}>Profil Görünür</Text>
                  <Text style={styles.toggleRowSub}>
                    {visible
                      ? 'Müşteriler dükkanı bulabilir'
                      : 'Dükkan arama sonuçlarında gizli'}
                  </Text>
                </View>
                <Toggle on={visible} onChange={setVisible} />
              </View>

              {/* Rezervasyon linki — paylaş/kopyala */}
              <ShareLinkBox slug={slug} />

              {/* Kaydet */}
              <TouchableOpacity
                onPress={canSave ? handleSave : undefined}
                style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
                activeOpacity={canSave ? 0.8 : 1}
              >
                <Text style={styles.primaryBtnText}>Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── HoursEditorSheet ──────────────────────────────────────── */

interface ScheduleDay {
  id: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
  brk: string;
}

interface HoursEditorSheetProps {
  open: boolean;
  onClose: () => void;
  shopName?: string;
  shopId?: string | null;
  staffId?: string | null;
  onSaved?: (schedule: ScheduleDay[]) => void;
  initialSchedule?: ScheduleDay[];
}

function HoursEditorSheet({ open, onClose, shopName = '', shopId, staffId, onSaved, initialSchedule }: HoursEditorSheetProps) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>(initialSchedule ?? INIT_SCHEDULE);
  const [sel, setSel] = useState(0);
  const day = schedule[sel];

  useEffect(() => {
    if (initialSchedule) setSchedule(initialSchedule);
  }, [initialSchedule]);

  function update(field: keyof ScheduleDay, val: string | boolean) {
    setSchedule((s) => s.map((d, i) => i === sel ? { ...d, [field]: val } : d));
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
          <View style={[styles.sheetHandle, { marginBottom: 18 }]} />

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Title block */}
            <View style={styles.hoursHeaderBlock}>
              <Text style={styles.hoursEyebrow}>Dükkan Saatleri</Text>
              <Text style={styles.hoursTitle}>Çalışma Saatleri</Text>
              <Text style={styles.hoursSubtitle}>
                {shopName || '—'} · Müşteri randevu ekranında görünür
              </Text>
            </View>

            {/* Day tabs */}
            <View style={styles.dayTabsRow}>
              {schedule.map((d, i) => {
                const isSel = sel === i;
                return (
                  <TouchableOpacity
                    key={d.id}
                    onPress={() => setSel(i)}
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
                      {d.label}
                    </Text>
                    <View
                      style={[
                        styles.dayTabDot,
                        {
                          backgroundColor: d.open
                            ? isSel
                              ? 'rgba(255,255,255,0.5)'
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
                  <Text style={styles.openToggleTitle}>Açık</Text>
                  <Text style={styles.openToggleSub}>
                    {day.open ? 'Bu gün hizmet veriliyor' : 'Bu gün kapalı'}
                  </Text>
                </View>
                <Toggle on={day.open} onChange={(v) => update('open', v)} />
              </View>
            </View>

            {day.open && (
              <>
                {/* Çalışma Saatleri */}
                <View>
                  <Text style={styles.timeSectionLabel}>Çalışma Saatleri</Text>
                  <View style={styles.timeGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Açılış</Text>
                      <TextInput
                        value={day.start}
                        onChangeText={(v) => update('start', v)}
                        placeholder="09:00"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timeFieldLabel}>Kapanış</Text>
                      <TextInput
                        value={day.end}
                        onChangeText={(v) => update('end', v)}
                        placeholder="19:00"
                        placeholderTextColor={v2Colors.ink3}
                        style={styles.timeInput}
                      />
                    </View>
                  </View>
                </View>

                {/* Mola */}
                <View>
                  <Text style={styles.timeSectionLabel}>Mola (Opsiyonel)</Text>
                  <TextInput
                    value={day.brk}
                    onChangeText={(v) => update('brk', v)}
                    placeholder="örn. 13:00–14:00"
                    placeholderTextColor={v2Colors.ink3}
                    style={styles.timeInputFull}
                  />
                  <Text style={styles.molaHint}>
                    Mola saatinde randevu alınamaz. Müşteri ekranında kapalı görünür.
                  </Text>
                </View>
              </>
            )}

            {/* Preview row */}
            <View style={styles.previewRow}>
              <Text style={styles.previewRowLabel}>{day.label} önizleme</Text>
              <Text style={[
                styles.previewRowValue,
                !day.open && { color: v2Colors.ink3 },
              ]}>
                {day.open ? `${day.start}–${day.end}` : 'Kapalı'}
              </Text>
            </View>

            {/* Save */}
            <TouchableOpacity
              onPress={async () => {
                if (shopId) {
                  const wh = shopHoursScheduleToWorkingHours(schedule);
                  const { error } = await supabase.from('shops').update({ working_hours: wh }).eq('id', shopId);
                  if (error) {
                    Alert.alert('Hata', 'Dükkan saatleri kaydedilemedi.');
                    return;
                  }
                }
                if (staffId) {
                  const { error } = await supabase
                    .from('staff_schedules')
                    .upsert(shopHoursScheduleToRows(staffId, schedule) as any, { onConflict: 'staff_id,day_of_week' });
                  if (error) {
                    Alert.alert('Hata', 'Personel çalışma saatleri kaydedilemedi.');
                    return;
                  }
                }
                onSaved?.(schedule);
                onClose();
              }}
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

/* ─── InfoRow ───────────────────────────────────────────────── */

interface InfoRowProps {
  icon: React.ReactNode;
  title: string;
  meta: string;
  onPress?: () => void;
  last?: boolean;
}

function InfoRow({ icon, title, meta, onPress, last }: InfoRowProps) {
  const content = (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <View style={styles.infoIconBox}>{icon}</View>
      <View style={styles.infoBody}>
        <Text style={styles.infoTitle}>{title}</Text>
        <Text style={styles.infoMeta}>{meta}</Text>
      </View>
      {onPress ? <ChevronRight size={18} color={v2Colors.ink3} strokeWidth={2} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
      {content}
    </TouchableOpacity>
  );
}

/* ─── Hours subtitle helpers ────────────────────────────────── */

const TR_DAYS_LABELS: Record<string, string> = { pzt: 'Pzt', sal: 'Sal', car: 'Çar', per: 'Per', cum: 'Cum', cmt: 'Cmt', paz: 'Paz' };

function buildHoursSubtitle(schedule: { id: string; open: boolean; start: string; end: string }[]): string {
  const open = schedule.filter(d => d.open);
  if (!open.length) return 'Kapalı';
  const parts = open.map(d => `${TR_DAYS_LABELS[d.id] ?? d.id} ${d.start}–${d.end}`);
  return parts.join(' · ');
}

function MiniSwitch({ on }: { on: boolean }) {
  return (
    <View style={[styles.miniSwitchTrack, on ? styles.miniSwitchTrackOn : styles.miniSwitchTrackOff]}>
      <View style={[styles.miniSwitchThumb, on ? styles.miniSwitchThumbOn : styles.miniSwitchThumbOff]} />
    </View>
  );
}

function formatHoursRange(day: ScheduleDay): string {
  return day.open ? `${day.start} - ${day.end}` : 'Kapalı';
}

function visibleSettingsDays(schedule: ScheduleDay[] | undefined): ScheduleDay[] {
  const source = schedule ?? INIT_SCHEDULE;
  const wanted = ['pzt', 'sal', 'car', 'cmt', 'paz'];
  return wanted
    .map((id) => source.find((day) => day.id === id))
    .filter(Boolean) as ScheduleDay[];
}

/* ─── Main Screen ───────────────────────────────────────────── */

interface WidgetLink {
  id: string;
  shortId: string;
  lastUsed: string;
}

interface ShopData {
  name: string;
  address: string;
  bio: string;
  phone: string;
  slug: string;
  email: string;
  commission_enabled: boolean;
}

interface NotificationPrefs {
  new_appointment: boolean;
  cancellation: boolean;
  daily_summary: boolean;
}

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  new_appointment: true,
  cancellation: true,
  daily_summary: true,
};

function normalizePrefs(raw: unknown): NotificationPrefs {
  const obj = (raw ?? {}) as Partial<NotificationPrefs>;
  return {
    new_appointment: obj.new_appointment !== false,
    cancellation: obj.cancellation !== false,
    daily_summary: obj.daily_summary !== false,
  };
}

export default function SettingsScreen() {
  const router = useRouter();
  const [commEnabled,        setCommEnabled]        = useState(false);
  const [profileOpen,        setProfileOpen]        = useState(false);
  const [hoursOpen,          setHoursOpen]          = useState(false);
  const [widgetLinks,        setWidgetLinks]        = useState<WidgetLink[]>([]);
  const [shop,               setShop]               = useState<ShopData | null>(null);
  const [shopId,             setShopId]             = useState<string | null>(null);
  const [ownerStaffId,       setOwnerStaffId]       = useState<string | null>(null);
  const [hoursSubtitle,      setHoursSubtitle]      = useState('Pzt–Cum 09:00–19:00 · Cmt 10:00–17:00 · Paz kapalı');
  const [hoursInitialSchedule, setHoursInitialSchedule] = useState<ScheduleDay[] | undefined>(undefined);
  const [prefs,              setPrefs]              = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [activeServiceCount, setActiveServiceCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getUser().then(({ data: { user }, error: authErr }) => {
      if (!isMounted) return;
      if (authErr) console.warn('[settings] auth error:', authErr);
      if (!user) { console.warn('[settings] no user — not logged in'); return; }
      supabase
        .from('shops')
        .select('id, name, address, bio, slug, commission_enabled, working_hours')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (error) { console.warn('[settings] shops query error:', error); Alert.alert('Hata', `Dükkan yüklenemedi: ${error.message}`); return; }
          if (!data) {
            console.warn('[settings] no shop row for user', user.id);
            Alert.alert('Hata', 'Bu kullanıcı için dükkan kaydı bulunamadı. Çıkış yapıp yeniden giriş yapın veya onboarding akışını tamamlayın.');
            return;
          }
          console.log('[settings] loaded shop', data.id, data.slug);
          setShopId(data.id);
          setShop({
            name: data.name ?? '',
            address: data.address ?? '',
            bio: data.bio ?? '',
            phone: '',
            slug: data.slug ?? '',
            email: user.email ?? '',
            commission_enabled: data.commission_enabled ?? false,
          });
          setCommEnabled(data.commission_enabled ?? false);
          supabase
            .from('staff')
            .select('id, notification_prefs')
            .eq('shop_id', data.id)
            .eq('user_id', user.id)
            .maybeSingle()
            .then(({ data: staffData }) => {
              if (!isMounted) return;
              const row = staffData as { id: string; notification_prefs: unknown } | null;
              setOwnerStaffId(row?.id ?? null);
              setPrefs(normalizePrefs(row?.notification_prefs));
            });
          if (data.working_hours) {
            const loaded: ScheduleDay[] = shopHoursScheduleFromWorkingHours(data.working_hours as any);
            setHoursInitialSchedule(loaded);
            setHoursSubtitle(buildHoursSubtitle(loaded));
          }
          // Fetch widget tokens
          supabase.from('widget_tokens').select('id, token_hash, label, last_used_at').eq('shop_id', data.id)
            .then(({ data: tokens }) => {
              if (!isMounted) return;
              setWidgetLinks((tokens ?? []).map((t: any) => ({
                id: t.id,
                shortId: `${t.token_hash.slice(0, 8)}…`,
                lastUsed: t.last_used_at ? new Date(t.last_used_at).toLocaleDateString('tr-TR') : 'Hiç',
              })));
            });
          supabase.from('services').select('id').eq('shop_id', data.id).eq('is_active', true)
            .then(({ data: services }) => {
              if (!isMounted) return;
              setActiveServiceCount(services?.length ?? 0);
            });
        });
    });
    return () => { isMounted = false; };
  }, []);

  async function updatePref(key: keyof NotificationPrefs, value: boolean) {
    const prev = prefs;
    const next: NotificationPrefs = { ...prev, [key]: value };
    setPrefs(next);
    if (!ownerStaffId) return;
    const { error } = await supabase
      .from('staff')
      .update({ notification_prefs: next } as any)
      .eq('id', ownerStaffId);
    if (error) {
      setPrefs(prev);
      Alert.alert('Hata', 'Bildirim tercihi kaydedilemedi.');
    }
  }

  function handleSignOut() {
    Alert.alert(
      'Çıkış Yap',
      'Hesaptan çıkmak istediğine emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Çıkış yap',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Hesabı Sil',
      'Hesabını ve dükkan verilerini silmek istediğine emin misin? Bu işlem geri alınamaz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.functions.invoke('delete-account');
            if (error) {
              Alert.alert('Hata', 'Hesap silinemedi. Lütfen tekrar deneyin.');
              return;
            }
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  }

  async function handleCreateLink() {
    if (!shopId) return;
    const { data, error } = await supabase.functions.invoke('create-widget-token', {
      body: { label: 'Telefon Widget' },
    });
    if (error || !data) {
      Alert.alert('Hata', 'Bağlantı oluşturulamadı.');
      return;
    }
    setWidgetLinks(prev => [...prev, {
      id: data.id,
      shortId: `${(data.raw_token as string).slice(0, 8)}…`,
      lastUsed: 'Yeni',
    }]);
  }

  const settingsDays = visibleSettingsDays(hoursInitialSchedule);

  function handleDeleteLink(id: string) {
    Alert.alert(
      'Bağlantı Sil',
      'Bu bağlantı silinirse widget çalışmayı durduracak.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('widget_tokens').delete().eq('id', id);
            setWidgetLinks((prev) => prev.filter((l) => l.id !== id));
          },
        },
      ],
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Dükkan & Hesap</Text>
          <Text style={styles.pageTitle}>Ayarlar</Text>
        </View>

        {/* Dükkan Bilgileri */}
        <Text style={styles.sectionLabel}>Dükkan Bilgileri</Text>
        <View style={styles.infoCard}>
          <InfoRow
            icon={<Store size={18} color={v2Colors.spruce} strokeWidth={2.2} />}
            title="Dükkan Adı"
            meta={shop?.name ?? '—'}
            onPress={() => { if (!shopId) return; setProfileOpen(true); }}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<MapPin size={18} color={v2Colors.spruce} strokeWidth={2.2} />}
            title="Adres"
            meta={shop?.address || 'Adres ekle'}
            onPress={() => { if (!shopId) return; setProfileOpen(true); }}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Scissors size={18} color={v2Colors.spruce} strokeWidth={2.2} />}
            title="Hizmetler"
            meta={`${activeServiceCount} aktif hizmet`}
            onPress={() => router.push('/(owner)/services')}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Clock size={18} color={v2Colors.spruce} strokeWidth={2.2} />}
            title="Çalışma Saatleri"
            meta={hoursSubtitle}
            onPress={() => setHoursOpen(true)}
            last
          />
        </View>

        {/* Widget */}
        <Text style={styles.sectionLabel}>Widget</Text>
        <View style={styles.infoCard}>
          {widgetLinks.length > 0 ? (
            widgetLinks.map((l, i) => (
              <View key={l.id}>
                {i > 0 && <View style={styles.divider} />}
                <View style={styles.widgetRow}>
                  <View style={styles.infoIconBox}>
                    <Code2 size={16} color={v2Colors.spruce} strokeWidth={2} />
                  </View>
                  <View style={styles.infoBody}>
                    <Text style={styles.infoTitle}>Web Sitesi Butonu</Text>
                    <Text style={styles.widgetToken}>{l.shortId}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={async () => {
                      await Clipboard.setStringAsync(l.shortId);
                      Alert.alert('Kopyalandı', 'Token panoya kopyalandı.');
                    }}
                    hitSlop={8}
                  >
                    <Copy size={18} color={v2Colors.ink3} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : null}
          {widgetLinks.length > 0 && <View style={styles.divider} />}
          <TouchableOpacity onPress={handleCreateLink} style={styles.newTokenRow} activeOpacity={0.78}>
            <Text style={styles.newTokenText}>+ Yeni Token Oluştur</Text>
          </TouchableOpacity>
        </View>

        {/* Hesap */}
        <Text style={styles.sectionLabel}>Hesap</Text>
        <View style={styles.infoCard}>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <View style={styles.infoIconBox}>
              <Mail size={18} color={v2Colors.spruce} strokeWidth={2.2} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>{shop?.email ?? '—'}</Text>
              <Text style={styles.infoMeta}>Google ile bağlı</Text>
            </View>
          </View>
        </View>

        {/* Yasal */}
        <View style={styles.legalSection}>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync('https://siradaki.app/kullanim-kosullari')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLink}>Kullanım Koşulları</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync('https://siradaki.app/gizlilik-politikasi')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLink}>Gizlilik Politikası</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => WebBrowser.openBrowserAsync('https://siradaki.app/cerez-politikasi')}
            activeOpacity={0.7}
          >
            <Text style={styles.legalLink}>Çerez Politikası</Text>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          style={styles.signOutBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutBtnText}>Çıkış yap</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={[styles.signOutBtn, { marginTop: 12 }]}
          activeOpacity={0.8}
        >
          <Text style={styles.signOutBtnText}>Hesabımı Sil</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Sıradaki · Dükkan Sahibi</Text>
      </ScrollView>

      {/* Profile editor sheet */}
      <ProfileEditorSheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        shopId={shopId}
        initialName={shop?.name ?? ''}
        initialAddress={shop?.address ?? ''}
        initialBio={shop?.bio ?? ''}
        initialPhone={shop?.phone ?? ''}
        slug={shop?.slug ?? ''}
        onSaved={(next) => setShop((prev) => prev ? { ...prev, ...next } : prev)}
      />

      {/* Hours editor sheet */}
      <HoursEditorSheet
        open={hoursOpen}
        onClose={() => setHoursOpen(false)}
        shopName={shop?.name}
        shopId={shopId}
        staffId={ownerStaffId}
        initialSchedule={hoursInitialSchedule}
        onSaved={(s) => {
          setHoursSubtitle(buildHoursSubtitle(s));
          setHoursInitialSchedule(s);
        }}
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
  content: {
    paddingHorizontal: 40,
    paddingTop: 74,
    paddingBottom: 130,
  },

  /* Header */
  header: {
    paddingBottom: 30,
  },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 2.7,
    textTransform: 'uppercase',
    color: v2Colors.ink3,
  },
  pageTitle: {
    fontSize: 39,
    lineHeight: 42,
    fontFamily: v2Fonts.display,
    color: v2Colors.ink,
    marginTop: 1,
  },
  headerMeta: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  accountCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accountOverline: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  accountName: { color: v2Colors.ink, fontFamily: v2Fonts.bodyBold, fontSize: 17, marginTop: 6 },
  accountEmail: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 13, marginTop: 2 },

  /* Profile card */
  profileCard: {
    marginHorizontal: 20,
    alignItems: 'center',
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileAvatar: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    flexShrink: 0,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  profileAvatarText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 16,
  },
  profileCardName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 16,
  },
  profileCardMeta: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    marginTop: 3,
  },
  profileEditBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  profileEditText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: v2Fonts.bodyBold,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: v2Colors.ink3,
    marginTop: 0,
    marginBottom: 10,
  },

  hoursCard: {
    backgroundColor: v2Colors.card,
    borderWidth: 1,
    borderColor: v2Colors.line,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  hoursRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: v2Colors.line,
  },
  hoursRowLast: {
    borderBottomWidth: 0,
  },
  hoursDay: {
    width: 48,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink,
  },
  hoursTime: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: v2Fonts.mono,
    color: v2Colors.ink3,
  },
  hoursClosed: {
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink3,
  },
  miniSwitchTrack: {
    width: 43,
    height: 27,
    borderRadius: 999,
    justifyContent: 'center',
  },
  miniSwitchTrackOn: {
    backgroundColor: v2Colors.spruce,
  },
  miniSwitchTrackOff: {
    backgroundColor: '#E8DFD0',
  },
  miniSwitchThumb: {
    position: 'absolute',
    top: 2,
    width: 23,
    height: 23,
    borderRadius: 999,
    backgroundColor: v2Colors.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.16,
    shadowRadius: 2,
    elevation: 2,
  },
  miniSwitchThumbOn: {
    left: 18,
  },
  miniSwitchThumbOff: {
    left: 2,
  },
  infoCard: {
    backgroundColor: v2Colors.card,
    borderWidth: 1,
    borderColor: v2Colors.line,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  infoRow: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: v2Colors.line,
    gap: 13,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: v2Colors.spruceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBody: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    lineHeight: 19,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink,
  },
  infoMeta: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 16,
    fontFamily: v2Fonts.bodySemiBold,
    color: v2Colors.ink3,
  },

  operationCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 20,
    padding: 14,
  },
  opRow: {
    alignItems: 'center',
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
  },
  opRowBorderTop: { borderTopColor: v2Colors.line, borderTopWidth: 1 },
  opRowLast: { borderBottomWidth: 0 },
  opRowTitle: { color: v2Colors.ink, fontFamily: v2Fonts.bodySemiBold, fontSize: 15 },
  opRowMeta: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 12, marginTop: 2 },

  /* Widget section */
  widgetSection: {
    gap: 10,
  },
  widgetLinkCard: {
    backgroundColor: v2Colors.card,
    borderWidth: 1,
    borderColor: v2Colors.line,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#2F281F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  widgetLinkId: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.ink,
  },
  widgetLinkMeta: {
    fontSize: 12,
    lineHeight: 15,
    fontFamily: v2Fonts.bodyMedium,
    color: v2Colors.ink3,
    marginTop: 2,
  },
  deleteLinkBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: v2Colors.brick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLinkBtnText: {
    fontSize: 13,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.brick,
  },
  newLinkBtn: {
    height: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: v2Colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newLinkBtnText: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: v2Fonts.bodyBold,
    color: v2Colors.spruce,
  },

  /* Yasal */
  legalSection: {
    marginHorizontal: 20,
    marginTop: 28,
    gap: 14,
  },
  legalLink: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    textDecorationLine: 'underline',
  },

  signOutBtn: {
    alignItems: 'center',
    borderColor: v2Colors.brick,
    borderRadius: 12,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 28,
  },
  signOutBtnText: { color: v2Colors.brick, fontFamily: v2Fonts.bodySemiBold, fontSize: 15 },

  footer: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 11,
    letterSpacing: 0.88,
    marginTop: 24,
    textAlign: 'center',
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

  /* Chevron */
  chevronWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronLine1: {
    position: 'absolute',
    width: 8,
    height: 1.6,
    backgroundColor: v2Colors.ink3,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateY: -3 }],
  },
  chevronLine2: {
    position: 'absolute',
    width: 8,
    height: 1.6,
    backgroundColor: v2Colors.ink3,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateY: 3 }],
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
    maxHeight: '90%',
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

  /* Profile editor sheet */
  profileSavedContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  profileSavedCircle: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruceSoft,
    borderColor: v2Colors.spruce,
    borderRadius: 999,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  profileSavedCheck: { color: v2Colors.spruce, fontFamily: v2Fonts.bodyBold, fontSize: 22 },
  profileSavedTitle: { color: v2Colors.ink, fontFamily: v2Fonts.bodyBold, fontSize: 20, textAlign: 'center' },
  profileSavedBody: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  profileAvatarCard: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderColor: v2Colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  profileAvatarName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
  profileAvatarCity: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  profilePreviewBadge: {
    backgroundColor: v2Colors.spruceSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  profilePreviewBadgeText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 11,
  },

  toggleRow: {
    alignItems: 'center',
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  toggleRowLast: { borderBottomWidth: 0 },

  sheetToggleRow: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderColor: v2Colors.line,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  toggleRowTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
  toggleRowSub: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },

  slugBox: {
    backgroundColor: v2Colors.paper2,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slugLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  slugValue: { color: v2Colors.spruce, fontFamily: v2Fonts.bodySemiBold, fontSize: 13 },
  slugBtnRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  slugSecondaryBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.spruce,
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  slugSecondaryBtnText: { color: v2Colors.spruce, fontFamily: v2Fonts.bodySemiBold, fontSize: 13 },
  slugPrimaryBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 9,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  slugPrimaryBtnText: { color: v2Colors.paper, fontFamily: v2Fonts.bodySemiBold, fontSize: 13 },
  slugBtnDisabled: { opacity: 0.4 },
  slugBtnTextActive: { color: v2Colors.spruce },

  fieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2.2,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  fieldHint: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 11, marginTop: 5 },
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  primaryBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: v2Colors.paper, fontFamily: v2Fonts.bodySemiBold, fontSize: 15 },

  hoursHeaderBlock: {
    borderBottomColor: v2Colors.line,
    borderBottomWidth: 1,
    marginBottom: 4,
    paddingBottom: 16,
  },
  hoursEyebrow: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  hoursTitle: { color: v2Colors.ink, fontFamily: v2Fonts.display, fontSize: 22, marginTop: 6 },
  hoursSubtitle: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 13, marginTop: 4 },

  dayTabsRow: { flexDirection: 'row', gap: 4 },
  dayTab: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    height: 52,
    justifyContent: 'center',
  },
  dayTabSel: { backgroundColor: v2Colors.ink, borderColor: v2Colors.ink },
  dayTabOpen: { backgroundColor: v2Colors.card, borderColor: v2Colors.line2 },
  dayTabClosed: { backgroundColor: v2Colors.paper2, borderColor: v2Colors.line2 },
  dayTabText: { fontFamily: v2Fonts.bodyBold, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  dayTabTextSel: { color: v2Colors.paper },
  dayTabTextOpen: { color: v2Colors.ink },
  dayTabTextClosed: { color: v2Colors.ink3 },
  dayTabDot: { borderRadius: 999, height: 4, width: 4 },

  openToggleCard: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  openToggleTitle: { color: v2Colors.ink, fontFamily: v2Fonts.bodySemiBold, fontSize: 15 },
  openToggleSub: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 12, marginTop: 2 },

  timeSectionLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.8,
    marginBottom: 8,
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
  timeInputFull: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 10,
    borderWidth: 1,
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  molaHint: { color: v2Colors.ink3, fontFamily: v2Fonts.body, fontSize: 11, lineHeight: 15, marginTop: 5 },

  previewRow: {
    alignItems: 'center',
    backgroundColor: v2Colors.paper2,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewRowLabel: { color: v2Colors.ink3, fontFamily: v2Fonts.bodyBold, fontSize: 12 },
  previewRowValue: { color: v2Colors.ink, fontFamily: v2Fonts.bodyBold, fontSize: 13 },

  /* Widget */
  widgetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  widgetToken: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 12,
    marginTop: 2,
  },
  newTokenRow: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
  },
  newTokenText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },
  divider: {
    backgroundColor: v2Colors.line,
    height: 1,
    marginLeft: 16,
  },
});
