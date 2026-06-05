# Availability Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build owner and staff mobile availability tabs backed by `widget-get-availability` duration-based slot calculation.

**Architecture:** Reuse the existing edge availability endpoint and shared slot algorithm by adding validated `duration_min` support beside the current `service_id` path. Mobile screens use small pure helpers for slot mapping and route-specific containers for owner and staff permissions.

**Tech Stack:** Expo Router, React Native, Supabase JS, Deno edge functions, `@berber/shared/slot-utils`, Jest, pnpm.

---

## File Structure

- Modify `supabase/functions/widget-get-availability/index.ts`: accept `duration_min=30|45|60` as an alternative to `service_id`.
- Create `apps/mobile/lib/availability.ts`: pure types and mapping helpers for duration options, earliest slot summaries, and display formatting.
- Create `apps/mobile/__tests__/availability.test.ts`: unit tests for the mobile mapping helpers.
- Create `apps/mobile/components/availability/AvailabilityScreen.tsx`: shared owner/staff UI and data fetching container.
- Create `apps/mobile/app/(owner)/availability.tsx`: owner route wrapper.
- Create `apps/mobile/app/(app)/availability.tsx`: staff route wrapper.
- Modify `apps/mobile/app/(owner)/_layout.tsx`: add owner tab item.
- Modify `apps/mobile/app/(app)/_layout.tsx`: add staff tab item.

## Task 1: Edge Function Duration Support

**Files:**
- Modify: `supabase/functions/widget-get-availability/index.ts`

- [ ] **Step 1: Add duration validation helper**

Add this near the top, below `DAY_KEYS`:

```ts
const ALLOWED_DURATION_MINUTES = new Set([30, 45, 60]);

function parseDurationMin(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !ALLOWED_DURATION_MINUTES.has(parsed)) {
    return NaN;
  }
  return parsed;
}
```

- [ ] **Step 2: Replace required `service_id` validation**

Change request parsing to:

```ts
const serviceId = url.searchParams.get("service_id");
const durationParam = url.searchParams.get("duration_min");
const durationFromParam = parseDurationMin(durationParam);
```

Replace the current missing-parameter guard with:

```ts
if (!shopSlug || !date || (!serviceId && !durationParam)) {
  return error("shop_slug, date ve service_id veya duration_min zorunlu");
}

if (Number.isNaN(durationFromParam)) {
  return error("duration_min 30, 45 veya 60 olmalı", 400);
}
```

- [ ] **Step 3: Preserve service lookup and derive duration**

Replace the current service lookup block with:

```ts
let durationMin = durationFromParam;

if (serviceId) {
  const { data: service } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();

  if (!service) return error("Hizmet bulunamadı", 404);
  durationMin = service.duration_min;
}

if (!durationMin) {
  return error("Geçerli süre bulunamadı", 400);
}
```

- [ ] **Step 4: Use `durationMin` in both slot calculations**

Replace both occurrences of:

```ts
durationMin: service.duration_min,
```

with:

```ts
durationMin,
```

- [ ] **Step 5: Run focused checks**

Run:

```bash
pnpm --filter @berber/shared test -- slot-utils
pnpm --filter @berber/mobile typecheck
```

Expected: shared slot tests pass; mobile typecheck may fail only if existing unrelated local changes broke dependencies. Record any failure before continuing.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/widget-get-availability/index.ts
git commit -m "feat: allow duration availability queries"
```

## Task 2: Mobile Availability Helpers

**Files:**
- Create: `apps/mobile/lib/availability.ts`
- Create: `apps/mobile/__tests__/availability.test.ts`

- [ ] **Step 1: Write helper tests**

Create `apps/mobile/__tests__/availability.test.ts`:

```ts
import {
  AVAILABILITY_DURATIONS,
  formatAvailabilityTime,
  getAvailableSlots,
  getEarliestStaffOptions,
} from '../lib/availability';

