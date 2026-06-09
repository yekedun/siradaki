import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";
import { isRateLimited, getClientIp } from "../_shared/rate-limit.ts";

const RL_MAX = 10;
const RL_WINDOW_SEC = 60;

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405, {}, req);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const ip = getClientIp(req);
  let rateLimited: boolean;
  try {
    rateLimited = await isRateLimited(`rl:invite:${ip}`, RL_MAX, RL_WINDOW_SEC);
  } catch (e) {
    console.error("[open-invite] Rate limit misconfigured:", e);
    return error("Servis geçici olarak kullanılamıyor.", 503, {}, req);
  }
  if (rateLimited) {
    return error("Çok fazla istek. Lütfen bekleyin.", 429, {}, req);
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON", 400, {}, req);
  }

  const token = body.token?.trim();
  if (!token) return error("token is required", 400, {}, req);

  const supabase = createAdminClient();
  const { data: inviteRow, error: inviteErr } = await supabase
    .from("invite_tokens")
    .select("used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    console.error("open-invite token lookup failed:", inviteErr);
    return error("Could not verify invite", 500, {}, req);
  }

  // All invalid token states return the same 404 to prevent lifecycle enumeration.
  // (not found, already used, expired → identical response)
  if (
    !inviteRow ||
    inviteRow.used_at ||
    new Date(inviteRow.expires_at) < new Date()
  ) {
    return error("Invalid or expired invite link", 404, {}, req);
  }

  return json({ valid: true }, 200, req);
});