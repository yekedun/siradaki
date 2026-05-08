import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();

  const url = new URL(req.url);
  const shopSlug  = url.searchParams.get("shop_slug");
  const date      = url.searchParams.get("date");
  const serviceId = url.searchParams.get("service_id");
  // barber_id = UUID → belirli usta | "any" veya yoksa → en az 1 usta müsait slot
  const barberIdParam = url.searchParams.get("barber_id");

  if (!shopSlug || !date || !serviceId) {
    return error("shop_slug, date, service_id zorunlu");
  }

  const supabase = createAdminClient();

  // Dükkanı bul
  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shopSlug)
    .single();

  if (!shop) return error("Dükkan bulunamadı", 404);

  // Hizmeti doğrula
  const { data: service } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();

  if (!service) return error("Hizmet bulunamadı", 404);

  const workingHours = shop.working_hours as WorkingHours;
  const timezone     = shop.timezone;

  // Belirli usta seçildiyse: sadece o ustayla hesapla
  if (barberIdParam && barberIdParam !== "any") {
    const { data: barber } = await supabase
      .from("barbers")
      .select("id")
      .eq("id", barberIdParam)
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single();

    if (!barber) return error("Usta bulunamadı", 404);

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
      workingHours,
      occupied: occupied ?? [],
      timezone,
    });

    return json({
      barber_id: barber.id,
      occupied: occupied ?? [],
      slots: slots.map((s) => ({
        starts_at: s.startsAt.toISOString(),
        ends_at:   s.endsAt.toISOString(),
        available: s.available,
      })),
    });
  }

  // "Fark Etmez" (any): slot müsait = en az 1 usta müsait
  const { data: barbers } = await supabase
    .from("barbers")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  if (!barbers || barbers.length === 0) {
    return error("Dükkanda aktif usta yok", 404);
  }

  // Her usta için occupied ranges al — paralel
  const occupiedPerBarber = await Promise.all(
    barbers.map(async (b) => {
      const { data } = await supabase.rpc("get_occupied_ranges", {
        p_barber_id: b.id,
        p_date: date,
      });
      return data ?? [];
    })
  );

  // Slot bazında union: en az 1 usta müsaitse available = true
  const slotMap = new Map<string, { available: boolean; ends_at: string }>();

  for (const occupied of occupiedPerBarber) {
    const slots = computeAvailableSlots({
      date: new Date(date),
      durationMin: service.duration_min,
      workingHours,
      occupied,
      timezone,
    });

    for (const slot of slots) {
      const key = slot.startsAt.toISOString();
      const existing = slotMap.get(key);
      if (!existing) {
        slotMap.set(key, {
          available: slot.available,
          ends_at: slot.endsAt.toISOString(),
        });
      } else if (slot.available) {
        // En az 1 usta müsaitse available = true
        slotMap.set(key, { ...existing, available: true });
      }
    }
  }

  const slots = Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([starts_at, { ends_at, available }]) => ({ starts_at, ends_at, available }));

  return json({ barber_id: "any", slots });
});
