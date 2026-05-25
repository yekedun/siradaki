import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

async function sendBookingNotifications(
  appointmentId: string,
  serviceUrl: string,
  serviceKey: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select(`
      id,
      customer_name,
      starts_at,
      services(name),
      staff:staff_id(
        push_token,
        user_id,
        shop:shop_id(
          owner_user_id,
          staff(push_token, user_id)
        )
      )
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return;

  const staffMember = appt.staff as any;
  const shop = staffMember?.shop as any;
  const service = appt.services as any;

  const timeStr = new Date(appt.starts_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const title = "Yeni Randevu";
  const body = `${appt.customer_name} — ${service?.name ?? "Randevu"}, ${timeStr}`;

  const tokens = new Set<string>();
  if (staffMember?.push_token) tokens.add(staffMember.push_token);

  // Owner token — only if different staff member
  if (shop?.staff) {
    for (const s of shop.staff as any[]) {
      if (s.user_id === shop.owner_user_id && s.push_token && s.push_token !== staffMember?.push_token) {
        tokens.add(s.push_token);
      }
    }
  }

  if (tokens.size === 0) return;

  const messages = Array.from(tokens).map((to) => ({
    to,
    title,
    body,
    data: { appointmentId },
  }));

  await fetch(`${serviceUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ messages }),
  }).catch((e) => console.error("[book] Push notification failed:", e));
}

interface BookRequest {
  shop_slug: string;
  service_id: string;
  staff_id?: string | null;
  barber_id?: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string | null;
}

function mapRpcErrorStatus(code?: string): number {
  if (code === "P0001") return 409;
  if (code === "P0002") return 404;
  if (code === "P0004") return 429;
  if (code === "22023") return 400;
  if (code === "42501") return 403;
  return 500;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Giris gerekli", 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) return error("Gecersiz oturum", 401);

  let body: BookRequest;
  try {
    body = await req.json();
  } catch {
    return error("Gecersiz JSON");
  }

  const { shop_slug, service_id, starts_at, customer_name, customer_phone } = body;
  const staff_id = body.staff_id ?? body.barber_id ?? null;

  if (!shop_slug || !service_id || !starts_at || !customer_name) {
    return error("shop_slug, service_id, starts_at, customer_name zorunlu");
  }
  if (customer_name.trim().length < 2) return error("Isim en az 2 karakter olmali");

  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Gecersiz starts_at");

  const supabase = createAdminClient();

  const { data, error: rpcError } = await supabase.rpc("create_appointment_atomic" as never, {
    p_shop_slug: shop_slug,
    p_shop_id: null,
    p_service_id: service_id,
    p_staff_id: staff_id,
    p_starts_at: starts_at,
    p_customer_name: customer_name,
    p_customer_phone: customer_phone ?? null,
    p_customer_notes: null,
    p_customer_user_id: user.id,
  } as never);

  if (rpcError) {
    const status = mapRpcErrorStatus(rpcError.code);
    if (status === 500) console.error("create_appointment_atomic failed:", rpcError);
    return error(rpcError.message ?? "Randevu olusturulamadi", status, {
      code: status === 409 ? "BOOKING_CONFLICT" : status === 429 ? "RATE_LIMITED" : status === 403 ? "FORBIDDEN" : "BOOKING_ERROR",
      should_refetch_availability: status === 409,
      ...(status === 429 ? { retry_after: 600 } : {}),
    });
  }

  // Fire-and-forget: send push notification to staff + owner
  const apptId = (data as any)?.appointment_id;
  if (apptId) {
    const svcUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    sendBookingNotifications(apptId, svcUrl, svcKey).catch(
      (e) => console.error("[book] Notification dispatch error:", e)
    );
  }

  return json(data);
});
