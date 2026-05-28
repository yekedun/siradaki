// /gizlilik-politikasi - Privacy Policy
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Gizlilik Politikasi - Siradaki',
  description: 'Siradaki uygulamasinin KVKK kapsamindaki gizlilik politikasi.',
};

const LAST_UPDATED = '24 Mayis 2026';
const CONTACT_EMAIL = 'emreyek29@gmail.com';
const DATA_CONTROLLER = 'Yunus Emre Kadakal';

export default function GizlilikPolitikasiPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--fg-1)', minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--divider)', padding: '16px 24px' }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', textDecoration: 'none' }}>Siradaki</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-4)', marginBottom: 12 }}>
          Son guncelleme: {LAST_UPDATED}
        </p>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 32px' }}>
          Gizlilik Politikasi
        </h1>

        <Legal>
          <H2>1. Veri Sorumlusu</H2>
          <P>
            Bu politika, {DATA_CONTROLLER} tarafindan isletilen Siradaki mobil uygulamasi ve
            web sitesi icin gecerlidir. Kisisel verilerin islenmesinden sorumlu veri sorumlusu
            {DATA_CONTROLLER}&apos;dir.
          </P>

          <H2>2. Toplanan Veriler</H2>
          <P>
            Hesap bilgileri, isletme bilgileri, randevu bilgileri, cihaz bilgileri ve anonim
            kullanim verileri hizmetin sunulmasi, guvenlik, destek ve yasal yukumlulukler icin
            islenebilir.
          </P>

          <H2>3. Saklama ve Aktarim</H2>
          <P>
            Veriler Supabase altyapisi uzerinde saklanir. Verileriniz acik rizaniz olmadan
            pazarlama amacli ucuncu taraflarla paylasilmaz.
          </P>

          <H2>4. Hesap Silme</H2>
          <P>
            Hesabinizi uygulama icinden silebilir veya e-posta ile talep iletebilirsiniz.
            Hesap silindikten sonra kisisel veriler makul sure icinde kalici olarak silinir.
          </P>

          <H2>5. KVKK Haklari</H2>
          <P>
            Verilerinize erisim, duzeltme, silme, islemeyi kisitlama ve itiraz haklarinizi
            kullanmak icin{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand-600)' }}>{CONTACT_EMAIL}</a>
            {' '}adresine basvurabilirsiniz.
          </P>
        </Legal>
      </div>
    </div>
  );
}

function Legal({ children }: { children: React.ReactNode }) {
  return <div style={{ lineHeight: 1.7 }}>{children}</div>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '36px 0 12px', letterSpacing: '-0.01em' }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: '0 0 14px', lineHeight: 1.7 }}>{children}</p>;
}
