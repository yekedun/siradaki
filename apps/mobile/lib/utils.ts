/**
 * Shared utility functions — pure, side-effect-free, fully tested.
 * Extracted from individual screens for reuse and testability.
 */

/* ── Time ────────────────────────────────────────────────────── */

/** Format a Date to "HH:MM" (24-hour, zero-padded). */
export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Return { start, end } for the full calendar day containing `date`. */
export function buildDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function getForwardAgendaDateByIndex(index: number, from: Date = new Date()): Date {
  const date = new Date(from);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + index);
  return date;
}

export function buildForwardAgendaDays(from: Date = new Date(), dayCount = 7): Date[] {
  return Array.from({ length: dayCount }, (_, index) => getForwardAgendaDateByIndex(index, from));
}

/* ── Turkish date display ────────────────────────────────────── */

export const TR_MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'] as const;
export const TR_DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'] as const;
const TR_DAYS_ABBR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

/** "10 Haziran 2026, Çar" — agenda header meta line. */
export function formatAgendaMetaDate(d: Date): string {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${TR_DAYS_ABBR[d.getDay()]}`;
}

/** "10 Haziran" — short day label for empty states. */
export function formatDayMonth(d: Date): string {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

/* ── Currency ────────────────────────────────────────────────── */

/**
 * Convert cents (integer) to Turkish locale display string.
 * @param cents        Amount in kuruş (100 kuruş = 1 TL)
 * @param useEmDash    Return "—" for zero (default true)
 */
export function formatCents(cents: number, useEmDash = true): string {
  if (cents === 0) return useEmDash ? '—' : '0';
  return (cents / 100).toLocaleString('tr-TR', { maximumFractionDigits: 0 });
}

/* ── Appointment ─────────────────────────────────────────────── */

export type AppointmentState = 'done' | 'active' | 'upcoming';

interface AppointmentLike {
  starts_at: string;
  duration_min: number;
  status: string;
}

/**
 * Determine display state of an appointment relative to now.
 *
 * Rules:
 *   status === 'completed'          → 'done'
 *   end time has passed             → 'done'   (no-show / forgot to mark)
 *   now is within [start, end)      → 'active'
 *   start is in the future          → 'upcoming'
 */
export function getAppointmentState(appt: AppointmentLike): AppointmentState {
  if (appt.status === 'completed') return 'done';
  const now = Date.now();
  const start = new Date(appt.starts_at).getTime();
  const end = start + (appt.duration_min ?? 30) * 60_000;
  if (now >= end) return 'done';
  if (now >= start && now < end) return 'active';
  return 'upcoming';
}

/* ── i18n ────────────────────────────────────────────────────── */

const REASON_MAP: Record<string, string> = {
  walkin: 'Anlık Müşteri',
  break: 'Mola',
  personal: 'Kişisel',
};

/** Translate a block reason code to Turkish. Unknown codes pass through. */
export function translateReason(reason: string): string {
  return REASON_MAP[reason] ?? reason;
}
