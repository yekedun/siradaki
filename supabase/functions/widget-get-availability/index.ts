import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, jsonCached } from "../_shared/cors.ts";
import { computeAvailableSlots } from "@berber/shared/slot-utils";

type WorkingHours = Record<
  "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat",
  { open: string | null; close: string | null; enabled: boolean }
>;

// ── Yardımcı: personelin o gün kendi schedule'ını çek ─────────────────────────
// staff_schedules kaydı varsa work_start/work_end'i kullan;
// yoksa dükkanın working_hours'una fall-back yap.
async function resolveWorkingHours(
  supabase: ReturnType<typeof createAdminClient>,
  staffId: string,
  date: string,           // "YYYY-MM-DD"
  shopWorkingHours: WorkingHours,
  timezone: string
): Promise<{ workingHours: WorkingHours; closed: boolean }> {
  const { data: schedule } = await supabase
    .rpc("get_staff_day_hours", { p_staff_id: staffId, p_date: date })
    .maybeSingle();

  // Kayıt yok → dükkan saatlerine fall-back (mevcut davranış korunuyor)
  if (!schedule) {
    return { workingHours: shopWorkingHours, closed: false };
  }

  // is_working = false → personel o gün kapalı
  if (!schedule.is_working) {
    return { workingHours: shopWorkingHours, closed: true };
  }

  // Personele özel çalışma saatlerini WorkingHours formatına dönüştür
  const jsDay  = new Date(date + "T00:00:00Z").getUTCDay();
  const dayKey = DAY_KEYS[jsDay];

  // Mevcut shopWorkingHours yapısını kopyala, sadece o günü override et
  const overridden: WorkingHours = {
    ...shopWorkingHours,
    [dayKey]: {
      open:    schedule.work_start,   // "HH:MM:SS" → slot-utils "HH:MM" de kabul eder
      close:   schedule.work_end,
      enabled: true,
    },
  };

  return { workingHours: overridden, closed: false };
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

const ALLOWED_DURATION_MINUTES = new Set([30, 45, 60]);

function parseDurationMin(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || !ALLOWED_DURATION_MINUTES.has(parsed)) {
    return NaN;
  }
  return parsed;
}

