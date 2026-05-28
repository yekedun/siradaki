import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";

const RL_MAX = 10;
const RL_WINDOW_SEC = 60;

async function isRateLimited(ip: string): Promise<boolean> {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) {
    console.warn("[open-invite] Upstash not configured — IP rate limiting is disabled");
    return false;
  }

  const key = `rl:invite:${ip}`;
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(RL_WINDOW_SEC), "NX"],
      ]),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const count: unknown = data?.[0]?.result;
    return typeof count === "number" && count > RL_MAX;
  } catch (err) {
    console.error("[open-invite] Upstash rate limit check failed:", err);
    return false;
  }
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405, {}, req);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const ip = getClientIp(req);
  if (await isRateLimited(ip)) {
    return error("Too many requests. Please wait.", 429, {}, req);
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