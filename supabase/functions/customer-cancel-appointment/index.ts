import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import { MIN_CANCEL_NOTICE_MINUTES } from "@berber/shared/constants";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return error("Oturum gerekli", 401);

  let body: { appointment_id: string };
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { appointment_id } = body;
  if (!appointment_id) return error("appointment_id zorunlu");

  const supabase = createAdminClient();

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return error("Oturum doğrulanamadı", 401);

  const { data: appointment } = await supabase
    .from("appointments")
    .select("starts_at, status, customer_user_id")
    .eq("id", appointment_id)
    .single();

  if (!appointment) return error("Randevu bulunamadı", 404);
  if (appointment.customer_user_id !== userData.user.id) return error("Randevu bulunamadı", 404);
  if (appointment.status === "cancelled") return error("Randevu zaten iptal edilmiş", 400);

  const slotDate = new Date(appointment.starts_at);
  const nowMs = Date.now();
  const minCancelMs = MIN_CANCEL_NOTICE_MINUTES * 60_000;

  if (slotDate.getTime() - nowMs < minCancelMs) {
    return error(`Randevuya ${MIN_CANCEL_NOTICE_MINUTES / 60} saatten az kaldığı için iptal edilemez. Lütfen dükkan ile iletişime geçin.`, 409);
  }

  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("id", appointment_id);

  if (updateError) {
    console.error("Cancel appointment error:", updateError);
    return error("İptal işlemi başarısız", 500);
  }

  return json({ success: true });
});
