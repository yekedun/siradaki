import type { Metadata } from 'next';
import './globals.css';

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
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-50 font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
