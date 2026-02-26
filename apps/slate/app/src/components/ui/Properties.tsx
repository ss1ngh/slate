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

    const glassPanel: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.10), 0 1.5px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
    };

    const segmentTrack: React.CSSProperties = {
        display: 'flex',
        background: 'rgba(0,0,0,0.05)',
        padding: '3px',
        borderRadius: '10px',
        gap: '2px',
    };

    const segmentBtn = (active: boolean): React.CSSProperties => active
        ? {
            flex: 1,
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(99,102,241,0.30)',
            border: 'none',
            cursor: 'pointer',
        }
        : {
            flex: 1,
            padding: '5px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            background: 'transparent',
            color: 'rgba(71,85,105,0.80)',
            border: 'none',
            cursor: 'pointer',
        };

    const labelStyle: React.CSSProperties = {
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'rgba(100,116,139,0.75)',
    };

    const dividerStyle: React.CSSProperties = {
        height: '1px',
        background: 'rgba(0,0,0,0.07)',
    };

    return (
        <div className="fixed left-6 top-1/2 -translate-y-1/2 z-50">
            <div
                className="flex flex-col gap-4 p-4 rounded-2xl w-56"
                style={glassPanel}
            >

                {/* Stroke Color */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Stroke</span>
                    <div className="flex flex-wrap gap-2 items-center">
                        {STROKE_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => onColorChange(color)}
                                className="w-6 h-6 rounded-full transition-transform"
                                style={{
                                    backgroundColor: color,
                                    border: strokeColor === color
                                        ? '2.5px solid rgba(99,102,241,0.9)'
                                        : '2px solid rgba(0,0,0,0.10)',
                                    transform: strokeColor === color ? 'scale(1.15)' : 'scale(1)',
                                    boxShadow: strokeColor === color ? '0 0 0 2px rgba(99,102,241,0.2)' : 'none',
                                }}
                            />
                        ))}
                        <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => onColorChange(e.target.value)}
                            className="w-6 h-6 rounded-full cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none"
                            style={{ border: '2px solid rgba(0,0,0,0.10)' }}
                            title="Custom color"
                        />
                    </div>
                </div>


                {/* Stroke Width */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Stroke Width</span>
                    <div style={segmentTrack}>
                        {STROKE_WIDTHS.map((sw) => (
                            <button
                                key={sw.label}
                                onClick={() => onWidthChange(sw.value)}
                                style={segmentBtn(strokeWidth === sw.value)}
                            >
                                {sw.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={dividerStyle} />

                {/* Style */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Style</span>
                    <div style={segmentTrack}>
                        {STYLES.map((style) => (
                            <button
                                key={style}
                                style={segmentBtn(style === 'Simple')}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

