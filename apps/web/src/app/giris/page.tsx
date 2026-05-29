'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

const AUTH_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .auth {
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 100vh;
    font-family: 'Plus Jakarta Sans', var(--font-sans, sans-serif);
    -webkit-font-smoothing: antialiased;
  }

  /* ── BRAND ──────────────────────── */
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

  .brand-points {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .brand-points li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(249,249,246,.55);
  }

  .brand-points li::before {
    content: '';
    flex-shrink: 0;
    width: 14px; height: 14px;
    background: #FF4D1C;
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  .brand-back {
    font-size: 13px;
    font-weight: 600;
    color: rgba(249,249,246,.28);
    text-decoration: none;
    transition: color .15s;
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .brand-back:hover { color: rgba(249,249,246,.6); }

  /* ── PANEL ──────────────────────── */
  .auth-panel {
    background: #F9F9F6;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
    overflow-y: auto;
  }

  .form-wrap { width: 100%; max-width: 400px; }

  .form-head { margin-bottom: 36px; }

  .form-over {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: #FF4D1C;
    margin-bottom: 6px;
  }

  .form-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(40px, 4vw, 56px);
    line-height: .92;
    text-transform: uppercase;
    color: #0B1220;
    margin-bottom: 10px;
  }

  .form-title .o { color: #FF4D1C; }

  .form-lead {
    font-size: 14px;
    color: rgba(11,18,32,.5);
    line-height: 1.6;
  }

  /* ── FIELDS ─────────────────────── */
  .auth-field { margin-bottom: 18px; }

  .auth-field label {
    display: block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: rgba(11,18,32,.5);
    margin-bottom: 7px;
  }

  .auth-field > input {
    width: 100%;
    padding: 11px 14px;
    border: 1.5px solid #D6DBE5;
    background: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    color: #0B1220;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    -webkit-appearance: none;
  }

  .auth-field > input:focus {
    border-color: #1E3A8A;
    box-shadow: 0 0 0 3px rgba(30,58,138,.1);
  }

  .auth-field > input::placeholder { color: rgba(11,18,32,.25); }

  .pw-wrap {
    display: flex;
    align-items: stretch;
    border: 1.5px solid #D6DBE5;
    background: #fff;
    transition: border-color .15s, box-shadow .15s;
  }

  .pw-wrap:focus-within {
    border-color: #1E3A8A;
    box-shadow: 0 0 0 3px rgba(30,58,138,.1);
  }

  .pw-wrap input {
    flex: 1;
    min-width: 0;
    padding: 11px 14px;
    border: none;
    background: transparent;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 14px;
    color: #0B1220;
    outline: none;
  }

  .pw-wrap input::placeholder { color: rgba(11,18,32,.25); }

  .pw-toggle {
    padding: 0 14px;
    background: none;
    border: none;
    border-left: 1.5px solid #D6DBE5;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    color: rgba(11,18,32,.4);
    cursor: pointer;
    transition: color .15s;
    white-space: nowrap;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .pw-toggle:hover { color: #0B1220; }

  .row-between {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }

  .check-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 500;
    color: rgba(11,18,32,.6);
    cursor: pointer;
  }

  .check-label input[type='checkbox'] {
    width: 15px; height: 15px;
    accent-color: #1E3A8A;
  }

  .link-accent {
    font-size: 13px;
    font-weight: 600;
    color: #1E3A8A;
    text-decoration: none;
  }
  .link-accent:hover { text-decoration: underline; }

  /* ── ACTIONS ────────────────────── */
  .auth-btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 14px 24px;
    background: #FF4D1C;
    color: #fff;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 700;
    font-size: 14px;
    border: none;
    cursor: pointer;
    letter-spacing: .02em;
    transition: opacity .15s, transform .12s;
    margin-bottom: 16px;
  }

  .auth-btn-primary:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
  .auth-btn-primary:disabled { opacity: .45; cursor: not-allowed; transform: none; }

  .auth-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(11,18,32,.28);
    margin: 16px 0;
  }

  .auth-divider::before, .auth-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #D6DBE5;
  }

  .btn-google {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    width: 100%;
    padding: 12px 24px;
    background: #fff;
    border: 1.5px solid #D6DBE5;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600;
    font-size: 14px;
    color: #0B1220;
    text-decoration: none;
    cursor: pointer;
    transition: border-color .15s, background .15s;
  }

  .btn-google:hover { border-color: #0B1220; background: #f0f0ec; }

  .form-error {
    font-size: 12px;
    color: #A0303F;
    background: #FAE8EB;
    padding: 10px 14px;
    margin-bottom: 14px;
  }

  .auth-foot {
    margin-top: 24px;
    text-align: center;
    font-size: 14px;
    color: rgba(11,18,32,.5);
  }

  /* ── RESPONSIVE ─────────────────── */
  @media (max-width: 768px) {
    .auth { grid-template-columns: 1fr; }
    .brand { display: none; }
    .auth-panel { padding: 32px 20px; min-height: 100vh; }
  }
`;

function GirisForm() {
  const router   = useRouter();
  const params   = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const [email,    setEmail]    = useState('');
  const [pass,     setPass]     = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      if (error) { setError(error.message); return; }
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
      <style>{AUTH_CSS}</style>

      <div className="auth">

        {/* BRAND */}
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
            <p className="brand-over">Tekrar hoş geldin</p>
            <h1 className="brand-title">
              DÜKKAN<br />
              <span className="o">SENİ</span><br />
              BEKLİYOR.
            </h1>
            <p className="brand-sub">
              Randevuların, ekibin ve günün özeti — giriş yap, kaldığın yerden devam et.
            </p>
            <ul className="brand-points">
              <li>Günün randevuları tek ekranda</li>
              <li>Ekibinin takvimi seninle</li>
              <li>Kazanç özeti her sabah hazır</li>
            </ul>
          </div>

          <Link href="/" className="brand-back">‹ Ana sayfaya dön</Link>
        </section>

        {/* FORM PANEL */}
        <section className="auth-panel">
          <div className="form-wrap">

            <div className="form-head">
              <p className="form-over">Giriş Yap</p>
              <h2 className="form-title">HESABINA<br /><span className="o">GİRİŞ</span> YAP.</h2>
              <p className="form-lead">Bilgilerini gir, dükkanını yönetmeye devam et.</p>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="auth-field">
                <label htmlFor="email">E-posta</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ornek@dukkanim.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Şifre</label>
                <div className="pw-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? 'Gizle' : 'Göster'}
                  </button>
                </div>
              </div>

              <div className="row-between">
                <label className="check-label">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  Beni hatırla
                </label>
                <a href="#" className="link-accent">Şifremi unuttum</a>
              </div>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" className="auth-btn-primary" disabled={loading || !email || !pass}>
                {loading ? 'Giriş yapılıyor…' : 'Giriş Yap →'}
              </button>

              <div className="auth-divider">veya</div>

              <button type="button" className="btn-google" onClick={handleGoogle}>
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.63Z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.01-2.33Z" />
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
                </svg>
                Google ile giriş yap
              </button>

            </form>

            <p className="auth-foot">
              Hesabın yok mu?{' '}
              <Link href="/kayit" className="link-accent">Hemen oluştur</Link>
            </p>

          </div>
        </section>

      </div>
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
