import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Authorization header eksik", 401);

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authErr || !user) return error("Kimlik doğrulama başarısız", 401);

  const admin = createAdminClient();

  const { data: shop } = await admin.from("shops")
    .select("id").or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`).single();
  if (!shop) return error("Dükkan sahibi yetkisi gerekli", 403);

  // Token oluştur (48 saat geçerli)
  const { data: tokenRow, error: tokenErr } = await admin
    .from("invite_tokens")
    .insert({ shop_id: shop.id, created_by: user.id })
    .select("token")
    .single();

  if (tokenErr) return error("Token oluşturulamadı: " + tokenErr.message, 500);

  const inviteLink = `siradaki://invite/${tokenRow.token}`;

  return json({ invite_link: inviteLink, token: tokenRow.token }, 201);
});
