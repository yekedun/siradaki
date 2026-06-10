import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Plus } from 'lucide-react-native';
import { AddAppointmentModal, ServiceOption } from '../AddAppointmentModal';
import { Chip, ChipRow } from '../ds/Chip';
import { DayPicker } from '../ds/DayPicker';
import { OverlineHeader } from '../ds/OverlineHeader';
import { OwnerSettingsAvatar } from '../ds/OwnerSettingsAvatar';
import {
  AVAILABILITY_DURATIONS,
  AvailabilityDuration,
  AvailabilityAppointmentInitialValues,
  AvailabilitySlot,
  StaffAvailability,
  StaffSlotOption,
  buildAvailabilityAppointmentInitialValues,
  findServiceIdForDuration,
  formatAvailabilityTime,
  getStaffAvailableSlotCount,
  getStaffInitials,
  getStaffSlotOptions,
  getTotalAvailableSlotCount,
} from '../../lib/availability';
import {
  AppointmentWorkingHours,
  buildLocalAppointmentTimestamp,
  formatLocalAppointmentDate,
} from '../../lib/appointment-time';
import { supabase } from '../../lib/supabase';
import { colors, radius } from '../../lib/theme';

const FN_BASE = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;

type Mode = 'owner' | 'staff';
type StaffFilter = 'any' | string;

interface StaffOption {
  id: string;
  name: string;
}

interface AvailabilityResponse {
  staff_id: string;
  closed: boolean;
  slots: AvailabilitySlot[];
}

interface AvailabilityScreenProps {
  mode: Mode;
  shopId?: string | null;
  shopSlug: string | null;
  staffList: StaffOption[];
  services?: ServiceOption[];
  staffId?: string | null;
  workingHours?: AppointmentWorkingHours | null;
  loadingContext?: boolean;
}

async function fetchAvailability(params: {
  shopSlug: string;
  date: Date;
  duration: AvailabilityDuration;
  staffId: StaffFilter;
  serviceId: string | null;
}): Promise<AvailabilityResponse> {
  const qs = new URLSearchParams({
    shop_slug: params.shopSlug,
    date: formatLocalAppointmentDate(params.date),
    duration_min: String(params.duration),
    staff_id: params.staffId,
  });
  if (params.serviceId) {
    qs.set('service_id', params.serviceId);
  }

  const res = await fetch(`${FN_BASE}/widget-get-availability?${qs.toString()}`);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = typeof body?.error === 'string' ? body.error : 'Müsaitlik alınamadı.';
    throw new Error(message);
  }

  return body ?? { staff_id: params.staffId, closed: false, slots: [] };
}

