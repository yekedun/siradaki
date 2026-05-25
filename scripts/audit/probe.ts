import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import type { ProbeResult } from "./types.js";

function fileURLToPath(url: string): string {
  // Handle Windows paths: file:///C:/... → C:\...
  const p = url.replace(/^file:\/\/\//, "").replace(/\//g, path.sep);
  return decodeURIComponent(p);
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ── Supabase clients ──────────────────────────────────────────────────────

const SUPABASE_URL = "http://127.0.0.1:54201";
const ANON_KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";
const SERVICE_ROLE_KEY = "sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz";

export const anonClient = createClient(SUPABASE_URL, ANON_KEY);
export const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Result collector ──────────────────────────────────────────────────────

export const results: ProbeResult[] = [];

export function pass(
  category: ProbeResult["category"],
  check: string,
  msg = "OK",
  ms?: number
) {
  results.push({ category, check, status: "PASS", message: msg, durationMs: ms });
  console.log(`  ✅ [${category}] ${check}`);
}

export function fail(
  category: ProbeResult["category"],
  check: string,
  msg: string,
  ms?: number
) {
  results.push({ category, check, status: "FAIL", message: msg, durationMs: ms });
  console.error(`  ❌ [${category}] ${check}: ${msg}`);
}

export function skip(
  category: ProbeResult["category"],
  check: string,
  reason: string
) {
  results.push({ category, check, status: "SKIP", message: reason });
  console.log(`  ⏭️  [${category}] ${check}: ${reason}`);
}

export async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const r = await fn();
  return [r, Date.now() - t];
}

// ── Test data helpers ─────────────────────────────────────────────────────

export async function getTestShop(): Promise<string> {
  const { data, error } = await serviceClient
    .from("shops")
    .select("id")
    .limit(1)
    .single();
  if (error || !data?.id) {
    throw new Error(
      `No shop found in local DB — run: npx supabase db reset\nError: ${error?.message}`
    );
  }
  return data.id;
}

export async function getTestStaff(shopId: string): Promise<string> {
  const { data, error } = await serviceClient
    .from("staff")
    .select("id")
    .eq("shop_id", shopId)
    .limit(1)
    .single();
  if (error || !data?.id) {
    throw new Error(
      `No staff found for shop ${shopId} — run: npx supabase db reset\nError: ${error?.message}`
    );
  }
  return data.id;
}

// ── Main placeholder (completed in Task 12) ───────────────────────────────

async function main() {
  console.log("🔬 Probe infrastructure ready.");
  console.log(`   Supabase URL: ${SUPABASE_URL}`);

  // Connectivity check
  const { error } = await serviceClient.from("shops").select("id").limit(1);
  if (error && error.code !== "PGRST116") {
    console.error(`\n❌ Cannot connect to Supabase: ${error.message}`);
    console.error("   Make sure local Supabase is running: npx supabase start");
    process.exit(1);
  }

  console.log("   ✅ Supabase connectivity OK");
  console.log("   (Full probe implemented in Task 12)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
