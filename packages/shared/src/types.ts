import type { DayKey } from "./constants.ts";

export interface WorkingDayHours {
  open: string | null;
  close: string | null;
  enabled: boolean;
}

export type WorkingHours = Record<DayKey, WorkingDayHours>;

export interface OccupiedRange {
  starts_at: string;
  ends_at: string;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
}

export interface BarberPublic {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  timezone: string;
  working_hours: WorkingHours;
}

export interface ServicePublic {
  id: string;
  barber_id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
  display_order: number;
}

export interface BlockWalkinRequest {
  duration_min: number;
  reason?: "walkin" | "break" | "personal";
}

export interface BookAppointmentRequest {
  slug: string;
  service_id: string;
  starts_at: string;
  customer_name: string;
  customer_phone?: string;
}

export interface BookAppointmentResponse {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  barber_display_name: string;
  service_name: string;
}
