import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient, sha256 } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

type LegacyBlockWalkinRequest = {
  staff_id?: string;
  barber_id?: string;
  duration_min: number;
  reason?: "walkin" | "break" | "personal";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  // Widget token auth
  const authHeader = req.headers.get("Authorization");
  const rawToken = authHeader?.replace("Bearer ", "").trim();

  if (!rawToken) return error("Authorization header eksik", 401);

  const supabase = createAdminClient();
  const tokenHash = await sha256(rawToken);

  // Token → shop_id resolve
  const { data: widgetToken } = await supabase
    .from("widget_tokens")
    .select("id, shop_id, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!widgetToken) return error("Geçersiz token", 401);
  if (
    widgetToken.expires_at &&
    new Date(widgetToken.expires_at) < new Date()
  ) {
    return error("Token süresi dolmuş", 401);
  }

  let body: LegacyBlockWalkinRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { duration_min, reason = "walkin" } = body;
  const staff_id = body.staff_id ?? body.barber_id;

  if (!staff_id) return error("staff_id zorunlu");

  if (!duration_min || duration_min < 5 || duration_min > 480) {
    return error("duration_min 5-480 dakika arasında olmalı");
  }

  // Belirtilen personelin bu dükkana ait olduğunu doğrula
  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("id", staff_id)
    .eq("shop_id", widgetToken.shop_id)
    .eq("is_active", true)
    .single();

  if (!staff) return error("Personel bu dükkana ait değil", 403);

  const now    = new Date();
  const endsAt = new Date(now.getTime() + duration_min * 60_000);

  const { data: block, error: rpcError } = await supabase.rpc("create_block_atomic" as never, {
    p_staff_id: staff.id,
    p_starts_at: now.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_reason: reason,
    p_created_via: "widget",
  } as never);

  if (rpcError) {
    const status = rpcError.code === "P0001" ? 409 : 500;
    if (status === 500) console.error("create_block_atomic failed:", rpcError);
    return error(rpcError.message ?? "Blok oluşturulamadı", status);
  }

  await supabase
    .from("widget_tokens")
    .update({ last_used_at: now.toISOString() })
    .eq("id", widgetToken.id);

  return json(block, 201);
});
