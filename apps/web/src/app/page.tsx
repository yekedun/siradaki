import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sıradaki — Berber Randevu & Ekip Yönetimi',
  description: 'Berber dükkanın için randevu defteri, ekip takvimi ve online randevu — hepsi tek uygulamada.',
};

const LP_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }

  .lp {
    --lp-black:   #0A0A0A;
    --lp-ink:     #0B1220;
    --lp-white:   #F9F9F6;
    --lp-accent:  #FF4D1C;
    --lp-navy:    #1E3A8A;
    --lp-dim:     rgba(249,249,246,0.46);
    --lp-display: 'Bebas Neue', sans-serif;
    --lp-body:    'Plus Jakarta Sans', var(--font-sans, sans-serif);
    --lp-mark:    'Montserrat', 'MontserratLocal', Helvetica, Arial, sans-serif;
    font-family: var(--lp-body);
    background: var(--lp-black);
    color: var(--lp-white);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .lp-wrap {
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 56px;
  }

  /* ── NAV ─────────────────────────────────── */
  .lp-nav {
    position: fixed;
    inset: 0 0 auto 0;
    z-index: 100;
    transition: background .3s, border-color .3s;
    border-bottom: 1px solid transparent;
  }

  .lp-nav.scrolled {
    background: rgba(10,10,10,.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom-color: rgba(255,255,255,.07);
  }

  .lp-nav-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
    padding: 0 56px;
  }

  .lp-logo {
    display: flex;
    align-items: center;
    gap: 11px;
    text-decoration: none;
    flex-shrink: 0;
  }

  .lp-wordmark {
    font-family: var(--lp-mark);
    font-weight: 700;
    font-size: 20px;
    letter-spacing: -.3px;
    color: var(--lp-white);
  }

  .lp-nav-actions {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .lp-nav-link {
    font-family: var(--lp-body);
    font-weight: 600;
    font-size: 14px;
    color: rgba(249,249,246,.62);
    text-decoration: none;
    transition: color .15s;
  }
  .lp-nav-link:hover { color: var(--lp-white); }

  .lp-nav-cta {
    font-family: var(--lp-body);
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .04em;
    color: #fff;
    background: var(--lp-accent);
    padding: 11px 24px;
    text-decoration: none;
    white-space: nowrap;
    transition: opacity .15s;
  }
  .lp-nav-cta:hover { opacity: .84; }

  /* ── HERO ────────────────────────────────── */
  .lp-hero {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 130px 56px 80px;
    position: relative;
    overflow: hidden;
  }

  .lp-hero-ghost {
    position: absolute;
    right: -2vw;
    top: 50%;
    transform: translateY(-50%);
    font-family: var(--lp-display);
    font-size: 52vw;
    line-height: 1;
    color: rgba(255,255,255,.022);
    pointer-events: none;
    user-select: none;
    letter-spacing: -.02em;
  }

  .lp-hero-overline {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--lp-accent);
    margin-bottom: 28px;
    animation: lpFadeUp .55s ease both .1s;
  }

  .lp-hero-h1 {
    font-family: var(--lp-display);
    font-size: clamp(80px, 12vw, 184px);
    line-height: .88;
    letter-spacing: .01em;
    text-transform: uppercase;
    margin-bottom: 48px;
    animation: lpFadeUp .65s ease both .2s;
  }

  .lp-hero-h1 .o { color: var(--lp-accent); }

  .lp-hero-divider {
    width: 48px;
    height: 2px;
    background: var(--lp-accent);
    margin-bottom: 28px;
    animation: lpFadeUp .5s ease both .32s;
  }

  .lp-hero-sub {
    max-width: 460px;
    font-size: 17px;
    line-height: 1.72;
    color: var(--lp-dim);
    margin-bottom: 44px;
    animation: lpFadeUp .55s ease both .38s;
  }

  .lp-hero-actions {
    display: flex;
    align-items: center;
    gap: 28px;
    flex-wrap: wrap;
    animation: lpFadeUp .55s ease both .46s;
  }

  .lp-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    background: var(--lp-accent);
    color: #fff;
    font-family: var(--lp-body);
    font-weight: 700;
    font-size: 15px;
    padding: 16px 36px;
    text-decoration: none;
    transition: box-shadow .2s, transform .18s ease;
  }
  .lp-btn-primary .arr { transition: transform .2s ease; display: inline-block; }
  .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -8px rgba(255,77,28,.55); }
  .lp-btn-primary:hover .arr { transform: translateX(4px); }

  .lp-btn-ghost {
    font-size: 14px;
    font-weight: 600;
    color: rgba(249,249,246,.5);
    text-decoration: none;
    border-bottom: 1px solid rgba(249,249,246,.2);
    padding-bottom: 2px;
    transition: color .15s, border-color .15s;
  }
  .lp-btn-ghost:hover { color: var(--lp-white); border-color: var(--lp-white); }

  .lp-hero-stats {
    display: flex;
    margin-top: 80px;
    padding-top: 40px;
    border-top: 1px solid rgba(255,255,255,.1);
    animation: lpFadeUp .55s ease both .54s;
  }

  .lp-hero-stat {
    flex: 1;
    padding-right: 40px;
    border-right: 1px solid rgba(255,255,255,.08);
    margin-right: 40px;
  }
  .lp-hero-stat:last-child { border-right: none; margin-right: 0; padding-right: 0; }

  .lp-stat-num {
    font-family: var(--lp-display);
    font-size: 50px;
    line-height: 1;
    letter-spacing: .02em;
    color: var(--lp-white);
  }

  .lp-stat-lbl {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: rgba(255,255,255,.28);
    margin-top: 8px;
  }

  /* ── SECTION SHARED ──────────────────────── */
  .lp-s-over {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .22em;
    text-transform: uppercase;
    color: var(--lp-accent);
    margin-bottom: 12px;
  }

  .lp-s-title {
    font-family: var(--lp-display);
    font-size: clamp(48px, 6vw, 88px);
    line-height: .92;
    text-transform: uppercase;
    margin-bottom: 64px;
  }

  /* ── FEATURES ────────────────────────────── */
  .lp-features {
    background: var(--lp-white);
    color: var(--lp-black);
    padding: 120px 0;
  }

  .lp-feat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: #D8D8D4;
    border: 1px solid #D8D8D4;
  }

  .lp-feat-card {
    background: var(--lp-white);
    padding: 52px;
    position: relative;
    overflow: hidden;
    transition: background .2s;
  }
  .lp-feat-card:hover { background: #F0F0EC; }

  .lp-feat-n {
    font-family: var(--lp-display);
    font-size: 88px;
    line-height: 1;
    color: #E6E6E2;
    margin-bottom: 8px;
    transition: color .25s;
    display: block;
  }
  .lp-feat-card:hover .lp-feat-n { color: var(--lp-accent); }

  .lp-feat-rule {
    width: 32px;
    height: 2px;
    background: var(--lp-black);
    margin-bottom: 20px;
    transition: background .25s;
  }
  .lp-feat-card:hover .lp-feat-rule { background: var(--lp-accent); }

  .lp-feat-title {
    font-family: var(--lp-display);
    font-size: 36px;
    line-height: 1;
    text-transform: uppercase;
    color: var(--lp-black);
    margin-bottom: 14px;
  }

  .lp-feat-desc {
    font-size: 15px;
    line-height: 1.78;
    color: #6E6E72;
    max-width: 340px;
  }

  /* ── HOW IT WORKS ────────────────────────── */
  .lp-hiw {
    background: var(--lp-black);
    padding: 120px 0;
  }

  .lp-hiw .lp-s-title { color: var(--lp-white); }

  .lp-hiw-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid rgba(255,255,255,.08);
  }

  .lp-step {
    padding: 52px 44px;
    border-right: 1px solid rgba(255,255,255,.08);
    position: relative;
    overflow: hidden;
  }
  .lp-step:last-child { border-right: none; }

  .lp-step::after {
    content: attr(data-n);
    position: absolute;
    top: 10px; right: 14px;
    font-family: var(--lp-display);
    font-size: 120px;
    line-height: 1;
    color: rgba(255,255,255,.04);
    pointer-events: none;
  }

  .lp-step-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px; height: 34px;
    border: 1.5px solid var(--lp-accent);
    font-family: var(--lp-display);
    font-size: 19px;
    color: var(--lp-accent);
    margin-bottom: 32px;
  }

  .lp-step-title {
    font-family: var(--lp-display);
    font-size: 34px;
    text-transform: uppercase;
    color: var(--lp-white);
    margin-bottom: 14px;
  }

  .lp-step-desc {
    font-size: 14px;
    line-height: 1.82;
    color: rgba(249,249,246,.36);
  }

  /* ── PRICING ─────────────────────────────── */
  .lp-pricing {
    background: var(--lp-white);
    color: var(--lp-black);
    padding: 120px 0;
    position: relative;
    overflow: hidden;
  }

  .lp-pricing-ghost {
    position: absolute;
    right: -1%;
    bottom: -12%;
    font-family: var(--lp-display);
    font-size: clamp(180px, 26vw, 380px);
    line-height: 1;
    color: rgba(10,10,10,.046);
    pointer-events: none;
    user-select: none;
  }

  .lp-pricing-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: start;
    position: relative;
    z-index: 1;
  }

  .lp-pricing-tag {
    display: inline-block;
    background: var(--lp-accent);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .18em;
    text-transform: uppercase;
    padding: 5px 12px;
    margin-bottom: 32px;
  }

  .lp-pricing-big {
    font-family: var(--lp-display);
    font-size: clamp(84px, 12vw, 184px);
    line-height: .88;
    text-transform: uppercase;
    color: var(--lp-black);
  }
  .lp-pricing-big .o { color: var(--lp-accent); display: block; }

  .lp-pricing-right { padding-top: 16px; }

  .lp-pricing-right > p {
    font-size: 17px;
    line-height: 1.72;
    color: #6E6E72;
    margin-bottom: 40px;
    max-width: 400px;
  }

  .lp-check-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 48px;
  }

  .lp-check-list li {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 15px;
    font-weight: 600;
    color: var(--lp-black);
  }

  .lp-check-list li::before {
    content: '';
    flex-shrink: 0;
    width: 18px; height: 18px;
    background: var(--lp-accent);
    clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  }

  /* ── FAQ ─────────────────────────────────── */
  .lp-faq {
    background: #EDEDEA;
    color: var(--lp-black);
    padding: 120px 0;
  }

  .lp-faq-layout {
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: 80px;
    align-items: start;
  }

  .lp-faq-sticky {
    position: sticky;
    top: 96px;
  }

  .lp-faq-sticky .lp-s-title { color: var(--lp-black); margin-bottom: 0; }

  .lp-faq-list { display: flex; flex-direction: column; }

  .lp-faq-item { border-top: 1px solid rgba(10,10,10,.14); }
  .lp-faq-item:last-child { border-bottom: 1px solid rgba(10,10,10,.14); }

  .lp-faq-q {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 26px 0;
    cursor: pointer;
    font-size: 16px;
    font-weight: 600;
    color: var(--lp-black);
    user-select: none;
  }

  .lp-faq-toggle {
    flex-shrink: 0;
    width: 28px; height: 28px;
    background: var(--lp-black);
    color: var(--lp-white);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 300;
    line-height: 1;
    transition: background .2s, transform .25s;
  }

  .lp-faq-item.open .lp-faq-toggle { background: var(--lp-accent); transform: rotate(45deg); }

  .lp-faq-a {
    max-height: 0;
    overflow: hidden;
    transition: max-height .38s ease;
    font-size: 15px;
    line-height: 1.8;
    color: #5A5A5E;
  }

  .lp-faq-a p { padding-bottom: 28px; }
  .lp-faq-item.open .lp-faq-a { max-height: 300px; }

  /* ── FOOTER ──────────────────────────────── */
  .lp-footer {
    background: var(--lp-black);
    padding: 72px 0 44px;
    border-top: 1px solid rgba(255,255,255,.07);
  }

  .lp-footer-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    margin-bottom: 60px;
    align-items: end;
  }

  .lp-footer-brand-desc {
    font-size: 14px;
    line-height: 1.78;
    color: rgba(249,249,246,.28);
    max-width: 300px;
    margin-top: 20px;
  }

  .lp-footer-cta-title {
    font-family: var(--lp-display);
    font-size: clamp(40px, 4.5vw, 64px);
    line-height: .94;
    text-transform: uppercase;
    color: var(--lp-white);
    margin-bottom: 28px;
  }
  .lp-footer-cta-title .o { color: var(--lp-accent); }

  .lp-footer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 28px;
    border-top: 1px solid rgba(255,255,255,.07);
    font-size: 12px;
    color: rgba(249,249,246,.18);
  }

  /* ── ANIMATION ───────────────────────────── */
  @keyframes lpFadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: none; }
  }

  [data-rv] { opacity: 0; transform: translateY(14px); transition: opacity .5s ease, transform .5s ease; }
  [data-rv].vis { opacity: 1; transform: none; }

  /* ── RESPONSIVE ──────────────────────────── */
  @media (max-width: 1024px) {
    .lp-wrap { padding: 0 40px; }
    .lp-nav-inner { padding: 0 40px; }
    .lp-hero { padding: 130px 40px 72px; }
  }

  @media (max-width: 768px) {
    .lp-wrap { padding: 0 24px; }
    .lp-nav-inner { padding: 0 24px; }
    .lp-nav-link { display: none; }

    .lp-hero { padding: 110px 24px 56px; }
    .lp-hero-h1 { font-size: clamp(64px, 16vw, 120px); }
    .lp-hero-sub { font-size: 16px; }
    .lp-hero-stats { flex-wrap: wrap; margin-top: 48px; }
    .lp-hero-stat { flex: 0 0 50%; margin-bottom: 24px; }
    .lp-hero-stat:nth-child(even) { border-right: none; margin-right: 0; }

    .lp-features { padding: 80px 0; }
    .lp-feat-grid { grid-template-columns: 1fr; }
    .lp-feat-card { padding: 40px; }

    .lp-hiw { padding: 80px 0; }
    .lp-hiw-steps { grid-template-columns: 1fr; }
    .lp-step { border-right: none; border-bottom: 1px solid rgba(255,255,255,.08); }
    .lp-step:last-child { border-bottom: none; }

    .lp-pricing { padding: 80px 0; }
    .lp-pricing-inner { grid-template-columns: 1fr; gap: 40px; }

    .lp-faq { padding: 80px 0; }
    .lp-faq-layout { grid-template-columns: 1fr; gap: 40px; }
    .lp-faq-sticky { position: static; }

    .lp-footer { padding: 56px 0 36px; }
    .lp-footer-top { grid-template-columns: 1fr; gap: 48px; }
    .lp-footer-bottom { flex-direction: column; gap: 8px; text-align: center; }

    .lp-s-title { margin-bottom: 40px; }
  }
