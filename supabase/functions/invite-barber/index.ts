import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

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

  // Dükkan sahibi mi doğrula
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("owner_user_id", user.id)
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

  // Barbers tablosuna ekle (user_id şimdiden set ediliyor)
  const { data: barber, error: insertError } = await supabase
    .from("barbers")
    .insert({
      shop_id: shop.id,
      user_id: invitedUserId,
      display_name: display_name.trim(),
      invite_email: email.toLowerCase().trim(),
      is_active: true,
    })
    .select("id, display_name, invite_email")
    .single();

  if (insertError) {
    console.error("Barber insert error:", insertError);
    return error("Usta kaydı oluşturulamadı: " + insertError.message, 500);
  }

  return json({ barber }, 201);
});
