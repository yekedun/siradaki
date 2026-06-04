import {
  DEFAULT_STAFF_SCHEDULE,
  rowsToStaffSchedule,
  staffScheduleToRows,
  shopHoursScheduleToRows,
  shopHoursScheduleToWorkingHours,
  shopHoursScheduleFromWorkingHours,
  type StaffScheduleRow,
  type UiStaffScheduleDay,
  type UiShopHoursDay,
} from '../lib/staff-schedule';

// ─── DEFAULT_STAFF_SCHEDULE ───────────────────────────────────────────────────

describe('DEFAULT_STAFF_SCHEDULE', () => {
  it('has exactly 7 days', () => {
    expect(DEFAULT_STAFF_SCHEDULE).toHaveLength(7);
  });

  it('index 0 is Paz (Sunday)', () => {
    expect(DEFAULT_STAFF_SCHEDULE[0].day).toBe('Paz');
  });

  it('follows correct index→abbreviation order', () => {
    const expected = ['Paz', 'Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt'];
    expect(DEFAULT_STAFF_SCHEDULE.map((d) => d.day)).toEqual(expected);
  });

  it('Paz is closed by default, all others open', () => {
    expect(DEFAULT_STAFF_SCHEDULE[0].open).toBe(false);
    for (let i = 1; i < 7; i++) {
      expect(DEFAULT_STAFF_SCHEDULE[i].open).toBe(true);
    }
  });

  it('all days default to 09:00–19:00 with no break', () => {
    for (const day of DEFAULT_STAFF_SCHEDULE) {
      expect(day.start).toBe('09:00');
      expect(day.end).toBe('19:00');
      expect(day.breakStart).toBe('');
      expect(day.breakEnd).toBe('');
    }
  });
});

// ─── staffScheduleToRows (UI → DB) ───────────────────────────────────────────

