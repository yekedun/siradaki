import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berber Randevu",
  description: "Online berber randevu sistemi",
};

const montserrat = localFont({
  src: [
    { path: "../fonts/Montserrat-Regular.otf",  weight: "400", style: "normal" },
    { path: "../fonts/Montserrat-Medium.otf",   weight: "500", style: "normal" },
    { path: "../fonts/Montserrat-SemiBold.otf", weight: "600", style: "normal" },
    { path: "../fonts/Montserrat-Bold.otf",     weight: "700", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={montserrat.variable}>
      <body className="bg-bg text-ink antialiased font-sans">{children}</body>
    </html>
  );
}
