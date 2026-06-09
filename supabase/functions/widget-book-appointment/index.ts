import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { sendBookingNotifications } from "../_shared/booking-notifications.ts";
import { isRateLimited, getClientIp } from "../_shared/rate-limit.ts";
import { isValidPhone } from "@berber/shared/phone-utils";

const RATE_LIMIT_MAX = 5;

interface BookAppointmentRequest {
  shop_slug: string;
  service_id?: string;           // legacy single-service (still accepted)
  service_ids?: string[];        // multi-service
  staff_id: string | null;
  starts_at: string;
  customer_name: string;
  customer_phone?: string;
  customer_notes?: string;
}

function mapRpcErrorStatus(code?: string): number {
  if (code === "P0001") return 409;
  if (code === "P0002") return 404;
  if (code === "22023") return 400;
  if (code === "P0004") return 429;
  return 500;
}

function mapRpcErrorMessage(status: number): string {
  if (status === 409) return "Seçilen saat dolu";
  if (status === 404) return "Randevu bilgileri bulunamadı";
  if (status === 429) return "Çok fazla istek. 10 dakika sonra tekrar deneyin.";
  if (status === 400) return "Randevu bilgileri geçersiz";
  return "Randevu oluşturulamadı";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const ip = getClientIp(req);
  let rateLimited: boolean;
  try {
    rateLimited = await isRateLimited(`rl:book:${ip}`, RATE_LIMIT_MAX);
  } catch (e) {
    console.error("[widget-book] Rate limit misconfigured:", e);
    return error("Servis geçici olarak kullanılamıyor.", 503);
  }
  if (rateLimited) {
    return error("Çok fazla istek. 10 dakika sonra tekrar deneyin.", 429, {
      code: "RATE_LIMITED",
      retry_after: RATE_LIMIT_WINDOW_SEC,
    });
  }

  let body: BookAppointmentRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const {
    shop_slug,
    service_id,
    service_ids,
    staff_id,
    starts_at,
    customer_name,
    customer_phone,
    customer_notes,
  } = body;

  // Normalize to a de-duplicated id list (array form wins; else single fallback).
  const serviceIdList: string[] = Array.isArray(service_ids) && service_ids.length > 0
    ? Array.from(new Set(service_ids.map((s) => String(s).trim()).filter(Boolean)))
    : (service_id ? [String(service_id).trim()] : []);

  if (!shop_slug || serviceIdList.length === 0 || !starts_at || !customer_name || !customer_phone) {
    return error("shop_slug, service_ids, starts_at, customer_name, customer_phone zorunlu");
  }

  if (customer_name.trim().length < 2) {
    return error("İsim en az 2 karakter olmalı");
  }
  if (!isValidPhone(customer_phone.trim())) {
    return error("Geçersiz müşteri telefon numarası", 400);
  }

  const slotDate = new Date(starts_at);
  if (isNaN(slotDate.getTime())) return error("Gecersiz starts_at");
  if (slotDate.getTime() < Date.now() - 5 * 60_000) return error("Geçmiş bir saate randevu oluşturulamaz", 400);

  const supabase = createAdminClient();

  const { data: shopCheck } = await supabase
    .from("shops")
    .select("id, status")
    .eq("slug", shop_slug)
    .maybeSingle();

  if (!shopCheck || shopCheck.status !== "active") return error("Dukkan bulunamadi", 404);

  const { data: serviceRows } = await supabase
    .from("services")
    .select("id")
    .in("id", serviceIdList)
    .eq("shop_id", shopCheck.id)
    .eq("is_active", true);

  if (!serviceRows || serviceRows.length !== serviceIdList.length) {
    return error("Hizmet bulunamadi", 404);
  }

  // Validate staff_id belongs to this shop (defense against cross-shop booking).
  // The any-staff path is bound to shopCheck.id below via p_shop_id.
  if (staff_id) {
    const { data: staffCheck } = await supabase
      .from("staff")
      .select("id")
      .eq("id", staff_id)
      .eq("shop_id", shopCheck.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!staffCheck) return error("Geçersiz personel", 403);
  }

  const { data, error: rpcError } = await supabase.rpc("create_appointment_atomic" as never, {
    p_shop_slug: null,
    p_shop_id: shopCheck.id,
    p_service_id: serviceIdList[0],
    p_service_ids: serviceIdList,
    p_staff_id: staff_id ?? null,
    p_starts_at: starts_at,
    p_customer_name: customer_name,
    p_customer_phone: customer_phone ?? null,
    p_customer_notes: customer_notes ?? null,
    p_customer_user_id: null,
  } as never);

  if (rpcError) {
    const status = mapRpcErrorStatus(rpcError.code);
    if (status === 500) console.error("create_appointment_atomic failed:", rpcError);
    return error(mapRpcErrorMessage(status), status, {
      code: status === 429 ? "RATE_LIMITED" : status === 409 ? "BOOKING_CONFLICT" : "BOOKING_ERROR",
      should_refetch_availability: status === 409,
      ...(status === 429 ? { retry_after: 600 } : {}),
    });
  }

  // Fire-and-forget: atanan personel + sahibe yeni randevu push'u gonder.
  const apptId = (data as any)?.appointment_id;
  if (apptId) {
    const svcUrl = Deno.env.get("SUPABASE_URL")!;
    const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    sendBookingNotifications(apptId, svcUrl, svcKey).catch(
      (e) => console.error("[widget-book] Notification dispatch error:", e),
    );
  }

  return json(data);
});
