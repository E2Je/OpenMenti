import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "itameter - מצגות אינטראקטיביות בזמן אמת",
  description:
    "הצבעות, ענני מילים ושאלות פתוחות בזמן אמת. עד 150 משתתפים מהנייד, בחינם.",
};

export const viewport: Viewport = {
  themeColor: "#5b4bff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
