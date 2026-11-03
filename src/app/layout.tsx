import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI & IT Новости",
  description:
    "Новости мира ИИ и IT-профессий на русском языке с анализом влияния на индустрию и push-уведомлениями.",
  manifest: "/manifest.webmanifest",
  applicationName: "AI & IT Новости",
  appleWebApp: { capable: true, title: "AI Новости", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b1020",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-[#0b1020] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
