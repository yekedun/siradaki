'use server';

import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// Platform erişimi yalnızca ADMIN_SECRET_KEY ile korunur.
// staff.role='admin' tüm dükkan sahipleri için geçerli olduğundan
// DB role kontrolü ek güvenlik sağlamaz — timing-safe key karşılaştırması yeterli.
function assertAdmin(adminKey: string) {
  const secret = process.env.ADMIN_SECRET_KEY ?? '';
  if (!secret) throw new Error('ADMIN_SECRET_KEY env var eksik');
  // Pad both buffers to the same length before comparing so an attacker
  // cannot infer secret length from which branch is taken.
  const maxLen = Math.max(adminKey.length, secret.length);
  const a = Buffer.alloc(maxLen);
  const b = Buffer.alloc(maxLen);
  Buffer.from(adminKey).copy(a);
  Buffer.from(secret).copy(b);
  if (!timingSafeEqual(a, b)) throw new Error('Yetkisiz');
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

  const { data: shop } = await supabase
    .from('shops')
    .select('owner_user_id')
    .eq('id', shopId)
    .single();

  if (shop?.owner_user_id) {
    const { data: ownerStaff } = await supabase
      .from('staff')
      .select('push_token')
      .eq('shop_id', shopId)
      .eq('user_id', shop.owner_user_id)
      .maybeSingle();

    if (ownerStaff?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: ownerStaff.push_token,
          title: 'Başvurunuz Onaylandı! 🎉',
          body: 'Dükkanınız aktif hale getirildi. Şimdi giriş yapabilirsiniz.',
        }),
      }).catch((e) => console.error('[admin] Push notification failed:', e));
    }
  }
}

export async function rejectShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  const { error } = await supabase.from('shops').update({ status: 'rejected' }).eq('id', shopId);
  if (error) throw new Error('Red başarısız: ' + error.message);
}

// "getShops" çünkü pending + active + rejected tüm durumlar döner
export async function getShops(adminKey: string, page = 0, pageSize = 20) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  const { data, count, error } = await supabase
    .from('shops')
    .select('id, name, slug, status, created_at, owner_user_id', { count: 'exact' })
    .in('status', ['pending', 'active', 'rejected'])
    .order('created_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) throw new Error('Shop listesi alınamadı: ' + error.message);

  const shops = data ?? [];
  const shopIds = shops.map(s => s.id);

  let ownerByShopId: Record<string, { name: string; email: string | null }> = {};
  if (shopIds.length > 0) {
    const { data: staffRows } = await supabase
      .from('staff')
      .select('shop_id, name, email')
      .in('shop_id', shopIds)
      .eq('role', 'admin');
    ownerByShopId = Object.fromEntries(
      (staffRows ?? []).map(s => [s.shop_id, { name: s.name, email: s.email }])
    );
  }

  return {
    data: shops.map(s => ({ ...s, owner: ownerByShopId[s.id] ?? null })),
    total: count ?? 0,
    pageSize,
  };
}
