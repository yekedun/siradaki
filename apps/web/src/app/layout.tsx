import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berber Randevu",
  description: "Online berber randevu sistemi",
};

const FONT_PRELOADS = [
  "/fonts/Montserrat-Regular.otf",
  "/fonts/Montserrat-Medium.otf",
  "/fonts/Montserrat-SemiBold.otf",
  "/fonts/Montserrat-Bold.otf",
] as const;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <head>
        {FONT_PRELOADS.map((href) => (
          <link
            key={href}
            rel="preload"
            href={href}
            as="font"
            type="font/otf"
            crossOrigin="anonymous"
          />
        ))}
      </head>
      <body className="bg-bg text-ink antialiased font-sans">{children}</body>
    </html>
  );
}
