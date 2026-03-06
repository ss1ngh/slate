import type { Metadata } from "next";
import { Geist, Geist_Mono } from 'next/font/google';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Slate — Infinite Whiteboard',
    template: '%s — Slate',
  },
  description:
    'A fast, browser-based infinite whiteboard. Draw shapes, add text, and annotate — no account needed. All data saved locally.',
  keywords: ['whiteboard', 'drawing', 'canvas', 'infinite canvas', 'annotations', 'sketch'],
  openGraph: {
    title: 'Slate — Infinite Whiteboard',
    description: 'A fast, browser-based infinite whiteboard. No account needed.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'Slate — Infinite Whiteboard',
    description: 'A fast, browser-based infinite whiteboard. No account needed.',
  },
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}