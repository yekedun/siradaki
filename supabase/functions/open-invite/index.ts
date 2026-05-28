import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return error("Gecersiz JSON");
  }

  const token = body.token?.trim();
  if (!token) return error("Token zorunlu");

  const supabase = createAdminClient();
  const { data: inviteRow, error: inviteErr } = await supabase
    .from("invite_tokens")
    .select("used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    console.error("open-invite token lookup failed:", inviteErr);
    return error("Davet kontrol edilemedi", 500);
  }

  if (!inviteRow) return error("Gecersiz token", 404);
  if (inviteRow.used_at) return error("Token zaten kullanilmis", 409);
  if (new Date(inviteRow.expires_at) < new Date()) {
    return error("Token suresi dolmus", 410);
  }

  return json({ valid: true });
});
