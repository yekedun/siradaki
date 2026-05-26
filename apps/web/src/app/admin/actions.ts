'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function assertAdmin(adminKey: string) {
  if (adminKey !== process.env.ADMIN_SECRET_KEY) throw new Error('Yetkisiz');
}

export async function approveShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  await supabase.from('shops').update({ status: 'active' }).eq('id', shopId);

  const { data: shop } = await supabase
    .from('shops').select('owner_user_id').eq('id', shopId).single();
  if (shop?.owner_user_id) {
    const { data: token } = await supabase
      .from('push_tokens').select('token').eq('user_id', shop.owner_user_id).maybeSingle();
    if (token?.token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: token.token,
          title: 'Başvurunuz Onaylandı! 🎉',
          body: 'Dükkanınız aktif hale getirildi. Şimdi giriş yapabilirsiniz.',
        }),
      });
    }
  }
}

export async function rejectShop(shopId: string, adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  await supabase.from('shops').update({ status: 'rejected' }).eq('id', shopId);
}

export async function getPendingShops(adminKey: string) {
  assertAdmin(adminKey);
  const supabase = getAdminClient();
  const { data } = await supabase
    .from('shops')
    .select('id, name, slug, status, created_at, owner_user_id')
    .in('status', ['pending', 'active', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}
