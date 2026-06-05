// /hesabimi-sil · Account Deletion — Google Play zorunlu sayfa
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Hesabımı Sil — Sıradaki',
  description: 'Sıradaki hesabınızı ve verilerinizi nasıl silebileceğinizi öğrenin.',
};

const CONTACT_EMAIL = 'admin@siradaki.app';

export default function HesabimiSilPage() {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--fg-1)', minHeight: '100vh', background: 'var(--bg)' }}>
      <nav style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--divider)', padding: '16px 24px' }}>
        <Link href="/" style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg-1)', textDecoration: 'none' }}>← Sıradaki</Link>
      </nav>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          Hesabımı Sil
        </h1>
        <p style={{ fontSize: 15, color: 'var(--fg-2)', margin: '0 0 48px', lineHeight: 1.7 }}>
          Sıradaki hesabınızı ve tüm verilerinizi kalıcı olarak silebilirsiniz.
          Hesap silindikten sonra randevularınız, işletme bilgileriniz ve profil verileriniz
          30 gün içinde sistemden tamamen kaldırılır.
        </p>

        <Section title="Uygulama üzerinden silme (önerilen)">
          <Step n={1}>Sıradaki uygulamasını açın.</Step>
          <Step n={2}>Alt menüden <strong>Hesabım</strong> sekmesine gidin.</Step>
          <Step n={3}>Sayfanın en altına inin ve <strong>Hesabımı Sil</strong> butonuna dokunun.</Step>
          <Step n={4}>Onay ekranında silme işlemini onaylayın. Hesabınız anında devre dışı bırakılır.</Step>
        </Section>

        <Section title="E-posta ile talep">
          <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: '0 0 12px', lineHeight: 1.7 }}>
            Uygulamaya erişiminiz yoksa{' '}
            <a href={`mailto:${CONTACT_EMAIL}?subject=Hesap%20Silme%20Talebi`} style={{ color: 'var(--brand-600)' }}>
              {CONTACT_EMAIL}
            </a>{' '}
            adresine <strong>&quot;Hesap Silme Talebi&quot;</strong> konusuyla e-posta gönderin.
            Talebiniz 3 iş günü içinde işleme alınır.
          </p>
        </Section>

        <Section title="Silinen veriler">
          <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: 14, color: 'var(--fg-2)', lineHeight: 2 }}>
            <li>Profil bilgileri (ad, e-posta, telefon)</li>
            <li>İşletme ve dükkan bilgileri</li>
            <li>Personel profili ve çalışma saatleri</li>
            <li>Geçmiş ve gelecek randevular</li>
            <li>Bildirim tercihleri</li>
          </ul>
        </Section>

        <p style={{ fontSize: 12, color: 'var(--fg-4)', marginTop: 48, lineHeight: 1.6 }}>
          Yasal zorunluluklar kapsamında bazı kayıtlar en fazla 2 yıl saklanabilir.
          Detaylar için{' '}
          <Link href="/gizlilik-politikasi" style={{ color: 'var(--brand-600)' }}>Gizlilik Politikası</Link>&apos;nı inceleyin.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
      <span style={{
        flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
        background: 'var(--brand-100)', color: 'var(--brand-700)',
        fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {n}
      </span>
      <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: 0, lineHeight: 1.7 }}>{children}</p>
    </div>
  );
}
