import dynamic from 'next/dynamic';
import type { Metadata } from 'next';

// Canvas must never be server-rendered: SlateEngine accesses window, document,
// and localStorage synchronously at construction time.
const Canvas = dynamic(() => import('./src/components/Canvas'), { ssr: false });

export const metadata: Metadata = {
  title: 'Slate — Infinite Whiteboard',
  description:
    'A fast, browser-based infinite whiteboard. Draw shapes, add text, annotate PDFs. All data saved locally — no account needed.',
};

export default function Home() {
  return (
    <main className="w-full h-screen overflow-hidden bg-slate-50">
      <Canvas />
    </main>
  );
}
