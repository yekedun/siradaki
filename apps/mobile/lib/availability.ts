export const AVAILABILITY_DURATIONS = [30, 45, 60] as const;

export type AvailabilityDuration = (typeof AVAILABILITY_DURATIONS)[number];

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
  available: boolean;
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

export function formatAvailabilityTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function getAvailableSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  return slots.filter((slot) => slot.available);
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
