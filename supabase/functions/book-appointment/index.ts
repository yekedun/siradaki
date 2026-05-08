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

  const { shop_slug, service_id, staff_id, starts_at, customer_name, customer_phone } = body;

  if (!shop_slug || !service_id || !starts_at || !customer_name) {
    return error("shop_slug, service_id, starts_at, customer_name zorunlu");
  }

  if (customer_name.trim().length < 2) {
    return error("İsim en az 2 karakter olmalı");
  }

  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Geçersiz starts_at");

  const supabase = createAdminClient();

  // 1. Dükkanı slug ile bul
  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shop_slug)
    .single();

  if (!shop) return error("Dükkan bulunamadı", 404);

  // 2. Hizmeti doğrula (bu dükkana ait ve aktif mi?)
  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_min")
    .eq("id", service_id)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();

  if (!service) return error("Hizmet bulunamadı", 404);

  const endsAt = new Date(
    slotDate.getTime() + service.duration_min * 60_000
  ).toISOString();

  // 3. Usta belirleme
  // staff_id = null → "Fark Etmez": assign_any_staff ile otomatik ata
  let resolvedStaffId: string;

  if (!staff_id) {
    const { data: assigned } = await supabase.rpc("assign_any_staff", {
      p_shop_id: shop.id,
      p_starts_at: starts_at,
      p_ends_at: endsAt,
    });

    if (!assigned) {
      return error("Seçilen saatte hiç müsait personel yok", 409);
    }
    resolvedStaffId = assigned;
  } else {
    // Belirtilen personelin bu dükkana ait olduğunu doğrula
    const { data: staffMember } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staff_id)
      .eq("shop_id", shop.id)
      .single();

    if (!staffMember) return error("Personel bulunamadı", 404);
    resolvedStaffId = staffMember.id;
  }

  // 4. Server-side slot revalidation (race condition guard)
  const dateStr = slotDate.toISOString().split("T")[0]!;

  const { data: occupied, error: rpcError } = await supabase.rpc(
    "get_occupied_ranges",
    { p_staff_id: resolvedStaffId, p_date: dateStr }
  );

  if (rpcError) {
    console.error("get_occupied_ranges RPC failed:", rpcError);
    return error("Müsaitlik bilgisi alınamadı", 500);
  }

  const slots = computeAvailableSlots({
    date: slotDate,
    durationMin: service.duration_min,
    workingHours: shop.working_hours as WorkingHours,
    occupied: occupied ?? [],
    timezone: shop.timezone,
  });

  const requestedSlot = slots.find(
    (s) => s.startsAt.toISOString() === slotDate.toISOString()
  );

  if (!requestedSlot?.available) {
    return error("Bu saat artık müsait değil", 409);
  }

  // 5. Randevuyu kaydet
  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      staff_id: resolvedStaffId,
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
      return error("Seçilen personel bu saatte dolu", 409);
    }
    console.error("Appointment insert error:", insertError);
    return error("Randevu oluşturulamadı", 500);
  }

  // Personel adını döndürmek için resolve et
  const { data: staffRow } = await supabase
    .from("staff")
    .select("name")
    .eq("id", resolvedStaffId)
    .single();

  return json({
    appointment_id: appointment!.id,
    starts_at,
    ends_at: endsAt,
    staff_name: staffRow?.name ?? "",
    service_name: service.name,
  });
});
