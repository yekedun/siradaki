import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient, sha256 } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";

const DEFAULT_WIDGET_LABEL = "Telefon Widget";
const MAX_WIDGET_LABEL_LENGTH = 80;

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  // Dükkan sahibinin JWT'si gerekli
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Authorization header eksik", 401);

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(
    authHeader.replace("Bearer ", "")
  );

  if (authError || !user) return error("Kimlik doğrulama başarısız", 401);

  const supabase = createAdminClient();

  // Dükkan sahibi mi? (owner_id legacy fallback dahil)
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
    .maybeSingle();

  if (!shop) return error("Dükkan profili bulunamadı", 404);

  const body = await req.json().catch(() => ({}));
  const rawLabel = (body as { label?: unknown }).label;
  if (rawLabel !== undefined && typeof rawLabel !== "string") {
    return error("Token etiketi geçersiz", 400);
  }
  const label = (rawLabel?.trim() || DEFAULT_WIDGET_LABEL).slice(0, MAX_WIDGET_LABEL_LENGTH);

  const rawToken  = crypto.randomUUID() + "-" + crypto.randomUUID();
  const tokenHash = await sha256(rawToken);

  const { data: token, error: insertError } = await supabase
    .from("widget_tokens")
    .insert({
      shop_id: shop.id,
      token_hash: tokenHash,
      label,
    })
    .select("id, label, created_at")
    .single();

  if (insertError) {
    console.error("Token insert error:", insertError);
    return error("Token oluşturulamadı", 500);
  }

  // raw_token bir kez gösterilir, bir daha alınamaz
  return json({ ...token, raw_token: rawToken }, 201);
});
