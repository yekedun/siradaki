import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();

  // Require authenticated caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Unauthorized", 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return error("Unauthorized", 401);

  const admin = createAdminClient();

  try {
    // Determine role: owner or staff
    const { data: shop } = await admin
      .from("shops")
      .select("id")
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .single();

    if (shop) {
      // Owner: delete shop cascades → staff, appointments, blocks, services, etc.
      const { error: shopErr } = await admin
        .from("shops")
        .delete()
        .eq("id", shop.id);
      if (shopErr) throw new Error(`Shop delete failed: ${shopErr.message}`);
    } else {
      // Staff: disconnect user_id so the staff slot remains but is unlinked
      const { error: staffErr } = await admin
        .from("staff")
        .update({ user_id: null })
        .eq("user_id", user.id);
      if (staffErr) throw new Error(`Staff unlink failed: ${staffErr.message}`);
    }

    // Delete auth user (requires service role)
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw new Error(`Auth delete failed: ${deleteErr.message}`);

    return json({ success: true });
  } catch (err) {
    return error((err as Error).message, 500);
  }
});
