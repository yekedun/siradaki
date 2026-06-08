import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { normalizeToE164 } from "@berber/shared/phone-utils";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  let body: { phone: string; shop_slug: string };
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { phone, shop_slug } = body;
  if (!phone) return error("phone zorunlu");
  if (!shop_slug) return error("shop_slug zorunlu");

  const normalizedPhone = normalizeToE164(phone);
  if (!normalizedPhone) return error("Geçersiz telefon numarası", 400);

  const supabase = createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("slug", shop_slug)
    .eq("status", "active")
    .maybeSingle();

  if (!shop) return error("Dükkan bulunamadı", 404);

  // Bu dükkanın aktif personel ID'lerini al
  const { data: staffRows } = await supabase
    .from("staff")
    .select("id")
    .eq("shop_id", shop.id)
    .eq("is_active", true);

  const staffIds = (staffRows ?? []).map((s: any) => s.id);
  if (staffIds.length === 0) return json({ appointments: [] });

  // Sadece gelecekteki + bugünkü confirmed randevular
  const { data: appointments, error: dbErr } = await supabase
    .from("appointments")
    .select(`
      id,
      starts_at,
      staff:staff_id ( name ),
      service:service_id ( name )
    `)
    .eq("customer_phone", normalizedPhone)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .in("staff_id", staffIds)
    .order("starts_at", { ascending: true })
    .limit(10);

  if (dbErr) {
    console.error("[widget-get-appointments-by-phone] DB error:", dbErr);
    return error("Randevular alınamadı", 500);
  }

  const result = (appointments ?? []).map((a: any) => ({
    id: a.id,
    starts_at: a.starts_at,
    service_name: a.service?.name ?? null,
    staff_name: a.staff?.name ?? null,
  }));

  return json({ appointments: result });
});
