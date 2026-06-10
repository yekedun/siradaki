import {
  getAppointmentDayIndex,
  getInitialAppointmentServiceIds,
  isAppointmentModalSaveEnabled,
  resolveAppointmentServiceIds,
  toggleAppointmentService,
  type AppointmentModalService,
} from '../lib/appointment-modal-state';

const dbServices: AppointmentModalService[] = [
  { id: 'svc-uuid-1', label: 'Kesim', dur: 30, price: '250₺', priceValue: 250 },
  { id: 'svc-uuid-2', label: 'Sakal', dur: 20, price: '150₺', priceValue: 150 },
];

describe('appointment modal multi-service selection', () => {
  it('defaults to the first provided service instead of the design mock id', () => {
    expect(getInitialAppointmentServiceIds(dbServices)).toEqual(['svc-uuid-1']);
  });

  it('keeps the design mock default when using design mock services', () => {
    expect(getInitialAppointmentServiceIds([
      { id: 'sac', label: 'Sac', dur: 30, price: '200₺', priceValue: 200 },
      { id: 'sac-sakal', label: 'Sac + Sakal', dur: 45, price: '280₺', priceValue: 280 },
    ])).toEqual(['sac-sakal']);
  });

  it('returns empty selection when there are no services', () => {
    expect(getInitialAppointmentServiceIds([])).toEqual([]);
  });

  it('drops stale ids but keeps remaining valid ones after services reload', () => {
    expect(resolveAppointmentServiceIds(['sac-sakal', 'svc-uuid-2'], dbServices)).toEqual(['svc-uuid-2']);
  });

  it('falls back to the initial selection when no selected id survives', () => {
    expect(resolveAppointmentServiceIds(['sac-sakal'], dbServices)).toEqual(['svc-uuid-1']);
  });

  it('toggles a service in and out preserving selection order', () => {
    expect(toggleAppointmentService(['svc-uuid-1'], 'svc-uuid-2')).toEqual(['svc-uuid-1', 'svc-uuid-2']);
    expect(toggleAppointmentService(['svc-uuid-1', 'svc-uuid-2'], 'svc-uuid-1')).toEqual(['svc-uuid-2']);
  });

  it('does not allow saving with an empty service selection', () => {
    expect(isAppointmentModalSaveEnabled({
      customerName: 'Ali',
      slot: '09:00',
      serviceIds: [],
      staffListHasItems: false,
      selectedStaffId: null,
    })).toBe(false);
  });

  it('allows saving with at least one service selected', () => {
    expect(isAppointmentModalSaveEnabled({
      customerName: 'Ali',
      slot: '09:00',
      serviceIds: ['svc-uuid-1', 'svc-uuid-2'],
      staffListHasItems: false,
      selectedStaffId: null,
    })).toBe(true);
  });

  it('resolves the selected day index for edit prefill dates', () => {
    const days = [
      new Date(2026, 5, 3),
      new Date(2026, 5, 4),
      new Date(2026, 5, 5),
    ];

    expect(getAppointmentDayIndex(days, '2026-06-04')).toBe(1);
    expect(getAppointmentDayIndex(days, '2026-06-10')).toBe(0);
  });
});
