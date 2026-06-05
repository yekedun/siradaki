import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json, bodyGuard } from "../_shared/cors.ts";

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  const guard = bodyGuard(req);
  if (guard) return guard;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Authorization header eksik", 401);

  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authErr || !user) return error("Kimlik doğrulama başarısız", 401);

  const admin = createAdminClient();

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return error("Geçersiz JSON");
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return error("Token zorunlu");

  const { data: inviteRow, error: inviteErr } = await admin
    .from("invite_tokens")
    .select("id, shop_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteErr) {
    console.error("[accept-invite] invite lookup failed:", inviteErr);
    return error("Davet doğrulanamadı", 500);
  }
  if (
    !inviteRow ||
    inviteRow.used_at ||
    new Date(inviteRow.expires_at) < new Date()
  ) {
    return error("Invalid or expired invite link", 404);
  }

  const { data: shop, error: shopErr } = await admin
    .from("shops")
    .select("id, status")
    .eq("id", inviteRow.shop_id)
    .maybeSingle();
  if (shopErr) {
    console.error("[accept-invite] shop lookup failed:", shopErr);
    return error("Dükkan doğrulanamadı", 500);
  }
  if (!shop || shop.status !== "active") return error("Davet edilen dükkan aktif değil", 403);

  const usedAt = new Date().toISOString();
  const { data: existing, error: existingErr } = await admin
    .from("staff")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("shop_id", inviteRow.shop_id)
    .maybeSingle();
  if (existingErr) {
    console.error("[accept-invite] existing staff lookup failed:", existingErr);
    return error("Personel kaydı doğrulanamadı", 500);
  }
  if (existing) {
    await admin
      .from("invite_tokens")
      .update({ used_at: usedAt, used_by: user.id })
      .eq("id", inviteRow.id)
      .is("used_at", null);
    return json({ staff: existing }, 200);
  }

  const { data: claimed, error: claimErr } = await admin
    .from("invite_tokens")
    .update({ used_at: usedAt, used_by: user.id })
    .eq("id", inviteRow.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();
  if (claimErr) {
    console.error("[accept-invite] invite claim failed:", claimErr);
    return error("Davet kullanılamadı", 500);
  }
  if (!claimed) return error("Token zaten kullanılmış", 409);

  const name = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "berber";
  const baseSlug = toSlug(name) || user.id.slice(0, 8);
  let slug = baseSlug;
  let suffix = 2;
  const MAX_SLUG_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    const { data: s } = await admin
      .from("staff")
      .select("id")
      .eq("shop_id", inviteRow.shop_id)
      .eq("slug", slug)
      .maybeSingle();
    if (!s) break;
    if (attempt === MAX_SLUG_ATTEMPTS - 1) {
      slug = `${user.id.slice(0, 8)}-${Date.now().toString(36)}`;
    } else {
      slug = `${baseSlug}-${suffix++}`;
    }
  }

  const { data: staffMember, error: insertErr } = await admin.from("staff").insert({
    shop_id: inviteRow.shop_id,
    user_id: user.id,
    name,
    role: "staff",
    is_active: true,
    slug: slug || null,
  }).select("id, name").single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: racedExisting } = await admin
        .from("staff")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("shop_id", inviteRow.shop_id)
        .maybeSingle();
      if (racedExisting) return json({ staff: racedExisting }, 200);
    }

    await admin
      .from("invite_tokens")
      .update({ used_at: null, used_by: null })
      .eq("id", inviteRow.id)
      .eq("used_by", user.id);
    console.error("[accept-invite] staff insert failed:", insertErr);
    return error("Personel kaydı oluşturulamadı", 500);
  }

  return json({ staff: staffMember }, 201);
});
