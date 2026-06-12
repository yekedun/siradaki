import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { json, error, corsOptions } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";

interface PushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string | null;
  channelId?: string;
  priority?: "default" | "normal" | "high";
}

interface SendPushRequest {
  messages: PushMessage[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions(req);
  if (req.method !== "POST") return error("Method not allowed", 405);

  // Only internal edge function callers (service role key).
  // Timing-safe comparison against SUPABASE_SERVICE_ROLE_KEY env var.
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return error("Yetkisiz", 403);
  const token = authHeader.slice(7);
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!svcKey) {
    console.error("[send-push] SUPABASE_SERVICE_ROLE_KEY env var missing");
    return error("Sunucu yapılandırma hatası", 500);
  }
  // Pad both buffers to the same length before comparing so an attacker
  // cannot infer key length from timing differences between branches.
  const enc = new TextEncoder();
  const tokenRaw = enc.encode(token);
  const keyRaw   = enc.encode(svcKey);
  const maxLen   = Math.max(tokenRaw.length, keyRaw.length);
  const tokenBytes = new Uint8Array(maxLen);
  const keyBytes   = new Uint8Array(maxLen);
  tokenBytes.set(tokenRaw);
  keyBytes.set(keyRaw);
  let mismatch = 0;
  for (let i = 0; i < maxLen; i++) mismatch |= tokenBytes[i] ^ keyBytes[i];
  if (mismatch !== 0) return error("Yetkisiz", 403);

  let body: SendPushRequest;
  try {
    body = await req.json();
  } catch {
    return error("Gecersiz JSON");
  }

  if (!body.messages || body.messages.length === 0) {
    return json({ sent: 0, errors: [] });
  }

  // Ses/kanal varsayilanlari: iOS'ta sound olmadan bildirim sessiz gelir;
  // Android'de channelId olmadan dusuk onemli fallback kanala duser.
  const messages = body.messages.map((m) => ({
    sound: "default",
    channelId: "default",
    priority: "high",
    ...m,
  }));

  // Batch into chunks of 100 (Expo limit)
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  let totalSent = 0;
  const errors: string[] = [];
  // Expo "DeviceNotRegistered" donen token'lar artik gecersiz — staff tablosundan temizle.
  const invalidTokens = new Set<string>();

  interface ExpoTicket {
    status: string;
    message?: string;
    details?: { error?: string };
  }

  for (const chunk of chunks) {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(chunk),
    });

    if (!res.ok) {
      errors.push(`Expo API error: ${res.status}`);
      continue;
    }

    const result = await res.json() as { data?: ExpoTicket[] };
    const tickets = result.data ?? [];
    tickets.forEach((ticket, i) => {
      if (ticket.status === "ok") {
        totalSent++;
        return;
      }
      // Hatali ticket — ilgili mesajin "to" token'i ile eslestir.
      const target = chunk[i]?.to;
      const detail = ticket.details?.error ?? ticket.message ?? "unknown";
      errors.push(`ticket error: ${detail}`);
      if (ticket.details?.error === "DeviceNotRegistered" && target) {
        const targets = Array.isArray(target) ? target : [target];
        for (const t of targets) invalidTokens.add(t);
      }
    });
  }

  // Gecersiz token'lari temizle (best-effort, gonderim sonucunu etkilemez).
  if (invalidTokens.size > 0) {
    try {
      const admin = createAdminClient();
      await admin
        .from("staff")
        .update({ push_token: null })
        .in("push_token", Array.from(invalidTokens));
    } catch (e) {
      console.error("[send-push] Failed to clear invalid tokens:", e);
    }
  }

  if (errors.length > 0) {
    console.error("Push send errors:", errors);
  }

  return json({ sent: totalSent, errors });
});