describe('availability helpers', () => {
  it('exposes the supported quick durations', () => {
    expect(AVAILABILITY_DURATIONS).toEqual([30, 45, 60]);
  });

  it('formats slot times in Istanbul time', () => {
    expect(formatAvailabilityTime('2026-06-06T10:00:00.000Z')).toBe('13:00');
  });

  it('keeps only available slots', () => {
    const slots = getAvailableSlots([
      { starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T10:30:00.000Z', available: true },
      { starts_at: '2026-06-06T10:30:00.000Z', ends_at: '2026-06-06T11:00:00.000Z', available: false },
    ]);

    expect(slots).toEqual([
      { starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T10:30:00.000Z', available: true },
    ]);
  });

  it('returns earliest staff options sorted by time', () => {
    const result = getEarliestStaffOptions([
      {
        staffId: 'staff-1',
        staffName: 'Mehmet',
        slots: [{ starts_at: '2026-06-06T11:00:00.000Z', ends_at: '2026-06-06T11:30:00.000Z', available: true }],
      },
      {
        staffId: 'staff-2',
        staffName: 'Can',
        slots: [{ starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T10:30:00.000Z', available: true }],
      },
    ]);

    expect(result).toEqual([
      { staffId: 'staff-2', staffName: 'Can', startsAt: '2026-06-06T10:00:00.000Z', label: '13:00 · Can' },
      { staffId: 'staff-1', staffName: 'Mehmet', startsAt: '2026-06-06T11:00:00.000Z', label: '14:00 · Mehmet' },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
pnpm --filter @berber/mobile test -- availability.test.ts
```

Expected: FAIL because `apps/mobile/lib/availability.ts` does not exist.

- [ ] **Step 3: Implement helpers**

Create `apps/mobile/lib/availability.ts`:

```ts
export const AVAILABILITY_DURATIONS = [30, 45, 60] as const;

export type AvailabilityDuration = typeof AVAILABILITY_DURATIONS[number];

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  available: boolean;
}

export interface StaffAvailability {
  staffId: string;
  staffName: string;
  slots: AvailabilitySlot[];
}

export interface EarliestStaffOption {
  staffId: string;
  staffName: string;
  startsAt: string;
  label: string;
}

export function formatAvailabilityTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function getAvailableSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return slots.filter((slot) => slot.available);
}

export function getEarliestStaffOptions(
  staffAvailability: StaffAvailability[],
  limit = 5,
): EarliestStaffOption[] {
  return staffAvailability
    .flatMap((entry) => {
      const first = getAvailableSlots(entry.slots)[0];
      if (!first) return [];
      return [{
        staffId: entry.staffId,
        staffName: entry.staffName,
        startsAt: first.starts_at,
        label: `${formatAvailabilityTime(first.starts_at)} · ${entry.staffName}`,
      }];
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run:

```bash
pnpm --filter @berber/mobile test -- availability.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/availability.ts apps/mobile/__tests__/availability.test.ts
git commit -m "feat: add availability helpers"
```

## Task 3: Shared Availability Screen

**Files:**
- Create: `apps/mobile/components/availability/AvailabilityScreen.tsx`

- [ ] **Step 1: Create shared screen component**

Create `apps/mobile/components/availability/AvailabilityScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarCheck2 } from 'lucide-react-native';
import { OverlineHeader } from '../ds/OverlineHeader';
import { DayPicker } from '../ds/DayPicker';
import { Card } from '../ds/Card';
import { Chip, ChipRow } from '../ds/Chip';
import { colors, radius } from '../../lib/theme';
import { supabase } from '../../lib/supabase';
import { formatLocalAppointmentDate } from '../../lib/appointment-time';
import {
  AVAILABILITY_DURATIONS,
  AvailabilityDuration,
  AvailabilitySlot,
  formatAvailabilityTime,
  getAvailableSlots,
  getEarliestStaffOptions,
  StaffAvailability,
} from '../../lib/availability';

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

  const { data, error } = await supabase.functions.invoke<AvailabilityResponse>(
    `widget-get-availability?${qs.toString()}`,
    { method: 'GET' },
  );

  if (error) throw error;
  return data ?? { staff_id: params.staffId, closed: false, slots: [] };
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
  const [earliest, setEarliest] = useState<StaffAvailability[]>([]);
  const [closed, setClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const effectiveStaffId = mode === 'staff' ? staffId ?? null : staffFilter;
  const availableSlots = useMemo(() => getAvailableSlots(slots), [slots]);
  const earliestOptions = useMemo(() => getEarliestStaffOptions(earliest), [earliest]);

  const load = useCallback(async (showRefresh = false) => {
    if (!shopSlug || !effectiveStaffId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorText(null);

    try {
      const response = await fetchAvailability({
        shopSlug,
        date: selectedDate,
        duration,
        staffId: effectiveStaffId,
      });
      setClosed(response.closed);
      setSlots(response.slots ?? []);

      const staffForEarliest = mode === 'owner'
        ? staffList
        : staffList.filter((staff) => staff.id === staffId);

      const perStaff = await Promise.all(
        staffForEarliest.map(async (staff) => {
          const staffResponse = await fetchAvailability({
            shopSlug,
            date: selectedDate,
            duration,
            staffId: staff.id,
          });
          return { staffId: staff.id, staffName: staff.name, slots: staffResponse.slots ?? [] };
        }),
      );
      setEarliest(perStaff);
    } catch (err) {
      if (__DEV__) console.warn('[availability] load failed:', err);
      setErrorText('Musaitlik alinamadi. Tekrar deneyin.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [duration, effectiveStaffId, mode, selectedDate, shopSlug, staffId, staffList]);

  useEffect(() => {
    load();
  }, [load]);

  const title = 'Musaitlik';
  const meta = `${duration} dk icin`;

  return (
    <View style={styles.root}>
      <OverlineHeader eyebrow="Berber · Dukkan Paneli" title={title} meta={meta} />
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
            <Chip key={staff.id} selected={staffFilter === staff.id} onPress={() => setStaffFilter(staff.id)}>
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
          {loadingContext || loading ? (
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
        ) : availableSlots.length === 0 && !loading ? (
          <Text style={styles.emptyText}>Bu sure icin bos saat yok.</Text>
        ) : (
          <View style={styles.slotList}>
            {availableSlots.map((slot) => (
              <View key={slot.starts_at} style={styles.slotRow}>
                <Text style={styles.slotTime}>{formatAvailabilityTime(slot.starts_at)}</Text>
                <Text style={styles.slotMeta}>Musait</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.slate[50] },
  content: { padding: 20, paddingBottom: 110, gap: 12 },
  earliestCard: { gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: 'Montserrat-Bold', fontSize: 15, color: colors.ink[900] },
  earliestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  earliestPill: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.slate[0],
  },
  earliestText: { fontFamily: 'Montserrat-SemiBold', fontSize: 12, color: colors.ink[900] },
  mutedText: { fontFamily: 'Montserrat-Regular', fontSize: 13, color: colors.slate[500] },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.coral[600],
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.slate[0],
  },
  errorText: { fontFamily: 'Montserrat-SemiBold', fontSize: 13, color: colors.coral[600] },
  emptyText: {
    paddingVertical: 28,
    textAlign: 'center',
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 13,
    color: colors.slate[500],
  },
  slotList: { gap: 8 },
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
  },
  slotTime: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: colors.ink[900],
    fontVariant: ['tabular-nums'],
  },
  slotMeta: { fontFamily: 'Montserrat-SemiBold', fontSize: 12, color: colors.brand[600] },
});
```

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm --filter @berber/mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/availability/AvailabilityScreen.tsx
git commit -m "feat: add shared availability screen"
```

## Task 4: Owner and Staff Routes

**Files:**
- Create: `apps/mobile/app/(owner)/availability.tsx`
- Create: `apps/mobile/app/(app)/availability.tsx`

- [ ] **Step 1: Create owner route**

Create `apps/mobile/app/(owner)/availability.tsx`:

```tsx
import React from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { useShop } from '../../lib/ShopContext';

export default function OwnerAvailabilityRoute() {
  const { shopSlug, staffList, loading } = useShop();
  return (
    <AvailabilityScreen
      mode="owner"
      shopSlug={shopSlug}
      staffList={staffList}
      loadingContext={loading}
    />
  );
}
```

- [ ] **Step 2: Create staff route**

Create `apps/mobile/app/(app)/availability.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { AvailabilityScreen } from '../../components/availability/AvailabilityScreen';
import { supabase } from '../../lib/supabase';

interface StaffContext {
  staffId: string | null;
  shopSlug: string | null;
  staffName: string;
}

export default function StaffAvailabilityRoute() {
  const [context, setContext] = useState<StaffContext>({ staffId: null, shopSlug: null, staffName: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('staff')
        .select('id, name, shops(slug)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!cancelled) {
        const shop = Array.isArray((data as any)?.shops) ? (data as any).shops[0] : (data as any)?.shops;
        setContext({
          staffId: data?.id ?? null,
          staffName: data?.name ?? '',
          shopSlug: shop?.slug ?? null,
        });
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <AvailabilityScreen
      mode="staff"
      shopSlug={context.shopSlug}
      staffId={context.staffId}
      staffList={context.staffId ? [{ id: context.staffId, name: context.staffName }] : []}
      loadingContext={loading}
    />
  );
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm --filter @berber/mobile typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add 'apps/mobile/app/(owner)/availability.tsx' 'apps/mobile/app/(app)/availability.tsx'
git commit -m "feat: add availability routes"
```

## Task 5: Tab Registration

**Files:**
- Modify: `apps/mobile/app/(owner)/_layout.tsx`
- Modify: `apps/mobile/app/(app)/_layout.tsx`

- [ ] **Step 1: Add icons to imports**

In owner layout, add `CalendarCheck2`:

```ts
import { BarChart3, CalendarDays, CalendarCheck2, Wallet, Users, Settings } from 'lucide-react-native';
```

In staff layout, add `CalendarCheck2`:

```ts
import { Clock3, CalendarCheck2, MinusCircle, Settings } from 'lucide-react-native';
```

- [ ] **Step 2: Add owner tab screen**

Insert owner tab after `agenda`:

```tsx
<Tabs.Screen
  name="availability"
  options={{
    title: 'Musaitlik',
    tabBarIcon: ({ color }) => <CalendarCheck2 size={ICON_SIZE} color={color} />,
  }}
/>
```

- [ ] **Step 3: Add staff tab screen**

Insert staff tab after `index`:

```tsx
<Tabs.Screen
  name="availability"
  options={{
    title: 'Musaitlik',
    tabBarIcon: ({ color, focused }) => (
      <>
        <TabIndicator focused={focused} />
        <CalendarCheck2 size={20} color={color} />
      </>
    ),
  }}
/>
```

- [ ] **Step 4: Run route/type checks**

Run:

```bash
pnpm --filter @berber/mobile typecheck
pnpm --filter @berber/mobile test -- router-guard.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add 'apps/mobile/app/(owner)/_layout.tsx' 'apps/mobile/app/(app)/_layout.tsx'
git commit -m "feat: register availability tabs"
```

## Task 6: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run mobile tests**

Run:

```bash
pnpm --filter @berber/mobile test -- availability.test.ts router-guard.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run mobile typecheck**

Run:

```bash
pnpm --filter @berber/mobile typecheck
```

Expected: PASS.

- [ ] **Step 3: Run edge/shared checks**

Run:

```bash
pnpm --filter @berber/shared test -- slot-utils
```

Expected: PASS.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -6
```

Expected: only intentional commits on `codex/availability`; no unstaged implementation files.
