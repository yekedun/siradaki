import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sıradaki — Berber Randevu Sistemi',
  description: "Instagram'a linkini at. Müşterilerin 7/24 randevusunu kendisi alsın.",
};

const BG     = '#FFFFFF';
const SURF   = '#F8FAFC';
const BORDER = '#E2E8F0';
const TEXT   = '#0F172A';
const MUTED  = '#64748B';
const BRAND  = '#1E3A8A';
const BRANDD = '#15296B';
const BRANDL = '#EFF3FB';

const FEATURES = [
  { icon: '📅', title: 'Online Randevu',   desc: 'Müşterilerin 7/24 randevu alabilir. Dolu saatleri görmez, sadece müsait olanları.' },
  { icon: '👥', title: 'Ekip Yönetimi',    desc: 'Birden fazla usta varsa herkese ayrı ajanda. Kimin ne zaman boş olduğunu görebilirsin.' },
  { icon: '💰', title: 'Kazanç Takibi',    desc: 'Aylık ve haftalık raporlar. Komisyon hesaplaması dahil.' },
  { icon: '🔗', title: 'Kişisel Link',     desc: "Her ustanın kendi randevu linki. Instagram'a koy, müşteri direkt sana gelsin." },
  { icon: '📱', title: 'Mobil Uygulama',   desc: 'iOS ve Android. Gittiğin her yerden randevularını gör ve yönet.' },
  { icon: '🚫', title: 'İzin & Tatil',     desc: 'Tatil günlerini ve öğle aralarını tek tıkla kapat.' },
];

const STEPS = [
  { n: '01', title: 'Dükkanını tanıt',   desc: 'Adını ve şehrini gir. Randevu linkin hazır.' },
  { n: '02', title: 'Hizmetlerini ekle', desc: 'Saç kesimi, sakal tıraşı... fiyat ve süreyle birlikte.' },
  { n: '03', title: 'Linki paylaş',      desc: "Instagram veya WhatsApp'a at. Randevular akmaya başlar." },
];

