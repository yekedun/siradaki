import { createAdminClient } from "./supabase-admin.ts";

/**
 * Yeni randevu olusunca atanan personel + dukkan sahibine Expo push gonderir.
 * Hem app-book-appointment (mobil musteri) hem widget-book-appointment (web widget)
 * tarafindan kullanilir — tek kaynak, davranis tutarli.
 *
 * Kurallar:
 *  - Atanan personel: bildirilir. Ancak personel ayni zamanda sahip ise,
 *    sahibin notification_prefs.new_appointment tercihini uygula (default true).
 *  - Sahip (personelden farkliysa): new_appointment tercihi true ise bildir.
 */
export async function sendBookingNotifications(
  appointmentId: string,
  serviceUrl: string,
  serviceKey: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: appt } = await supabase
    .from("appointments")
    .select("customer_name, starts_at, staff_id, services(name), staff:staff_id(push_token, shop_id, user_id, notification_prefs)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!appt) return;

  const staffMember = appt.staff as any;
  const service = appt.services as any;
  const shopId: string | null = staffMember?.shop_id ?? null;

  const timeStr = new Date(appt.starts_at).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });

  const title = "Yeni Randevu";
  const body = `${appt.customer_name} — ${service?.name ?? "Randevu"}, ${timeStr}`;

  // Sahibi belirle: atanan personel ayni zamanda sahip olabilir.
  let ownerUserId: string | null = null;
  if (shopId) {
    const { data: shop } = await supabase
      .from("shops")
      .select("owner_user_id")
      .eq("id", shopId)
      .maybeSingle();
    ownerUserId = (shop as any)?.owner_user_id ?? null;
  }

  const staffIsOwner = ownerUserId !== null && staffMember?.user_id === ownerUserId;
  const staffPrefs = staffMember?.notification_prefs ?? {};

  const tokens = new Set<string>();

  if (staffMember?.push_token) {
    if (staffIsOwner) {
      if (staffPrefs.new_appointment !== false) tokens.add(staffMember.push_token);
    } else {
      tokens.add(staffMember.push_token);
    }
  }

  if (shopId && ownerUserId && !staffIsOwner) {
    const { data: ownerStaff } = await supabase
      .from("staff")
      .select("push_token, notification_prefs")
      .eq("shop_id", shopId)
      .eq("user_id", ownerUserId)
      .maybeSingle();

    const ownerPrefs = (ownerStaff as any)?.notification_prefs ?? {};
    if (
      ownerStaff?.push_token &&
      ownerStaff.push_token !== staffMember?.push_token &&
      ownerPrefs.new_appointment !== false
    ) {
      tokens.add(ownerStaff.push_token);
    }
  }

  if (tokens.size === 0) return;

  const messages = Array.from(tokens).map((to) => ({
    to,
    title,
    body,
    data: { appointmentId },
  }));

  await fetch(`${serviceUrl}/functions/v1/send-push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ messages }),
  }).catch((e) => console.error("[book] Push notification failed:", e));
}