`;

const LOGO_SVG = (
  <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#FFFFFF" />
    <path d="M23 16 L41 32 L23 48" fill="none" stroke="#0B1220" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="46" cy="48" r="2.8" fill="#1E3A8A" />
  </svg>
);

export default function LandingPage() {
  return (
    <>
      <style>{LP_CSS}</style>

      <div className="lp">

        {/* ── NAV ── */}
        <nav className="lp-nav" id="lp-nav">
          <div className="lp-nav-inner">
            <Link href="/" className="lp-logo" aria-label="Sıradaki — Ana Sayfa">
              {LOGO_SVG}
              <span className="lp-wordmark">Sıradaki</span>
            </Link>
            <div className="lp-nav-actions">
              <Link href="/giris" className="lp-nav-link">Giriş Yap</Link>
              <Link href="/kayit" className="lp-nav-cta">Ücretsiz Başla <span className="arr">→</span></Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero-ghost" aria-hidden="true">›</div>
          <p className="lp-hero-overline">Berber Randevu &amp; Ekip Yönetimi</p>
          <h1 className="lp-hero-h1">
            SIRADAKI<br />
            RANDEVUN<br />
            <span className="o">HAZIR.</span>
          </h1>
          <div className="lp-hero-divider" />
          <p className="lp-hero-sub">
            Berber dükkanın için randevu defteri, ekip takvimi ve online randevu — hepsi tek uygulamada. Üstelik şu an tamamen ücretsiz.
          </p>
          <div className="lp-hero-actions">
            <Link href="/kayit" className="lp-btn-primary">Ücretsiz Başla <span className="arr">→</span></Link>
            <a href="#hiw" className="lp-btn-ghost">Nasıl çalışır?</a>
          </div>
          <div className="lp-hero-stats">
            <div className="lp-hero-stat">
              <div className="lp-stat-num">2 dk</div>
              <div className="lp-stat-lbl">Kurulum süresi</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-stat-num">₺0</div>
              <div className="lp-stat-lbl">Beta döneminde</div>
            </div>
            <div className="lp-hero-stat">
              <div className="lp-stat-num">7/24</div>
              <div className="lp-stat-lbl">Online randevu</div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="lp-features" id="features" data-rv>
          <div className="lp-wrap">
            <p className="lp-s-over">Özellikler</p>
            <h2 className="lp-s-title" style={{ color: 'var(--lp-black)' }}>HER ŞEY<br />BİR ARADA.</h2>
            <div className="lp-feat-grid">
              {[
                { n: '01', title: 'Randevu Yönetimi', desc: 'Günlük ve haftalık görünüm. Çakışma uyarısı, tek dokunuşla onay, anlık hatırlatma. Hiçbir randevu gözden kaçmaz.' },
                { n: '02', title: 'Ekip Takvimi',     desc: 'Her ustanın takvimi ayrı. Randevuları sürükle-bırak ile yeniden ata. Tüm ekibi tek ekranda gör.' },
                { n: '03', title: 'Kazanç Takibi',    desc: 'Günlük gelir ve komisyon hesabı. Haftalık özet, tek bakışta. Rakamları bil, kararını ver.' },
                { n: '04', title: 'Online Randevu',   desc: 'Müşteriler 7/24 kendi randevusunu alır. Sen onaylarsın, işine bakarsın. Telefon trafiği sıfıra iner.' },
              ].map(f => (
                <div key={f.n} className="lp-feat-card">
                  <span className="lp-feat-n">{f.n}</span>
                  <div className="lp-feat-rule" />
                  <div className="lp-feat-title">{f.title}</div>
                  <p className="lp-feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-hiw" id="hiw" data-rv>
          <div className="lp-wrap">
            <p className="lp-s-over">Nasıl çalışır</p>
            <h2 className="lp-s-title">3 ADIMDA<br />HAZIR.</h2>
            <div className="lp-hiw-steps">
              {[
                { n: '1', title: 'Hesabını Aç',  desc: '2 dakikada kurulum. Ödeme bilgisi istemiyoruz. Telefon numaranla kayıt ol, hemen başla.' },
                { n: '2', title: 'Ekibini Ekle', desc: 'Ustalarını ekle, çalışma saatlerini ayarla. Her personel kendi telefonundan günlük takibini yapar.' },
                { n: '3', title: 'Linki Paylaş', desc: "Müşterilerine randevu linkini gönder. WhatsApp'ta, Instagram'da, her yerde çalışır. Randevular gelsin." },
              ].map(s => (
                <div key={s.n} className="lp-step" data-n={s.n}>
                  <div className="lp-step-badge">{s.n}</div>
                  <div className="lp-step-title">{s.title}</div>
                  <p className="lp-step-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="lp-pricing" id="pricing" data-rv>
          <div className="lp-pricing-ghost" aria-hidden="true">₺0</div>
          <div className="lp-wrap">
            <span className="lp-pricing-tag">Beta Dönemi</span>
            <div className="lp-pricing-inner">
              <div>
                <div className="lp-pricing-big">
                  ŞU AN
                  <span className="o">ÜCRETSİZ.</span>
                </div>
              </div>
              <div className="lp-pricing-right">
                <p>Beta döneminde tüm özellikler sınırsız ve ücretsiz. Hesabını şimdi aç, erken kullanıcı avantajını kaçırma.</p>
                <ul className="lp-check-list">
                  <li>Sınırsız randevu</li>
                  <li>Sınırsız personel</li>
                  <li>Müşteri randevu linki</li>
                  <li>Kazanç &amp; komisyon takibi</li>
                  <li>Ekip takvimi &amp; yeniden atama</li>
                  <li>Anlık bildirimler</li>
                </ul>
                <Link href="/kayit" className="lp-btn-primary">Hemen Başla — Ücretsiz <span className="arr">→</span></Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-faq" id="faq" data-rv>
          <div className="lp-wrap">
            <div className="lp-faq-layout">
              <div className="lp-faq-sticky">
                <p className="lp-s-over">Sıkça sorulanlar</p>
                <h2 className="lp-s-title">AKLINDA<br />SORU MU?</h2>
              </div>
              <div className="lp-faq-list">
                {[
                  { q: 'Uygulama gerçekten ücretsiz mi?', a: 'Evet. Beta döneminde tüm özellikler tamamen ücretsiz. İleride farklı planlar gelecek ama mevcut kullanıcılara özel geçiş koşulları sunulacak.' },
                  { q: 'Kaç personel ekleyebilirim?', a: 'Beta süresince sınırsız. Tek kişilik dükkanlar da büyük ekipler de rahatlıkla kullanabilir.' },
                  { q: 'Müşteriler nasıl randevu alıyor?', a: 'Sana özel bir randevu linki oluşturulur. Müşterilerin bu adrese girip hizmet, usta, tarih ve saat seçerek randevu alır. Telefon açmalarına gerek kalmaz.' },
                  { q: 'Uygulama telefonda mı çalışıyor?', a: 'Evet. iOS ve Android için uygulamamız var. Hem sen hem de personelin kendi telefonundan kullanır.' },
                  { q: 'Ücretli plan ne zaman geliyor?', a: 'Beta bittikten sonra. Tam tarihi henüz belli değil ama erken kullanıcıları geçişte ayrıca bilgilendirip özel fiyat sunacağız.' },
                ].map((item, i) => (
                  <div key={i} className="lp-faq-item">
                    <div className="lp-faq-q">
                      <span>{item.q}</span>
                      <span className="lp-faq-toggle">+</span>
                    </div>
                    <div className="lp-faq-a"><p>{item.a}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-wrap">
            <div className="lp-footer-top">
              <div>
                <Link href="/" className="lp-logo" aria-label="Sıradaki">
                  <svg width="34" height="34" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <rect width="64" height="64" rx="14" fill="#FFFFFF" />
                    <path d="M23 16 L41 32 L23 48" fill="none" stroke="#0B1220" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="46" cy="48" r="2.8" fill="#1E3A8A" />
                  </svg>
                  <span className="lp-wordmark" style={{ fontSize: '22px' }}>Sıradaki</span>
                </Link>
                <p className="lp-footer-brand-desc">Berber dükkanın için randevu ve ekip yönetimi. Sıradaki müşteri her zaman hazır.</p>
              </div>
              <div>
                <div className="lp-footer-cta-title">
                  HÂLÂ<br />
                  <span className="o">BEKLİYOR</span><br />
                  MUSUN?
                </div>
                <Link href="/kayit" className="lp-btn-primary">Ücretsiz Başla <span className="arr">→</span></Link>
              </div>
            </div>
            <div className="lp-footer-bottom">
              <span>© {new Date().getFullYear()} Sıradaki. Tüm hakları saklıdır.</span>
              <span>Türkiye&apos;de yapıldı ›</span>
            </div>
          </div>
        </footer>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function(){
          // Nav scroll
          var nav = document.getElementById('lp-nav');
          window.addEventListener('scroll', function(){ nav.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });

          // FAQ accordion
          document.querySelectorAll('.lp-faq-q').forEach(function(btn){
            btn.addEventListener('click', function(){
              var item = btn.closest('.lp-faq-item');
              var isOpen = item.classList.contains('open');
              document.querySelectorAll('.lp-faq-item.open').forEach(function(i){ i.classList.remove('open'); });
              if (!isOpen) item.classList.add('open');
            });
          });

          // Scroll reveal
          var io = new IntersectionObserver(function(es){
            es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('vis'); io.unobserve(e.target); }});
          }, { threshold: 0.1 });
          document.querySelectorAll('[data-rv]').forEach(function(el){ io.observe(el); });
        })();
      `}} />
    </>
  );
}
