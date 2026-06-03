import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@berber/db';

interface CreateClientOptions {
  /**
   * "Beni hatırla = false" durumu için kullanılır.
   * true olduğunda auth cookie'leri Max-Age olmadan yazılır (session cookie),
   * tarayıcı kapınca temizlenir.
   *
   * Güvenlik notu: @supabase/ssr browser client'ı sunucu-tarafı HttpOnly cookie
   * yazmaz — tokenlar zaten JavaScript'ten erişilebilir. Bu seçenek yalnızca
   * oturum kalıcılığını kaldırır, ek bir XSS riski yaratmaz.
   */
  sessionOnly?: boolean;
}

export function createClient(options: CreateClientOptions = {}) {
  if (options.sessionOnly) {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        // Farklı cookie davranışı için singleton'dan çık
        isSingleton: false,
        cookies: {
          getAll() {
            if (typeof document === 'undefined') return [];
            return document.cookie
              .split(';')
              .map(c => c.trim())
              .filter(Boolean)
              .map(c => {
                const idx = c.indexOf('=');
                return {
                  name: decodeURIComponent(idx >= 0 ? c.slice(0, idx) : c),
                  value: decodeURIComponent(idx >= 0 ? c.slice(idx + 1) : ''),
                };
              })
              .filter(c => c.name);
          },
          setAll(cookies) {
            if (typeof document === 'undefined') return;
            cookies.forEach(({ name, value, options: o }) => {
              const parts = [
                `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
                'Path=/',
                'SameSite=Lax',
              ];
              // maxAge === 0 → cookie sil; aksi halde Max-Age yazma → session cookie
              if (o.maxAge === 0) parts.push('Max-Age=0');
              if (window.location.protocol === 'https:') parts.push('Secure');
              document.cookie = parts.join('; ');
            });
          },
        },
      },
    );
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
