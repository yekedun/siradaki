import {
  AVAILABILITY_DURATIONS,
  buildAvailabilityAppointmentInitialValues,
  formatAvailabilityTime,
  findServiceIdForDuration,
  getAvailableSlots,
  getEarliestStaffOptions,
  getStaffAvailableSlotCount,
  getStaffInitials,
  getStaffSlotOptions,
  getTotalAvailableSlotCount,
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
      {
        starts_at: '2026-06-06T10:00:00.000Z',
        ends_at: '2026-06-06T10:30:00.000Z',
        available: true,
      },
      {
        starts_at: '2026-06-06T10:30:00.000Z',
        ends_at: '2026-06-06T11:00:00.000Z',
        available: false,
      },
    ]);

    expect(slots).toEqual([
      {
        starts_at: '2026-06-06T10:00:00.000Z',
        ends_at: '2026-06-06T10:30:00.000Z',
        available: true,
      },
    ]);
  });

  it('finds a matching service id for legacy availability endpoints', () => {
    expect(
      findServiceIdForDuration([
        { id: 'svc-30', dur: 30 },
        { id: 'svc-45', dur: 45 },
      ], 45),
    ).toBe('svc-45');
  });

  it('falls back to the first service when no duration matches', () => {
    expect(
      findServiceIdForDuration([
        { id: 'svc-30', dur: 30 },
        { id: 'svc-45', dur: 45 },
      ], 60),
    ).toBe('svc-30');
  });

  it('returns null when there are no services', () => {
    expect(findServiceIdForDuration([], 60)).toBeNull();
  });

  it('returns earliest staff options sorted by time', () => {
    const result = getEarliestStaffOptions([
      {
        staffId: 'staff-1',
        staffName: 'Mehmet',
        slots: [
          {
            starts_at: '2026-06-06T11:00:00.000Z',
            ends_at: '2026-06-06T11:30:00.000Z',
            available: true,
          },
        ],
      },
      {
        staffId: 'staff-2',
        staffName: 'Can',
        slots: [
          {
            starts_at: '2026-06-06T10:00:00.000Z',
            ends_at: '2026-06-06T10:30:00.000Z',
            available: true,
          },
        ],
      },
    ]);

    expect(result).toEqual([
      {
        staffId: 'staff-2',
        staffName: 'Can',
        startsAt: '2026-06-06T10:00:00.000Z',
        label: '13:00 · Can',
      },
      {
        staffId: 'staff-1',
        staffName: 'Mehmet',
        startsAt: '2026-06-06T11:00:00.000Z',
        label: '14:00 · Mehmet',
      },
    ]);
  });

  it('builds initials for staff chips and slot cards', () => {
    expect(getStaffInitials('Emre Keskin')).toBe('EK');
    expect(getStaffInitials('Soner')).toBe('S');
    expect(getStaffInitials('')).toBe('?');
  });

  it('builds staff slot cards sorted by time then staff name', () => {
    const result = getStaffSlotOptions([
      {
        staffId: 'staff-2',
        staffName: 'Soner Ay',
        slots: [
          { starts_at: '2026-06-06T11:00:00.000Z', ends_at: '2026-06-06T12:00:00.000Z', available: true },
          { starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T11:00:00.000Z', available: true },
        ],
      },
      {
        staffId: 'staff-1',
        staffName: 'Emre Keskin',
        slots: [
          { starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T11:00:00.000Z', available: true },
          { starts_at: '2026-06-06T12:00:00.000Z', ends_at: '2026-06-06T13:00:00.000Z', available: false },
        ],
      },
    ], 60);

    expect(result.map((slot) => `${slot.startsAt}-${slot.staffName}-${slot.initials}`)).toEqual([
      '2026-06-06T10:00:00.000Z-Emre Keskin-EK',
      '2026-06-06T10:00:00.000Z-Soner Ay-SA',
      '2026-06-06T11:00:00.000Z-Soner Ay-SA',
    ]);
  });

  it('counts available slots for all and per staff', () => {
    const availability = [
      {
        staffId: 'staff-1',
        staffName: 'Emre',
        slots: [
          { starts_at: '2026-06-06T10:00:00.000Z', ends_at: '2026-06-06T10:30:00.000Z', available: true },
          { starts_at: '2026-06-06T10:30:00.000Z', ends_at: '2026-06-06T11:00:00.000Z', available: false },
        ],
      },
      {
        staffId: 'staff-2',
        staffName: 'Soner',
        slots: [
          { starts_at: '2026-06-06T11:00:00.000Z', ends_at: '2026-06-06T11:30:00.000Z', available: true },
        ],
      },
    ];

    expect(getStaffAvailableSlotCount(availability, 'staff-1')).toBe(1);
    expect(getTotalAvailableSlotCount(availability)).toBe(2);
  });

  it('builds appointment modal initial values from an available staff slot', () => {
    expect(
      buildAvailabilityAppointmentInitialValues({
        staffId: 'staff-1',
        startsAt: '2026-06-06T06:00:00.000Z',
      }),
    ).toEqual({
      customerName: '',
      customerPhone: '',
      serviceIds: [],
      staffId: 'staff-1',
      date: '2026-06-06',
      time: '09:00',
      notes: null,
    });
  });
});
