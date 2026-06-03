'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .auth {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
    -webkit-font-smoothing: antialiased;
  }

  .brand {
    background: #0B1220;
    color: #F9F9F6;
    padding: 48px;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }

  .brand-ghost {
    position: absolute;
    right: -6%;
    top: 50%;
    transform: translateY(-50%);
    font-family: 'Bebas Neue', sans-serif;
    font-size: 60vw;
    line-height: 1;
    color: rgba(255,255,255,.025);
    pointer-events: none;
    user-select: none;
    letter-spacing: -.02em;
  }

  .brand-logo {
    display: flex;
    align-items: center;
    gap: 11px;
    text-decoration: none;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .brand-wordmark {
    font-family: 'Montserrat', 'MontserratLocal', Helvetica, Arial, sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -.3px;
    color: #F9F9F6;
  }

  .brand-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    z-index: 1;
    padding: 48px 0;
  }

  .brand-over {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: #FF4D1C;
    margin-bottom: 16px;
  }

  .brand-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(52px, 5.5vw, 84px);
    line-height: .92;
    text-transform: uppercase;
    color: #F9F9F6;
    margin-bottom: 20px;
  }

  .brand-title .o { color: #FF4D1C; }

  .brand-sub {
    font-size: 15px;
    line-height: 1.72;
    color: rgba(249,249,246,.46);
    margin-bottom: 28px;
    max-width: 320px;
  }

  .brand-back {
    font-size: 13px;
    color: rgba(249,249,246,.4);
    text-decoration: none;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }

  .brand-back:hover { color: #F9F9F6; }

  .auth-panel {
    background: #F9F9F6;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
  }

  .form-wrap {
    width: 100%;
    max-width: 400px;
  }

  .form-head { margin-bottom: 32px; }

  .form-over {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: #FF4D1C;
    margin-bottom: 10px;
  }

  .form-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(36px, 4vw, 52px);
    line-height: .92;
    text-transform: uppercase;
    color: #0B1220;
    margin-bottom: 12px;
  }

  .form-title .o { color: #FF4D1C; }

  .form-lead {
    font-size: 14px;
    line-height: 1.65;
    color: rgba(11,18,32,.55);
  }

  .auth-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 18px;
  }

  .auth-field label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: rgba(11,18,32,.5);
  }

  .auth-field input {
    width: 100%;
    padding: 11px 14px;
    background: #fff;
    border: 1.5px solid #D6DBE5;
    font-family: inherit;
    font-size: 14px;
    color: #0B1220;
    outline: none;
    transition: border-color .15s;
  }

  .auth-field input:focus { border-color: #1E3A8A; }

  .slug-wrap {
    display: flex;
    align-items: center;
    border: 1.5px solid #D6DBE5;
    background: #fff;
    transition: border-color .15s;
  }

  .slug-wrap:focus-within { border-color: #1E3A8A; }

  .slug-prefix {
    padding: 11px 0 11px 14px;
    font-size: 13px;
    color: rgba(11,18,32,.4);
    white-space: nowrap;
    user-select: none;
  }

  .slug-wrap input {
    flex: 1;
    padding: 11px 14px 11px 4px;
    border: none;
    background: transparent;
    font-size: 14px;
    color: #0B1220;
    font-family: inherit;
    outline: none;
  }

  .field-hint {
    font-size: 11px;
    color: rgba(11,18,32,.4);
  }

  .btn-primary {
    width: 100%;
    padding: 13px 24px;
    background: #1E3A8A;
    color: #F9F9F6;
    border: none;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 18px;
    letter-spacing: .06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: background .15s;
    margin-top: 8px;
  }

  .btn-primary:hover:not(:disabled) { background: #162d6e; }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; }

  .form-error {
    font-size: 12px;
    color: #A0303F;
    background: #FAE8EB;
    padding: 10px 14px;
    margin-bottom: 14px;
  }

  @media (max-width: 768px) {
    .auth { grid-template-columns: 1fr; }
    .brand { display: none; }
    .auth-panel { padding: 32px 20px; min-height: 100vh; }
  }
`;

export default function TamamlaPage() {
  const router = useRouter();
  const [shopName, setShopName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  const slug = shopName
    .toLowerCase()
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/kayit');
        return;
      }
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .or(`owner_user_id.eq.${user.id},owner_id.eq.${user.id}`)
        .maybeSingle();
      if (shop) {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (shopName.trim().length < 2) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/register-shop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ shop_name: shopName.trim() }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Dükkan oluşturulamadı. Lütfen tekrar dene.');
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar dene.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="auth">
        <section className="brand">
          <div className="brand-ghost" aria-hidden="true">›</div>
          <Link href="/" className="brand-logo" aria-label="Sıradaki — Ana Sayfa">
            <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#FFFFFF" />
              <path d="M23 16 L41 32 L23 48" fill="none" stroke="#0B1220" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="46" cy="48" r="2.8" fill="#1E3A8A" />
            </svg>
            <span className="brand-wordmark">Sıradaki</span>
          </Link>
          <div className="brand-body">
            <p className="brand-over">Son bir adım</p>
            <h1 className="brand-title">DÜKKANINI<br /><span className="o">KUR.</span></h1>
            <p className="brand-sub">Google hesabın doğrulandı. Şimdi dükkan adını gir, her şey hazır.</p>
          </div>
          <Link href="/" className="brand-back">‹ Ana sayfaya dön</Link>
        </section>

        <section className="auth-panel">
          <div className="form-wrap">
            <div className="form-head">
              <p className="form-over">Kurulum</p>
              <h2 className="form-title">DÜKKAN<br /><span className="o">BİLGİLERİ</span></h2>
              <p className="form-lead">Google ile giriş başarılı. Dükkanını oluşturmak için adını gir.</p>
            </div>

            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="shop">Dükkan adı</label>
                <div className="slug-wrap">
                  <span className="slug-prefix">siradaki.app/</span>
                  <input
                    type="text"
                    id="shop"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    placeholder="berber-ahmet"
                    autoFocus
                    autoComplete="organization"
                  />
                </div>
                {slug && (
                  <span className="field-hint">Adresin: siradaki.app/{slug}</span>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={shopName.trim().length < 2 || loading}
              >
                {loading ? 'Oluşturuluyor…' : 'Dükkanı Oluştur →'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
