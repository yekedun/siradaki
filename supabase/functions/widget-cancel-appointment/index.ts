import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { sendCancellationNotifications } from "../_shared/booking-notifications.ts";
import { isRateLimited, getClientIp } from "../_shared/rate-limit.ts";
import { MIN_CANCEL_NOTICE_MINUTES } from "@berber/shared/constants";
import { normalizeToE164 } from "@berber/shared/phone-utils";

// 3 iptal denemesi / 10 dk per IP — phone enumeration'ı önler
const CANCEL_RATE_LIMIT_MAX = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const ip = getClientIp(req);
  let rateLimited: boolean;
  try {
    rateLimited = await isRateLimited(`rl:cancel:${ip}`, CANCEL_RATE_LIMIT_MAX);
  } catch (e) {
    console.error("[widget-cancel] Rate limit misconfigured:", e);
    return error("Servis geçici olarak kullanılamıyor.", 503);
  }
  if (rateLimited) {
    return error("Çok fazla istek. 10 dakika sonra tekrar deneyin.", 429, {
      code: "RATE_LIMITED",
      retry_after: 600,
    });
  }

  let body: { appointment_id: string; phone: string };
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { appointment_id, phone } = body;
  if (!appointment_id) return error("appointment_id zorunlu");
  if (!phone) return error("phone zorunlu");

  const normalizedPhone = normalizeToE164(phone);
  if (!normalizedPhone) return error("Geçersiz telefon numarası", 400);

  const supabase = createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, status, customer_phone")
    .eq("id", appointment_id)
    .maybeSingle();

  if (!appt) return error("Randevu bulunamadı", 404);

  // Sahiplik doğrulaması: telefon numarası eşleşmeli.
  // DB'de ham (05xx) veya E164 (+90xx) formatında saklı olabilir — her ikisine karşı normalize ederek karşılaştır.
  const storedNormalized = normalizeToE164(appt.customer_phone ?? "");
  if (!storedNormalized || storedNormalized !== normalizedPhone) {
    return error("Randevu bulunamadı", 404);
  }

  if (appt.status === "cancelled") return error("Randevu zaten iptal edilmiş", 400);
  if (appt.status === "completed") return error("Tamamlanan randevu iptal edilemez", 400);

  const minCancelMs = MIN_CANCEL_NOTICE_MINUTES * 60_000;
  if (new Date(appt.starts_at).getTime() - Date.now() < minCancelMs) {
    return error(
      `Randevuya ${MIN_CANCEL_NOTICE_MINUTES} dakikadan az kaldığı için iptal edilemez. Lütfen dükkan ile iletişime geçin.`,
      409,
    );
  }

  // service_role olarak çalıştığı için cancel_appointment_atomic auth check'i bypass eder
  const { error: rpcError } = await supabase.rpc("cancel_appointment_atomic" as never, {
    p_appointment_id: appointment_id,
  } as never);

  if (rpcError) {
    if (rpcError.code === "P0002" || rpcError.code === "42501") {
      return error("Randevu bulunamadı", 404);
    }
    if (rpcError.code === "22023") {
      return error("Bu randevu iptal edilemiyor", 400);
    }
    console.error("cancel_appointment_atomic failed:", rpcError);
    return error("İptal işlemi başarısız", 500);
  }

  sendCancellationNotifications(appointment_id).catch(
    (e) => console.error("[widget-cancel] Notification dispatch error:", e),
  );

  return json({ success: true });
});
