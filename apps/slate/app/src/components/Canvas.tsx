'use client'

import React, { useEffect, useRef } from 'react'
import { SlateEngine } from '../canvas-engine/engine';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SlateEngine | null>(null);

  useEffect(() => {
    if(canvasRef.current && !engineRef.current) {
      engineRef.current = new SlateEngine(canvasRef.current);
    }

    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.handleResize();
      }
    };

    window.addEventListener("resize", handleResize);

    //cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  //render DOM element
  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full bg-slate-50 touch-none"
    />
  );
}
