import { appointmentRowToAgendaItem } from '../lib/appointment-mappers';

describe('appointmentRowToAgendaItem', () => {
  it('maps joined service data instead of relying on non-existent appointment columns', () => {
    const item = appointmentRowToAgendaItem({
      id: 'appt-1',
      customer_name: 'Ali Veli',
      starts_at: '2026-05-24T09:00:00+03:00',
      ends_at: '2026-05-24T09:45:00+03:00',
      status: 'confirmed',
      services: { name: 'Saç + Sakal', duration_min: 45 },
    }, new Date('2026-05-24T07:00:00+03:00'));

    expect(item).toMatchObject({
      id: 'appt-1',
      name: 'Ali Veli',
      svc: 'Saç + Sakal',
      dur: 45,
      state: 'upcoming',
    });
  });

  it('falls back to the appointment time range when service duration is missing', () => {
    const item = appointmentRowToAgendaItem({
      id: 'appt-2',
      customer_name: 'Ayşe',
      starts_at: '2026-05-24T10:00:00+03:00',
      ends_at: '2026-05-24T10:30:00+03:00',
      status: 'confirmed',
      services: null,
    }, new Date('2026-05-24T09:00:00+03:00'));

    expect(item.dur).toBe(30);
    expect(item.svc).toBe('Hizmet');
  });

  it('prefers customer_notes for appointment card notes', () => {
    const item = appointmentRowToAgendaItem({
      id: 'appt-3',
      customer_name: 'Veli',
      starts_at: '2026-05-24T11:00:00+03:00',
      ends_at: '2026-05-24T11:30:00+03:00',
      status: 'confirmed',
      notes: 'legacy note',
      customer_notes: 'customer note',
      services: null,
    }, new Date('2026-05-24T09:00:00+03:00'));

    expect(item.notes).toBe('customer note');
  });
});
