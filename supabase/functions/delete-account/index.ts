import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

interface AppointmentRow {
  id: string;
  staff_id: string;
  customer_user_id: string | null;
  customer_name: string;
  starts_at: string;
}

async function clearInviteTokenReferences(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<void> {
  // invite_tokens.created_by/used_by may block auth user deletion on older schemas.
  const { error: usedByErr } = await admin
    .from("invite_tokens")
    .update({ used_by: null })
    .eq("used_by", userId);
  if (usedByErr) throw new Error(`Invite token used_by cleanup failed: ${usedByErr.message}`);

  const { error: createdByErr } = await admin
    .from("invite_tokens")
    .delete()
    .eq("created_by", userId);
  if (createdByErr) throw new Error(`Invite token created_by cleanup failed: ${createdByErr.message}`);
}

function fail(message: string, cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return new Error(`${message}: ${detail}`);
}

// Cancel a batch of future appointments and email each affected customer.
async function cancelAndNotifyCustomers(
  admin: ReturnType<typeof createAdminClient>,
  appointments: AppointmentRow[],
  shopName: string,
): Promise<void> {
  if (appointments.length === 0) return;

  const ids = appointments.map((a) => a.id);
  const { error: cancelErr } = await admin
    .from("appointments")
    .update({ status: "cancelled" })
    .in("id", ids);
  if (cancelErr) throw new Error(`Appointment cancel failed: ${cancelErr.message}`);

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;

  const fromEmail = Deno.env.get("SYSTEM_FROM_EMAIL") ?? "sistem@siradaki.app";

  // Collect unique customer user IDs that have an account
  const customerIds = [...new Set(
    appointments.map((a) => a.customer_user_id).filter((id): id is string => Boolean(id)),
  )];

  // Fetch emails in parallel (one getUserById per customer)
  const emailMap = new Map<string, string>();
  await Promise.all(
    customerIds.map(async (uid) => {
      const { data } = await admin.auth.admin.getUserById(uid);
      if (data?.user?.email) emailMap.set(uid, data.user.email);
    }),
  );

  // Send one email per appointment so the time is specific
  await Promise.all(
    appointments.map(async (appt) => {
      const email = appt.customer_user_id ? emailMap.get(appt.customer_user_id) : null;
      if (!email) return;

      const timeStr = new Date(appt.starts_at).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Istanbul",
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject: "Randevunuz iptal edildi",
          html: `
            <p>Merhaba ${appt.customer_name},</p>
            <p><b>${timeStr}</b> tarihli randevunuz, <b>${shopName}</b> ile bağlantılı bir hesap değişikliği nedeniyle iptal edilmiştir.</p>
            <p>Yeni bir randevu almak için <a href="https://siradaki.app">siradaki.app</a> adresini ziyaret edebilirsiniz.</p>
            <p>Anlayışınız için teşekkür ederiz.</p>
          `,
        }),
      }).catch((e) => console.warn("[delete-account] customer email failed:", e));
    }),
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);

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
  let currentStep = "init";

  try {
    // Determine role: owner or staff
    currentStep = "load_shop";
    const { data: shop, error: shopLookupErr } = await admin
      .from("shops")
      .select("id, name")
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .maybeSingle();
    if (shopLookupErr) throw fail("Shop lookup failed", shopLookupErr.message);

    const now = new Date().toISOString();

    if (shop) {
      // Owner: cancel future appointments across all shop staff, notify customers, then delete shop
      const shopRecord = shop as { id: string; name: string };

      currentStep = "load_shop_staff";
      const { data: staffRows, error: staffRowsErr } = await admin
        .from("staff")
        .select("id")
        .eq("shop_id", shopRecord.id);
      if (staffRowsErr) throw fail("Shop staff lookup failed", staffRowsErr.message);

      const staffIds = (staffRows ?? []).map((s: { id: string }) => s.id);
      let futureAppointments: AppointmentRow[] = [];
      if (staffIds.length > 0) {
        currentStep = "load_owner_future_appointments";
        const { data, error: futureErr } = await admin
          .from("appointments")
          .select("id, staff_id, customer_user_id, customer_name, starts_at")
          .eq("status", "confirmed")
          .gte("starts_at", now)
          .in("staff_id", staffIds);
        if (futureErr) throw fail("Owner appointment lookup failed", futureErr.message);
        futureAppointments = (data ?? []) as AppointmentRow[];
      }

      currentStep = "cancel_owner_future_appointments";
      await cancelAndNotifyCustomers(
        admin,
        futureAppointments,
        shopRecord.name,
      );

      if (staffIds.length > 0) {
        currentStep = "clear_owner_appointment_services";
        const { error: serviceRefErr } = await admin
          .from("appointments")
          .update({ service_id: null })
          .in("staff_id", staffIds)
          .not("service_id", "is", null);
        if (serviceRefErr) {
          throw new Error(`Appointment service cleanup failed: ${serviceRefErr.message}`);
        }
      }

      // Delete the shop before auth user deletion. This runs as service_role, so
      // scheduling-write triggers allow the cascade through staff/appointments.
      currentStep = "delete_owner_shop";
      const { error: shopErr } = await admin
        .from("shops")
        .delete()
        .eq("id", shopRecord.id);
      if (shopErr) throw new Error(`Shop delete failed: ${shopErr.message}`);
    } else {
      // Staff: find this user's staff record before unlinking
      currentStep = "load_staff_record";
      const { data: staffRecord, error: staffRecordErr } = await admin
        .from("staff")
        .select("id, shop_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (staffRecordErr) throw fail("Staff lookup failed", staffRecordErr.message);

      if (staffRecord) {
        const sr = staffRecord as { id: string; shop_id: string };

        // Get shop name for the email
        currentStep = "load_staff_shop";
        const { data: staffShop, error: staffShopErr } = await admin
          .from("shops")
          .select("name")
          .eq("id", sr.shop_id)
          .maybeSingle();
        if (staffShopErr) throw fail("Staff shop lookup failed", staffShopErr.message);
        const shopName = (staffShop as { name: string } | null)?.name ?? "Berber";

        // Cancel future appointments for this staff member
        currentStep = "load_staff_future_appointments";
        const { data: futureAppointments, error: futureErr } = await admin
          .from("appointments")
          .select("id, staff_id, customer_user_id, customer_name, starts_at")
          .eq("staff_id", sr.id)
          .eq("status", "confirmed")
          .gte("starts_at", now);
        if (futureErr) throw fail("Staff appointment lookup failed", futureErr.message);

        currentStep = "cancel_staff_future_appointments";
        await cancelAndNotifyCustomers(
          admin,
          (futureAppointments ?? []) as AppointmentRow[],
          shopName,
        );
      }

      // Disconnect user_id so the staff slot remains but is unlinked
      currentStep = "unlink_staff_user";
      const { error: staffErr } = await admin
        .from("staff")
        .update({ user_id: null })
        .eq("user_id", user.id);
      if (staffErr) throw new Error(`Staff unlink failed: ${staffErr.message}`);

      // Customer: cancel future confirmed appointments so barbers are not left with ghost slots
      currentStep = "load_customer_future_appointments";
      const { data: customerAppointments, error: customerAppointmentsErr } = await admin
        .from("appointments")
        .select("id, staff_id")
        .eq("customer_user_id", user.id)
        .gte("starts_at", now)
        .eq("status", "confirmed");
      if (customerAppointmentsErr) {
        throw fail("Customer appointment lookup failed", customerAppointmentsErr.message);
      }

      if (customerAppointments && customerAppointments.length > 0) {
        const ids = customerAppointments.map((a) => a.id);
        currentStep = "cancel_customer_future_appointments";
        const { error: cancelErr } = await admin
          .from("appointments")
          .update({ status: "cancelled" })
          .in("id", ids);
        if (cancelErr) throw new Error(`Appointment cancel failed: ${cancelErr.message}`);

        // Notify affected barbers via Expo push
        const staffIds = [...new Set(customerAppointments.map((a) => a.staff_id))];
        currentStep = "load_push_tokens";
        const { data: staffRows, error: pushTokenErr } = await admin
          .from("staff")
          .select("push_token")
          .in("id", staffIds)
          .not("push_token", "is", null);
        if (pushTokenErr) throw fail("Push token lookup failed", pushTokenErr.message);

        const tokens = (staffRows ?? [])
          .map((s) => (s as { push_token: string | null }).push_token)
          .filter((t): t is string => Boolean(t));

        if (tokens.length > 0) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${svcKey}`,
            },
            body: JSON.stringify({
              messages: tokens.map((to) => ({
                to,
                title: "Randevu İptal Edildi",
                body: "Bir müşteri hesabını sildi; gelecek randevusu iptal edildi.",
              })),
            }),
          }).catch((e) => console.warn("[delete-account] push notify failed:", e));
        }
      }
    }

    // Delete auth user (requires service role)
    currentStep = "clear_invite_token_references";
    await clearInviteTokenReferences(admin, user.id);

    currentStep = "delete_auth_user";
    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) throw new Error(`Auth delete failed: ${deleteErr.message}`);

    return json({ success: true });
  } catch (err) {
    console.error(`[delete-account] account deletion failed at step=${currentStep}:`, err);
    return error("Hesap silinemedi", 500);
  }
});
