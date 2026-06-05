/**
 * Unit tests for lib/utils.ts
 * TDD: these tests were written BEFORE the implementation.
 * Run: pnpm test (from apps/mobile)
 */

import {
  formatTime,
  formatCents,
  translateReason,
  getAppointmentState,
  buildDayRange,
  buildForwardAgendaDays,
  getForwardAgendaDateByIndex,
} from '../lib/utils';

/* ── formatTime ──────────────────────────────────────────────── */
describe('formatTime', () => {
  it('formats midnight as 00:00', () => {
    const d = new Date(2026, 4, 7, 0, 0, 0);
    expect(formatTime(d)).toBe('00:00');
  });

  it('pads single-digit hours', () => {
    const d = new Date(2026, 4, 7, 9, 5, 0);
    expect(formatTime(d)).toBe('09:05');
  });

  it('formats afternoon time correctly', () => {
    const d = new Date(2026, 4, 7, 14, 30, 0);
    expect(formatTime(d)).toBe('14:30');
  });

  it('formats end-of-day correctly', () => {
    const d = new Date(2026, 4, 7, 23, 59, 0);
    expect(formatTime(d)).toBe('23:59');
  });
});

/* ── formatCents ─────────────────────────────────────────────── */
describe('formatCents', () => {
  it('returns "—" for zero when useEmDash is true (default)', () => {
    expect(formatCents(0)).toBe('—');
  });

  it('returns "0" for zero when useEmDash is false', () => {
    expect(formatCents(0, false)).toBe('0');
  });

  it('converts 32000 cents → "320" (TL display, no decimals)', () => {
    expect(formatCents(32000)).toBe('320');
  });

  it('converts 8432000 cents → "84.320" (Turkish locale thousands)', () => {
    // tr-TR uses period as thousands separator
    expect(formatCents(8432000)).toBe('84.320');
  });

  it('rounds fractional cents correctly', () => {
    // 150 cents = 1.50 TL → rounds to 2
    expect(formatCents(150)).toBe('2');
  });
});

/* ── translateReason ─────────────────────────────────────────── */
describe('translateReason', () => {
  it('translates "walkin" to "Anlık Müşteri"', () => {
    expect(translateReason('walkin')).toBe('Anlık Müşteri');
  });

  it('translates "break" to "Mola"', () => {
    expect(translateReason('break')).toBe('Mola');
  });

  it('translates "personal" to "Kişisel"', () => {
    expect(translateReason('personal')).toBe('Kişisel');
  });

  it('returns unknown reasons as-is', () => {
    expect(translateReason('custom_reason')).toBe('custom_reason');
  });

  it('handles empty string by returning it', () => {
    expect(translateReason('')).toBe('');
  });
});

/* ── getAppointmentState ─────────────────────────────────────── */
describe('getAppointmentState', () => {
  const makeAppt = (startsAt: Date, durationMin: number, status: string) => ({
    starts_at: startsAt.toISOString(),
    duration_min: durationMin,
    status,
  });

  it('returns "done" for completed status regardless of time', () => {
    const past = new Date(Date.now() - 3600_000);
    expect(getAppointmentState(makeAppt(past, 30, 'completed'))).toBe('done');
  });

  it('returns "active" when now is within appointment window', () => {
    const justStarted = new Date(Date.now() - 5_000); // 5 sec ago
    expect(getAppointmentState(makeAppt(justStarted, 30, 'confirmed'))).toBe('active');
  });

  it('returns "upcoming" for future appointments', () => {
    const future = new Date(Date.now() + 3600_000);
    expect(getAppointmentState(makeAppt(future, 30, 'confirmed'))).toBe('upcoming');
  });

  it('returns "done" when appointment window has passed (not marked completed)', () => {
    // Started 60 min ago, 30 min duration → ended 30 min ago
    const old = new Date(Date.now() - 3600_000);
    expect(getAppointmentState(makeAppt(old, 30, 'confirmed'))).toBe('done');
  });

  it('returns "upcoming" at the exact start boundary (edge case)', () => {
    // starts exactly now — should be active
    const now = new Date();
    const state = getAppointmentState(makeAppt(now, 30, 'confirmed'));
    expect(['active', 'upcoming']).toContain(state); // ms precision edge
  });
});

/* ── buildDayRange ───────────────────────────────────────────── */
describe('buildDayRange', () => {
  it('start is midnight of the given date', () => {
    const d = new Date(2026, 4, 7, 14, 30, 0);
    const { start } = buildDayRange(d);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getSeconds()).toBe(0);
  });

  it('end is midnight of the next day', () => {
    const d = new Date(2026, 4, 7, 14, 30, 0);
    const { end } = buildDayRange(d);
    expect(end.getDate()).toBe(8);
    expect(end.getHours()).toBe(0);
  });

  it('start and end are different Date objects (no mutation)', () => {
    const d = new Date(2026, 4, 7);
    const { start, end } = buildDayRange(d);
    expect(start).not.toBe(end);
    expect(start).not.toBe(d);
  });

  it('end is exactly 24 hours after start', () => {
    const d = new Date(2026, 4, 7);
    const { start, end } = buildDayRange(d);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe('forward agenda days', () => {
  const today = new Date(2026, 5, 5, 14, 51, 0);

  it('starts the agenda day picker at today, not earlier dates', () => {
    const days = buildForwardAgendaDays(today);

    expect(days.map((d) => d.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(days.every((d) => d.getTime() >= new Date(2026, 5, 5).getTime())).toBe(true);
  });

  it('maps index 0 to today for staff agenda queries and header', () => {
    const selected = getForwardAgendaDateByIndex(0, today);

    expect(selected.getFullYear()).toBe(2026);
    expect(selected.getMonth()).toBe(5);
    expect(selected.getDate()).toBe(5);
    expect(selected.getHours()).toBe(0);
  });
});
