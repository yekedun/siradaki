import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type {
  BookAppointmentRequest,
  WorkingHours,
} from "@berber/shared/types";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  let body: BookAppointmentRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { slug, service_id, starts_at, customer_name, customer_phone } = body;

  if (!slug || !service_id || !starts_at || !customer_name) {
    return error("slug, service_id, starts_at, customer_name zorunlu");
  }

  if (customer_name.trim().length < 2) {
    return error("İsim en az 2 karakter olmalı");
  }

  const supabase = createAdminClient();

  // 1. Resolve barber
  const { data: barber } = await supabase
    .from("barbers")
    .select("id, display_name, timezone, working_hours")
    .eq("slug", slug)
    .single();

  if (!barber) return error("Berber bulunamadı", 404);

  // 2. Resolve service
  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_min")
    .eq("id", service_id)
    .eq("barber_id", barber.id)
    .eq("is_active", true)
    .single();

  if (!service) return error("Hizmet bulunamadı", 404);

  // 3. Server-side slot revalidation (race condition guard)
  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Geçersiz starts_at");

  const dateStr = slotDate.toISOString().split("T")[0]!;

  const { data: occupied, error: rpcError } = await supabase.rpc(
    "get_occupied_ranges",
    { p_barber_id: barber.id, p_date: dateStr }
  );

  if (rpcError) {
    console.error("get_occupied_ranges RPC failed:", rpcError);
    return error("Müsaitlik bilgisi alınamadı", 500);
  }

  const slots = computeAvailableSlots({
    date: slotDate,
    durationMin: service.duration_min,
    workingHours: barber.working_hours as WorkingHours,
    occupied: occupied ?? [],
    timezone: barber.timezone,
  });

  const requestedStartIso = slotDate.toISOString();
  const requestedSlot = slots.find(
    (s) => s.startsAt.toISOString() === requestedStartIso
  );

  if (!requestedSlot?.available) {
    return error("Bu saat artık müsait değil", 409);
  }

  // 4. Insert appointment
  const endsAt = new Date(
    slotDate.getTime() + service.duration_min * 60_000
  ).toISOString();

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      barber_id: barber.id,
      service_id: service.id,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone?.trim() || null,
      starts_at,
      ends_at: endsAt,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23P01") {
      return error("Bu saat az önce doldu, başka bir saat seçin", 409);
    }
    console.error("Appointment insert error:", insertError);
    return error("Randevu oluşturulamadı", 500);
  }

  return json({
    appointment_id: appointment!.id,
    starts_at,
    ends_at: endsAt,
    barber_display_name: barber.display_name,
    service_name: service.name,
  });
});
