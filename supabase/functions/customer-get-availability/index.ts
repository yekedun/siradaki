import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";

type WorkingHours = Record<
  "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
  { open: string | null; close: string | null; enabled: boolean }
>;

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "GET") return error("Method not allowed", 405);

  const url = new URL(req.url);
  const shop_slug = url.searchParams.get("shop_slug");
  const dateStr = url.searchParams.get("date");     // YYYY-MM-DD
  const service_id = url.searchParams.get("service_id");
  const staff_id = url.searchParams.get("staff_id") ?? url.searchParams.get("barber_id"); // barber_id kept for old clients

  if (!shop_slug || !dateStr || !service_id) {
    return error("shop_slug, date, service_id zorunlu");
  }

  const dateParsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(dateParsed.getTime())) return error("Geçersiz tarih");

  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shop_slug)
    .single();
  if (!shop) return error("Dükkan bulunamadı", 404);

  // Dükkanın aktif personelini getir
  const staffQuery = supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("is_active", true);
  if (staff_id) staffQuery.eq("id", staff_id);

  const { data: staff, error: staffErr } = await staffQuery;
  if (staffErr || !staff || staff.length === 0) {
    return error("Dükkan veya personel bulunamadı", 404);
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, duration_min")
    .eq("id", service_id)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();
  if (!service) return error("Hizmet bulunamadı", 404);

  // "any staff" modunda: tüm personel arasındaki UNION (herhangi biri müsaitse slot açık)
  const slotMap = new Map<string, { starts_at: string; ends_at: string; available: boolean }>();

  await Promise.all(
    staff.map(async (member: { id: string }) => {
      const { data: occupied } = await supabase.rpc("get_occupied_ranges", {
        p_staff_id: member.id,
        p_date: dateStr,
      } as never);

      const computed = computeAvailableSlots({
        date: dateParsed,
        durationMin: service.duration_min,
        workingHours: shop.working_hours as WorkingHours,
        occupied: occupied ?? [],
        timezone: shop.timezone,
      });

      for (const s of computed) {
        const key = s.startsAt.toISOString();
        const existing = slotMap.get(key);
        // Herhangi bir usta o saatte müsaitse slot müsait
        if (!existing || (!existing.available && s.available)) {
          slotMap.set(key, {
            starts_at: s.startsAt.toISOString(),
            ends_at: s.endsAt.toISOString(),
            available: s.available,
          });
        }
      }
    })
  );

  const slots = Array.from(slotMap.values()).sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at)
  );

  return json({ slots });
});
