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
  id?: string;
}

export interface Slot {
  startsAt: Date;
  endsAt: Date;
  available: boolean;
}

// Dükkan: müşteri sayfasında ve booking flow'da kullanılır
export interface ShopPublic {
  id: string;
  slug: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  timezone: string;
  working_hours: WorkingHours;
}

// Usta: müşteri usta seçim adımında kullanılır
export interface BarberPublic {
  id: string;
  shop_id: string;
  display_name: string;
  avatar_url: string | null;
  is_active: boolean;
}

// Hizmet: dükkan düzeyinde
export interface ServicePublic {
  id: string;
  shop_id: string;
  name: string;
  duration_min: number;
  price_cents: number | null;
  display_order: number;
}

export interface BlockWalkinRequest {
  barber_id: string;
  duration_min: number;
  reason?: "walkin" | "break" | "personal";
}

export interface BookAppointmentRequest {
  shop_slug: string;
  service_id: string;
  // barber_id = null → "Fark Etmez", assign_any_barber çağrılır
  barber_id: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string;
}

export interface BookAppointmentResponse {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  barber_display_name: string;
  service_name: string | null;
}
