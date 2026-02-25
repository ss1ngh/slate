'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SlateEngine } from '../canvas-engine/engine';
import { ShapeType, ToolType } from '../config/types';
import Toolbar from './ui/Toolbar';
import Properties from './ui/Properties';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SlateEngine | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('pencil');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
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

  //onchange of active tool/color/width - update engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(activeTool);
      engineRef.current.setColor(strokeColor);
      engineRef.current.setWidth(strokeWidth);
    }
  }, [activeTool, strokeColor, strokeWidth]);

  //undo redo actions+shortcut keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      //ctrl+z or cmd+z
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engineRef.current.redo();
        } else {
          engineRef.current.undo();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engineRef.current.redo();
        return;
      }

      // Clear canvas shortcut: Ctrl/Cmd + Shift + Backspace
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        if (confirm("Are you sure you want to clear the entire canvas?")) {
          engineRef.current.clearCanvas();
        }
        return;
      }

      //tool selection shortcuts
      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'p': setActiveTool('pencil'); break;
        case 'r': setActiveTool('rect'); break;
        case 'c': setActiveTool('circle'); break;
        case 'l': setActiveTool('line'); break;
        case 'a': setActiveTool('arrow'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  //render DOM element
  return (
    <div className='relative w-full h-screen'>

      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      <Properties
        strokeColor={strokeColor}
        onColorChange={setStrokeColor}
        strokeWidth={strokeWidth}
        onWidthChange={setStrokeWidth}
      />

      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full bg-slate-50 touch-none"
        onContextMenu={(e) => e.preventDefault()}
      />

    </div>
  );
}