describe('staffScheduleToRows', () => {
  it('maps each array index to day_of_week', () => {
    const schedule: UiStaffScheduleDay[] = DEFAULT_STAFF_SCHEDULE.map((d) => ({ ...d }));
    const rows = staffScheduleToRows('staff-1', schedule);
    rows.forEach((row, i) => {
      expect(row.day_of_week).toBe(i);
    });
  });

  it('sets staff_id on every row', () => {
    const rows = staffScheduleToRows('staff-abc', DEFAULT_STAFF_SCHEDULE);
    for (const row of rows) {
      expect(row.staff_id).toBe('staff-abc');
    }
  });

  it('converts breakStart/breakEnd to null when empty string', () => {
    const rows = staffScheduleToRows('s1', [
      { day: 'Paz', open: false, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
    ]);
    expect(rows[0].break_start).toBeNull();
    expect(rows[0].break_end).toBeNull();
  });

  it('converts whitespace-only breakStart/breakEnd to null', () => {
    const rows = staffScheduleToRows('s1', [
      { day: 'Pzt', open: true, start: '09:00', end: '18:00', breakStart: '   ', breakEnd: '\t' },
    ]);
    expect(rows[0].break_start).toBeNull();
    expect(rows[0].break_end).toBeNull();
  });

  it('keeps non-empty break times as strings', () => {
    const rows = staffScheduleToRows('s1', [
      { day: 'Sal', open: true, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '13:30' },
    ]);
    expect(rows[0].break_start).toBe('13:00');
    expect(rows[0].break_end).toBe('13:30');
  });

  it('preserves work_start/work_end even when is_working=false', () => {
    const rows = staffScheduleToRows('s1', [
      { day: 'Paz', open: false, start: '10:00', end: '17:00', breakStart: '', breakEnd: '' },
    ]);
    expect(rows[0].is_working).toBe(false);
    expect(rows[0].work_start).toBe('10:00');
    expect(rows[0].work_end).toBe('17:00');
  });

  it('falls back to 09:00/19:00 when start/end are empty strings', () => {
    const rows = staffScheduleToRows('s1', [
      { day: 'Pzt', open: true, start: '', end: '', breakStart: '', breakEnd: '' },
    ]);
    expect(rows[0].work_start).toBe('09:00');
    expect(rows[0].work_end).toBe('19:00');
  });

  it('produces full upsert shape', () => {
    const rows = staffScheduleToRows('staff-1', [
      { day: 'Paz', open: false, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
      { day: 'Pzt', open: true, start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '13:30' },
    ]);
    expect(rows).toEqual([
      { staff_id: 'staff-1', day_of_week: 0, is_working: false, work_start: '09:00', work_end: '19:00', break_start: null, break_end: null },
      { staff_id: 'staff-1', day_of_week: 1, is_working: true, work_start: '10:00', work_end: '18:00', break_start: '13:00', break_end: '13:30' },
    ]);
  });
});

// ─── rowsToStaffSchedule (DB → UI) ───────────────────────────────────────────

describe('rowsToStaffSchedule', () => {
  it('returns 7 days always', () => {
    expect(rowsToStaffSchedule([])).toHaveLength(7);
  });

  it('uses DEFAULT_STAFF_SCHEDULE for days with no matching DB row', () => {
    const schedule = rowsToStaffSchedule([]);
    expect(schedule).toEqual(DEFAULT_STAFF_SCHEDULE);
  });

  it('merges DB row into the correct index via day_of_week', () => {
    const rows: StaffScheduleRow[] = [
      { day_of_week: 3, is_working: true, work_start: '08:00', work_end: '17:00', break_start: null, break_end: null },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[3]).toMatchObject({ day: 'Car', open: true, start: '08:00', end: '17:00' });
  });

  it('converts null break_start/break_end to empty string in UI', () => {
    const rows: StaffScheduleRow[] = [
      { day_of_week: 1, is_working: true, work_start: '09:00', work_end: '19:00', break_start: null, break_end: null },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[1].breakStart).toBe('');
    expect(schedule[1].breakEnd).toBe('');
  });

  it('carries non-null break times into UI', () => {
    const rows: StaffScheduleRow[] = [
      { day_of_week: 2, is_working: true, work_start: '09:00', work_end: '19:00', break_start: '12:00', break_end: '12:30' },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[2].breakStart).toBe('12:00');
    expect(schedule[2].breakEnd).toBe('12:30');
  });

  it('preserves the day abbreviation from DEFAULT_STAFF_SCHEDULE (not the row)', () => {
    const rows: StaffScheduleRow[] = [
      { day_of_week: 6, is_working: false, work_start: '09:00', work_end: '19:00', break_start: null, break_end: null },
    ];
    const schedule = rowsToStaffSchedule(rows);
    expect(schedule[6].day).toBe('Cmt');
  });

  it('round-trips: staffScheduleToRows → rowsToStaffSchedule returns original UI shape', () => {
    const original: UiStaffScheduleDay[] = [
      { day: 'Paz', open: false, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
      { day: 'Pzt', open: true, start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '13:30' },
      ...DEFAULT_STAFF_SCHEDULE.slice(2),
    ];
    const rows = staffScheduleToRows('staff-1', original).map(({ staff_id: _s, ...rest }) => rest);
    const recovered = rowsToStaffSchedule(rows);
    expect(recovered).toEqual(original);
  });
});

// ─── shopHoursScheduleToRows (owner UI → DB) ─────────────────────────────────

describe('shopHoursScheduleToRows', () => {
  const ownerSchedule: UiShopHoursDay[] = [
    { id: 'pzt', label: 'Pzt', open: true, start: '09:00', end: '18:00', brk: '' },
    { id: 'sal', label: 'Sal', open: true, start: '10:00', end: '19:00', brk: '13:00' },
    { id: 'paz', label: 'Paz', open: false, start: '', end: '', brk: '' },
  ];

  it('maps pzt → day_of_week 1', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    expect(rows.find((r) => r.work_start === '09:00')?.day_of_week).toBe(1);
  });

  it('maps paz → day_of_week 0', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    expect(rows.find((r) => r.is_working === false)?.day_of_week).toBe(0);
  });

  it('converts empty brk to null break_start', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    const pzt = rows.find((r) => r.day_of_week === 1)!;
    expect(pzt.break_start).toBeNull();
  });

  it('keeps non-empty brk as break_start', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    const sal = rows.find((r) => r.day_of_week === 2)!;
    expect(sal.break_start).toBe('13:00');
  });

  it('always sets break_end to null (shop schedule has no break end)', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    for (const row of rows) {
      expect(row.break_end).toBeNull();
    }
  });

  it('falls back to 09:00/19:00 when start/end are empty', () => {
    const rows = shopHoursScheduleToRows('s1', ownerSchedule);
    const paz = rows.find((r) => r.day_of_week === 0)!;
    expect(paz.work_start).toBe('09:00');
    expect(paz.work_end).toBe('19:00');
  });
});

