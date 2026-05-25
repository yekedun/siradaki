import * as fs from "fs";
import * as path from "path";
import type { IntegrationObject, GapEntry, ObjectKind } from "./types.js";

function fileURLToPath(url: string): string {
  return decodeURIComponent(url.replace(/^file:\/\/\//, '').replace(/\//g, path.sep));
}
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");

// ── Pure parsers (testable) ────────────────────────────────────────────────

export function parseTablesFromSql(sql: string): string[] {
  const names: string[] = [];
  for (const m of sql.matchAll(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi
  )) {
    names.push(m[1].toLowerCase());
  }
  return names;
}

export function parseDroppedTablesFromSql(sql: string): string[] {
  const names: string[] = [];
  for (const m of sql.matchAll(
    /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?(\w+)/gi
  )) {
    names.push(m[1].toLowerCase());
  }
  return names;
}

export function parseFunctionsFromSql(sql: string): string[] {
  const names: string[] = [];
  for (const m of sql.matchAll(
    /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(/gi
  )) {
    names.push(m[1].toLowerCase());
  }
  return names;
}

export function parseTriggersFromSql(sql: string): string[] {
  const names: string[] = [];
  for (const m of sql.matchAll(/CREATE\s+TRIGGER\s+(\w+)/gi)) {
    names.push(m[1].toLowerCase());
  }
  return names;
}

// ── Source code scanner ───────────────────────────────────────────────────

export interface SourceCallSite {
  file: string;
  calls: string[]; // "from:tableName", "rpc:rpcName", "invoke:fnName", "channel:channelName"
}

export function parseSupabaseCallsFromTs(src: string, filePath: string): SourceCallSite {
  const calls: string[] = [];

  for (const m of src.matchAll(/\.from\(\s*['"`](\w+)['"`]/g))
    calls.push(`from:${m[1]}`);
  for (const m of src.matchAll(/\.rpc\(\s*['"`]([\w]+)['"`]/g))
    calls.push(`rpc:${m[1]}`);
  for (const m of src.matchAll(/functions\.invoke\(\s*['"`]([\w-]+)['"`]/g))
    calls.push(`invoke:${m[1]}`);
  for (const m of src.matchAll(/\.channel\(\s*['"`]([\w\-:]+)['"`]/g))
    calls.push(`channel:${m[1]}`);

  return { file: filePath, calls: [...new Set(calls)] };
}

export function scanDirectory(dir: string): SourceCallSite[] {
  const results: SourceCallSite[] = [];
  if (!fs.existsSync(dir)) return results;

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (
        entry.isDirectory() &&
        !["node_modules", ".next", "dist", "__tests__", ".expo"].includes(entry.name)
      ) {
        walk(full);
      } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
        const src = fs.readFileSync(full, "utf8");
        const site = parseSupabaseCallsFromTs(src, full.replace(ROOT + path.sep, ""));
        if (site.calls.length > 0) results.push(site);
      }
    }
  }

  walk(dir);
  return results;
}

// ── Self-test ──────────────────────────────────────────────────────────────

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

function runSelfTests() {
  console.log("Running build-map self-tests...");

  const sql = `
    CREATE TABLE public.shops (id uuid);
    CREATE TABLE IF NOT EXISTS public.staff (id uuid);
    DROP TABLE IF EXISTS public.old_table;
    CREATE OR REPLACE FUNCTION public.my_fn(p_id uuid) RETURNS void AS $$ $$ language sql;
    CREATE TRIGGER shops_updated_at BEFORE UPDATE ON shops FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  `;

  const tables = parseTablesFromSql(sql);
  assert(tables.includes("shops"), "should find shops");
  assert(tables.includes("staff"), "should find staff");
  assert(!tables.includes("old_table"), "should not include dropped tables in parseTablesFromSql");

  const dropped = parseDroppedTablesFromSql(sql);
  assert(dropped.includes("old_table"), "should find dropped old_table");

  const fns = parseFunctionsFromSql(sql);
  assert(fns.includes("my_fn"), "should find my_fn");

  const triggers = parseTriggersFromSql(sql);
  assert(triggers.includes("shops_updated_at"), "should find trigger");

  // scanner tests
  const tsSrc = `
    supabase.from('appointments').select()
    supabase.rpc('get_shop_dashboard_stats', {})
    supabase.functions.invoke('app-book-appointment', {})
    supabase.channel('appointments:abc')
  `;
  const site = parseSupabaseCallsFromTs(tsSrc, "fake/file.tsx");
  assert(site.calls.includes("from:appointments"), "should find from:appointments");
  assert(site.calls.includes("rpc:get_shop_dashboard_stats"), "should find rpc");
  assert(site.calls.includes("invoke:app-book-appointment"), "should find invoke");
  assert(site.calls.includes("channel:appointments:abc"), "should find channel");
  console.log("  ✅ Scanner self-tests passed");

  console.log("  ✅ All self-tests passed");
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  if (process.argv.includes("--test")) {
    runSelfTests();
    process.exit(0);
  }

  const sites = [
    ...scanDirectory(path.join(ROOT, "apps/mobile/app")),
    ...scanDirectory(path.join(ROOT, "apps/mobile/components")),
    ...scanDirectory(path.join(ROOT, "apps/web/src")),
    ...scanDirectory(path.join(ROOT, "supabase/functions")),
  ];
  console.log(`Scanned ${sites.length} files with Supabase calls:`);
  for (const s of sites) {
    console.log(`  ${s.file}: ${s.calls.join(", ")}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
