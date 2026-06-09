import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code         = searchParams.get('code');
  const rawRedirect  = searchParams.get('redirect') ?? '/dashboard';
  // Guard against open-redirect: must be a relative path, no protocol-relative (//) or credential (@)
  const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('@')
    ? rawRedirect
    : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('[auth/callback] exchangeCodeForSession başarısız:', sessionError.message);
      // Geçersiz veya süresi dolmuş code → tekrar giriş sayfasına yönlendir
      const url = new URL(`${origin}/giris`);
      url.searchParams.set('error', 'link_expired');
      return NextResponse.redirect(url.toString());
    }

    if (user) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();

      if (!shop) {
        return NextResponse.redirect(`${origin}/kayit/tamamla`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`);
}
