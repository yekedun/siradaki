import { toggleService } from '@berber/shared/booking-selection';

export interface AppointmentModalService {
  id: string;
  label: string;
  dur: number;
  price: string;
  priceValue: number;
}

interface SaveState {
  customerName: string;
  slot: string;
  serviceIds: string[];
  staffListHasItems: boolean;
  selectedStaffId: string | null;
}

const DESIGN_DEFAULT_SERVICE_ID = 'sac-sakal';

export function getInitialAppointmentServiceIds(
  services: AppointmentModalService[],
): string[] {
  if (services.some((service) => service.id === DESIGN_DEFAULT_SERVICE_ID)) {
    return [DESIGN_DEFAULT_SERVICE_ID];
  }
  return services[0] ? [services[0].id] : [];
}

export function resolveAppointmentServiceIds(
  currentServiceIds: string[],
  services: AppointmentModalService[],
): string[] {
  const valid = currentServiceIds.filter((id) => services.some((service) => service.id === id));
  if (valid.length > 0) return valid;
  return getInitialAppointmentServiceIds(services);
}

export function toggleAppointmentService(current: string[], id: string): string[] {
  return toggleService(current, id);
}

export function isAppointmentModalSaveEnabled(state: SaveState): boolean {
  return state.customerName.trim().length >= 2
    && !!state.slot
    && state.serviceIds.length > 0
    && (!state.staffListHasItems || !!state.selectedStaffId);
}

export function getAppointmentDayIndex(
  days: Date[],
  date: string | null | undefined,
): number {
  if (!date) return 0;
  const idx = days.findIndex((day) => {
    const year = day.getFullYear();
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const dayOfMonth = String(day.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayOfMonth}` === date;
  });
  return idx >= 0 ? idx : 0;
}
