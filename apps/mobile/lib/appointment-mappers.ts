import { formatTime, AppointmentState as AppState } from './utils';

interface AppointmentServiceJoin {
  name?: string | null;
  duration_min?: number | null;
}

interface AppointmentServicesRow {
  sequence_order?: number | null;
  services?: { name?: string | null } | { name?: string | null }[] | null;
}

export interface AppointmentAgendaRow {
  id: string;
  customer_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes?: string | null;
  customer_notes?: string | null;
  services?: AppointmentServiceJoin | AppointmentServiceJoin[] | null;
  appointment_services?: AppointmentServicesRow[] | null;
}

function joinedServiceName(row: AppointmentServicesRow): string | null {
  const svc = Array.isArray(row.services) ? row.services[0] : row.services;
  return svc?.name ?? null;
}

export function appointmentRowToAgendaItem(row: AppointmentAgendaRow, now = new Date()) {
  const start = new Date(row.starts_at);
  const end = new Date(row.ends_at);
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  const fallbackDuration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  const names = (row.appointment_services ?? [])
    .slice()
    .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0))
    .map(joinedServiceName)
    .filter((n): n is string => Boolean(n));
  // For multi-service rows ends_at - starts_at is the authoritative total duration.
  const dur = names.length > 1 ? fallbackDuration : service?.duration_min ?? fallbackDuration;
  const state: AppState = row.status === 'completed' ? 'done'
    : (start <= now && now < end) ? 'active' : 'upcoming';

  return {
    type: 'appt' as const,
    id: row.id,
    time: formatTime(start),
    endTime: formatTime(end),
    dur,
    name: row.customer_name,
    svc: names.length > 0 ? names.join(' + ') : (service?.name ?? 'Hizmet'),
    notes: row.customer_notes ?? row.notes ?? null,
    state,
  };
}
