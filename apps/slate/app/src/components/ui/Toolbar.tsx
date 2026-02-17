import React from 'react'
import { ShapeType } from '../../config/types'
import {
    Square,
    Circle as CircleIcon,
    Minus,
    ArrowUpRight,
    Pencil,
} from 'lucide-react';

interface ToolbarProps {
    activeTool : ShapeType;
    onToolChange : (tool : ShapeType) => void;
}

const tools : { type : ShapeType; icon: React.ReactNode; label : string}[] = [
    {type : 'pencil', icon: <Pencil size={18}/>, label : 'Pencil'},
    {type : 'rect', icon: <Square size={18}/>, label : 'Square'},
    {type : 'circle', icon: <CircleIcon size={18}/>, label : 'Circle'},
    {type : 'line', icon: <Minus size={18}/>, label : 'Line'},
    {type : 'arrow', icon: <ArrowUpRight size={18}/>, label : 'Arrow'},
];

export default function Toolbar({ activeTool, onToolChange }: ToolbarProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg">
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => onToolChange(tool.type)}
            className={`
              p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center
              ${activeTool === tool.type 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-slate-600 hover:bg-slate-100'
              }
            `}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

