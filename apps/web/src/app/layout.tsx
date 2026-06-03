import type { Metadata } from 'next';
import { Bebas_Neue, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '../components/ServiceWorkerRegistrar';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas-neue',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sıradaki — Berber Randevu & Ekip Yönetimi',
  description: 'Berber dükkanın için randevu ve ekip yönetimi. Sıradaki müşteri her zaman hazır.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${bebasNeue.variable} ${plusJakarta.variable}`}>
      <body className="bg-slate-50 font-sans text-ink-900 antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
