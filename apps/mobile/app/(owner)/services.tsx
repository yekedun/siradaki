/**
 * M28 · Hizmet Yönetimi (Services)
 * Pixel-perfect conversion from screen-28-hizmetler.html
 *
 * Includes:
 *  - Color status dot per row (8×8, mint-600=active, slate-300=inactive)
 *  - Service name: fontSize 15, Montserrat-SemiBold
 *  - Duration badge PILL: slate-100 bg, slate-200 border, borderRadius 999, padding 2h 8v, fontSize 11
 *  - Price badge PILL: ink-900 bg, white text, borderRadius 999, fontSize 11 Bold
 *  - "Pasif" badge PILL when inactive: slate-100 bg, slate-400 text
 *  - Row opacity 0.55 when inactive
 *  - Chevron icon (›) at end of row
 *  - Custom Toggle: 44×26, brand-600=on / slate-200=off, white thumb 22×22, top:2, Animated
 *  - Hint text below header (exact string from source)
 *  - Empty state (exact strings from source)
 *  - FAB "Hizmet Ekle" bottom-right, brand-600 bg, + icon, shadow
 *  - ServiceSheet bottom sheet:
 *      drag handle, "Yeni Hizmet" / "Hizmet Düzenle" title + İptal
 *      Hizmet Adı field, DurPicker 4-col grid, Fiyat field
 *      Active toggle row ("Müşteri ekranında görünür" / "Rezervasyona kapalı")
 *      Summary row (canSave: "name · dur dk · price₺")
 *      "Ekle" / "Kaydet" primary btn
 *      "Hizmeti Sil" → "Vazgeç" / "Evet, Sil" two-step confirm
 *  - DurPicker: 4-col, [15,20,30,45,60,90,120], height 40, borderRadius 9
 *      selected=ink-900/white, unselected=white/ink-900, value fontSize 14 Bold, "dk" 9 SemiBold opacity 0.6
 *  - Dummy data: Saç Kesimi 30/200 active, Saç+Sakal 45/300 active,
 *                Sakal Şekillendirme 20/150 active, Fön+Şekillendirme 40/250 inactive
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Baby, ChevronLeft, Droplets, Info, Plus, Scissors, Sparkles, Wind } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { trackEvent } from '../../lib/analytics';
import { serviceFormToDb, serviceRowToView } from '../../lib/service-mappers';
import { v2Colors, v2Fonts } from '../../lib/v2-tokens';

/* ─── Data ──────────────────────────────────────────────────── */

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
}

const INIT_SERVICES: Service[] = [];

function formatMetricPriceRange(min: number, max: number): string {
  if (min === max) return `₺${min}`;
  return `₺${min}-${max}`;
}

/* ─── Toggle ────────────────────────────────────────────────── */

interface ToggleProps {
  on: boolean;
  onChange: (val: boolean) => void;
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

/* ─── DurPicker ─────────────────────────────────────────────── */

interface DurPickerProps {
  value: number;
  onChange: (val: number) => void;
}

function DurPicker({ value, onChange }: DurPickerProps) {
  return (
    <View style={styles.durGrid}>
      {DURATIONS.map((d) => {
        const sel = value === d;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => onChange(d)}
            style={[styles.durCell, sel ? styles.durCellSel : styles.durCellUnsel]}
            activeOpacity={0.75}
          >
            <Text style={[styles.durValue, sel ? styles.durValueSel : styles.durValueUnsel]}>
              {d}
            </Text>
            <Text style={[styles.durUnit, sel ? styles.durUnitSel : styles.durUnitUnsel]}>
              dk
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ─── ServiceSheet ──────────────────────────────────────────── */

interface ServiceSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Service, 'id'>) => void;
  onDelete?: () => void;
  initial: Service | null;
}

function ServiceSheet({ open, onClose, onSave, onDelete, initial }: ServiceSheetProps) {
  const isNew = !initial;
  const [name,     setName]     = useState(initial?.name     ?? '');
  const [duration, setDuration] = useState(initial?.duration ?? 30);
  const [price,    setPrice]    = useState(initial?.price != null ? String(initial.price) : '');
  const [active,   setActive]   = useState(initial?.active   ?? true);
  const [confirm,  setConfirm]  = useState(false);

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDuration(initial?.duration ?? 30);
      setPrice(initial?.price != null ? String(initial.price) : '');
      setActive(initial?.active ?? true);
      setConfirm(false);
    }
  }, [open]);

  const canSave = name.trim().length >= 2 && price !== '';

