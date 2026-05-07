import { supabase } from "./supabase";
import { NativeWidgetModule, isWidgetModuleAvailable } from "../modules/widget/NativeWidgetModule";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface WidgetTokenResponse {
  id: string;
  label: string;
  raw_token: string;
}

/**
 * Yeni bir widget token üretir, Supabase'e SHA256 hash olarak kaydeder
 * ve raw token'ı native widget'a gönderir.
 *
 * Raw token SADECE bu çağrıda döner — bir daha gösterilemez.
 */
export async function generateWidgetToken(
  label = "Telefon Widget"
): Promise<WidgetTokenResponse> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error("Oturum bulunamadı");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-widget-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ label }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Token oluşturulamadı");
  }

  const token = (await res.json()) as WidgetTokenResponse;

  // Token + Supabase URL'yi native widget storage'a yaz
  // (iOS App Group UserDefaults / Android SharedPreferences)
  await NativeWidgetModule.setWidgetToken(token.raw_token, SUPABASE_URL);

  return token;
}

/**
 * Mevcut widget tokenlarını listeler. Raw token gösterilmez (sadece metadata).
 */
export async function listWidgetTokens() {
  const { data, error } = await supabase
    .from("widget_tokens")
    .select("id, label, last_used_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Widget tokenı siler (revoke). Aynı zamanda native storage'tan da temizlenmesi
 * gerekir, ama kullanıcı bilinçli olarak yeniden oluşturana kadar bırakıyoruz.
 */
export async function deleteWidgetToken(tokenId: string): Promise<void> {
  const { error } = await supabase
    .from("widget_tokens")
    .delete()
    .eq("id", tokenId);

  if (error) throw error;
}

export { isWidgetModuleAvailable };
