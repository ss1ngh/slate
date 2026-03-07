'use client'

import React, { useEffect, useRef, useState } from 'react'
import { SlateEngine } from '../canvas-engine/engine';
import { ShapeType, ToolType } from '@repo/shared';
import Toolbar from './ui/Toolbar';
import Properties from './ui/Properties';
import CollabModal from './ui/CollabModal';
import RemoteCursors from './RemoteCursors';
import { useCollab } from '../hooks/useCollab';
import { Undo2, Redo2, Plus, Minus as MinusIcon, Search, HelpCircle, Trash2, Download, Upload, Menu, Users, Copy, Check, LogOut } from 'lucide-react';
import Link from 'next/link';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin'], weight: ['400', '600'] });

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
  const [shapeCount, setShapeCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const collab = useCollab(engineRef);
  const { remoteDrawingUser, remoteClearEvent, acceptRemoteClear } = collab;

  // Sliding toast for drawing lock
  const [drawingToast, setDrawingToast] = useState<{ name: string; visible: boolean } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (remoteDrawingUser) {
      setDrawingToast({ name: remoteDrawingUser.userName, visible: true });
    } else {
      setDrawingToast(prev => prev ? { ...prev, visible: false } : null);
      toastTimerRef.current = setTimeout(() => setDrawingToast(null), 350);
    }
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, [remoteDrawingUser]);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new SlateEngine(canvasRef.current);
      collab.bindEngine(engineRef.current);

      // Sync engine state to React
      engineRef.current.onZoomChange = (z: number) => setZoom(z);
      engineRef.current.onSceneChange = (count: number) => setShapeCount(count);
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
    <div className="fixed inset-0 overflow-hidden bg-[#f8fafc]">
      {/* Top Left: Hamburger Menu */}
      <div className="fixed top-3 left-4 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 bg-white/95 backdrop-blur-xl border border-slate-200/50 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08),0_10px_24px_-4px_rgba(0,0,0,0.10)] text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-all font-medium text-sm"
          title="Menu"
        >
          <Menu size={20} />
        </button>

        {/* dropdown menu */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200/50 rounded-xl shadow-[0_10px_30px_rgb(0,0,0,0.1)] overflow-hidden flex flex-col py-1">
            <button
              onClick={() => {
                engineRef.current?.downloadImage();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-colors text-sm w-full text-left"
            >
              <Download size={16} />
              <span>Export as PNG</span>
            </button>
            <button
              onClick={() => {
                setIsCollabModalOpen(true);
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 transition-colors text-sm w-full text-left"
            >
              <Users size={16} />
              <span>Collaborate</span>
            </button>
          </div>
        )}
      </div>
      {/* Top Right: Room Status Chip */}
      {collab.roomId && (
        <div className="fixed top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-xl border border-indigo-200 rounded-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.08)] text-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono font-bold text-slate-700 tracking-widest">{collab.roomId}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(collab.roomId!);
              setCopiedRoomId(true);
              setTimeout(() => setCopiedRoomId(false), 2000);
            }}
            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
            title="Copy Room ID"
          >
            {copiedRoomId ? <Check size={13} /> : <Copy size={13} />}
          </button>
          <div className="w-px h-4 bg-slate-200" />
          {collab.peers.map(p => (
            <div
              key={p.userId}
              title={p.userName}
              className="w-5 h-5 rounded-full border-2 border-white shadow-sm text-[9px] flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: p.userColor }}
            >
              {p.userName[0]?.toUpperCase()}
            </div>
          ))}
          <button
            onClick={() => collab.leaveRoom()}
            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
            title="Leave Room"
          >
            <LogOut size={13} />
          </button>
        </div>
      )}

      {shapeCount === 0 && !hasInteracted && !remoteDrawingUser && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-40 mt-12">
          <div className="text-center mb-16 flex flex-col items-center">
            <div className="flex items-center gap-4 mb-2 mt-30">

              <svg width="50" height="50" viewBox="0 0 50 50" fill="none" className="shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-2xl">
                <rect width="50" height="50" rx="16" fill="#4f46e5" />
                <g transform="translate(12, 12) scale(1.1)">
                  <path
                    d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </svg>
              <h1 className={`text-4xl font-extrabold text-indigo-500 ${caveat.className}`}>
                SLATE
              </h1>
            </div>
            <p className={`text-slate-400 text-xl ${caveat.className}`}>All your data is saved locally in the browser</p>
          </div>

          {/* arrow pointing to Top Left Menu */}
          <div className="absolute top-4 left-8 flex items-start gap-2 opacity-60">
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" className="text-slate-400">
              <path d="M 90 90 Q 30 90, 15 25 M 5 45 L 15 25 L 35 35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className={`text-slate-400 text-xl ${caveat.className} mt-20 ml-2`}>Export, preferences, collaborative...</span>
          </div>

          {/* arrow pointing to top Center Toolbar */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
            <svg width="50" height="100" viewBox="0 0 40 60" fill="none" className="text-slate-400 mb-1">
              <path d="M 30 70 Q 45 50, 20 10 M 15 25 L 20 10 L 40 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className={`text-slate-400 text-2xl ${caveat.className} text-center leading-tight`}>Pick a tool &<br />Start drawing!</span>
          </div>

          {/* arrow pointing to Bottom Right Help Icon */}
          <div className="absolute bottom-24 right-16 flex items-end gap-2 opacity-60">
            <span className={`text-slate-400 text-xl ${caveat.className} mb-12 mr-2 leading-tight text-right`}>Need help?<br />Read the guide!</span>
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-slate-400">
              <path d="M 10 10 Q 70 20, 70 70 M 55 55 L 70 70 L 75 50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>
        </div>
      )}

      {/* hidden file Input for Importing Assets */}
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

      <Toolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      {/* Remote cursors overlay */}
      <RemoteCursors cursors={collab.remoteCursors} />

      {/* only show properties bar when a shape is selected */}
      {selectedIds.length > 0 && (
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
      )}

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
        onMouseMove={(e) => {
          collab.sendCursor(e.clientX, e.clientY);
        }}
        onMouseDown={(e) => {
          setHasInteracted(true);
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

      {/* Drawing lock overlay — invisible blocker while someone is drawing */}
      {remoteDrawingUser && (
        <div className="fixed inset-0 z-[60]" style={{ cursor: 'not-allowed', pointerEvents: 'all' }}>
          <div className="absolute inset-0 bg-indigo-50/10" />
        </div>
      )}

      {/* Sliding toast — just below toolbar */}
      {drawingToast && (
        <div
          className="fixed left-1/2 z-[200] pointer-events-none"
          style={{
            top: '56px',
            transform: `translateX(-50%) translateY(${drawingToast.visible ? '0' : '-150%'})`,
            opacity: drawingToast.visible ? 1 : 0,
            transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
          }}
        >
          <div className="flex items-center gap-2.5 px-4 py-2 bg-white border border-indigo-200 rounded-xl shadow-[0_8px_24px_rgba(99,102,241,0.18)] text-sm text-slate-700 select-none whitespace-nowrap">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
            </span>
            <span className="font-semibold text-indigo-600">{drawingToast.name}</span>
            <span className="text-slate-500">is drawing…</span>
          </div>
        </div>
      )}

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
                  setHasInteracted(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Clear Prompt Modal */}
      {remoteClearEvent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Canvas Cleared</h3>
              <p className="text-slate-600 text-sm mb-4">
                <span className="font-semibold text-indigo-600">{remoteClearEvent.userName}</span> has cleared the canvas.
                Would you like to save a copy of the current drawing before it disappears?
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => {
                  acceptRemoteClear();
                  setHasInteracted(false);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Discard current canvas"
              >
                Clear Now
              </button>
              <button
                onClick={() => {
                  engineRef.current?.downloadImage();
                  acceptRemoteClear();
                  setHasInteracted(false);
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm flex items-center gap-2"
              >
                <Download size={16} />
                Save Image & Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collab Modal */}
      {isCollabModalOpen && (
        <CollabModal
          onClose={() => setIsCollabModalOpen(false)}
          collab={collab}
        />
      )}

    </div>
  );
}
