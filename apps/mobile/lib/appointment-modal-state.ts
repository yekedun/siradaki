export interface AppointmentModalService {
  id: string;
  label: string;
  dur: number;
  price: string;
}

interface SaveState {
  customerName: string;
  slot: string;
  serviceId: string | null;
  staffListHasItems: boolean;
  selectedStaffId: string | null;
}

export interface AppointmentDraft {
  customerName: string;
  customerPhone: string;
  serviceId: string | null;
  staffId: string | null;
  date: string;
  time: string;
  notes: string;
  gapDurationMin: number | null;
}

export interface FreeGapPrefill {
  startsAt: string;
  staffId: string;
  gapDurationMin: number;
}

export interface DraftSaveState {
  customerName: string;
  date: string;
  time: string;
  serviceId: string | null;
  staffId: string | null;
  serviceDurationMin: number | null;
  gapDurationMin: number | null;
}

const DESIGN_DEFAULT_SERVICE_ID = 'sac-sakal';

export function getInitialAppointmentServiceId(
  services: AppointmentModalService[],
): string | null {
  if (services.some((service) => service.id === DESIGN_DEFAULT_SERVICE_ID)) {
    return DESIGN_DEFAULT_SERVICE_ID;
  }
  return services[0]?.id ?? null;
}

export function resolveAppointmentServiceId(
  currentServiceId: string | null,
  services: AppointmentModalService[],
): string | null {
  if (currentServiceId && services.some((service) => service.id === currentServiceId)) {
    return currentServiceId;
  }
  return getInitialAppointmentServiceId(services);
}

export function isAppointmentModalSaveEnabled(state: SaveState): boolean {
  return state.customerName.trim().length >= 2
    && !!state.slot
    && !!state.serviceId
    && (!state.staffListHasItems || !!state.selectedStaffId);
}

export function createAppointmentDraftFromFreeGap(prefill: FreeGapPrefill): AppointmentDraft {
  return {
    customerName: '',
    customerPhone: '',
    serviceId: null,
    staffId: prefill.staffId,
    date: prefill.startsAt.slice(0, 10),
    time: prefill.startsAt.slice(11, 16),
    notes: '',
    gapDurationMin: prefill.gapDurationMin,
  };
}

export function selectedServiceFitsGap({
  serviceDurationMin,
  gapDurationMin,
}: {
  serviceDurationMin: number | null;
  gapDurationMin: number | null;
}): boolean {
  if (serviceDurationMin == null || gapDurationMin == null) return true;
  return serviceDurationMin <= gapDurationMin;
}

export function isAppointmentDraftSaveEnabled(state: DraftSaveState): boolean {
  return state.customerName.trim().length >= 2
    && !!state.date
    && !!state.time
    && !!state.serviceId
    && !!state.staffId
    && selectedServiceFitsGap({
      serviceDurationMin: state.serviceDurationMin,
      gapDurationMin: state.gapDurationMin,
    });
}
