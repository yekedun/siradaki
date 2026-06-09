export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function isRateLimited(
  key: string,
  maxRequests: number,
  windowSec = 600,
): Promise<boolean> {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) {
    if (Deno.env.get("ENVIRONMENT") !== "development") {
      throw new Error("UPSTASH_REDIS_REST_URL / TOKEN not set in production");
    }
    console.warn(`[rate-limit] Upstash not configured — rate limiting disabled (dev only)`);
    return false;
  }

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(windowSec), "NX"],
      ]),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const count: unknown = data?.[0]?.result;
    return typeof count === "number" && count > maxRequests;
  } catch (err) {
    console.error("Upstash rate limit check failed:", err);
    return false;
  }
}
