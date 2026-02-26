'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SlateEngine } from '../canvas-engine/engine';
import { ShapeType, ToolType } from '../config/types';
import Toolbar from './ui/Toolbar';
import Properties from './ui/Properties';
import { Undo2, Redo2, Plus, Minus as MinusIcon, Search } from 'lucide-react';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);

  const [activeTool, setActiveTool] = useState<ShapeType>('pencil');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new SlateEngine(canvasRef.current);

      // Sync engine state to React
      engineRef.current.onZoomChange = (z: number) => setZoom(z);
      engineRef.current.onSelectionChange = (s: any) => setSelectedId(s?.id || null);
      engineRef.current.onToolChange = (t: any) => setActiveTool(t);
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

  // onchange of active tool - update engine and clear selection if needed
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(activeTool);
      // Clear selection if not in select tool
      if (activeTool !== 'select') {
        setSelectedId(null);
      }
    }
  }, [activeTool]);

  // onchange of strokeColor/strokeWidth/strokeStyle - update engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColor(strokeColor);
      engineRef.current.setWidth(strokeWidth);
      engineRef.current.setStrokeStyle(strokeStyle);
    }
  }, [strokeColor, strokeWidth, strokeStyle]);

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
        case 'h': setActiveTool('hand'); break;
        case 'p': setActiveTool('pencil'); break;
        case 'r': setActiveTool('rect'); break;
        case 'd': setActiveTool('diamond'); break;
        case 'c': setActiveTool('circle'); break;
        case 'l': setActiveTool('line'); break;
        case 'a': setActiveTool('arrow'); break;
        case 'e': setActiveTool('eraser'); break;
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
        strokeStyle={strokeStyle}
        onStyleChange={setStrokeStyle}
        isSelected={!!selectedId}
      />

      {/* Bottom Left: History Controls */}
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-slate-600 font-medium text-sm">
        <button
          onClick={() => engineRef.current?.undo()}
          className="p-1.5 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={() => engineRef.current?.redo()}
          className="p-1.5 hover:text-indigo-600 hover:bg-slate-100 rounded transition-all"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      {/* Bottom Right: Navigation Controls */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4 px-4 py-2 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-slate-600 font-medium text-sm">
        <button
          onClick={() => engineRef.current?.setZoom(-0.25)}
          className="p-1 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
          title="Zoom Out"
        >
          <MinusIcon size={16} />
        </button>
        <button
          onClick={() => engineRef.current?.setZoom(1 - (engineRef.current ? (engineRef.current as any).camera.z : 1))}
          className="flex items-center gap-1 min-w-[50px] justify-center hover:text-indigo-600 cursor-pointer transition-colors"
          title="Reset Zoom"
        >
          {zoom}%
        </button>
        <button
          onClick={() => engineRef.current?.setZoom(0.25)}
          className="p-1 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
          title="Zoom In"
        >
          <Plus size={16} />
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={(e) => {
          engineRef.current?.handleMouseDown(e);
          // Sync selection state if in select tool
          if (activeTool === 'select') {
            setSelectedId(engineRef.current?.selectedShape?.id || null);
          } else {
            setSelectedId(null);
          }
        }}
        className="w-full h-full touch-none block"
        onContextMenu={(e) => e.preventDefault()}
      />

    </div>
  );
}
