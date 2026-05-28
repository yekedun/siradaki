// /kullanim-kosullari - Terms of Service
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Kullanim Kosullari - Siradaki',
  description: 'Siradaki uygulamasinin kullanim kosullari.',
};

const LAST_UPDATED = '24 Mayis 2026';
const CONTACT_EMAIL = 'emreyek29@gmail.com';
const DATA_CONTROLLER = 'Yunus Emre Kadakal';

export default function KullanimKosullariPage() {
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
          Kullanim Kosullari
        </h1>

        <Legal>
          <H2>1. Taraflar ve Kapsam</H2>
          <P>
            Bu kosullar, {DATA_CONTROLLER} tarafindan saglanan Siradaki mobil uygulamasi ve web
            sitesini kullanan tum kullanicilar icin gecerlidir.
          </P>

          <H2>2. Hizmet</H2>
          <P>
            Siradaki, berber ve kuafor isletmelerinin online randevu almasina, ekip yonetimine
            ve kazanc takibine yardimci olan bir yazilim hizmetidir.
          </P>

          <H2>3. Hesap Guvenligi</H2>
          <P>
            Hesap olustururken dogru bilgi saglamak ve hesabinizin guvenligini korumak sizin
            sorumlulugunuzdadir. Yetkisiz kullanim fark ederseniz bize bildirin.
          </P>

          <H2>4. Yasakli Kullanim</H2>
          <P>
            Yaniltici bilgi vermek, baska kullanicilarin verilerine izinsiz erismek, sisteme zarar
            verecek islemler yapmak ve hizmeti yasa disi amaclarla kullanmak yasaktir.
          </P>

          <H2>5. Iletisim</H2>
          <P>
            Kullanim kosullariyla ilgili sorulariniz icin{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--brand-600)' }}>{CONTACT_EMAIL}</a>
            {' '}adresine yazabilirsiniz.
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
