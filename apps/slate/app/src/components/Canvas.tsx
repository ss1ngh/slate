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
      <div className="fixed bottom-6 left-6 z-50 flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl shadow-lg">
        <button
          onClick={() => engineRef.current?.undo()}
          className="p-2 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={() => engineRef.current?.redo()}
          className="p-2 text-slate-600 hover:bg-white hover:text-indigo-600 rounded-lg transition-all"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* Bottom Center: Navigation Controls */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl shadow-lg text-slate-500 font-medium text-sm">
        <button className="p-1 hover:text-indigo-600 transition-colors"><MinusIcon size={16} /></button>
        <div className="flex items-center gap-1 min-w-[60px] justify-center">
          {zoom}%
        </div>
        <button className="p-1 hover:text-indigo-600 transition-colors"><Plus size={16} /></button>
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
