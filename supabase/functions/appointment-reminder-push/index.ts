import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createAdminClient } from "../_shared/supabase-admin.ts";
import { corsOptions, error, json } from "../_shared/cors.ts";

// Web Push: RFC 8291 / RFC 8292 — native WebCrypto, no npm dependency.

function b64u(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64u(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) => c.charCodeAt(0));
}

async function signJwt(header: object, payload: object, privateKey: CryptoKey): Promise<string> {
  const enc = new TextEncoder();
  const h = b64u(enc.encode(JSON.stringify(header)).buffer);
  const p = b64u(enc.encode(JSON.stringify(payload)).buffer);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    enc.encode(`${h}.${p}`),
  );
  return `${h}.${p}.${b64u(sig)}`;
}

async function hkdf(
  salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

async function encryptPayload(
  payload: string,
  p256dhB64: string,
  authB64: string,
): Promise<{ ciphertext: Uint8Array; serverPublicKeyRaw: Uint8Array; salt: Uint8Array }> {
  const enc = new TextEncoder();
  const plaintext = enc.encode(payload);

  // Ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"],
  );
  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey),
  );

  // Import subscription's p256dh
  const clientPublicKey = await crypto.subtle.importKey(
    "raw", fromB64u(p256dhB64),
    { name: "ECDH", namedCurve: "P-256" },
    false, [],
  );

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPublicKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedBits);

  const authSecret = fromB64u(authB64);
  const clientPublicKeyRaw = fromB64u(p256dhB64);

  // PRK (HKDF-SHA-256 with auth as salt)
  const infoKey = concat(
    enc.encode("WebPush: info\0"),
    clientPublicKeyRaw,
    serverPublicKeyRaw,
  );
  const prk = await hkdf(authSecret, sharedSecret, infoKey, 32);

  // Encryption salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Content encryption key (16 bytes)
  const cekInfo = enc.encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Nonce (12 bytes)
  const nonceInfo = enc.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Padding (RFC 8291 §4: delimiter byte 0x02 + no padding)
  const padded = concat(plaintext, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const encBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded);

  // RFC 8188 record header: salt (16) + rs (4, big-endian) + idlen (1) + keyid (server public key raw)
  const rs = 4096;
  const header = new ArrayBuffer(21 + serverPublicKeyRaw.length);
  const view = new DataView(header);
  new Uint8Array(header).set(salt, 0);
  view.setUint32(16, rs, false);
  view.setUint8(20, serverPublicKeyRaw.length);
  new Uint8Array(header).set(serverPublicKeyRaw, 21);

  const ciphertext = concat(new Uint8Array(header), new Uint8Array(encBuf));
  return { ciphertext, serverPublicKeyRaw, salt };
}

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string,
  payload: string,
): Promise<boolean> {
  const origin = new URL(endpoint).origin;

  // Import VAPID private key (raw ES256 scalar, 32 bytes)
  const vapidPrivateKeyBytes = fromB64u(vapidPrivateKeyB64);
  const vapidPublicKeyBytes = fromB64u(vapidPublicKeyB64);

  // Import as ECDSA key pair
  const jwk = {
    kty: "EC", crv: "P-256", ext: true,
    d: b64u(vapidPrivateKeyBytes.buffer),
    x: b64u(vapidPublicKeyBytes.slice(1, 33).buffer),
    y: b64u(vapidPublicKeyBytes.slice(33, 65).buffer),
  };
  const privateKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"],
  );

  const now = Math.floor(Date.now() / 1000);
  const jwt = await signJwt(
    { typ: "JWT", alg: "ES256" },
    { aud: origin, exp: now + 43200, sub: "mailto:emreyek29@gmail.com" },
    privateKey,
  );

  const { ciphertext, serverPublicKeyRaw } = await encryptPayload(payload, p256dh, auth);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Urgency": "normal",
      "Authorization": `vapid t=${jwt},k=${b64u(serverPublicKeyRaw.buffer)}`,
      "Content-Length": String(ciphertext.length),
    },
    body: ciphertext,
  });

  if (!res.ok && res.status !== 201) {
    const body = await res.text().catch(() => "");
    console.warn(`[reminder] push failed ${res.status}: ${body.slice(0, 200)}`);
    return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return error("Method not allowed", 405);

  // Service-role-key auth (same pattern as daily-summary-push)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return error("Yetkisiz", 403);
  const token = authHeader.slice(7);
  const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!svcKey) return error("Sunucu yapılandırma hatası", 500);
  const enc = new TextEncoder();
  const tBytes = enc.encode(token);
  const kBytes = enc.encode(svcKey);
  const maxLen = Math.max(tBytes.length, kBytes.length);
  const tPad = new Uint8Array(maxLen); tPad.set(tBytes);
  const kPad = new Uint8Array(maxLen); kPad.set(kBytes);
  let mismatch = 0;
  for (let i = 0; i < maxLen; i++) mismatch |= tPad[i] ^ kPad[i];
  if (mismatch !== 0) return error("Yetkisiz", 403);

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
  const vapidPrivateKey = (await (async () => {
    try {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("vault.decrypted_secrets" as never)
        .select("decrypted_secret")
        .eq("name", "vapid_private_key")
        .maybeSingle() as any;
      return data?.decrypted_secret ?? "";
    } catch { return ""; }
  })());

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error("[reminder] VAPID keys missing");
    return error("Yapılandırma eksik", 500);
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 24h window: starts_at between now+23h and now+25h
  const win24Start = new Date(now.getTime() + 23 * 3600_000).toISOString();
  const win24End   = new Date(now.getTime() + 25 * 3600_000).toISOString();

  // 1h window: starts_at between now+55min and now+70min
  const win1hStart = new Date(now.getTime() + 55 * 60_000).toISOString();
  const win1hEnd   = new Date(now.getTime() + 70 * 60_000).toISOString();

  // Fetch due subscriptions
  const { data: rows24 } = await supabase
    .from("appointment_web_push_subscriptions")
    .select("id, endpoint, p256dh, auth, appointment_id, appointments!inner(starts_at, customer_name, status, services(name))")
    .eq("notified_24h", false)
    .eq("appointments.status", "confirmed")
    .gte("appointments.starts_at", win24Start)
    .lt("appointments.starts_at", win24End);

  const { data: rows1h } = await supabase
    .from("appointment_web_push_subscriptions")
    .select("id, endpoint, p256dh, auth, appointment_id, appointments!inner(starts_at, customer_name, status, services(name))")
    .eq("notified_1h", false)
    .eq("appointments.status", "confirmed")
    .gte("appointments.starts_at", win1hStart)
    .lt("appointments.starts_at", win1hEnd);

  let sent = 0;

  async function processRow(row: any, type: "24h" | "1h") {
    const appt = row.appointments as any;
    const timeStr = new Date(appt.starts_at).toLocaleTimeString("tr-TR", {
      hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul",
    });
    const serviceName = appt.services?.name ?? "Randevunuz";
    const body = type === "24h"
      ? `Yarın ${timeStr} — ${serviceName}`
      : `1 saat sonra ${timeStr} — ${serviceName}`;

    const ok = await sendWebPush(
      row.endpoint, row.p256dh, row.auth,
      vapidPublicKey, vapidPrivateKey,
      JSON.stringify({ title: "Randevu Hatırlatması", body }),
    ).catch(() => false);

    if (ok) {
      await supabase
        .from("appointment_web_push_subscriptions")
        .update(type === "24h" ? { notified_24h: true } : { notified_1h: true })
        .eq("id", row.id);
      sent++;
    }
  }

  await Promise.all([
    ...(rows24 ?? []).map((r: any) => processRow(r, "24h")),
    ...(rows1h ?? []).map((r: any) => processRow(r, "1h")),
  ]);

  return json({ sent, checked24h: (rows24 ?? []).length, checked1h: (rows1h ?? []).length });
});