// ── Ana Handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);

  const url          = new URL(req.url);
  const shopSlug     = url.searchParams.get("shop_slug") ?? url.searchParams.get("slug");
  const date         = url.searchParams.get("date");
  // service_ids = comma-separated UUIDs (multi-service). Falls back to single service_id.
  const serviceIdsParam = url.searchParams.get("service_ids");
  const serviceIds = serviceIdsParam
    ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : (url.searchParams.get("service_id") ? [url.searchParams.get("service_id")!.trim()] : []);
  const durationParam = url.searchParams.get("duration_min");
  const durationFromParam = parseDurationMin(durationParam);
  // staff_id = UUID → belirli personel | "any" veya yoksa → en az 1 personel müsait slot
  const staffIdParam = url.searchParams.get("staff_id");

  if (!shopSlug || !date || (serviceIds.length === 0 && !durationParam)) {
    return error("shop_slug, date ve service_id(ler) veya duration_min zorunlu");
  }

  if (Number.isNaN(durationFromParam)) {
    return error("duration_min 30, 45 veya 60 olmali", 400);
  }

  const supabase = createAdminClient();

  // Dükkanı bul
  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shopSlug)
    .eq("status", "active")
    .single();

  if (!shop) return error("Dükkan bulunamadı", 404);

  let durationMin = durationFromParam;

  if (serviceIds.length > 0) {
    // Tüm hizmetleri doğrula + toplam süreyi hesapla
    const { data: svcRows } = await supabase
      .from("services")
      .select("id, duration_min")
      .in("id", serviceIds)
      .eq("shop_id", shop.id)
      .eq("is_active", true);

    if (!svcRows || svcRows.length !== serviceIds.length) {
      return error("Hizmet bulunamadı", 404);
    }
    const total = svcRows.reduce((sum, s) => sum + s.duration_min, 0);
    durationMin = durationFromParam ?? total;
  }

  if (!durationMin) {
    return error("Gecerli sure bulunamadi", 400);
  }

  const shopWorkingHours = shop.working_hours as WorkingHours;
  const timezone         = shop.timezone;

  // ── Belirli personel seçildiyse ─────────────────────────────────────────
  if (staffIdParam && staffIdParam !== "any") {
    const { data: staffMember } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffIdParam)
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .single();

    if (!staffMember) return error("Personel bulunamadı", 404);

    // Personelin o günkü çalışma saatlerini al (varsa schedule'dan, yoksa shop WH)
    const { workingHours, closed } = await resolveWorkingHours(
      supabase,
      staffMember.id,
      date,
      shopWorkingHours,
      timezone
    );

    if (closed) {
      // Personel o gün çalışmıyor → tüm slotlar available=false
      return jsonCached({
        staff_id: staffMember.id,
        closed: true,
        occupied: [],
        slots: [],
      });
    }

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
      durationMin,
      workingHours,
      occupied: occupied ?? [],
      timezone,
    });

    return jsonCached({
      staff_id: staffMember.id,
      closed: false,
      occupied: occupied ?? [],
      slots: slots.map((s) => ({
        starts_at: s.startsAt.toISOString(),
        ends_at:   s.endsAt.toISOString(),
        available: s.available,
      })),
    });
  }

  // ── "Fark Etmez" (any): slot müsait = en az 1 aktif personel müsait ────
  const { data: staffList } = await supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  if (!staffList || staffList.length === 0) {
    return error("Dükkanda aktif personel yok", 404);
  }

  const dowInt = new Date(date + "T00:00:00Z").getUTCDay();
  const staffIds = staffList.map((s) => s.id);

  // 2 sorgu — N×2 fan-out yerine
  const [schedulesResult, shopOccupiedResult] = await Promise.all([
    supabase
      .from("staff_schedules")
      .select("staff_id, is_working, work_start, work_end")
      .in("staff_id", staffIds)
      .eq("day_of_week", dowInt),
    supabase.rpc("get_shop_occupied_ranges", {
      p_shop_id: shop.id,
      p_date: date,
    }),
  ]);

  if (shopOccupiedResult.error) {
    console.error("get_shop_occupied_ranges RPC failed:", shopOccupiedResult.error);
    return error("Müsaitlik bilgisi alınamadı", 500);
  }

  // Çalışma saatlerini staff_id → schedule şeklinde indeksle
  const scheduleByStaff = new Map(
    (schedulesResult.data ?? []).map((s) => [s.staff_id, s])
  );

  // Dolu aralıkları staff_id'ye göre grupla
  const occupiedByStaff = new Map<string, { starts_at: string; ends_at: string }[]>();
  for (const row of shopOccupiedResult.data ?? []) {
    const list = occupiedByStaff.get(row.staff_id) ?? [];
    list.push({ starts_at: row.starts_at, ends_at: row.ends_at });
    occupiedByStaff.set(row.staff_id, list);
  }

  // Her personel için çalışma saatlerini belirle + slot hesapla — DB çağrısı yok
  const perStaff = staffList.map((b) => {
    const schedule = scheduleByStaff.get(b.id);

    if (schedule && !schedule.is_working) {
      return { wh: shopWorkingHours, occupied: [], closed: true };
    }

    let wh = shopWorkingHours;
    if (schedule?.work_start && schedule?.work_end) {
      const dayKey = DAY_KEYS[dowInt];
      wh = {
        ...shopWorkingHours,
        [dayKey]: { open: schedule.work_start, close: schedule.work_end, enabled: true },
      };
    }

    return { wh, occupied: occupiedByStaff.get(b.id) ?? [], closed: false };
  });

  // Slot bazında union: en az 1 personel müsaitse available = true
  const slotMap = new Map<string, { available: boolean; ends_at: string }>();

  for (const { wh, occupied, closed } of perStaff) {
    if (closed) continue; // bu personel gün kapalı, atlat

    const slots = computeAvailableSlots({
      date: new Date(date),
      durationMin,
      workingHours: wh,
      occupied,
      timezone,
    });

    for (const slot of slots) {
      const key      = slot.startsAt.toISOString();
      const existing = slotMap.get(key);
      if (!existing) {
        slotMap.set(key, {
          available: slot.available,
          ends_at:   slot.endsAt.toISOString(),
        });
      } else if (slot.available) {
        slotMap.set(key, { ...existing, available: true });
      }
    }
  }

  // Tüm personel o gün kapalıysa → closed: true döndür
  // (slotMap boş olur ama "Fully booked" yerine "Closed today" gösterilmeli)
  const allClosed = perStaff.every((p) => p.closed);
  if (allClosed) {
    return jsonCached({ staff_id: "any", closed: true, slots: [] });
  }

  const slots = Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([starts_at, { ends_at, available }]) => ({ starts_at, ends_at, available }));

  return jsonCached({ staff_id: "any", closed: false, slots });
});
