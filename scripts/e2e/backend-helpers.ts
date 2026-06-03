import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "child_process";
import * as path from "path";

function fileURLToPath(url: string): string {
  const p = url.replace(/^file:\/\/\//, "").replace(/\//g, path.sep);
  return decodeURIComponent(p);
}

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readSupabaseStatusEnv(): Record<string, string> {
  try {
    const out = execFileSync("supabase", ["status", "-o", "env"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return Object.fromEntries(
      out
        .split(/\r?\n/)
        .map((line) => line.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
    );
  } catch {
    return {};
  }
}

const localEnv = readSupabaseStatusEnv();

export const SUPABASE_URL =
  process.env.SUPABASE_URL ?? localEnv.API_URL ?? "http://127.0.0.1:54321";
export const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SERVICE_ROLE_KEY ?? localEnv.SECRET_KEY ?? "";

if (!SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing. Run `supabase start` or export local keys.");
}

export const functionsUrl = `${SUPABASE_URL}/functions/v1`;

export const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const fixture = {
  shopId: "00000000-0000-0000-0000-000000000001",
  staffId: "00000000-0000-0000-0000-000000000002",
  serviceId: "00000000-0000-0000-0000-000000000003",
  shopSlug: "test-berber",
};

const workingHours = {
  mon: { open: "09:00", close: "18:00", enabled: true },
  tue: { open: "09:00", close: "18:00", enabled: true },
  wed: { open: "09:00", close: "18:00", enabled: true },
  thu: { open: "09:00", close: "18:00", enabled: true },
  fri: { open: "09:00", close: "18:00", enabled: true },
  sat: { open: "09:00", close: "18:00", enabled: true },
  sun: { open: null, close: null, enabled: false },
};

export function nextWeekdayDate(dayOfWeek: number): string {
  const today = new Date();
  const current = today.getDay();
  let days = (dayOfWeek - current + 7) % 7;
  if (days === 0) days = 7;
  const date = new Date(today);
  date.setDate(today.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function ensureBookingFixture(date = nextWeekdayDate(1)) {
  await must(
    serviceClient
      .from("shops")
      .update({
        status: "active",
        timezone: "Europe/Istanbul",
        working_hours: workingHours,
      })
      .eq("id", fixture.shopId),
    "activate fixture shop",
  );

  await must(
    serviceClient
      .from("staff")
      .update({ is_active: true, slug: "test-usta" })
      .eq("id", fixture.staffId)
      .eq("shop_id", fixture.shopId),
    "activate fixture staff",
  );

  await must(
    serviceClient
      .from("services")
      .update({ duration_min: 30, is_active: true, price_cents: 5000 })
      .eq("id", fixture.serviceId)
      .eq("shop_id", fixture.shopId),
    "activate fixture service",
  );

  for (let day = 1; day <= 6; day += 1) {
    await must(
      serviceClient.from("staff_schedules").upsert(
        {
          staff_id: fixture.staffId,
          day_of_week: day,
          is_working: true,
          work_start: "09:00",
          work_end: "18:00",
          break_start: null,
          break_end: null,
        },
        { onConflict: "staff_id,day_of_week" },
      ),
      `upsert fixture schedule day ${day}`,
    );
  }

  await must(
    serviceClient
      .from("appointments")
      .delete()
      .eq("staff_id", fixture.staffId)
      .eq("service_id", fixture.serviceId)
      .gte("starts_at", `${date}T00:00:00.000Z`)
      .lt("starts_at", `${date}T23:59:59.999Z`),
    "clear fixture appointments",
  );
}

export async function firstAvailableSlot(date: string): Promise<string> {
  const url = new URL(`${functionsUrl}/widget-get-availability`);
  url.searchParams.set("shop_slug", fixture.shopSlug);
  url.searchParams.set("date", date);
  url.searchParams.set("service_id", fixture.serviceId);
  url.searchParams.set("staff_id", fixture.staffId);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`availability failed: HTTP ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { slots?: Array<{ starts_at: string; available: boolean }> };
  const slot = data.slots?.find((s) => s.available);
  if (!slot) throw new Error(`No available slot returned for ${date}`);
  return slot.starts_at;
}

export async function bookWidgetAppointment(startsAt: string, index = 0): Promise<Response> {
  return fetch(`${functionsUrl}/widget-book-appointment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shop_slug: fixture.shopSlug,
      service_id: fixture.serviceId,
      staff_id: fixture.staffId,
      starts_at: startsAt,
      customer_name: `E2E Customer ${index}`,
      customer_phone: `+90555555${String(index).padStart(4, "0")}`,
    }),
  });
}

export async function appointmentForSlot(startsAt: string) {
  const { data, error } = await serviceClient
    .from("appointments")
    .select("id, staff_id, service_id, status, starts_at, ends_at")
    .eq("staff_id", fixture.staffId)
    .eq("service_id", fixture.serviceId)
    .eq("starts_at", startsAt)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`appointments query failed: ${error.message}`);
  return data ?? [];
}

export async function mirrorRows(appointmentId: string) {
  const { data, error } = await serviceClient
    .from("appointment_slots")
    .select("appointment_id, staff_id, starts_at, ends_at")
    .eq("appointment_id", appointmentId);
  if (error) throw new Error(`appointment_slots query failed: ${error.message}`);
  return data ?? [];
}

export async function assertFunctionsRuntime() {
  const res = await fetch(`${functionsUrl}/widget-get-availability`, { method: "OPTIONS" }).catch(
    (err) => {
      throw new Error(
        `Supabase functions runtime is not reachable at ${functionsUrl}. Run ` +
          "`supabase functions serve --env-file .env.local --import-map supabase/functions/import_map.json`. " +
          String(err),
      );
    },
  );
  if (![204, 403].includes(res.status)) {
    throw new Error(`Unexpected functions runtime health status: HTTP ${res.status}`);
  }
}

async function must<T extends { error: unknown }>(
  promise: PromiseLike<T>,
  label: string,
): Promise<T> {
  const result = await promise;
  if (result.error) {
    throw new Error(`${label} failed: ${(result.error as { message?: string }).message ?? result.error}`);
  }
  return result;
}
