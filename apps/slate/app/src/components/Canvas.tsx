'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SlateEngine } from '../canvas-engine/engine';
import { ShapeType, ToolType } from '../config/types';
import Toolbar from './ui/Toolbar';
import Properties from './ui/Properties';
import { Undo2, Redo2, Plus, Minus as MinusIcon, Search, HelpCircle, Trash2, Download, Upload } from 'lucide-react';
import Link from 'next/link';

export default function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [activeTool, setActiveTool] = useState<ShapeType>('pencil');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [strokeStyle, setStrokeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new SlateEngine(canvasRef.current);

      // Sync engine state to React
      engineRef.current.onZoomChange = (z: number) => setZoom(z);
      engineRef.current.onSelectionChange = (s: any) => {
        if (!engineRef.current) return;
        const shapes = engineRef.current.selectedShapes || [];
        setSelectedIds(shapes.map((shape: any) => shape.id));
      };
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
        setSelectedIds([]);
      }

      if (activeTool === 'image') {
        fileInputRef.current?.click();
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
        setIsClearModalOpen(true);
        return;
      }

      // Group/Ungroup shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          engineRef.current.ungroupShapes();
        } else {
          engineRef.current.groupShapes();
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
        case 'i': setActiveTool('image'); break;
        case 't': setActiveTool('text'); break;
        case 'e': setActiveTool('eraser'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  //render DOM element
  return (
    <div className='relative w-full h-screen'>
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const src = ev.target?.result as string;
              if (engineRef.current) {
                engineRef.current.setPendingImage(src);
              }
            };
            reader.readAsDataURL(file);
          }
          e.target.value = '';
        }}
      />

      {/* export */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => engineRef.current?.exportImage()}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 border border-indigo-500 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_24px_-4px_rgba(0,0,0,0.10)] text-white hover:bg-indigo-700 transition-all font-medium text-sm"
          title="Export Drawing"
        >
          <Download size={16} />
          <span>Export</span>
        </button>
      </div>

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
        isSelected={selectedIds.length > 0}
        isMultipleSelected={selectedIds.length > 1}
        isGroupSelected={selectedIds.length === 1 && engineRef.current?.selectedShapes?.[0]?.type === 'group'}
        onBringForward={() => engineRef.current?.bringForward()}
        onSendBackward={() => engineRef.current?.sendBackward()}
        onBringToFront={() => engineRef.current?.bringToFront()}
        onSendToBack={() => engineRef.current?.sendToBack()}
        onGroupShapes={() => engineRef.current?.groupShapes()}
        onUngroupShapes={() => engineRef.current?.ungroupShapes()}
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
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <button
          onClick={() => setIsClearModalOpen(true)}
          className="p-1.5 hover:text-red-600 hover:bg-red-50 text-slate-500 rounded transition-all"
          title="Clear Canvas (Ctrl+Shift+Backspace)"
        >
          <Trash2 size={16} />
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
        <div className="w-px h-4 bg-slate-200 mx-1" />
        <Link
          href="/guide"
          className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors"
          title="View User Guide (How to use)"
        >
          <HelpCircle size={16} />
        </Link>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={(e) => {
          engineRef.current?.handleMouseDown(e);
          // Sync selection state if in select tool
          if (activeTool === 'select' && engineRef.current) {
            const shapes = engineRef.current.selectedShapes || [];
            setSelectedIds(shapes.map((shape: any) => shape.id));
          } else {
            setSelectedIds([]);
          }
        }}
        className="w-full h-full touch-none block"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Clear Canvas Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Clear Canvas</h3>
              <p className="text-slate-500 text-sm">
                Are you sure you want to clear the entire canvas? This action cannot be undone.
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  engineRef.current?.clearCanvas();
                  setIsClearModalOpen(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
