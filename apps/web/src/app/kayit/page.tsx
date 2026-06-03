'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { slugify, DEFAULT_WORKING_HOURS } from '@berber/shared';

const KAYIT_CSS = `
  .kayit-v2 {
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
  .kayit-v2 * { box-sizing: border-box; }

  /* ── SOL PANEL ── */
  .kayit-side {
    background: var(--spruce);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    overflow: hidden;
    padding: 52px;
    position: relative;
  }
  .kayit-side-ghost {
    bottom: -84px;
    color: rgba(255,255,255,.06);
    font-family: var(--serif);
    font-size: 360px;
    line-height: .8;
    position: absolute;
    right: -42px;
  }
  .kayit-logo {
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
  .kayit-logo-mark {
    align-items: center;
    background: rgba(255,255,255,.15);
    border-radius: 12px;
    display: flex;
    height: 40px;
    justify-content: center;
    width: 40px;
  }
  .kayit-logo-mark::before {
    border-bottom: 7px solid transparent;
    border-left: 9px solid #fff;
    border-top: 7px solid transparent;
    content: '';
    margin-left: 3px;
  }
  .kayit-copy {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    max-width: 340px;
    padding-bottom: 32px;
    position: relative;
    z-index: 1;
  }
  .kayit-overline {
    color: rgba(255,255,255,.5);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .22em;
    margin: 0 0 14px;
    text-transform: uppercase;
  }
  .kayit-copy h1 {
    font-family: var(--serif);
    font-size: 42px;
    font-weight: 500;
    letter-spacing: -.02em;
    line-height: 1.05;
    margin: 0 0 14px;
  }
  .kayit-copy h1 em { color: #9FD9BE; font-style: italic; }
  .kayit-copy p {
    color: rgba(255,255,255,.65);
    font-size: 14px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .kayit-points {
    display: flex;
    flex-direction: column;
    gap: 9px;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .kayit-points li {
    align-items: center;
    color: rgba(255,255,255,.7);
    display: flex;
    font-size: 13px;
    font-weight: 500;
    gap: 10px;
  }
  .kayit-points li::before {
    background: rgba(159,217,190,.3);
    border-radius: 999px;
    color: #9FD9BE;
    content: '✓';
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    height: 18px;
    width: 18px;
  }

  /* ── SAĞ PANEL ── */
  .kayit-panel {
    align-items: flex-start;
    display: flex;
    justify-content: center;
    overflow-y: auto;
    padding: 52px 64px;
  }
  .kayit-form-wrap { max-width: 420px; width: 100%; }
  .kayit-panel-overline {
    color: var(--ink-3);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .18em;
    margin: 0 0 14px;
    text-transform: uppercase;
  }
  .kayit-panel h2 {
    font-family: var(--serif);
    font-size: 30px;
    font-weight: 500;
    letter-spacing: -.01em;
    line-height: 1.1;
    margin: 0 0 28px;
  }

  /* ── ALANLAR ── */
  .kayit-field { margin-bottom: 16px; }
  .kayit-field label {
    color: var(--ink-3);
    display: block;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .16em;
    margin-bottom: 8px;
    text-transform: uppercase;
  }
  .kayit-input {
    align-items: center;
    background: var(--card);
    border: 1.5px solid var(--line-2);
    border-radius: 12px;
    display: flex;
    gap: 0;
    min-height: 44px;
    overflow: hidden;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .kayit-input:focus-within {
    border-color: var(--spruce-2);
    box-shadow: 0 0 0 3px rgba(24,74,58,.08);
  }
  .kayit-input.err { border-color: var(--brick); }
  .kayit-input input {
    background: transparent;
    border: 0;
    color: var(--ink);
    flex: 1;
    font-family: var(--grot);
    font-size: 14px;
    font-weight: 500;
    height: 42px;
    min-width: 0;
    outline: none;
    padding: 0 14px;
  }
  .kayit-input input::placeholder { color: var(--ink-3); font-weight: 400; }
  .kayit-slug-prefix {
    background: rgba(232,226,213,.5);
    border-right: 1px solid var(--line-2);
    color: var(--ink-3);
    font-family: var(--grot);
    font-size: 13px;
    padding: 0 10px;
    white-space: nowrap;
    align-self: stretch;
    display: flex;
    align-items: center;
  }
  .kayit-pw-toggle {
    background: transparent;
    border: 0;
    border-left: 1px solid var(--line-2);
    color: var(--ink-3);
    cursor: pointer;
    font-family: var(--grot);
    font-size: 11px;
    font-weight: 700;
    height: 42px;
    letter-spacing: .06em;
    padding: 0 14px;
    text-transform: uppercase;
    transition: color .13s;
    white-space: nowrap;
  }
  .kayit-pw-toggle:hover { color: var(--ink); }
  .kayit-slug-hint {
    color: var(--ink-3);
    font-size: 11px;
    margin-top: 6px;
  }
  .kayit-slug-hint b { color: var(--spruce); font-weight: 700; }
  .kayit-field-error { color: var(--brick); font-size: 11.5px; margin-top: 5px; }

  /* password strength */
  .kayit-strength { align-items: center; display: flex; gap: 8px; margin-top: 7px; }
  .kayit-bars { display: flex; flex: 1; gap: 3px; }
  .kayit-bar { background: var(--line); border-radius: 999px; flex: 1; height: 3px; transition: background .2s; }
  .kayit-bar.weak { background: #DC2626; }
  .kayit-bar.medium { background: #D97706; }
  .kayit-bar.strong { background: #16A34A; }
  .kayit-strength-label { font-size: 11px; font-weight: 700; }
  .kayit-strength-label.weak { color: #DC2626; }
  .kayit-strength-label.medium { color: #D97706; }
  .kayit-strength-label.strong { color: #16A34A; }

  /* ── BUTONLAR ── */
  .kayit-error {
    background: var(--brick-soft);
    border: 1px solid #E4C9C3;
    border-radius: 12px;
    color: var(--brick);
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 14px;
    padding: 10px 12px;
  }
  .kayit-primary {
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
    margin-bottom: 14px;
    width: 100%;
  }
  .kayit-primary:disabled { background: var(--line-2); box-shadow: none; color: var(--ink-3); cursor: not-allowed; }
  .kayit-terms {
    color: var(--ink-3);
    font-size: 12px;
    line-height: 1.6;
    margin-bottom: 16px;
    text-align: center;
  }
  .kayit-terms a { color: var(--spruce); font-weight: 600; text-decoration: none; }
  .kayit-divider {
    align-items: center;
    color: var(--ink-3);
    display: flex;
    font-size: 12px;
    gap: 10px;
    margin: 0 0 16px;
  }
  .kayit-divider::before, .kayit-divider::after { background: var(--line-2); content: ''; flex: 1; height: 1px; }
  .kayit-google {
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
  .kayit-google:hover { border-color: var(--line); background: var(--paper); }
  .kayit-google-mark {
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
  .kayit-foot { color: var(--ink-3); font-size: 13px; margin-top: 20px; text-align: center; }
  .kayit-foot a { color: var(--spruce); font-weight: 700; text-decoration: none; }

  @media (max-width: 820px) {
    .kayit-v2 { display: block; }
    .kayit-side { display: none; }
    .kayit-panel { min-height: 100vh; padding: 34px 20px; }
    .kayit-panel h2 { font-size: 26px; }
  }
`;

