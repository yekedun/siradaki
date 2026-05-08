import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "GET") return error("Method not allowed", 405);

  const url = new URL(req.url);
  const shop_slug = url.searchParams.get("shop_slug");
  const dateStr = url.searchParams.get("date");     // YYYY-MM-DD
  const service_id = url.searchParams.get("service_id");
  const barber_id = url.searchParams.get("barber_id"); // optional

  if (!shop_slug || !dateStr || !service_id) {
    return error("shop_slug, date, service_id zorunlu");
  }

  const dateParsed = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(dateParsed.getTime())) return error("Geçersiz tarih");

  const supabase = createAdminClient();

  // Dükkanın aktif berberlerini getir
  const barberQuery = supabase
    .from("barbers")
    .select("id, timezone, working_hours")
    .eq("shop_slug", shop_slug)
    .eq("is_active", true);
  if (barber_id) barberQuery.eq("id", barber_id);

  const { data: barbers, error: bErr } = await barberQuery;
  if (bErr || !barbers || barbers.length === 0) {
    return error("Dükkan veya usta bulunamadı", 404);
  }

  // Hizmet — bu dükkanın herhangi bir ustasına ait olmalı
  const barberIds = barbers.map((b: { id: string }) => b.id);
  const { data: service } = await supabase
    .from("services")
    .select("id, duration_min")
    .eq("id", service_id)
    .in("barber_id", barberIds)
    .eq("is_active", true)
    .single();
  if (!service) return error("Hizmet bulunamadı", 404);

  // Her berber için müsait slotları hesapla
  // "any barber" modunda: tüm berberler arasındaki UNION (herhangi biri müsaitse slot açık)
  const slotMap = new Map<string, { starts_at: string; ends_at: string; available: boolean }>();

  await Promise.all(
    barbers.map(async (barber: { id: string; timezone: string; working_hours: unknown }) => {
      const { data: occupied } = await supabase.rpc("get_occupied_ranges", {
        p_barber_id: barber.id,
        p_date: dateStr,
      });

      const computed = computeAvailableSlots({
        date: dateParsed,
        durationMin: service.duration_min,
        workingHours: barber.working_hours as WorkingHours,
        occupied: occupied ?? [],
        timezone: barber.timezone,
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
