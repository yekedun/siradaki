import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import type { Database } from "../_shared/database.types.ts";

interface SaveRequest {
  appointment_id: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  // --- Auth ---
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return error("Yetkisiz", 401);

  const userClient = createClient<Database>(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return error("Yetkisiz", 401);

  // --- Input validation ---
  let body: SaveRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { appointment_id, subscription } = body;
  if (!appointment_id) return error("appointment_id zorunlu");
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return error("Geçersiz subscription", 400);
  }

  const supabase = createAdminClient();

  // --- Ownership check ---
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, starts_at, status, customer_user_id")
    .eq("id", appointment_id)
    .maybeSingle();

  if (!appt) return error("Randevu bulunamadı", 404);

  if (appt.customer_user_id !== user.id) return error("Yasak", 403);

  if (appt.status === "cancelled") return error("İptal edilmiş randevu", 400);

  if (new Date(appt.starts_at).getTime() < Date.now()) {
    return error("Randevu geçmiş", 400);
  }

  // Upsert acts as rate-limit: same user+endpoint pair is updated, never duplicated.
  const { error: upsertErr } = await supabase
    .from("appointment_web_push_subscriptions")
    .upsert(
      {
        appointment_id,
        endpoint: subscription.endpoint,
        p256dh:   subscription.keys.p256dh,
        auth:     subscription.keys.auth,
      },
      { onConflict: "appointment_id,endpoint" },
    );

  if (upsertErr) {
    console.error("[save-push-subscription] upsert failed:", upsertErr);
    return error("Kayıt başarısız", 500);
  }

  return json({ success: true });
});