// ─── shopHoursScheduleToWorkingHours ─────────────────────────────────────────

describe('shopHoursScheduleToWorkingHours', () => {
  it('uses Turkish id keys (pzt/sal/...) to write English WorkingHours keys (mon/tue/...)', () => {
    const wh = shopHoursScheduleToWorkingHours([
      { id: 'pzt', label: 'Pzt', open: true, start: '09:00', end: '19:00', brk: '' },
    ]);
    expect(wh).toHaveProperty('mon');
    expect(wh).not.toHaveProperty('pzt');
  });

  it('sets enabled from the open flag', () => {
    const wh = shopHoursScheduleToWorkingHours([
      { id: 'paz', label: 'Paz', open: false, start: '', end: '', brk: '' },
    ]);
    expect(wh.sun?.enabled).toBe(false);
  });

  it('falls back to DEFAULT_WORKING_HOURS values when start/end are empty', () => {
    const wh = shopHoursScheduleToWorkingHours([
      { id: 'pzt', label: 'Pzt', open: true, start: '', end: '', brk: '' },
    ]);
    expect(wh.mon?.open).toBeTruthy();
    expect(wh.mon?.close).toBeTruthy();
  });
});

// ─── shopHoursScheduleFromWorkingHours ───────────────────────────────────────

describe('shopHoursScheduleFromWorkingHours', () => {
  it('returns 7 days', () => {
    expect(shopHoursScheduleFromWorkingHours(null)).toHaveLength(7);
  });

  it('assigns brk as empty string for every day', () => {
    const schedule = shopHoursScheduleFromWorkingHours(null);
    for (const day of schedule) {
      expect(day.brk).toBe('');
    }
  });

  it('reads mon → id pzt', () => {
    const schedule = shopHoursScheduleFromWorkingHours({
      mon: { open: '08:00', close: '17:00', enabled: true },
    });
    const pzt = schedule.find((d) => d.id === 'pzt');
    expect(pzt).toMatchObject({ open: true, start: '08:00', end: '17:00' });
  });

  it('reads sat → id cmt', () => {
    const schedule = shopHoursScheduleFromWorkingHours({
      sat: { open: '11:00', close: '16:00', enabled: true },
    });
    const cmt = schedule.find((d) => d.id === 'cmt');
    expect(cmt).toMatchObject({ open: true, start: '11:00', end: '16:00' });
  });

  it('falls back to DEFAULT_WORKING_HOURS for missing keys', () => {
    const schedule = shopHoursScheduleFromWorkingHours({});
    expect(schedule.find((d) => d.id === 'pzt')?.open).toBeDefined();
  });

  it('handles null/undefined input without throwing', () => {
    expect(() => shopHoursScheduleFromWorkingHours(null)).not.toThrow();
    expect(() => shopHoursScheduleFromWorkingHours(undefined)).not.toThrow();
  });
});
