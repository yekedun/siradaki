import {
  AVAILABILITY_DURATIONS,
  formatAvailabilityTime,
  findServiceIdForDuration,
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

  it('returns null when no service matches the selected duration', () => {
    expect(
      findServiceIdForDuration([{ id: 'svc-30', dur: 30 }], 60),
    ).toBeNull();
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
});
