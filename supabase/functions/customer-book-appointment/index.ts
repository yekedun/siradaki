import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

interface BookRequest {
  shop_slug: string;
  service_id: string;
  barber_id?: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  // Müşteri JWT doğrulaması zorunlu
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Giriş gerekli", 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return error("Geçersiz oturum", 401);

  let body: BookRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { shop_slug, service_id, barber_id, starts_at, customer_name, customer_phone } = body;

  if (!shop_slug || !service_id || !starts_at || !customer_name) {
    return error("shop_slug, service_id, starts_at, customer_name zorunlu");
  }
  if (customer_name.trim().length < 2) return error("İsim en az 2 karakter olmalı");

  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Geçersiz starts_at");

  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shop_slug)
    .single();
  if (!shop) return error("Dükkan bulunamadı", 404);

  const { data: service } = await supabase
    .from("services")
    .select("id, name, duration_min")
    .eq("id", service_id)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();
  if (!service) return error("Hizmet bulunamadı", 404);

  const endsAt = new Date(slotDate.getTime() + service.duration_min * 60_000).toISOString();

  let resolvedBarberId: string;
  if (!barber_id) {
    const { data: assigned } = await supabase.rpc("assign_any_barber", {
      p_shop_id: shop.id,
      p_starts_at: starts_at,
      p_ends_at: endsAt,
    });
    if (!assigned) return error("Seçilen saatte hiç müsait usta yok", 409);
    resolvedBarberId = assigned;
  } else {
    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("id", barber_id)
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single();
    if (!barber) return error("Usta bulunamadı", 404);
    resolvedBarberId = barber.id;
  }

  // Server-side slot revalidation (race condition guard)
  const dateStr = slotDate.toISOString().split("T")[0]!;
  const { data: occupied, error: rpcError } = await supabase.rpc("get_occupied_ranges", {
    p_barber_id: resolvedBarberId,
    p_date: dateStr,
  });
  if (rpcError) return error("Müsaitlik bilgisi alınamadı", 500);

  const slots = computeAvailableSlots({
    date: slotDate,
    durationMin: service.duration_min,
    workingHours: shop.working_hours as WorkingHours,
    occupied: occupied ?? [],
    timezone: shop.timezone,
  });

  const requestedSlot = slots.find((s) => s.startsAt.toISOString() === slotDate.toISOString());
  if (!requestedSlot?.available) return error("Bu saat artık müsait değil", 409);

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      barber_id: resolvedBarberId,
      service_id: service.id,
      customer_name: customer_name.trim(),
      customer_phone: customer_phone?.trim() || null,
      customer_user_id: user.id,
      starts_at,
      ends_at: endsAt,
    } as never)
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23P01") return error("Bu saat az önce doldu, başka bir saat seçin", 409);
    console.error("Appointment insert error:", insertError);
    return error("Randevu oluşturulamadı", 500);
  }

  const { data: barberRow } = await supabase
    .from("barbers")
    .select("display_name")
    .eq("id", resolvedBarberId)
    .single();

  return json({
    appointment_id: (appointment as { id: string }).id,
    starts_at,
    ends_at: endsAt,
    barber_display_name: barberRow?.display_name ?? "",
    service_name: service.name,
  });
});
