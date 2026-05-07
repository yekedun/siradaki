import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { computeAvailableSlots } from "@berber/shared/slot-utils";
import type { WorkingHours } from "@berber/shared/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const slug = searchParams.get("slug");
  const date = searchParams.get("date");
  const serviceId = searchParams.get("service_id");

  if (!slug || !date || !serviceId) {
    return NextResponse.json(
      { error: "slug, date, service_id zorunlu" },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  const { data: barber } = await supabase
    .from("barbers")
    .select("id, timezone, working_hours")
    .eq("slug", slug)
    .single();

  if (!barber) {
    return NextResponse.json({ error: "Berber bulunamadı" }, { status: 404 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("duration_min")
    .eq("id", serviceId)
    .eq("barber_id", barber.id)
    .single();

  if (!service) {
    return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
  }

  // F-11: RPC hatasını sessizce yutma
  const { data: occupied, error: rpcError } = await supabase.rpc(
    "get_occupied_ranges",
    { p_barber_id: barber.id, p_date: date }
  );

  if (rpcError) {
    console.error("get_occupied_ranges RPC failed:", rpcError);
    return NextResponse.json(
      { error: "Müsaitlik bilgisi alınamadı" },
      { status: 500 }
    );
  }

  const occupiedRanges = occupied ?? [];

  const slots = computeAvailableSlots({
    date: new Date(date),
    durationMin: service.duration_min,
    workingHours: barber.working_hours as unknown as WorkingHours,
    occupied: occupiedRanges,
    timezone: barber.timezone,
  });

  // F-07: Realtime zaten anlık güncellemeleri taşıyor; API yalnızca initial state.
  // 30s edge cache + 60s SWR makul.
  return NextResponse.json(
    {
      occupied: occupiedRanges,
      slots: slots.map((s) => ({
        starts_at: s.startsAt.toISOString(),
        ends_at: s.endsAt.toISOString(),
        available: s.available,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
