import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const date = url.searchParams.get("date");
  const serviceId = url.searchParams.get("service_id");

  if (!slug || !date || !serviceId) {
    return error("slug, date, service_id zorunlu");
  }

  const supabase = createAdminClient();

  const { data: barber } = await supabase
    .from("barbers")
    .select("id, timezone, working_hours")
    .eq("slug", slug)
    .single();

  if (!barber) return error("Berber bulunamadı", 404);

  const { data: service } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("barber_id", barber.id)
    .eq("is_active", true)
    .single();

  if (!service) return error("Hizmet bulunamadı", 404);

  const { data: occupied, error: rpcError } = await supabase.rpc(
    "get_occupied_ranges",
    { p_barber_id: barber.id, p_date: date }
  );

  if (rpcError) {
    console.error("get_occupied_ranges RPC failed:", rpcError);
    return error("Müsaitlik bilgisi alınamadı", 500);
  }

  const slots = computeAvailableSlots({
    date: new Date(date),
    durationMin: service.duration_min,
    workingHours: barber.working_hours as WorkingHours,
    occupied: occupied ?? [],
    timezone: barber.timezone,
  });

  return json({
    occupied: occupied ?? [],
    slots: slots.map((s) => ({
      starts_at: s.startsAt.toISOString(),
      ends_at: s.endsAt.toISOString(),
      available: s.available,
    })),
  });
});