export default function KayitPage() {
  const router = useRouter();

  const [shopName,  setShopName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [pass,      setPass]      = useState('');
  const [passConf,  setPassConf]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  const slug      = slugify(shopName);
  const passErr   = pass.length > 0 && pass.length < 8 ? 'En az 8 karakter gerekli' : null;
  const confErr   = passConf && pass !== passConf ? 'Şifreler eşleşmiyor' : null;
  const emailErr  = email && !email.includes('@') ? 'Geçerli bir e-posta gir' : null;
  const canSubmit = shopName.trim().length >= 2 && email.includes('@') && pass.length >= 8 && pass === passConf;

  const passScore  = pass.length >= 12 ? 3 : pass.length >= 8 ? 2 : pass.length > 0 ? 1 : 0;
  const scoreLabel = ['', 'Zayıf', 'Orta', 'Güçlü'][passScore];
  const scoreKey   = ['', 'weak', 'medium', 'strong'][passScore];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const trimmed  = shopName.trim();

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: { data: { shop_name: trimmed } },
      });
      if (signUpErr || !authData.user) {
        setError(signUpErr?.message ?? 'Kayıt başarısız.');
        return;
      }

      const { error: shopErr } = await supabase.from('shops').insert({
        owner_user_id: authData.user.id,
        name:          trimmed,
        display_name:  trimmed,
        slug,
        working_hours: DEFAULT_WORKING_HOURS as unknown as import('@berber/db').Json,
      });
      if (shopErr) {
        if (shopErr.code === '23505') {
          setError('Bu dükkan adı zaten alınmış. Farklı bir isim dene.');
        } else {
          setError('Dükkan oluşturulamadı: ' + shopErr.message);
        }
        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback?redirect=/dashboard` },
    });
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: KAYIT_CSS }} />

      <div className="kayit-v2">

        {/* SOL PANEL */}
        <section className="kayit-side">
          <div className="kayit-side-ghost" aria-hidden="true">›</div>

          <Link href="/" className="kayit-logo" aria-label="Sıradaki ana sayfa">
            <span className="kayit-logo-mark" />
            <span>Sıra<strong>daki</strong></span>
          </Link>

          <div className="kayit-copy">
            <p className="kayit-overline">Berber · Kayıt</p>
            <h1>Dükkanı <em>aç,</em><br />sıra <em>sende.</em></h1>
            <p>Hesabını aç, ekibini ekle, müşterilerine randevu linkini paylaş. Ödeme bilgisi istemiyoruz.</p>
            <ul className="kayit-points">
              <li>Sınırsız randevu ve personel</li>
              <li>Müşterilere özel randevu linki</li>
              <li>Kazanç ve komisyon takibi</li>
            </ul>
          </div>
        </section>

        {/* SAĞ PANEL */}
        <section className="kayit-panel">
          <div className="kayit-form-wrap">
            <p className="kayit-panel-overline">Dükkan Paneli</p>
            <h2>Hesap Oluştur</h2>

            <form onSubmit={handleSubmit}>

              {/* Dükkan Adı */}
              <div className="kayit-field">
                <label htmlFor="shop">Dükkan adı</label>
                <div className="kayit-input">
                  <span className="kayit-slug-prefix">siradaki.app/</span>
                  <input
                    type="text"
                    id="shop"
                    value={shopName}
                    onChange={e => setShopName(e.target.value)}
                    placeholder="Dükkan adı"
                    autoComplete="organization"
                    required
                  />
                </div>
                <p className="kayit-slug-hint">
                  Müşterilerin randevu için bu adresi görecek:{' '}
                  <b>siradaki.app/{slug || 'dukkan-adin'}</b>
                </p>
              </div>

              {/* E-posta */}
              <div className="kayit-field">
                <label htmlFor="email">E-posta</label>
                <div className={`kayit-input${emailErr ? ' err' : ''}`}>
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
                {emailErr && <p className="kayit-field-error">{emailErr}</p>}
              </div>

              {/* Şifre */}
              <div className="kayit-field">
                <label htmlFor="password">Şifre</label>
                <div className={`kayit-input${passErr ? ' err' : ''}`}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    id="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="En az 8 karakter"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="kayit-pw-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                {pass && (
                  <div className="kayit-strength">
                    <div className="kayit-bars">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`kayit-bar ${i <= passScore ? scoreKey : ''}`} />
                      ))}
                    </div>
                    <span className={`kayit-strength-label ${scoreKey}`}>{scoreLabel}</span>
                  </div>
                )}
                {passErr && <p className="kayit-field-error">{passErr}</p>}
              </div>

              {/* Şifre Tekrar */}
              <div className="kayit-field">
                <label htmlFor="password2">Şifre tekrar</label>
                <div className={`kayit-input${confErr ? ' err' : ''}`}>
                  <input
                    type={showPass2 ? 'text' : 'password'}
                    id="password2"
                    value={passConf}
                    onChange={e => setPassConf(e.target.value)}
                    placeholder="Şifreni tekrar yaz"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="kayit-pw-toggle" onClick={() => setShowPass2(v => !v)}>
                    {showPass2 ? 'Gizle' : 'Göster'}
                  </button>
                </div>
                {confErr && <p className="kayit-field-error">{confErr}</p>}
              </div>

              {error && <p className="kayit-error">{error}</p>}

              <button type="submit" className="kayit-primary" disabled={!canSubmit || loading}>
                {loading ? 'Hesap oluşturuluyor…' : 'Hesabımı Oluştur →'}
              </button>

              <p className="kayit-terms">
                Hesap oluşturarak{' '}
                <Link href="/kullanim-kosullari">Kullanım Koşulları</Link>
                &apos;nı ve{' '}
                <Link href="/gizlilik-politikasi">Gizlilik Politikası</Link>
                &apos;nı kabul etmiş olursun.
              </p>

              <div className="kayit-divider"><span>veya</span></div>

              <button type="button" className="kayit-google" onClick={handleGoogle}>
                <span className="kayit-google-mark">G</span>
                Google ile kayıt ol
              </button>

            </form>

            <p className="kayit-foot">
              Zaten hesabın var mı? <Link href="/giris">Giriş yap</Link>
            </p>
          </div>
        </section>

      </div>
    </>
  );
}
