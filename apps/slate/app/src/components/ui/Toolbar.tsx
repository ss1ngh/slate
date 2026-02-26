import React from 'react'
import { ShapeType } from '../../config/types'
import {
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  Pencil,
  MousePointer2,
  Hand,
  Diamond,
  Type,
  Eraser
} from 'lucide-react';

interface ToolbarProps {
  activeTool: ShapeType;
  onToolChange: (tool: ShapeType) => void;
}

const tools: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
  { type: 'select', icon: <MousePointer2 size={18} />, label: 'Select (V)' },
  { type: 'pencil', icon: <Pencil size={18} />, label: 'Pencil (P)' },
  { type: 'rect', icon: <Square size={18} />, label: 'Rectangle (R)' },
  { type: 'circle', icon: <CircleIcon size={18} />, label: 'Circle (C)' },
  { type: 'line', icon: <Minus size={18} />, label: 'Line (L)' },
  { type: 'arrow', icon: <ArrowUpRight size={18} />, label: 'Arrow (A)' },
];

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Adding decorative icons to match the mockup's complexity */}
        <div className="flex items-center gap-1 px-2 border-r border-slate-700">
          <button className="p-2 text-slate-400 hover:text-white transition-colors">
            <Hand size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1 px-1">
          {tools.map((tool) => (
            <button
              key={tool.type}
              onClick={() => onToolChange(tool.type)}
              className={`
                w-10 h-10 rounded-xl transition-all duration-200 flex items-center justify-center group
                ${activeTool === tool.type
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                }
              `}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}

          {/* Placeholder for future tools to match mockup layout */}
          <button className="w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-700 transition-all flex items-center justify-center">
            <Diamond size={18} />
          </button>
          <button className="w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-700 transition-all flex items-center justify-center">
            <Type size={18} />
          </button>
          <button className="w-10 h-10 rounded-xl text-slate-400 hover:bg-slate-700 transition-all flex items-center justify-center">
            <Eraser size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
