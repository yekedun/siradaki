import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient, sha256 } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";
import type { BlockWalkinRequest } from "@berber/shared/types";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  // Widget token auth (not JWT — widget extensions can't refresh tokens)
  const authHeader = req.headers.get("Authorization");
  const rawToken = authHeader?.replace("Bearer ", "").trim();

  if (!rawToken) return error("Authorization header eksik", 401);

  const supabase = createAdminClient();
  const tokenHash = await sha256(rawToken);

  const { data: widgetToken } = await supabase
    .from("widget_tokens")
    .select("id, barber_id, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!widgetToken) return error("Geçersiz token", 401);
  if (
    widgetToken.expires_at &&
    new Date(widgetToken.expires_at) < new Date()
  ) {
    return error("Token süresi dolmuş", 401);
  }

  let body: BlockWalkinRequest;
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const { duration_min, reason = "walkin" } = body;

  if (!duration_min || duration_min < 5 || duration_min > 480) {
    return error("duration_min 5-480 dakika arasında olmalı");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + duration_min * 60_000);

  const { data: block, error: insertError } = await supabase
    .from("blocks")
    .insert({
      barber_id: widgetToken.barber_id,
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      reason,
      created_via: "widget",
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23P01") {
      return error("Bu saatte zaten bir randevu veya blok var", 409);
    }
    console.error("Block insert error:", insertError);
    return error("Blok oluşturulamadı", 500);
  }

  // Update last_used_at for token
  await supabase
    .from("widget_tokens")
    .update({ last_used_at: now.toISOString() })
    .eq("id", widgetToken.id);

  return json(block, 201);
});
