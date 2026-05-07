import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Berber Randevu",
  description: "Online berber randevu sistemi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
