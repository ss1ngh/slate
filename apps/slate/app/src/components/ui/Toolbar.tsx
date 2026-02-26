import React from 'react'
import { ShapeType } from '../../config/types'
import {
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  Pencil,
  MousePointer2,
  Pointer,
  Diamond,
  Eraser,
  Image as ImageIcon,
  Type
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ShapeType;
  onToolChange: (tool: ShapeType) => void;
}

const tools: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: 'hand', icon: <Pointer size={16} />, label: 'Hand — pan canvas (H)' },
  { type: 'select', icon: <MousePointer2 size={16} />, label: 'Select (V)' },
  { type: 'pencil', icon: <Pencil size={16} />, label: 'Pencil (P)' },
  { type: 'rect', icon: <Square size={16} />, label: 'Rectangle (R)' },
  { type: 'diamond', icon: <Diamond size={16} />, label: 'Diamond (D)' },
  { type: 'circle', icon: <CircleIcon size={16} />, label: 'Circle (C)' },
  { type: 'line', icon: <Minus size={16} />, label: 'Line (L)' },
  { type: 'arrow', icon: <ArrowUpRight size={16} />, label: 'Arrow (A)' },
  { type: 'image', icon: <ImageIcon size={16} />, label: 'Image (I)' },
  { type: 'text', icon: <Type size={16} />, label: 'Text (T)' },
  { type: 'eraser', icon: <Eraser size={16} />, label: 'Eraser (E)' },
];

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50">
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 10px 24px -4px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        {tools.map((tool, i) => {
          const isActive = activeTool === tool.type;

          const showSeparator = i === 1;
          return (
            <React.Fragment key={tool.type}>
              {showSeparator && (
                <div style={{ width: 1, height: 18, background: 'rgba(0,0,0,0.08)', margin: '0 2px', flexShrink: 0 }} />
              )}
              <button
                onClick={() => onToolChange(tool.type)}
                className="w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center"
                style={
                  isActive
                    ? { background: '#e8e8fc', color: '#5353c5' }
                    : { color: '#1e1e1e' }
                }
                onMouseEnter={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                title={tool.label}
              >
                {tool.icon}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
