import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { MIN_CANCEL_NOTICE_MINUTES } from "@berber/shared/constants";
import { normalizeToE164 } from "@berber/shared/phone-utils";

async function sendCancelNotification(
  appointmentId: string,
  serviceUrl: string,
  serviceKey: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("customer_name, starts_at, staff_id, staff:staff_id(push_token, shop_id, user_id, notification_prefs)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return;
  const staffMember = appt.staff as any;
  const shopId: string | null = staffMember?.shop_id ?? null;

  const timeStr = new Date(appt.starts_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const tokens = new Set<string>();

  let ownerUserId: string | null = null;
  if (shopId) {
    const { data: shop } = await supabase
      .from("shops")
      .select("owner_user_id")
      .eq("id", shopId)
      .maybeSingle();
    ownerUserId = (shop as any)?.owner_user_id ?? null;
  }

  const staffIsOwner = ownerUserId !== null && staffMember?.user_id === ownerUserId;
  const staffPrefs = staffMember?.notification_prefs ?? {};

  if (staffMember?.push_token) {
    if (staffIsOwner) {
      if (staffPrefs.cancellation !== false) tokens.add(staffMember.push_token);
    } else {
      tokens.add(staffMember.push_token);
    }
  }

  if (shopId && ownerUserId && !staffIsOwner) {
    const { data: ownerStaff } = await supabase
      .from("staff")
      .select("push_token, notification_prefs")
      .eq("shop_id", shopId)
      .eq("user_id", ownerUserId)
      .maybeSingle();
    const ownerPrefs = (ownerStaff as any)?.notification_prefs ?? {};
    if (
      ownerStaff?.push_token &&
      ownerStaff.push_token !== staffMember?.push_token &&
      ownerPrefs.cancellation !== false
    ) {
      tokens.add(ownerStaff.push_token);
    }
  }

  if (tokens.size === 0) return;

  const messages = Array.from(tokens).map((to) => ({
    to,
    title: "Randevu İptal Edildi",
    body: `${appt.customer_name} — ${timeStr} randevusunu iptal etti`,
    data: { appointmentId },
  }));

  await fetch(`${serviceUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ messages }),
  }).catch((e) => console.error("[widget-cancel] Push failed:", e));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

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

  // Sahiplik doğrulaması: telefon numarası eşleşmeli
  const storedPhone = normalizeToE164(appt.customer_phone ?? "");
  if (!storedPhone || storedPhone !== normalizedPhone) {
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

  const svcUrl = Deno.env.get("SUPABASE_URL")!;
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  sendCancelNotification(appointment_id, svcUrl, svcKey).catch(
    (e) => console.error("[widget-cancel] Notification dispatch error:", e),
  );

  return json({ success: true });
});
