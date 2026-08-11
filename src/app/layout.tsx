import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body-loaded",
});

const hanzi = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-hanzi-loaded",
});

export const metadata: Metadata = {
  title: "WTF E-learning — Tiếng Trung",
  description: "Học tiếng Trung theo chuỗi bài rõ ràng, tập trung và dễ dùng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${hanzi.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={
          {
            "--font-body": "var(--font-body-loaded), 'Be Vietnam Pro', sans-serif",
            "--font-hanzi": "var(--font-hanzi-loaded), 'Noto Sans SC', sans-serif",
            "--font-display": "var(--font-body-loaded), 'Be Vietnam Pro', sans-serif",
          } as React.CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
