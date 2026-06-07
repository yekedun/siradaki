import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { sendBookingNotifications } from "../_shared/booking-notifications.ts";
import { isValidPhone } from "@berber/shared/phone-utils";

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

function mapRpcErrorMessage(status: number): string {
  if (status === 409) return "Seçilen saat dolu";
  if (status === 404) return "Randevu bilgileri bulunamadı";
  if (status === 429) return "Çok fazla istek. Lütfen daha sonra tekrar deneyin";
  if (status === 400) return "Randevu bilgileri geçersiz";
  if (status === 403) return "Bu işlem için yetkiniz yok";
  return "Randevu oluşturulamadı";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Giriş gerekli", 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) return error("Geçersiz oturum", 401);

  let body: BookRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { shop_slug, service_id, starts_at, customer_name, customer_phone } = body;
  const staff_id = body.staff_id ?? body.barber_id ?? null;

  if (!shop_slug || !service_id || !starts_at || !customer_name) {
    return error("shop_slug, service_id, starts_at, customer_name zorunlu");
  }
  if (customer_name.trim().length < 2) return error("İsim en az 2 karakter olmalı");
  if (customer_phone && !isValidPhone(customer_phone.trim())) {
    return error("Geçersiz müşteri telefon numarası", 400);
  }

  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Geçersiz starts_at");

  // Sunucu saatine göre geçmiş slot kontrolü — cihaz saatinden bağımsız
  if (slotDate.getTime() < Date.now() - 5 * 60_000) {
    return error("Geçmiş bir saate randevu oluşturulamaz", 400);
  }

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
    return error(mapRpcErrorMessage(status), status, {
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
