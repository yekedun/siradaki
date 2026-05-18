import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g").replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o").replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

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

  // Dükkan sahibi veya admin yetkisi — hem owner_user_id hem owner_id kontrol et
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
    .single();

  if (!shop) return error("Dükkan sahibi yetkisi gerekli", 403);

  let body: { email: string; display_name: string };
  try { body = await req.json(); } catch { return error("Geçersiz JSON"); }

  const { email, display_name } = body;
  if (!email || !display_name) return error("email ve display_name zorunlu");

  // Supabase auth invite — kullanıcı zaten varsa yeniden davet gönderir
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email, {
      data: { display_name },
    });

  if (inviteError) {
    console.error("Invite error:", inviteError);
    return error("Davet gönderilemedi: " + inviteError.message, 500);
  }

  const invitedUserId = inviteData.user.id;

  // Slug çakışması olmayana kadar benzersiz slug bul
  const baseSlug = toSlug(display_name.trim());
  let slug = baseSlug;
  let suffix = 2;
  while (slug) {
    const { data: existing } = await supabase
      .from("staff")
      .select("id")
      .eq("shop_id", shop.id)
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${suffix++}`;
  }

  // Staff tablosuna ekle (barbers yerine)
  const { data: staffMember, error: insertError } = await supabase
    .from("staff")
    .insert({
      shop_id: shop.id,
      user_id: invitedUserId,
      name: display_name.trim(),
      role: "staff",
      is_active: true,
      slug: slug || null,
    })
    .select("id, name, slug")
    .single();

  if (insertError) {
    console.error("Staff insert error:", insertError);
    return error("Personel kaydı oluşturulamadı: " + insertError.message, 500);
  }

  return json({ staff: staffMember }, 201);
});
