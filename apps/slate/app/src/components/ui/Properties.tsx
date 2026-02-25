import React from 'react'

const COLORS = [
    '#000000',
    '#ef4444',
    '#3b82f6',
    '#22c55e',
    '#eab308',
    '#a855f7',
    '#f97316',
    '#64748b',
];

const STROKE_WIDTHS = [
    { label: 'Thin', value: 2 },
    { label: 'Normal', value: 5 },
    { label: 'Bold', value: 10 },
];

interface PropertiesProps {
    strokeColor: string;
    onColorChange: (color: string) => void;
    strokeWidth: number;
    onWidthChange: (width: number) => void;
}

export default function Properties({
    strokeColor,
    onColorChange,
    strokeWidth,
    onWidthChange,
}: PropertiesProps) {
    return (
        <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
            <div className="flex flex-col gap-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-xl w-16 items-center">
                {/* color palette */}
                <div className="flex flex-col gap-2">
                    {COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => onColorChange(color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${strokeColor === color ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105'
                                }`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                </div>

                <div className="w-full h-px bg-slate-100" />

                {/* stroke width */}
                <div className="flex flex-col gap-3">
                    {STROKE_WIDTHS.map((sw) => (
                        <button
                            key={sw.label}
                            onClick={() => onWidthChange(sw.value)}
                            className={`
                flex flex-col items-center justify-center gap-1 group
              `}
                            title={`${sw.label} (${sw.value}px)`}
                        >
                            <div
                                className={`
                  rounded-full transition-all duration-200
                  ${strokeWidth === sw.value ? 'bg-indigo-600 scale-110' : 'bg-slate-300 group-hover:bg-slate-400'}
                `}
                                style={{
                                    width: `${Math.max(12, sw.value * 2)}px`,
                                    height: `${Math.max(12, sw.value * 2)}px`
                                }}
                            />
                            <span className={`text-[10px] font-medium ${strokeWidth === sw.value ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {sw.label[0]}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