export default function LandingPage() {
  return (
    <>
      <style>{`
        :root { color-scheme: light; }
        *, *::before, *::after { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fu  { animation: fadeUp 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .d1  { animation-delay: 0.08s; }
        .d2  { animation-delay: 0.18s; }
        .d3  { animation-delay: 0.28s; }
        .d4  { animation-delay: 0.38s; }

        .fc  { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .fc:hover { border-color: ${BRAND} !important; box-shadow: 0 4px 20px rgba(30,58,138,0.1); }

        .btn-p { transition: background 0.15s ease, transform 0.12s ease; }
        .btn-p:hover { background: ${BRANDD} !important; transform: translateY(-1px); }

        .btn-s { transition: border-color 0.15s ease, color 0.15s ease; }
        .btn-s:hover { border-color: ${BRAND} !important; color: ${BRAND} !important; }

        @media (max-width: 560px) {
          .hero-ctas { flex-direction: column !important; }
          .hero-ctas a { width: 100% !important; text-align: center !important; }
          .stats-row { grid-template-columns: 1fr 1fr !important; }
          .stats-row > :last-child { grid-column: 1 / -1; border-right: none !important; border-top: 1px solid ${BORDER}; }
          .feat-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ fontFamily: 'var(--font-sans, system-ui, sans-serif)', background: BG, color: TEXT, minHeight: '100vh' }}>

        {/* ── Nav ──────────────────────────────────────────── */}
        <nav style={{
          background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${BORDER}`,
          padding: '0 24px', height: 56,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', color: TEXT }}>
            Sıradaki
          </span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/giris" style={{ fontSize: 13, fontWeight: 600, color: MUTED, textDecoration: 'none' }}>
              Giriş
            </Link>
            <Link href="/kayit" className="btn-p" style={{
              fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none',
              background: BRAND, padding: '7px 16px', borderRadius: 8,
            }}>
              Ücretsiz Dene
            </Link>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────── */}
        <section style={{ padding: '80px 24px 72px', maxWidth: 660, margin: '0 auto', textAlign: 'center' }}>
          <div className="fu" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: BRAND, background: BRANDL, padding: '5px 14px', borderRadius: 999, marginBottom: 32,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: BRAND, display: 'inline-block', flexShrink: 0 }} />
            Berber · Kuaför · Barber
          </div>

          <h1 className="fu d1" style={{
            fontSize: 'clamp(34px, 8.5vw, 60px)', fontWeight: 700,
            letterSpacing: '-0.03em', lineHeight: 1.06,
            color: TEXT, margin: '0 0 20px',
          }}>
            Randevun hazır.<br />
            <span style={{ color: BRAND }}>Sen hazır mısın?</span>
          </h1>

          <p className="fu d2" style={{
            fontSize: 'clamp(15px, 2.2vw, 18px)', lineHeight: 1.7, color: MUTED,
            margin: '0 auto 40px', maxWidth: 460,
          }}>
            Instagram&apos;a linkini at. Müşterilerin 7/24 randevusunu kendisi alsın.
            Ekibini yönet, kazancını takip et.
          </p>

          <div className="fu d3 hero-ctas" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/kayit" className="btn-p" style={{
              fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none',
              background: BRAND, padding: '14px 32px', borderRadius: 10,
            }}>
              Ücretsiz Başla
            </Link>
            <a href="#nasil-calisir" className="btn-s" style={{
              fontSize: 15, fontWeight: 600, color: MUTED, textDecoration: 'none',
              padding: '14px 24px', borderRadius: 10, border: `1.5px solid ${BORDER}`,
            }}>
              Nasıl çalışır?
            </a>
          </div>
        </section>

        {/* ── Stats ────────────────────────────────────────── */}
        <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: SURF }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {[
                { n: '5 dk',  label: 'Kurulum süresi' },
                { n: '7/24',  label: 'Randevu alınabilir' },
                { n: '0 ₺',   label: 'Başlangıç ücreti' },
              ].map((s, i) => (
                <div key={s.n} style={{
                  padding: '32px 16px', textAlign: 'center',
                  borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', color: TEXT, marginBottom: 6 }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: 13, color: MUTED, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── How it works ─────────────────────────────────── */}
        <section id="nasil-calisir" style={{ padding: '80px 24px' }}>
          <div style={{ maxWidth: 520, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, margin: '0 0 12px' }}>
                3 adımda başla
              </p>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.02em', color: TEXT, margin: 0 }}>
                5 dakikada dükkanını kur
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{
                  display: 'flex', gap: 20, alignItems: 'flex-start',
                  padding: '24px 0',
                  borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div style={{
                    flexShrink: 0, width: 40, height: 40, borderRadius: 10,
                    background: BRANDL, color: BRAND,
                    fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {s.n}
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{s.title}</div>
                    <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section style={{ background: SURF, borderTop: `1px solid ${BORDER}`, padding: '80px 24px' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, margin: '0 0 12px' }}>
                Özellikler
              </p>
              <h2 style={{ fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, letterSpacing: '-0.02em', color: TEXT, margin: 0 }}>
                İhtiyacın olan her şey
              </h2>
            </div>
            <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="fc" style={{
                  background: BG, border: `1.5px solid ${BORDER}`,
                  borderRadius: 12, padding: '24px 20px',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: TEXT, margin: '0 0 8px' }}>{f.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: MUTED, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────── */}
        <section style={{ padding: '88px 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.025em', color: TEXT, margin: '0 0 14px' }}>
              Bugün başla, yarın hazırsın.
            </h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: '0 0 36px' }}>
              Kurulum ücreti yok. Kredi kartı gerekmez.
            </p>
            <Link href="/kayit" className="btn-p" style={{
              display: 'block', fontSize: 16, fontWeight: 700,
              color: '#fff', textDecoration: 'none',
              background: BRAND, padding: '16px 32px', borderRadius: 12,
              maxWidth: 320, margin: '0 auto',
            }}>
              Ücretsiz Başla →
            </Link>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${BORDER}`, padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: TEXT }}>Sıradaki</span>
          </div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            {[
              { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
              { label: 'Kullanım Koşulları',  href: '/kullanim-kosullari' },
              { label: 'Çerez Politikası',    href: '/cerez-politikasi' },
              { label: 'İletişim',            href: 'mailto:destek@siradaki.com' },
            ].map(l =>
              l.href.startsWith('mailto:') ? (
                <a key={l.href} href={l.href} style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} style={{ fontSize: 13, color: MUTED, textDecoration: 'none', fontWeight: 500 }}>
                  {l.label}
                </Link>
              )
            )}
          </div>
          <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>
            © {new Date().getFullYear()} Sıradaki. Tüm hakları saklıdır.
          </p>
        </footer>

      </div>
    </>
  );
}
