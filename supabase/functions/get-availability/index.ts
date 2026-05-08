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
  // staff_id = UUID → belirli personel | "any" veya yoksa → en az 1 personel müsait slot
  const staffIdParam = url.searchParams.get("staff_id");

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

  // Belirli personel seçildiyse: sadece o personelle hesapla
  if (staffIdParam && staffIdParam !== "any") {
    const { data: staffMember } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffIdParam)
      .eq("shop_id", shop.id)
      .single();

    if (!staffMember) return error("Personel bulunamadı", 404);

    const { data: occupied, error: rpcError } = await supabase.rpc(
      "get_occupied_ranges",
      { p_staff_id: staffMember.id, p_date: date }
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
      staff_id: staffMember.id,
      occupied: occupied ?? [],
      slots: slots.map((s) => ({
        starts_at: s.startsAt.toISOString(),
        ends_at:   s.endsAt.toISOString(),
        available: s.available,
      })),
    });
  }

  // "Fark Etmez" (any): slot müsait = en az 1 personel müsait
  const { data: staffList } = await supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shop.id);

  if (!staffList || staffList.length === 0) {
    return error("Dükkanda aktif personel yok", 404);
  }

  // Her personel için occupied ranges al — paralel
  const occupiedPerStaff = await Promise.all(
    staffList.map(async (b) => {
      const { data } = await supabase.rpc("get_occupied_ranges", {
        p_staff_id: b.id,
        p_date: date,
      });
      return data ?? [];
    })
  );

  // Slot bazında union: en az 1 personel müsaitse available = true
  const slotMap = new Map<string, { available: boolean; ends_at: string }>();

  for (const occupied of occupiedPerStaff) {
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
        // En az 1 personel müsaitse available = true
        slotMap.set(key, { ...existing, available: true });
      }
    }
  }

  const slots = Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([starts_at, { ends_at, available }]) => ({ starts_at, ends_at, available }));

  return json({ staff_id: "any", slots });
});