export function AvailabilityScreen({
  mode,
  shopId,
  shopSlug,
  staffList,
  services = [],
  staffId,
  workingHours,
  loadingContext = false,
}: AvailabilityScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [duration, setDuration] = useState<AvailabilityDuration>(30);
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('any');
  const [perStaffAvailability, setPerStaffAvailability] = useState<StaffAvailability[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [appointmentInitialValues, setAppointmentInitialValues] =
    useState<AvailabilityAppointmentInitialValues | null>(null);

  const effectiveStaffId = mode === 'staff' ? staffId ?? null : staffFilter;
  const slotOptions = useMemo(
    () => getStaffSlotOptions(perStaffAvailability, duration),
    [duration, perStaffAvailability],
  );
  const topSlot = slotOptions[0] ?? null;
  const totalSlotCount = useMemo(
    () => getTotalAvailableSlotCount(perStaffAvailability),
    [perStaffAvailability],
  );
  const serviceId = useMemo(
    () => findServiceIdForDuration(services, duration),
    [duration, services],
  );

  const staffForSummary = useMemo(() => {
    if (mode === 'staff') {
      return staffId ? staffList.filter((staff) => staff.id === staffId) : [];
    }
    if (staffFilter !== 'any') {
      return staffList.filter((staff) => staff.id === staffFilter);
    }
    return staffList;
  }, [mode, staffFilter, staffId, staffList]);

  const load = useCallback(async (showRefresh = false) => {
    if (!shopSlug || !effectiveStaffId) {
      setPerStaffAvailability([]);
      return;
    }

    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorText(null);

    try {
      const [response, perStaff] = await Promise.all([
        fetchAvailability({
          shopSlug,
          date: selectedDate,
          duration,
          staffId: effectiveStaffId,
          serviceId,
        }),
        Promise.all(
          staffForSummary.map(async (staff) => {
            const staffResponse = await fetchAvailability({
              shopSlug,
              date: selectedDate,
              duration,
              staffId: staff.id,
              serviceId,
            });

            return {
              staffId: staff.id,
              staffName: staff.name,
              slots: staffResponse.slots ?? [],
            };
          }),
        ),
      ]);

      setClosed(response.closed);
      setPerStaffAvailability(perStaff);
    } catch (err) {
      if (__DEV__) console.warn('[availability] load failed:', err);
      setErrorText(err instanceof Error ? err.message : 'Müsaitlik alınamadı.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [duration, effectiveStaffId, selectedDate, serviceId, shopSlug, staffForSummary]);

  useEffect(() => {
    load();
  }, [load]);

  const isBusy = loadingContext || loading;

  function handleOpenAppointment(slot: StaffSlotOption) {
    setAppointmentInitialValues(
      buildAvailabilityAppointmentInitialValues({
        staffId: slot.staffId,
        startsAt: slot.startsAt,
      }),
    );
  }

  async function handleSaveAppointment(data: {
    customerName: string;
    customerPhone: string;
    serviceIds: string[];
    staffId: string | null;
    date: string;
    time: string;
    notes?: string;
  }) {
    if (!shopSlug) {
      Alert.alert('Hata', 'Dükkan bilgisi yüklenmedi. Sayfayı yenileyin.');
      return;
    }
    if (!data.staffId) {
      Alert.alert('Hata', 'Berber seçimi zorunludur.');
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
      const ctx = (fnErr as any)?.context;
      let status = ctx?.status ?? 0;
      let ctxBody: any = ctx?.body;
      if (ctx && typeof ctx.json === 'function') {
        try { ctxBody = await ctx.clone().json(); }
        catch { try { ctxBody = await ctx.clone().text(); } catch {} }
        if (!status) status = ctx.status ?? 0;
      }

      const serverMsg = (ctxBody && typeof ctxBody === 'object' && typeof ctxBody.error === 'string')
        ? ctxBody.error
        : (typeof ctxBody === 'string' ? ctxBody : '');
      const msg = status === 409
        ? serverMsg || 'Bu saat dolu. Başka bir saat seçin.'
        : status === 401
          ? 'Oturum gerekli. Tekrar giriş yapın.'
          : serverMsg || fnErr.message || 'Randevu eklenemedi.';

      Alert.alert('Hata', msg);
      if (status === 409) load(true);
      return;
    }

    setAppointmentInitialValues(null);
    load(true);
  }

  return (
    <View style={styles.root}>
      <OverlineHeader
        eyebrow={mode === 'owner' ? 'Dükkan Sahibi' : 'Berber'}
        title="Müsaitlik"
        meta={`${duration} dk için`}
        trailing={mode === 'owner' ? <OwnerSettingsAvatar /> : null}
      />
      <DayPicker selected={selectedDate} onSelect={setSelectedDate} />

      <ChipRow>
        {AVAILABILITY_DURATIONS.map((value) => (
          <Chip key={value} selected={duration === value} onPress={() => setDuration(value)}>
            {value} dk
          </Chip>
        ))}
      </ChipRow>

      {mode === 'owner' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => setStaffFilter('any')}
            style={[styles.filterChip, staffFilter === 'any' && styles.filterChipSelected]}
          >
            <Text style={[styles.filterAvatar, staffFilter === 'any' && styles.filterAvatarSelected]}>
              TM
            </Text>
            <Text style={[styles.filterLabel, staffFilter === 'any' && styles.filterLabelSelected]}>
              Tümü
            </Text>
            <Text style={[styles.filterCount, staffFilter === 'any' && styles.filterCountSelected]}>
              {totalSlotCount}
            </Text>
          </TouchableOpacity>
          {staffList.map((staff) => {
            const selected = staffFilter === staff.id;
            const count = getStaffAvailableSlotCount(perStaffAvailability, staff.id);

            return (
              <TouchableOpacity
                key={staff.id}
                activeOpacity={0.82}
                onPress={() => setStaffFilter(staff.id)}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <Text style={[styles.filterAvatar, selected && styles.filterAvatarSelected]}>
                  {getStaffInitials(staff.name)}
                </Text>
                <Text style={[styles.filterLabel, selected && styles.filterLabelSelected]} numberOfLines={1}>
                  {staff.name}
                </Text>
                <Text style={[styles.filterCount, selected && styles.filterCountSelected]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <TouchableOpacity
          activeOpacity={topSlot && !isBusy ? 0.86 : 1}
          disabled={!topSlot || isBusy}
          onPress={() => topSlot && handleOpenAppointment(topSlot)}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>
            {(() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const diff = Math.round((selectedDate.getTime() - today.getTime()) / 86400000);
              const label = diff === 0 ? 'Bugün' : diff === 1 ? 'Yarın' : selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
              return `${label} · en yakın boş slot`;
            })()}
          </Text>
          {isBusy ? (
            <ActivityIndicator color="#ffffff" style={styles.heroLoader} />
          ) : topSlot ? (
            <>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={() => handleOpenAppointment(topSlot)}
                hitSlop={8}
                style={styles.heroAddButton}
              >
                <Plus size={22} color="#ffffff" strokeWidth={2.4} />
              </TouchableOpacity>
              <View style={styles.heroTimeRow}>
                <Text style={styles.heroTime}>{formatAvailabilityTime(topSlot.startsAt)}</Text>
                <Text style={styles.heroEndTime}>{formatAvailabilityTime(topSlot.endsAt)}</Text>
              </View>
              <View style={styles.heroStaffRow}>
                <Text style={styles.heroAvatar}>{topSlot.initials}</Text>
                <View style={styles.heroStaffText}>
                  <Text style={styles.heroName} numberOfLines={1}>{topSlot.staffName}</Text>
                  <Text style={styles.heroMeta}>{topSlot.durationMin} dk müsait</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.heroEmpty}>Bu seçimde yakın boş saat yok.</Text>
          )}
        </TouchableOpacity>

        {errorText && (
          <TouchableOpacity style={styles.errorBox} onPress={() => load()}>
            <Text style={styles.errorText}>{errorText}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Boş slotlar</Text>
          <Text style={styles.sectionCount}>{slotOptions.length} slot</Text>
        </View>

        {closed ? (
          <Text style={styles.emptyText}>Seçilen gün kapalı.</Text>
        ) : slotOptions.length === 0 && !isBusy ? (
          <Text style={styles.emptyText}>Bu süre için boş saat yok.</Text>
        ) : (
          <View style={styles.slotList}>
            {slotOptions.map((slot) => (
              <TouchableOpacity
                key={`${slot.staffId}-${slot.startsAt}`}
                activeOpacity={0.82}
                onPress={() => handleOpenAppointment(slot)}
                style={styles.slotCard}
              >
                <View style={styles.slotTimeBlock}>
                  <Text style={styles.slotTime}>{formatAvailabilityTime(slot.startsAt)}</Text>
                  <Text style={styles.slotEnd}>{formatAvailabilityTime(slot.endsAt)}</Text>
                </View>
                <Text style={styles.slotAvatar}>{slot.initials}</Text>
                <View style={styles.slotStaffBlock}>
                  <Text style={styles.slotStaffName} numberOfLines={2}>{slot.staffName}</Text>
                  <Text style={styles.slotMeta}>{slot.durationMin} dk müsait</Text>
                </View>
                <View style={styles.durationPill}>
                  <Text style={styles.durationPillText}>{slot.durationMin} dk</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => handleOpenAppointment(slot)}
                  hitSlop={8}
                  style={styles.slotAddButton}
                >
                  <Plus size={22} color={colors.ink[900]} strokeWidth={2.2} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <AddAppointmentModal
        visible={!!appointmentInitialValues}
        onClose={() => {
          setAppointmentInitialValues(null);
        }}
        onSave={handleSaveAppointment}
        services={services}
        staffList={mode === 'staff' && staffId ? staffList.filter((staff) => staff.id === staffId) : staffList}
        initialStaffId={appointmentInitialValues?.staffId ?? (mode === 'staff' ? staffId ?? null : null)}
        workingHours={workingHours}
        shopId={shopId}
        mode="create"
        initialValues={appointmentInitialValues}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    padding: 20,
    paddingBottom: 110,
    gap: 12,
  },
  filterScroll: {
    height: 48,
    flexGrow: 0,
    flexShrink: 0,
  },
  filterContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
    alignItems: 'center',
  },
  filterChip: {
    height: 40,
    maxWidth: 180,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[0],
    paddingLeft: 7,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChipSelected: {
    borderColor: colors.ink[900],
    backgroundColor: colors.ink[900],
  },
  filterAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.brand[100],
    color: colors.brand[700],
    fontFamily: 'Montserrat-Bold',
    fontSize: 10,
    lineHeight: 26,
  },
  filterAvatarSelected: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#ffffff',
  },
  filterLabel: {
    minWidth: 0,
    maxWidth: 92,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: colors.ink[900],
  },
  filterLabelSelected: {
    color: '#ffffff',
  },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: colors.slate[100],
    color: colors.slate[500],
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    lineHeight: 22,
  },
  filterCountSelected: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    color: '#ffffff',
  },
  heroCard: {
    minHeight: 154,
    borderRadius: radius.lg,
    padding: 18,
    backgroundColor: colors.mint[700],
    gap: 12,
    position: 'relative',
  },
  heroAddButton: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
  },
  heroLoader: {
    marginTop: 34,
  },
  heroTimeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  heroTime: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 48,
    lineHeight: 52,
    color: '#ffffff',
  },
  heroEndTime: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 18,
    color: 'rgba(255,255,255,0.72)',
    paddingBottom: 7,
  },
  heroStaffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroAvatar: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    lineHeight: 34,
    color: '#ffffff',
  },
  heroStaffText: {
    minWidth: 0,
    flex: 1,
  },
  heroName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: '#ffffff',
  },
  heroMeta: {
    marginTop: 2,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
  },
  heroEmpty: {
    marginTop: 30,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.76)',
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.coral[600],
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.slate[0],
  },
  errorText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: colors.coral[600],
  },
  emptyText: {
    paddingVertical: 28,
    textAlign: 'center',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: colors.slate[500],
  },
  slotList: {
    gap: 10,
  },
  sectionHeader: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: colors.slate[500],
  },
  sectionCount: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: colors.slate[500],
  },
  slotCard: {
    minHeight: 74,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[0],
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotTimeBlock: {
    width: 62,
  },
  slotTime: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: colors.ink[900],
  },
  slotEnd: {
    marginTop: 2,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: colors.slate[500],
  },
  slotAvatar: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.brand[100],
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: 'Montserrat-Bold',
    fontSize: 11,
    lineHeight: 32,
    color: colors.brand[700],
  },
  slotStaffBlock: {
    minWidth: 0,
    flex: 1,
  },
  slotStaffName: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 13,
    lineHeight: 16,
    color: colors.ink[900],
  },
  slotMeta: {
    marginTop: 2,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 11,
    color: colors.mint[700],
  },
  durationPill: {
    minWidth: 58,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
  },
  slotAddButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[0],
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPillText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 12,
    color: colors.brand[700],
  },
});
