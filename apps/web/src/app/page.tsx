// / · Sıradaki Landing Page
// Hero + features + CTA + footer with legal links
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Sıradaki — Berber Randevu ve Ekip Yönetimi',
  description: 'Dükkanını dijitale taşı. Müşterilerine online randevu al, ekibini yönet, kazancını takip et.',
};

export default function LandingPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--fg-1)', minHeight: '100vh' }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--divider)',
        padding: '0 24px', height: 56, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
      }}>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--fg-1)' }}>
          Sıradaki
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/giris" style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-3)', textDecoration: 'none' }}>
            Giriş
          </Link>
          <Link href="/kayit" style={{
            fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none',
            background: 'var(--brand-600)', padding: '8px 16px', borderRadius: 8,
          }}>
            Ücretsiz Dene
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ textAlign: 'center', padding: '72px 24px 56px', maxWidth: 640, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          color: 'var(--brand-600)', background: 'var(--brand-100)',
          padding: '4px 12px', borderRadius: 999, marginBottom: 24,
        }}>
          Berber · Kuaför · Barber
        </div>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 700,
          letterSpacing: '-0.03em', lineHeight: 1.05,
          color: 'var(--fg-1)', margin: '0 0 20px',
        }}>
          Dükkanını Dijitale Taşı
        </h1>
        <p style={{
          fontSize: 17, lineHeight: 1.65, color: 'var(--fg-3)',
          margin: '0 auto 40px', maxWidth: 460,
        }}>
          Müşterilerine online randevu al, ekibini yönet ve kazancını takip et —
          hepsi tek uygulamada.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/kayit" style={{
            fontSize: 15, fontWeight: 700, color: '#fff', textDecoration: 'none',
            background: 'var(--brand-600)', padding: '14px 28px', borderRadius: 12,
            display: 'inline-block',
          }}>
            Ücretsiz Başla
          </Link>
          <a href="#nasil-calisir" style={{
            fontSize: 15, fontWeight: 600, color: 'var(--fg-2)', textDecoration: 'none',
            background: 'var(--bg-elevated)', padding: '14px 28px', borderRadius: 12,
            border: '1.5px solid var(--border)', display: 'inline-block',
          }}>
            Nasıl çalışır? →
          </a>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section id="nasil-calisir" style={{ background: 'var(--bg-elevated)', padding: '56px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 12 }}>
              Özellikler
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--fg-1)', margin: 0 }}>
              İhtiyacın olan her şey
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              {
                emoji: '📅',
                title: 'Online Randevu',
                desc: 'Müşterilerin 7/24 randevu alabilir. Seninle dolu saatleri görmez, sadece müsaitleri.',
              },
              {
                emoji: '👥',
                title: 'Ekip Yönetimi',
                desc: 'Birden fazla usta çalışıyorsa herkese ayrı ajanda. Kimin ne zaman boş olduğunu görebilirsin.',
              },
              {
                emoji: '💰',
                title: 'Kazanç Takibi',
                desc: 'Aylık, haftalık, ustalara göre kazanç raporları. Komisyon hesaplaması dahil.',
              },
              {
                emoji: '🔗',
                title: 'Kişisel Link',
                desc: 'Her ustanın kendi randevu linki. Instagram\'a koy, müşterilerin direkt sana gelsin.',
              },
              {
                emoji: '📱',
                title: 'Mobil Uygulama',
                desc: 'iOS ve Android uygulaması. Gittiğin her yerden randevularını gör ve yönet.',
              },
              {
                emoji: '🚫',
                title: 'Gelmedi / İzin',
                desc: 'Tatil günlerini, öğle aralarını ve geç gelmeleri tek tıkla engelleyebilirsin.',
              },
            ].map(f => (
              <div key={f.title} style={{
                background: 'var(--bg)', border: '1.5px solid var(--border)',
                borderRadius: 16, padding: '24px 20px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.emoji}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-3)', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section style={{ padding: '56px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 12 }}>
            3 Adımda Başla
          </p>
          <h2 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 40px' }}>
            5 dakikada dükkanını kur
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { n: '1', title: 'Dükkanını tanıt', desc: 'Adını, şehrini gir. Rezervasyon linkin hazır.' },
              { n: '2', title: 'Hizmetlerini ekle', desc: 'Saç kesimi, sakal tıraşı... fiyat ve süreyle birlikte.' },
              { n: '3', title: 'Linki paylaş', desc: 'Instagram veya WhatsApp\'a at. Randevular akmaya başlar.' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 999, background: 'var(--brand-600)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {s.n}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)', marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--fg-3)', lineHeight: 1.55 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <Link href="/kayit" style={{
            display: 'block', marginTop: 40, fontSize: 15, fontWeight: 700,
            color: '#fff', textDecoration: 'none',
            background: 'var(--brand-600)', padding: '16px', borderRadius: 14, textAlign: 'center',
          }}>
            Ücretsiz Başla
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{
        background: 'var(--bg-elevated)', borderTop: '1px solid var(--divider)',
        padding: '32px 24px', textAlign: 'center',
      }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-1)' }}>Sıradaki</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          {[
            { label: 'Gizlilik Politikası', href: '/gizlilik-politikasi' },
            { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' },
            { label: 'Çerez Politikası', href: '/cerez-politikasi' },
            { label: 'İletişim', href: 'mailto:destek@sıradaki.com' },
          ].map(l => (
            l.href.startsWith('mailto:') ? (
              <a key={l.href} href={l.href} style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none', fontWeight: 500 }}>
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={l.href} style={{ fontSize: 13, color: 'var(--fg-3)', textDecoration: 'none', fontWeight: 500 }}>
                {l.label}
              </Link>
            )
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--fg-4)', margin: 0 }}>
          © {new Date().getFullYear()} Sıradaki. Tüm hakları saklıdır.
        </p>
      </footer>
    </div>
  );
}
