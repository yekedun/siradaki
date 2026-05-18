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

// Usta/Personel: müşteri seçim adımında kullanılır
export interface StaffPublic {
  id: string;
  shop_id: string;
  name: string;
  role: string;
  slug: string | null;
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
  staff_id: string;
  duration_min: number;
  reason?: "walkin" | "break" | "personal";
}

export interface BookAppointmentRequest {
  shop_slug: string;
  service_id: string;
  // staff_id = null → "Fark Etmez", assign_any_staff çağrılır
  staff_id: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_notes?: string;
}

export interface BookAppointmentResponse {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  staff_name: string;
  service_name: string | null;
}
