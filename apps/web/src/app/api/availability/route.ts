import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const shopSlug      = searchParams.get("shop_slug");
  const date          = searchParams.get("date");
  const serviceId     = searchParams.get("service_id");
  // staff_id = UUID → belirli personel | "any" veya yoksa → en az 1 personel müsait slot
  const staffIdParam = searchParams.get("staff_id");

  if (!shopSlug || !date || !serviceId) {
    return NextResponse.json(
      { error: "shop_slug, date, service_id zorunlu" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, timezone, working_hours")
    .eq("slug", shopSlug)
    .single();

  if (!shop) {
    return NextResponse.json({ error: "Dükkan bulunamadı" }, { status: 404 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("shop_id", shop.id)
    .eq("is_active", true)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
  }

  const workingHours = shop.working_hours as unknown as WorkingHours;
  const timezone     = shop.timezone;

  // Belirli personel
  if (staffIdParam && staffIdParam !== "any") {
    const { data: staffMember } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staffIdParam)
      .eq("shop_id", shop.id)
      .single();

    if (!staffMember) {
      return NextResponse.json({ error: "Personel bulunamadı" }, { status: 404 });
    }

    const { data: occupied, error: rpcError } = await supabase.rpc(
      "get_occupied_ranges",
      { p_staff_id: staffMember.id, p_date: date }
    );

    if (rpcError) {
      console.error("get_occupied_ranges RPC failed:", rpcError);
      return NextResponse.json(
        { error: "Müsaitlik bilgisi alınamadı" },
        { status: 500 }
      );
    }

    const slots = computeAvailableSlots({
      date: new Date(date),
      durationMin: service.duration_min,
      workingHours,
      occupied: occupied ?? [],
      timezone,
    });

    return NextResponse.json(
      {
        staff_id: staffMember.id,
        occupied: occupied ?? [],
        slots: slots.map((s) => ({
          starts_at: s.startsAt.toISOString(),
          ends_at:   s.endsAt.toISOString(),
          available: s.available,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // "Fark Etmez": slot müsait = en az 1 personel müsait
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shop.id);

  if (!staff || staff.length === 0) {
    return NextResponse.json(
      { error: "Dükkanda personel yok" },
      { status: 404 }
    );
  }

  const occupiedPerStaff = await Promise.all(
    staff.map(async (b) => {
      const { data } = await supabase.rpc("get_occupied_ranges", {
        p_staff_id: b.id,
        p_date: date,
      });
      return data ?? [];
    })
  );

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
      const key      = slot.startsAt.toISOString();
      const existing = slotMap.get(key);
      if (!existing) {
        slotMap.set(key, { available: slot.available, ends_at: slot.endsAt.toISOString() });
      } else if (slot.available) {
        slotMap.set(key, { ...existing, available: true });
      }
    }
  }

  const slots = Array.from(slotMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([starts_at, { ends_at, available }]) => ({ starts_at, ends_at, available }));

  return NextResponse.json(
    { staff_id: "any", slots },
    { headers: { "Cache-Control": "no-store" } }
  );
}
