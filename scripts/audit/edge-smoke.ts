import { execFileSync } from "child_process";
import * as path from "path";
import { EDGE_FN_PROBES } from "./probe-config.js";

function fileURLToPath(url: string): string {
  const p = url.replace(/^file:\/\/\//, "").replace(/\//g, path.sep);
  return decodeURIComponent(p);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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
const SUPABASE_URL = process.env.SUPABASE_URL ?? localEnv.API_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SERVICE_ROLE_KEY ?? localEnv.SECRET_KEY ?? "";

if (!SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY missing. Run `supabase start` or export local keys.");
}

let failures = 0;

async function check(
  label: string,
  fn: () => Promise<{ ok: boolean; message: string }>,
) {
  const started = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - started;
    if (result.ok) {
      console.log(`PASS ${label} ${result.message} ${ms}ms`);
    } else {
      failures += 1;
      console.error(`FAIL ${label} ${result.message} ${ms}ms`);
    }
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${label} ${(err as Error).message}`);
  }
}

async function main() {
  for (const cfg of EDGE_FN_PROBES) {
    const url = `${SUPABASE_URL}/functions/v1/${cfg.name}`;

    await check(`${cfg.name} OPTIONS allowed-origin`, async () => {
      const res = await fetch(url, {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:3000" },
      });
    const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
    return {
        ok: res.status === 204 && (allowOrigin === "http://localhost:3000" || allowOrigin === "*"),
        message: `HTTP ${res.status} allow-origin=${allowOrigin}`,
      };
    });

    await check(`${cfg.name} OPTIONS blocked-origin`, async () => {
      const res = await fetch(url, {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example" },
      });
    const allowOrigin = res.headers.get("Access-Control-Allow-Origin");
    return {
        ok: res.status === 403,
        message: `HTTP ${res.status} allow-origin=${allowOrigin}`,
      };
    });

    await check(`${cfg.name} wrong-method`, async () => {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      });
      return {
        ok: cfg.wrongMethodStatus.includes(res.status),
        message: `HTTP ${res.status} expected=${cfg.wrongMethodStatus.join("/")}`,
      };
    });

    await check(`${cfg.name} no-auth`, async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg.body),
      });
      return {
        ok: cfg.expectedNoAuthStatus.includes(res.status),
        message: `HTTP ${res.status} expected=${cfg.expectedNoAuthStatus.join("/")}`,
      };
    });

    await check(`${cfg.name} service-smoke`, async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(cfg.body),
      });
      return {
        ok: res.status === cfg.expectedServiceStatus,
        message: `HTTP ${res.status} expected=${cfg.expectedServiceStatus}`,
      };
    });
  }

  if (failures > 0) {
    console.error(`edge-smoke-failed failures=${failures}`);
    process.exit(1);
  }

  console.log("edge-smoke-ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
