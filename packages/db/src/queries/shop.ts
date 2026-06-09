import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '../database.types';

type Client = SupabaseClient<Database>;

// WorkingHours shape — mirrors @berber/shared to avoid cross-package dep in @berber/db
type WorkingDayHours = { open: string | null; close: string | null; enabled: boolean };
type WorkingHours = Record<'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat', WorkingDayHours>;

export async function getShopByOwner(client: Client, userId: string) {
  return client
    .from('shops')
    .select('id, slug, name, display_name, address, working_hours, status, timezone')
    .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
    .maybeSingle();
}

export async function updateShop(
  client: Client,
  shopId: string,
  patch: {
    name?: string;
    display_name?: string;
    address?: string;
    working_hours?: WorkingHours;
    timezone?: string;
  },
) {
  const { working_hours, ...rest } = patch;
  return client
    .from('shops')
    .update({
      ...rest,
      ...(working_hours !== undefined ? { working_hours: working_hours as unknown as Json } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', shopId)
    .select('id, slug, name, display_name, address, working_hours, status')
    .single();
}
