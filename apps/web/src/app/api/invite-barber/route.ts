import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Creates an invite link for a barber to join the shop.
 * Proxies the existing Supabase Edge Function `accept-invite`.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { shop_id } = await request.json();
    if (!shop_id) {
      return NextResponse.json({ error: 'shop_id gerekli' }, { status: 400 });
    }

    // Verify the user owns this shop
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
      .eq('id', shop_id)
      .maybeSingle();

    if (!shop) {
      return NextResponse.json({ error: 'Dükkan bulunamadı veya yetkiniz yok' }, { status: 403 });
    }

    // Call the Supabase Edge Function to create the invite
    const { data, error } = await supabase.functions.invoke('accept-invite', {
      body: { shop_id },
    });

    if (error) {
      console.error('Invite error:', error);
      return NextResponse.json({ error: 'Davet oluşturulamadı' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu' }, { status: 500 });
  }
}