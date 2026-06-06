export const AVAILABILITY_DURATIONS = [30, 45, 60] as const;

export type AvailabilityDuration = (typeof AVAILABILITY_DURATIONS)[number];

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  available: boolean;
}

export interface AvailabilityServiceOption {
  id: string;
  dur: number;
}

export interface StaffAvailability {
  staffId: string;
  staffName: string;
  slots: AvailabilitySlot[];
}

export interface EarliestStaffOption {
  staffId: string;
  staffName: string;
  startsAt: string;
  label: string;
}

export interface StaffSlotOption {
  staffId: string;
  staffName: string;
  initials: string;
  startsAt: string;
  endsAt: string;
  durationMin: AvailabilityDuration;
}

export interface AvailabilityAppointmentInitialValues {
  customerName: string;
  customerPhone: string;
  serviceId: string | null;
  staffId: string;
  date: string;
  time: string;
  notes: string | null;
}

function formatAvailabilityDate(value: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));

  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

export function formatAvailabilityTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function buildAvailabilityAppointmentInitialValues({
  staffId,
  startsAt,
}: {
  staffId: string;
  startsAt: string;
}): AvailabilityAppointmentInitialValues {
  return {
    customerName: '',
    customerPhone: '',
    serviceId: null,
    staffId,
    date: formatAvailabilityDate(startsAt),
    time: formatAvailabilityTime(startsAt),
    notes: null,
  };
}

export function getAvailableSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return slots.filter((slot) => slot.available);
}

export function findServiceIdForDuration(
  services: AvailabilityServiceOption[],
  duration: AvailabilityDuration,
): string | null {
  return services.find((service) => service.dur === duration)?.id ?? services[0]?.id ?? null;
}

export function getEarliestStaffOptions(
  staffAvailability: StaffAvailability[],
  limit = 5,
): EarliestStaffOption[] {
  return staffAvailability
    .flatMap((entry) => {
      const first = getAvailableSlots(entry.slots)[0];
      if (!first) return [];

      return [
        {
          staffId: entry.staffId,
          staffName: entry.staffName,
          startsAt: first.starts_at,
          label: `${formatAvailabilityTime(first.starts_at)} · ${entry.staffName}`,
        },
      ];
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, limit);
}

export function getStaffInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => part[0]?.toLocaleUpperCase('tr-TR') ?? '').join('');
}

export function getStaffSlotOptions(
  staffAvailability: StaffAvailability[],
  durationMin: AvailabilityDuration,
): StaffSlotOption[] {
  return staffAvailability
    .flatMap((entry) =>
      getAvailableSlots(entry.slots).map((slot) => ({
        staffId: entry.staffId,
        staffName: entry.staffName,
        initials: getStaffInitials(entry.staffName),
        startsAt: slot.starts_at,
        endsAt: slot.ends_at,
        durationMin,
      })),
    )
    .sort((a, b) => {
      const timeSort = a.startsAt.localeCompare(b.startsAt);
      if (timeSort !== 0) return timeSort;
      return a.staffName.localeCompare(b.staffName, 'tr-TR');
    });
}

export function getStaffAvailableSlotCount(staffAvailability: StaffAvailability[], staffId: string): number {
  return getAvailableSlots(staffAvailability.find((entry) => entry.staffId === staffId)?.slots ?? []).length;
}

export function getTotalAvailableSlotCount(staffAvailability: StaffAvailability[]): number {
  return staffAvailability.reduce((total, entry) => total + getAvailableSlots(entry.slots).length, 0);
}
