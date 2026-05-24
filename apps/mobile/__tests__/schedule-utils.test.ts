import {
  DEFAULT_STAFF_SCHEDULE,
  shopHoursScheduleToRows,
  rowsToStaffSchedule,
  staffScheduleToRows,
  type StaffScheduleRow,
} from '../lib/staff-schedule';

describe('staff schedule helpers', () => {
  it('converts UI days to staff_schedules upsert rows', () => {
    const rows = staffScheduleToRows('staff-1', [
      { day: 'Paz', open: false, start: '09:00', end: '19:00', breakStart: '', breakEnd: '' },
      { day: 'Pzt', open: true, start: '10:00', end: '18:00', breakStart: '13:00', breakEnd: '13:30' },
    ]);

    expect(rows).toEqual([
      {
        staff_id: 'staff-1',
        day_of_week: 0,
        is_working: false,
        work_start: '09:00',
        work_end: '19:00',
        break_start: null,
        break_end: null,
      },
      {
        staff_id: 'staff-1',
        day_of_week: 1,
        is_working: true,
        work_start: '10:00',
        work_end: '18:00',
        break_start: '13:00',
        break_end: '13:30',
      },
    ]);
  });

  it('prefills the default schedule with rows from Supabase', () => {
    const rows: StaffScheduleRow[] = [
      {
        day_of_week: 2,
        is_working: true,
        work_start: '11:00',
        work_end: '20:00',
        break_start: null,
        break_end: null,
      },
      {
        day_of_week: 6,
        is_working: false,
        work_start: '09:00',
        work_end: '19:00',
        break_start: '12:00',
        break_end: '12:30',
      },
    ];

    const schedule = rowsToStaffSchedule(rows);

    expect(schedule[0]).toEqual(DEFAULT_STAFF_SCHEDULE[0]);
    expect(schedule[2]).toMatchObject({
      day: 'Sal',
      open: true,
      start: '11:00',
      end: '20:00',
      breakStart: '',
      breakEnd: '',
    });
    expect(schedule[6]).toMatchObject({
      day: 'Cmt',
      open: false,
      start: '09:00',
      end: '19:00',
      breakStart: '12:00',
      breakEnd: '12:30',
    });
  });

  it('converts owner shop hours order to staff_schedules day_of_week values', () => {
    const rows = shopHoursScheduleToRows('staff-owner', [
      { id: 'pzt', label: 'Pzt', open: true, start: '09:00', end: '18:00', brk: '' },
      { id: 'sal', label: 'Sal', open: true, start: '10:00', end: '19:00', brk: '13:00' },
      { id: 'paz', label: 'Paz', open: false, start: '', end: '', brk: '' },
    ]);

    expect(rows).toEqual([
      {
        staff_id: 'staff-owner',
        day_of_week: 1,
        is_working: true,
        work_start: '09:00',
        work_end: '18:00',
        break_start: null,
        break_end: null,
      },
      {
        staff_id: 'staff-owner',
        day_of_week: 2,
        is_working: true,
        work_start: '10:00',
        work_end: '19:00',
        break_start: '13:00',
        break_end: null,
      },
      {
        staff_id: 'staff-owner',
        day_of_week: 0,
        is_working: false,
        work_start: '09:00',
        work_end: '19:00',
        break_start: null,
        break_end: null,
      },
    ]);
  });
});
