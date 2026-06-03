import {
  createAppointmentDraftFromFreeGap,
  getInitialAppointmentServiceId,
  isAppointmentDraftSaveEnabled,
  isAppointmentModalSaveEnabled,
  selectedServiceFitsGap,
  resolveAppointmentServiceId,
  type AppointmentModalService,
} from '../lib/appointment-modal-state';

const dbServices: AppointmentModalService[] = [
  { id: 'svc-uuid-1', label: 'Kesim', dur: 30, price: '250' },
  { id: 'svc-uuid-2', label: 'Sakal', dur: 20, price: '150' },
];

describe('appointment modal service selection', () => {
  it('defaults to the first provided service instead of the design mock id', () => {
    expect(getInitialAppointmentServiceId(dbServices)).toBe('svc-uuid-1');
  });

  it('keeps the design mock default when using design mock services', () => {
    expect(getInitialAppointmentServiceId([
      { id: 'sac', label: 'Sac', dur: 30, price: '200' },
      { id: 'sac-sakal', label: 'Sac + Sakal', dur: 45, price: '280' },
    ])).toBe('sac-sakal');
  });

  it('falls back to the first service when selected id disappears after services reload', () => {
    expect(resolveAppointmentServiceId('sac-sakal', dbServices)).toBe('svc-uuid-1');
  });

  it('does not allow saving without a real current service id', () => {
    expect(isAppointmentModalSaveEnabled({
      customerName: 'Ali',
      slot: '09:00',
      serviceId: null,
      staffListHasItems: false,
      selectedStaffId: null,
    })).toBe(false);
  });
});

describe('v2 appointment draft prefill', () => {
  it('prefills date, time and staff from a selected free gap', () => {
    const draft = createAppointmentDraftFromFreeGap({
      startsAt: '2026-05-20T15:45:00+03:00',
      staffId: 'staff-1',
      gapDurationMin: 45,
    });

    expect(draft).toMatchObject({
      date: '2026-05-20',
      time: '15:45',
      staffId: 'staff-1',
      gapDurationMin: 45,
    });
  });

  it('keeps a shorter service valid inside a larger free gap', () => {
    expect(selectedServiceFitsGap({ serviceDurationMin: 45, gapDurationMin: 90 })).toBe(true);
  });

  it('rejects services that do not fit the selected free gap', () => {
    expect(selectedServiceFitsGap({ serviceDurationMin: 120, gapDurationMin: 90 })).toBe(false);
  });

  it('requires selected service to fit before saving a prefilled gap appointment', () => {
    expect(isAppointmentDraftSaveEnabled({
      customerName: 'Ali',
      date: '2026-05-20',
      time: '15:00',
      serviceId: 'svc-1',
      staffId: 'staff-1',
      serviceDurationMin: 120,
      gapDurationMin: 90,
    })).toBe(false);

    expect(isAppointmentDraftSaveEnabled({
      customerName: 'Ali',
      date: '2026-05-20',
      time: '15:00',
      serviceId: 'svc-1',
      staffId: 'staff-1',
      serviceDurationMin: 45,
      gapDurationMin: 90,
    })).toBe(true);
  });
});
