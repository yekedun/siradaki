import { DEFAULT_WORKING_HOURS } from './onboarding-utils';

export interface UiStaffScheduleDay {
  day: string;
  open: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
}

export interface StaffScheduleRow {
  day_of_week: number;
  is_working: boolean;
  work_start: string;
  work_end: string;
  break_start: string | null;
  break_end: string | null;
}

export interface StaffScheduleUpsertRow extends StaffScheduleRow {
  staff_id: string;
}

export interface UiShopHoursDay {
  id: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
  brk: string;
}

export const DEFAULT_STAFF_SCHEDULE: UiStaffScheduleDay[] = [
  { day: 'Paz', open: false, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Pzt', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Sal', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Car', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Per', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Cum', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
  { day: 'Cmt', open: true, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
];

export function rowsToStaffSchedule(rows: StaffScheduleRow[]): UiStaffScheduleDay[] {
  const byDay = new Map(rows.map((row) => [row.day_of_week, row]));

  return DEFAULT_STAFF_SCHEDULE.map((day, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (!row) return day;

    return {
      day: day.day,
      open: row.is_working,
      start: row.work_start,
      end: row.work_end,
      breakStart: row.break_start ?? '',
      breakEnd: row.break_end ?? '',
    };
  });
}

export function staffScheduleToRows(
  staffId: string,
  schedule: UiStaffScheduleDay[],
): StaffScheduleUpsertRow[] {
  return schedule.map((day, dayOfWeek) => ({
    staff_id: staffId,
    day_of_week: dayOfWeek,
    is_working: day.open,
    work_start: day.start || '09:00',
    work_end: day.end || '19:00',
    break_start: day.breakStart.trim() || null,
    break_end: day.breakEnd.trim() || null,
  }));
}

const SHOP_DAY_TO_DOW: Record<string, number> = {
  paz: 0,
  pzt: 1,
  sal: 2,
  car: 3,
  per: 4,
  cum: 5,
  cmt: 6,
};

const SHOP_UI_TO_WORKING_HOURS_KEY: Record<string, keyof typeof DEFAULT_WORKING_HOURS> = {
  pzt: 'mon',
  sal: 'tue',
  car: 'wed',
  per: 'thu',
  cum: 'fri',
  cmt: 'sat',
  paz: 'sun',
};

export type ShopWorkingHours = typeof DEFAULT_WORKING_HOURS;
type WorkingHoursKey = keyof ShopWorkingHours;
const SHOP_HOURS_UI_DAYS: Array<{ id: string; label: string; key: WorkingHoursKey }> = [
  { id: 'pzt', label: 'Pzt', key: 'mon' },
  { id: 'sal', label: 'Sal', key: 'tue' },
  { id: 'car', label: 'Car', key: 'wed' },
  { id: 'per', label: 'Per', key: 'thu' },
  { id: 'cum', label: 'Cum', key: 'fri' },
  { id: 'cmt', label: 'Cmt', key: 'sat' },
  { id: 'paz', label: 'Paz', key: 'sun' },
];

export function shopHoursScheduleToWorkingHours(
  schedule: UiShopHoursDay[],
): ShopWorkingHours {
  const next: Record<string, { open: string; close: string; enabled: boolean }> = {};

  schedule.forEach((day) => {
    const key = SHOP_UI_TO_WORKING_HOURS_KEY[day.id];
    if (!key) return;
    const fallback = DEFAULT_WORKING_HOURS[key];
    next[key] = {
      open: day.start || fallback.open,
      close: day.end || fallback.close,
      enabled: day.open,
    };
  });

  return {
    ...DEFAULT_WORKING_HOURS,
    ...next,
  };
}

export function shopHoursScheduleFromWorkingHours(
  workingHours: Partial<Record<WorkingHoursKey, { open?: string; close?: string; enabled?: boolean }>> | null | undefined,
): UiShopHoursDay[] {
  return SHOP_HOURS_UI_DAYS.map(({ id, label, key }) => {
    const fallback = DEFAULT_WORKING_HOURS[key];
    const value = workingHours?.[key] ?? fallback;
    return {
      id,
      label,
      open: value.enabled ?? fallback.enabled,
      start: value.open ?? fallback.open,
      end: value.close ?? fallback.close,
      brk: '',
    };
  });
}

export function shopHoursScheduleToRows(
  staffId: string,
  schedule: UiShopHoursDay[],
): StaffScheduleUpsertRow[] {
  return schedule.map((day) => ({
    staff_id: staffId,
    day_of_week: SHOP_DAY_TO_DOW[day.id],
    is_working: day.open,
    work_start: day.start || '09:00',
    work_end: day.end || '19:00',
    break_start: day.brk.trim() || null,
    break_end: null,
  }));
}
