import React from 'react'

const STROKE_COLORS = [
    '#adb5bd', // light gray
    '#ff8787', // light red
    '#51cf66', // light green
    '#5c7cfa', // light blue
    '#ffa94d', // light orange
    '#e599f7', // light purple
];

const STROKE_WIDTHS = [
    { label: 'Thin', value: 2 },
    { label: 'Bold', value: 5 },
    { label: 'Extra', value: 10 },
];

const STYLES = ['Simple', 'Rough', 'Dense'];

interface PropertiesProps {
    strokeColor: string;
    onColorChange: (color: string) => void;
    strokeWidth: number;
    onWidthChange: (width: number) => void;
    isSelected: boolean;
}

export default function Properties({
    strokeColor,
    onColorChange,
    strokeWidth,
    onWidthChange,
    isSelected
}: PropertiesProps) {
    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
            <div className="flex flex-col gap-5 p-5 bg-slate-700 border border-slate-600 rounded-2xl shadow-2xl w-56 text-white font-medium">

                {/* Stroke Section */}
                <div className="space-y-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Stroke</span>
                    <div className="flex flex-wrap gap-2 items-center">
                        {STROKE_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => onColorChange(color)}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${strokeColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                        {/* Native color picker for custom colors */}
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => onColorChange(e.target.value)}
                            className="w-6 h-6 rounded-full border-none p-0 cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                            title="Custom color"
                        />
                    </div>
                </div>

                {/* Background Section (Placeholder) */}
                <div className="space-y-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Background</span>
                    <div className="flex gap-2">
                        <button className="w-6 h-6 rounded-full border border-slate-500 flex items-center justify-center bg-slate-800">
                            <div className="w-[1px] h-4 bg-red-500 rotate-45" />
                        </button>
                        {['#343a40', '#212529', '#1864ab', '#087f5b', '#c92a2a'].map(c => (
                            <button key={c} className="w-6 h-6 rounded-full" style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                {/* Stroke Width Section */}
                <div className="space-y-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Stroke Width</span>
                    <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                        {STROKE_WIDTHS.map((sw) => (
                            <button
                                key={sw.label}
                                onClick={() => onWidthChange(sw.value)}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs transition-all ${strokeWidth === sw.value ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:text-white'}`}
                            >
                                {sw.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Style Section */}
                <div className="space-y-3">
                    <span className="text-xs text-slate-400 uppercase tracking-wider">Style</span>
                    <div className="flex bg-slate-800 p-1 rounded-xl gap-1">
                        {STYLES.map((style) => (
                            <button
                                key={style}
                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs ${style === 'Simple' ? 'bg-indigo-500 text-white' : 'text-slate-300'}`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}
