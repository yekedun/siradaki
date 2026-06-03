import {
  buildIstanbulAppointmentDayRange,
  buildLocalAppointmentTimestamp,
  formatLocalAppointmentDate,
  generateAppointmentTimesForDate,
  generateAppointmentTimes,
} from '../lib/appointment-time';

describe('buildLocalAppointmentTimestamp', () => {
  it('adds an explicit timezone offset so Postgres does not guess UTC/local session timezone', () => {
    const ts = buildLocalAppointmentTimestamp('2026-05-25', '09:30');

    expect(ts).toMatch(/^2026-05-25T09:30:00[+-]\d{2}:\d{2}$/);
  });
});

describe('formatLocalAppointmentDate', () => {
  it('formats the selected local calendar date without converting through UTC', () => {
    const date = new Date(2026, 4, 24, 23, 30, 0, 0);

    expect(formatLocalAppointmentDate(date)).toBe('2026-05-24');
  });
});

describe('buildIstanbulAppointmentDayRange', () => {
  it('builds a stable Istanbul calendar-day query range', () => {
    const date = new Date(2026, 5, 3, 15, 45, 0, 0);

    expect(buildIstanbulAppointmentDayRange(date)).toEqual({
      start: '2026-06-03T00:00:00+03:00',
      end: '2026-06-04T00:00:00+03:00',
    });
  });
});

describe('generateAppointmentTimes', () => {
  it('generates late slots when the shop closes at 23:59', () => {
    const slots = generateAppointmentTimes({ open: '09:00', close: '23:59', stepMinutes: 30, durationMinutes: 30 });

    expect(slots).toContain('19:30');
    expect(slots).toContain('23:00');
    expect(slots[slots.length - 1]).toBe('23:00');
  });
});

describe('generateAppointmentTimesForDate', () => {
  it('uses the selected day from shop working hours', () => {
    const sunday = new Date(2026, 4, 24, 12, 0, 0, 0);
    const slots = generateAppointmentTimesForDate(sunday, {
      sun: { open: '12:00', close: '23:59', enabled: true },
    }, 30);

    expect(slots[0]).toBe('12:00');
    expect(slots).toContain('19:30');
    expect(slots[slots.length - 1]).toBe('23:00');
  });

  it('returns no slots when the selected shop day is disabled', () => {
    const sunday = new Date(2026, 4, 24, 12, 0, 0, 0);

    expect(generateAppointmentTimesForDate(sunday, {
      sun: { open: '09:00', close: '19:00', enabled: false },
    }, 30)).toEqual([]);
  });
});
