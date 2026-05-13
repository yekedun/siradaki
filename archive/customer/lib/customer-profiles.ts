// customer_profiles tablosu migration 005 ile ekleniyor.
// pnpm db:sync çalıştırıldıktan sonra @berber/db types otomatik güncellenir.
// O zamana kadar `any` cast burada izole tutulur.

import { supabase } from "./supabase";

export interface CustomerProfile {
  user_id: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const t = () => (supabase as any).from("customer_profiles");

export async function getProfile(userId: string): Promise<CustomerProfile | null> {
  const { data, error } = await t()
    .select("user_id, full_name, phone, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerProfile) ?? null;
}

export async function upsertProfile(
  userId: string,
  fields: { full_name: string; phone?: string | null }
): Promise<void> {
  const { error } = await t().upsert({
    user_id: userId,
    full_name: fields.full_name,
    phone: fields.phone ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
