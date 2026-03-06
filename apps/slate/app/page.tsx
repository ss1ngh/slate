import type { Metadata } from 'next';
import CanvasClient from './src/components/CanvasClient';

export const metadata: Metadata = {
  title: 'Slate — Infinite Whiteboard',
  description:
    'A fast, browser-based infinite whiteboard. Draw shapes, add text, annotate PDFs. All data saved locally — no account needed.',
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-50">
      <CanvasClient />
    </main>
  );
}
