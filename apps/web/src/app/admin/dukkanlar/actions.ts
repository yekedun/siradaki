'use server';

import { createClient } from '@supabase/supabase-js';
import { assertAdmin } from '../lib/assert-admin';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function sendOwnerPush(
  supabase: ReturnType<typeof getAdminClient>,
  shopId: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<void> {
  const { data: shop } = await supabase
    .from('shops')
    .select('owner_user_id')
    .eq('id', shopId)
    .single();

  if (!shop?.owner_user_id) return;

  const { data: ownerStaff } = await supabase
    .from('staff')
    .select('push_token')
    .eq('shop_id', shopId)
    .eq('user_id', shop.owner_user_id)
    .maybeSingle();

  if (!ownerStaff?.push_token) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(`${supabaseUrl}/functions/v1/send-push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      messages: [{ to: ownerStaff.push_token, title, body, data }],
    }),
  }).catch((e) => console.error('[admin] sendOwnerPush failed:', e));
}

export async function approveShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('shops')
    .select('status')
    .eq('id', shopId)
    .single();
  if (existing?.status === 'active') return { error: 'Bu dükkan zaten aktif.' };

  const { error } = await supabase.from('shops').update({ status: 'active' }).eq('id', shopId);
  if (error) throw new Error('Onay başarısız: ' + error.message);

  await sendOwnerPush(
    supabase, shopId,
    'Başvurunuz Onaylandı! 🎉',
    'Dükkanınız aktif hale getirildi. Şimdi giriş yapabilirsiniz.',
    { type: 'shop_approved' },
  );
}

export async function rejectShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();

  const { data: existing } = await supabase
    .from('shops')
    .select('status')
    .eq('id', shopId)
    .single();
  if (existing?.status === 'rejected') return { error: 'Bu dükkan zaten reddedilmiş.' };

  const { error } = await supabase.from('shops').update({ status: 'rejected' }).eq('id', shopId);
  if (error) throw new Error('Red başarısız: ' + error.message);

  await sendOwnerPush(
    supabase, shopId,
    'Başvuru Sonucu',
    'Dükkan başvurunuz bu sefer onaylanamadı. Detay için destek ekibiyle iletişime geçebilirsiniz.',
    { type: 'shop_rejected' },
  );
}

export async function suspendShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  const { error } = await supabase.from('shops').update({ status: 'suspended' }).eq('id', shopId);
  if (error) throw new Error('Durdurma başarısız: ' + error.message);
}

export async function reactivateShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  const { error } = await supabase.from('shops').update({ status: 'active' }).eq('id', shopId);
  if (error) throw new Error('Aktivasyon başarısız: ' + error.message);
}

export type ShopStatus = 'pending' | 'active' | 'rejected' | 'suspended';

export type Owner = { name: string; email: string | null; phone: string | null } | null;

export type Shop = {
  id: string;
  name: string | null;
  display_name: string;
  slug: string;
  status: ShopStatus;
  created_at: string;
  owner_user_id: string;
  address: string | null;
  phone: string | null;
  is_listed: boolean;
  owner: Owner;
};

export async function getShops(
  adminKey: string,
  page = 0,
  pageSize = 20,
  statusFilter?: ShopStatus,
) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();

  const statuses: ShopStatus[] = statusFilter
    ? [statusFilter]
    : ['pending', 'active', 'rejected', 'suspended'];

  const { data, count, error } = await supabase
    .from('shops')
    .select('id, name, display_name, slug, status, created_at, owner_user_id, address, phone, is_listed', { count: 'exact' })
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error('Shop listesi alınamadı: ' + error.message);

  const shops = data ?? [];
  const shopIds = shops.map(s => s.id);

  let ownerByShopId: Record<string, { name: string; email: string | null; phone: string | null }> = {};
  if (shopIds.length > 0) {
    const { data: staffRows } = await supabase
      .from('staff')
      .select('shop_id, name, email, phone')
      .in('shop_id', shopIds)
      .eq('role', 'admin');
    ownerByShopId = (staffRows ?? []).reduce<typeof ownerByShopId>((acc, s) => {
      if (!acc[s.shop_id]) acc[s.shop_id] = { name: s.name, email: s.email, phone: s.phone };
      return acc;
    }, {});
  }

  return {
    data: shops.map(s => ({ ...s, owner: ownerByShopId[s.id] ?? null })) as Shop[],
    total: count ?? 0,
    pageSize,
  };
}
