'use client';

import dynamic from 'next/dynamic';

// Canvas must never be server-rendered: SlateEngine accesses window, document,
// and localStorage synchronously at construction time.
const Canvas = dynamic(() => import('./Canvas'), { ssr: false });

export default function CanvasClient() {
    return <Canvas />;
}
