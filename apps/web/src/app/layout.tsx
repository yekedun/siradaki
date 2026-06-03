import type { Metadata } from 'next';
import './globals.css';
import { ServiceWorkerRegistrar } from '../components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Sıradaki — Berber Randevu & Ekip Yönetimi',
  description: 'Berber dükkanın için randevu ve ekip yönetimi. Sıradaki müşteri her zaman hazır.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 font-sans text-ink-900 antialiased">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
