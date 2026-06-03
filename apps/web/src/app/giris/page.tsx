'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/browser';

const AUTH_CSS = `
  .auth-v2 {
    --paper: #FBF8F1;
    --card: #FFFFFF;
    --ink: #1B1813;
    --ink-2: #5A534A;
    --ink-3: #938A7C;
    --line: #E5DECF;
    --line-2: #D8CFBC;
    --spruce: #184A3A;
    --spruce-2: #23624D;
    --spruce-soft: #E4ECE7;
    --ember: #2D6AE0;
    --ember-soft: #E4ECFB;
    --brick: #A23A2E;
    --brick-soft: #F3E2DF;
    --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
    --grot: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
    min-height: 100vh;
    background: var(--paper);
    color: var(--ink);
    display: grid;
    grid-template-columns: 520px minmax(0, 1fr);
    font-family: var(--grot);
    -webkit-font-smoothing: antialiased;
  }
  .auth-v2 * { box-sizing: border-box; }
  .auth-side {
    background: var(--spruce);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;
    padding: 52px;
    position: relative;
  }
  .auth-side-ghost {
    bottom: -84px;
    color: rgba(255,255,255,.06);
    font-family: var(--serif);
    font-size: 360px;
    line-height: .8;
    position: absolute;
    right: -42px;
  }
  .auth-logo {
    align-items: center;
    color: #fff;
    display: inline-flex;
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 500;
    gap: 11px;
    position: relative;
    text-decoration: none;
    z-index: 1;
  }
  .auth-logo-mark {
    align-items: center;
    background: rgba(255,255,255,.15);
    border-radius: 12px;
    display: flex;
    height: 40px;
    justify-content: center;
    width: 40px;
  }
  .auth-logo-mark::before {
    border-bottom: 7px solid transparent;
    border-left: 9px solid #fff;
    border-top: 7px solid transparent;
    content: '';
    margin-left: 3px;
  }
  .auth-copy { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; max-width: 330px; padding-bottom: 48px; position: relative; z-index: 1; }
  .auth-overline {
    color: rgba(255,255,255,.5);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .22em;
    margin: 0 0 14px;
    text-transform: uppercase;
  }
  .auth-copy h1 {
    font-family: var(--serif);
    font-size: 46px;
    font-weight: 500;
    letter-spacing: -.02em;
    line-height: 1.02;
    margin: 0 0 14px;
  }
  .auth-copy h1 em { color: #9FD9BE; font-style: italic; }
  .auth-copy p {
    color: rgba(255,255,255,.7);
    font-size: 15px;
    line-height: 1.55;
    margin: 0;
  }
  .auth-panel {
    align-items: center;
    display: flex;
    justify-content: center;
    padding: 52px 64px;
  }
  .auth-form-wrap { max-width: 792px; width: 100%; }
  .auth-panel-overline {
    color: var(--ink-3);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .18em;
    margin: 0 0 14px;
    text-transform: uppercase;
  }
  .auth-panel h2 {
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 500;
    letter-spacing: -.01em;
    line-height: 1.1;
    margin: 0 0 26px;
  }
  .auth-field { margin-bottom: 15px; }
  .auth-field label {
    color: var(--ink-3);
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .16em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .auth-input {
    align-items: center;
    background: var(--card);
    border: 1.5px solid var(--line-2);
    border-radius: 12px;
    display: flex;
    gap: 10px;
    min-height: 42px;
    padding: 0 13px;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .auth-input:focus-within {
    border-color: var(--spruce-2);
    box-shadow: 0 0 0 3px rgba(24,74,58,.08);
  }
  .auth-input svg { color: var(--ink-3); flex: 0 0 auto; height: 16px; width: 16px; }
  .auth-input input {
    background: transparent;
    border: 0;
    color: var(--ink);
    flex: 1;
    font-family: var(--grot);
    font-size: 14px;
    font-weight: 500;
    height: 40px;
    min-width: 0;
    outline: none;
  }
  .auth-input input::placeholder { color: var(--ink-3); font-weight: 400; }
  .auth-link {
    color: var(--spruce);
    font-size: 12.5px;
    font-weight: 700;
    text-decoration: none;
  }
  .auth-error {
    background: var(--brick-soft);
    border: 1px solid #E4C9C3;
    border-radius: 12px;
    color: var(--brick);
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 14px;
    padding: 10px 12px;
  }
  .auth-primary {
    align-items: center;
    background: var(--spruce);
    border: 0;
    border-radius: 12px;
    box-shadow: 0 10px 22px -12px rgba(24,74,58,.75);
    color: #fff;
    cursor: pointer;
    display: flex;
    font-family: var(--grot);
    font-size: 14.5px;
    font-weight: 800;
    gap: 9px;
    height: 46px;
    justify-content: center;
    width: 100%;
  }
  .auth-primary:disabled { background: var(--line-2); box-shadow: none; color: var(--ink-3); cursor: not-allowed; }
  .auth-divider {
    align-items: center;
    color: var(--ink-3);
    display: flex;
    font-size: 12px;
    gap: 10px;
    margin: 16px 0;
  }
  .auth-divider::before, .auth-divider::after { background: var(--line-2); content: ''; flex: 1; height: 1px; }
  .auth-google {
    align-items: center;
    background: var(--card);
    border: 1.5px solid var(--line-2);
    border-radius: 12px;
    color: var(--ink);
    cursor: pointer;
    display: flex;
    font-family: var(--grot);
    font-size: 14px;
    font-weight: 700;
    gap: 10px;
    height: 46px;
    justify-content: center;
    width: 100%;
  }
  .auth-google-mark {
    align-items: center;
    background: var(--ember-soft);
    border-radius: 999px;
    color: var(--ember);
    display: flex;
    font-family: var(--serif);
    font-size: 12px;
    font-weight: 800;
    height: 20px;
    justify-content: center;
    width: 20px;
  }
  .auth-foot { color: var(--ink-3); font-size: 13px; margin-top: 16px; text-align: center; }
  @media (max-width: 820px) {
    .auth-v2 { display: block; }
    .auth-side { display: none; }
    .auth-panel { min-height: 100vh; padding: 34px 20px; }
    .auth-panel h2 { font-size: 28px; }
  }
`;

function GirisForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) {
        setError(error.message);
        return;
      }
      router.push(redirect);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?redirect=${redirect}` },
    });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />
      <main className="auth-v2">
        <section className="auth-side">
          <div className="auth-side-ghost" aria-hidden="true">›</div>
          <Link href="/" className="auth-logo" aria-label="Sıradaki ana sayfa">
            <span className="auth-logo-mark" />
            <span>Sıra<strong>daki</strong></span>
          </Link>

          <div className="auth-copy">
            <p className="auth-overline">Berber · Panel Girişi</p>
            <h1>Sıra <em>sende.</em></h1>
            <p>Randevu takvimine, ekibine ve kazancına tek ekrandan ulaş.</p>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-form-wrap">
            <p className="auth-panel-overline">Dükkan Paneli</p>
            <h2>Giriş Yap</h2>

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="email">E-posta</label>
                <div className="auth-input">
                  <Mail aria-hidden="true" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="berber@dukkan.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="password">Şifre</label>
                <div className="auth-input">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    type="password"
                    id="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && <p className="auth-error">{error}</p>}

              <button type="submit" className="auth-primary" disabled={loading || !email || !pass}>
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
                {!loading && <ArrowRight size={16} aria-hidden="true" />}
              </button>

              <div className="auth-divider"><span>veya</span></div>

              <button type="button" className="auth-google" onClick={handleGoogle}>
                <span className="auth-google-mark">G</span>
                Google ile Giriş Yap
              </button>
            </form>

            <p className="auth-foot">
              Hesabın yok mu? <Link href="/kayit" className="auth-link">Kayıt ol</Link>
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

export default function GirisPage() {
  return (
    <Suspense>
      <GirisForm />
    </Suspense>
  );
}
