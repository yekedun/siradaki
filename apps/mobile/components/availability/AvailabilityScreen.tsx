import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CalendarCheck2 } from 'lucide-react-native';
import { Card } from '../ds/Card';
import { Chip, ChipRow } from '../ds/Chip';
import { DayPicker } from '../ds/DayPicker';
import { OverlineHeader } from '../ds/OverlineHeader';
import {
  AVAILABILITY_DURATIONS,
  AvailabilityDuration,
  AvailabilitySlot,
  StaffAvailability,
  formatAvailabilityTime,
  getAvailableSlots,
  getEarliestStaffOptions,
} from '../../lib/availability';
import { formatLocalAppointmentDate } from '../../lib/appointment-time';
import { colors, radius } from '../../lib/theme';

const FN_BASE = process.env.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1';

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
  shopSlug: string | null;
  staffList: StaffOption[];
  staffId?: string | null;
  loadingContext?: boolean;
}

async function fetchAvailability(params: {
  shopSlug: string;
  date: Date;
  duration: AvailabilityDuration;
  staffId: StaffFilter;
}): Promise<AvailabilityResponse> {
  const qs = new URLSearchParams({
    shop_slug: params.shopSlug,
    date: formatLocalAppointmentDate(params.date),
    duration_min: String(params.duration),
    staff_id: params.staffId,
  });

  const res = await fetch(`${FN_BASE}/widget-get-availability?${qs.toString()}`);
  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = typeof body?.error === 'string' ? body.error : 'Musaitlik alinamadi.';
    throw new Error(message);
  }

  return body ?? { staff_id: params.staffId, closed: false, slots: [] };
}

export function AvailabilityScreen({
  mode,
  shopSlug,
  staffList,
  staffId,
  loadingContext = false,
}: AvailabilityScreenProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [duration, setDuration] = useState<AvailabilityDuration>(30);
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('any');
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [perStaffAvailability, setPerStaffAvailability] = useState<StaffAvailability[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const effectiveStaffId = mode === 'staff' ? staffId ?? null : staffFilter;
  const availableSlots = useMemo(() => getAvailableSlots(slots), [slots]);
  const earliestOptions = useMemo(
    () => getEarliestStaffOptions(perStaffAvailability),
    [perStaffAvailability],
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
      setSlots([]);
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
        }),
        Promise.all(
          staffForSummary.map(async (staff) => {
            const staffResponse = await fetchAvailability({
              shopSlug,
              date: selectedDate,
              duration,
              staffId: staff.id,
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
      setSlots(response.slots ?? []);
      setPerStaffAvailability(perStaff);
    } catch (err) {
      if (__DEV__) console.warn('[availability] load failed:', err);
      setErrorText(err instanceof Error ? err.message : 'Musaitlik alinamadi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [duration, effectiveStaffId, selectedDate, shopSlug, staffForSummary]);

  useEffect(() => {
    load();
  }, [load]);

  function staffNamesForSlot(startsAt: string): string {
    const names = perStaffAvailability
      .filter((entry) => entry.slots.some((slot) => slot.starts_at === startsAt && slot.available))
      .map((entry) => entry.staffName)
      .filter(Boolean);

    if (names.length === 0) return 'Musait';
    if (names.length <= 2) return names.join(', ');
    return `${names.length} personel`;
  }

  const isBusy = loadingContext || loading;

  return (
    <View style={styles.root}>
      <OverlineHeader
        eyebrow="Berber · Dukkan Paneli"
        title="Musaitlik"
        meta={`${duration} dk icin`}
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
        <ChipRow>
          <Chip selected={staffFilter === 'any'} onPress={() => setStaffFilter('any')}>
            Tumu
          </Chip>
          {staffList.map((staff) => (
            <Chip
              key={staff.id}
              selected={staffFilter === staff.id}
              onPress={() => setStaffFilter(staff.id)}
            >
              {staff.name}
            </Chip>
          ))}
        </ChipRow>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        <Card style={styles.earliestCard}>
          <View style={styles.cardHeader}>
            <CalendarCheck2 size={18} color={colors.brand[600]} />
            <Text style={styles.cardTitle}>En erken bos saatler</Text>
          </View>

          {isBusy ? (
            <ActivityIndicator color={colors.brand[600]} />
          ) : earliestOptions.length > 0 ? (
            <View style={styles.earliestGrid}>
              {earliestOptions.map((option) => (
                <View key={`${option.staffId}-${option.startsAt}`} style={styles.earliestPill}>
                  <Text style={styles.earliestText}>{option.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>Bu secimde yakin bos saat yok.</Text>
          )}
        </Card>

        {errorText && (
          <TouchableOpacity style={styles.errorBox} onPress={() => load()}>
            <Text style={styles.errorText}>{errorText}</Text>
          </TouchableOpacity>
        )}

        {closed ? (
          <Text style={styles.emptyText}>Secilen gun kapali.</Text>
        ) : availableSlots.length === 0 && !isBusy ? (
          <Text style={styles.emptyText}>Bu sure icin bos saat yok.</Text>
        ) : (
          <View style={styles.slotList}>
            {availableSlots.map((slot) => (
              <View key={slot.starts_at} style={styles.slotRow}>
                <Text style={styles.slotTime}>{formatAvailabilityTime(slot.starts_at)}</Text>
                <Text style={styles.slotMeta} numberOfLines={1}>
                  {staffNamesForSlot(slot.starts_at)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  earliestCard: {
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: colors.ink[900],
  },
  earliestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  earliestPill: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.slate[0],
  },
  earliestText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: colors.ink[900],
  },
  mutedText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    color: colors.slate[500],
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
    gap: 8,
  },
  slotRow: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate[200],
    backgroundColor: colors.slate[0],
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  slotTime: {
    flexShrink: 0,
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: colors.ink[900],
  },
  slotMeta: {
    minWidth: 0,
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 12,
    color: colors.brand[600],
  },
});