  function handleSave() {
    if (!canSave) return;
    onSave({ name: name.trim(), duration, price: Number(price), active });
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
          {/* Drag handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {isNew ? 'Yeni Hizmet' : 'Hizmet Düzenle'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={styles.sheetCancelBtn}>İptal</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.sheetBody}
            contentContainerStyle={styles.sheetBodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hizmet Adı */}
            <View>
              <Text style={styles.fieldLabel}>Hizmet Adı</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="örn. Saç Kesimi"
                placeholderTextColor={v2Colors.ink3}
                style={styles.textInput}
              />
            </View>

            {/* Süre */}
            <View>
              <Text style={styles.fieldLabel}>Süre</Text>
              <DurPicker value={duration} onChange={setDuration} />
            </View>

            {/* Fiyat */}
            <View>
              <Text style={styles.fieldLabel}>Fiyat (₺)</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="örn. 200"
                placeholderTextColor={v2Colors.ink3}
                keyboardType="numeric"
                style={[styles.textInput, styles.textInputPrice]}
              />
            </View>

            {/* Aktif toggle row */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleRowTitle}>Aktif</Text>
                <Text style={styles.toggleRowSub}>
                  {active ? 'Müşteri ekranında görünür' : 'Rezervasyona kapalı'}
                </Text>
              </View>
              <Toggle on={active} onChange={setActive} />
            </View>

            {/* Summary row */}
            {canSave && (
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Özet</Text>
                <Text style={styles.summaryValue}>
                  {name} · {duration} dk · {price}₺
                </Text>
              </View>
            )}

            {/* Primary CTA */}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
              activeOpacity={canSave ? 0.8 : 1}
            >
              <Text style={styles.primaryBtnText}>
                {isNew ? 'Ekle' : 'Kaydet'}
              </Text>
            </TouchableOpacity>

            {/* Delete / confirm */}
            {!isNew && (
              confirm ? (
                <View style={styles.confirmRow}>
                  <TouchableOpacity
                    onPress={() => setConfirm(false)}
                    style={[styles.confirmBtn, styles.confirmBtnSecondary]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmBtnSecondaryText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onDelete}
                    style={[styles.confirmBtn, styles.confirmBtnDanger]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmBtnDangerText}>Evet, Sil</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => setConfirm(true)}
                  style={styles.deleteBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteBtnText}>Hizmeti Sil</Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ─── ServiceRow ────────────────────────────────────────────── */

interface ServiceRowProps {
  service: Service;
  onPress: () => void;
  onToggle: () => void;
}

function serviceIcon(name: string, active: boolean) {
  const normalized = name.toLocaleLowerCase('tr-TR');
  const color = active ? v2Colors.spruce : v2Colors.ink3;
  const props = { size: 21, color, strokeWidth: 2.3 };
  if (normalized.includes('çocuk')) return <Baby {...props} />;
  if (normalized.includes('sakal')) return <Wind {...props} />;
  if (normalized.includes('boya')) return <Sparkles {...props} />;
  if (normalized.includes('maske') || normalized.includes('bakım')) return <Droplets {...props} />;
  return <Scissors {...props} />;
}

function ServiceRow({ service: sv, onPress, onToggle }: ServiceRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, !sv.active && styles.rowInactive]}
    >
      {/* Icon */}
      <View style={[styles.iconBox, !sv.active && styles.iconBoxInactive]}>
        {serviceIcon(sv.name, sv.active)}
      </View>

      {/* Info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowName}>{sv.name}</Text>
        <Text style={styles.rowMeta}>{sv.duration} dk · ₺{sv.price}</Text>
      </View>

      {/* Toggle */}
      <Pressable
        onPress={(e) => { e.stopPropagation?.(); onToggle(); }}
        hitSlop={8}
      >
        <Toggle on={sv.active} onChange={() => onToggle()} />
      </Pressable>
    </Pressable>
  );
}

/* ─── Main Screen ───────────────────────────────────────────── */

export default function ServicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>(INIT_SERVICES);
  const [editing,  setEditing]  = useState<Service | null>(null);
  const [adding,   setAdding]   = useState(false);
  const [shopId,   setShopId]   = useState<string | null>(null);
  const nextId = useRef(1);
  const activeServices = services.filter((service) => service.active);
  const priceRange = useMemo(() => {
    if (services.length === 0) return '₺0';
    const prices = services.map((service) => service.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return formatMetricPriceRange(min, max);
  }, [services]);
  const durationRange = useMemo(() => {
    if (services.length === 0) return '0';
    const durations = services.map((service) => service.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    return min === max ? `${min}` : `${min}-${max}`;
  }, [services]);

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: shopData, error: shopErr } = await supabase.from('shops').select('id').or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`).maybeSingle();
    if (shopErr) {
      Alert.alert('Hata', `Dükkan yüklenemedi: ${shopErr.message}`);
      return;
    }
    if (!shopData) { setShopId(null); return; }
    setShopId(shopData.id);
    const { data, error: servicesErr } = await supabase.from('services').select('id, name, duration_min, price_cents, is_active').eq('shop_id', shopData.id).order('name');
    if (servicesErr) {
      Alert.alert('Hata', `Hizmetler yüklenemedi: ${servicesErr.message}`);
      return;
    }
    if (data) setServices(data.map((s: any) => serviceRowToView(s)));
  }

  async function saveEdit(data: Omit<Service, 'id'>) {
    if (!editing) return;
    const { error } = await supabase.from('services').update(serviceFormToDb(data)).eq('id', editing.id);
    if (error) {
      Alert.alert('Hata', `Hizmet kaydedilemedi: ${error.message}`);
      return;
    }
    trackEvent('service_edited');
    setServices((s) => s.map((sv) => sv.id === editing.id ? { ...sv, ...data } : sv));
    setEditing(null);
  }

  async function deleteEdit() {
    if (!editing) return;
    const { error } = await supabase.from('services').delete().eq('id', editing.id);
    if (error) {
      Alert.alert('Hata', `Hizmet silinemedi: ${error.message}`);
      return;
    }
    setServices((s) => s.filter((sv) => sv.id !== editing.id));
    setEditing(null);
  }

  async function saveAdd(data: Omit<Service, 'id'>) {
    if (!shopId) {
      Alert.alert('Hata', 'Dükkan bilgisi yüklenemedi. Lütfen tekrar deneyin.');
      return;
    }
    const { data: inserted, error } = await supabase.from('services').insert({
      shop_id: shopId,
      ...serviceFormToDb(data),
    }).select('id, name, duration_min, price_cents, is_active').single();
    if (error || !inserted) {
      Alert.alert('Hata', `Hizmet eklenemedi: ${error?.message ?? 'bilinmeyen hata'}`);
      return;
    }
    if (inserted) {
      trackEvent('service_added');
      setServices((s) => [...s, serviceRowToView(inserted as any)]);
    }
    setAdding(false);
  }

  async function toggleActive(id: string) {
    const sv = services.find(s => s.id === id);
    if (!sv) return;
    const { error } = await supabase.from('services').update({ is_active: !sv.active }).eq('id', id);
    if (error) {
      Alert.alert('Hata', `Hizmet durumu değiştirilemedi: ${error.message}`);
      return;
    }
    setServices((s) => s.map((sv) => sv.id === id ? { ...sv, active: !sv.active } : sv));
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 4 }]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
          <ChevronLeft size={22} color={v2Colors.ink} strokeWidth={2.4} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>Ayarlar</Text>
          <Text style={styles.pageTitle}>Hizmetler</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{activeServices.length}</Text>
          <Text style={styles.statLabel}>Aktif{'\n'}Hizmet</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{priceRange}</Text>
          <Text style={styles.statLabel}>Fiyat{'\n'}Aralığı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{durationRange}</Text>
          <Text style={styles.statUnit}>dk</Text>
          <Text style={styles.statLabel}>Süre</Text>
        </View>
      </View>

      {/* Service list or empty state */}
      {services.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Henüz hizmet yok</Text>
          <Text style={styles.emptyBody}>
            Randevu alınabilmesi için en az bir hizmet ekleyin.
          </Text>
          <TouchableOpacity
            onPress={() => setAdding(true)}
            style={styles.emptyCtaBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaBtnText}>Hizmet Ekle</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {services.map((sv) => (
            <ServiceRow
              key={sv.id}
              service={sv}
              onPress={() => setEditing(sv)}
              onToggle={() => toggleActive(sv.id)}
            />
          ))}
          <TouchableOpacity
            onPress={() => setAdding(true)}
            style={styles.addServiceButton}
            activeOpacity={0.85}
          >
            <Plus size={18} color={v2Colors.spruce} strokeWidth={2.4} />
            <Text style={styles.addServiceButtonText}>Hizmet Ekle</Text>
          </TouchableOpacity>
          <View style={styles.footerNote}>
            <Info size={14} color={v2Colors.ink3} strokeWidth={2} />
            <Text style={styles.footerNoteText}>Müşteriler rezervasyon sayfasında yalnızca aktif hizmetleri görür.</Text>
          </View>
        </ScrollView>
      )}

      {/* Edit sheet */}
      <ServiceSheet
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
        onDelete={deleteEdit}
        initial={editing}
      />

      {/* Add sheet */}
      <ServiceSheet
        open={adding}
        onClose={() => setAdding(false)}
        onSave={saveAdd}
        initial={null}
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

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 13,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: v2Colors.paper,
    borderColor: v2Colors.line,
    borderRadius: 14,
    borderWidth: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: v2Fonts.bodySemiBold,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: v2Colors.ink3,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: v2Fonts.display,
    letterSpacing: 0,
    color: v2Colors.ink,
    includeFontPadding: false,
    lineHeight: 32,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: v2Colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    minHeight: 104,
    paddingHorizontal: 14,
    paddingTop: 15,
    shadowColor: v2Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  statValue: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.mono,
    fontSize: 19,
    includeFontPadding: false,
    lineHeight: 23,
  },
  statUnit: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 13,
    marginTop: 2,
  },
  statLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    lineHeight: 15.5,
    marginTop: 8,
    textTransform: 'uppercase',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 30,
    gap: 10,
  },
  addServiceButton: {
    alignItems: 'center',
    borderColor: v2Colors.line2,
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 54,
    justifyContent: 'center',
    marginTop: 6,
  },
  addServiceButtonText: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
  footerNote: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 7,
    paddingHorizontal: 2,
  },
  footerNoteText: {
    color: v2Colors.ink3,
    flex: 1,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 11,
  },

  /* Service row */
  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: v2Colors.line,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 78,
    shadowColor: v2Colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.075,
    shadowRadius: 12,
    elevation: 2,
  },
  rowInactive: {
    opacity: 0.56,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruceSoft,
    borderRadius: 10,
    flexShrink: 0,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconBoxInactive: {
    backgroundColor: v2Colors.paper2,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
    includeFontPadding: false,
  },
  rowMeta: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.mono,
    fontSize: 12,
    marginTop: 4,
  },

  /* Empty state */
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
  },
  emptyTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
  },
  emptyBody: {
    color: v2Colors.ink2,
    fontFamily: v2Fonts.body,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyCtaBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyCtaBtnText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },

  /* Toggle */
  toggleTrack: {
    width: 48,
    height: 30,
    borderRadius: 999,
    position: 'relative',
    flexShrink: 0,
  },
  toggleThumb: {
    position: 'absolute',
    top: 2,
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },

  /* DurPicker — 4-col grid */
  durGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  durCell: {
    width: '23%',
    height: 40,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  durCellSel: {
    backgroundColor: v2Colors.ink,
    borderColor: v2Colors.ink,
  },
  durCellUnsel: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
  },
  durValue: {
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },
  durValueSel: {
    color: v2Colors.paper,
  },
  durValueUnsel: {
    color: v2Colors.ink,
  },
  durUnit: {
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 9,
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  durUnitSel: {
    color: v2Colors.paper,
  },
  durUnitUnsel: {
    color: v2Colors.ink,
  },

  /* Sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,24,19,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: v2Colors.paper,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 18,
    shadowColor: v2Colors.ink,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 34,
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
    paddingBottom: 11,
    paddingHorizontal: 17,
    paddingTop: 8,
  },
  sheetTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.display,
    fontSize: 21,
    includeFontPadding: false,
    lineHeight: 25,
  },
  sheetCancelBtn: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
  sheetBody: {
    flexShrink: 1,
  },
  sheetBodyContent: {
    gap: 17,
    paddingBottom: 8,
    paddingHorizontal: 17,
    paddingTop: 15,
  },

  /* Form fields */
  fieldLabel: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.7,
    marginBottom: 7,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line2,
    borderRadius: 13,
    borderWidth: 1.5,
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyMedium,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  textInputPrice: {
    fontFamily: v2Fonts.mono,
  },

  /* Toggle row inside sheet */
  toggleRow: {
    alignItems: 'center',
    backgroundColor: v2Colors.card,
    borderColor: v2Colors.line,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toggleRowTitle: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },
  toggleRowSub: {
    color: v2Colors.ink3,
    fontFamily: v2Fonts.body,
    fontSize: 12,
    marginTop: 2,
  },

  /* Summary */
  summaryBox: {
    backgroundColor: v2Colors.spruceSoft,
    borderColor: v2Colors.line,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  summaryLabel: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: v2Colors.spruce,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 14,
  },

  /* Primary CTA */
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: v2Colors.spruce,
    borderRadius: 15,
    height: 52,
    justifyContent: 'center',
    shadowColor: v2Colors.spruce,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
  },
  primaryBtnDisabled: {
    backgroundColor: v2Colors.line2,
    shadowOpacity: 0,
  },
  primaryBtnText: {
    color: v2Colors.paper,
    fontFamily: v2Fonts.bodyBold,
    fontSize: 15,
  },

  /* Delete / confirm */
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteBtnText: {
    color: v2Colors.brick,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmBtnSecondary: {
    backgroundColor: v2Colors.paper,
    borderColor: v2Colors.line2,
  },
  confirmBtnSecondaryText: {
    color: v2Colors.ink,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
  confirmBtnDanger: {
    backgroundColor: v2Colors.brickSoft,
    borderColor: '#E4C9C3',
  },
  confirmBtnDangerText: {
    color: v2Colors.brick,
    fontFamily: v2Fonts.bodySemiBold,
    fontSize: 14,
  },
});
