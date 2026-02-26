import React, { useState, useRef, useEffect } from 'react';
import { Pipette, GripHorizontal, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, Group, Ungroup } from 'lucide-react';

const STROKE_COLORS = [
    '#1e1e1e',
    '#e03131',
    '#f783ac',
    '#2f9e44',
    '#1971c2',
];

const STROKE_WIDTHS = [
    { label: 'Thin', value: 2 },
    { label: 'Bold', value: 7 },
    { label: 'Extra', value: 15 },
];



interface PropertiesProps {
    strokeColor: string;
    onColorChange: (color: string) => void;
    strokeWidth: number;
    onWidthChange: (width: number) => void;
    strokeStyle: 'solid' | 'dashed' | 'dotted';
    onStyleChange: (style: 'solid' | 'dashed' | 'dotted') => void;
    isSelected: boolean;
    isMultipleSelected: boolean;
    isGroupSelected: boolean;
    onBringForward: () => void;
    onSendBackward: () => void;
    onBringToFront: () => void;
    onSendToBack: () => void;
    onGroupShapes: () => void;
    onUngroupShapes: () => void;
}

export default function Properties({
    strokeColor,
    onColorChange,
    strokeWidth,
    onWidthChange,
    strokeStyle,
    onStyleChange,
    isSelected,
    isMultipleSelected,
    isGroupSelected,
    onBringForward,
    onSendBackward,
    onBringToFront,
    onSendToBack,
    onGroupShapes,
    onUngroupShapes
}: PropertiesProps) {

    const [pos, setPos] = useState({ x: 20, y: 160 });
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const [feedback, setFeedback] = useState<string | null>(null);
    const feedbackTimeout = useRef<NodeJS.Timeout | null>(null);

    const showFeedback = (text: string) => {
        setFeedback(text);
        if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
        feedbackTimeout.current = setTimeout(() => setFeedback(null), 1500);
    };

    const handleBringToFront = () => { onBringToFront(); showFeedback("Moved to top"); };
    const handleBringForward = () => { onBringForward(); showFeedback("Moved forward"); };
    const handleSendBackward = () => { onSendBackward(); showFeedback("Moved backward"); };
    const handleSendToBack = () => { onSendToBack(); showFeedback("Moved to bottom"); };

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            setPos({
                x: Math.max(0, e.clientX - offset.current.x),
                y: Math.max(0, e.clientY - offset.current.y),
            });
        };
        const onUp = () => { dragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    const onDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
        dragging.current = true;
        offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        e.preventDefault();
    };

    const glassPanel: React.CSSProperties = {
        background: 'rgba(255, 255, 255, 0.65)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.85)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.10), 0 1.5px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
    };

    const segmentTrack: React.CSSProperties = {
        display: 'flex',
        background: 'rgba(0, 0, 0, 0.06)',
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
            color: 'rgba(0,0,0,0.75)',
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
        <div
            className="fixed z-50"
            style={{ left: pos.x, top: pos.y }}
        >
            <div
                className="flex flex-col gap-4 p-4 rounded-2xl w-55"
                style={glassPanel}
            >
                {/*drag*/}
                <div
                    className="flex items-center justify-center -mt-1 mb-0 cursor-grab active:cursor-grabbing"
                    style={{ color: 'rgba(0,0,0,0.25)' }}
                    onMouseDown={onDragStart}
                    title="Drag to move"
                >
                    <GripHorizontal size={16} />
                </div>

                {/* stroke color */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Stroke</span>
                    <div className="flex gap-1.5 items-center">
                        {STROKE_COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => onColorChange(color)}
                                className="w-6 h-6 rounded-full transition-transform flex-shrink-0"
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

                        <div style={{ width: 2, height: 20, background: 'rgba(0, 0, 0, 0.45)', margin: '0 2px', flexShrink: 0 }} />
                        <label
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors"
                            style={{ border: '2px solid rgba(0,0,0,0.12)', color: '#555' }}
                            title="Custom color"
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Pipette size={14} />
                            <input
                                type="color"
                                value={strokeColor}
                                onChange={(e) => onColorChange(e.target.value)}
                                className="sr-only"
                            />
                        </label>
                    </div>
                </div>

                <div style={dividerStyle} />

                {/* stroke width */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Stroke Width</span>
                    <div style={segmentTrack}>
                        {([
                            { value: 2, sw: 1.5, title: 'Thin' },
                            { value: 7, sw: 3, title: 'Bold' },
                            { value: 15, sw: 5.5, title: 'Extra' },
                        ] as { value: number; sw: number; title: string }[]).map(({ value, sw, title }) => (
                            <button
                                key={value}
                                onClick={() => onWidthChange(value)}
                                style={{ ...segmentBtn(strokeWidth === value), padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title={title}
                            >
                                <svg width="28" height="10" viewBox="0 0 28 10">
                                    <line x1="2" y1="5" x2="26" y2="5"
                                        stroke="currentColor"
                                        strokeWidth={sw}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                <div style={dividerStyle} />

                {/* stroke style */}
                <div className="space-y-2.5">
                    <span style={labelStyle}>Style</span>
                    <div style={segmentTrack}>
                        {([
                            { value: 'solid', dasharray: 'none', title: 'Solid' },
                            { value: 'dashed', dasharray: '4 3', title: 'Dashed' },
                            { value: 'dotted', dasharray: '1.5 3', title: 'Dotted' },
                        ] as { value: 'solid' | 'dashed' | 'dotted'; dasharray: string; title: string }[]).map(({ value, dasharray, title }) => (
                            <button
                                key={value}
                                onClick={() => onStyleChange(value)}
                                style={{ ...segmentBtn(strokeStyle === value), padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title={title}
                            >
                                <svg width="28" height="10" viewBox="0 0 28 10">
                                    <line x1="2" y1="5" x2="26" y2="5"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeDasharray={dasharray === 'none' ? undefined : dasharray}
                                    />
                                </svg>
                            </button>
                        ))}
                    </div>
                </div>

                {isSelected && (
                    <>
                        <div style={dividerStyle} />
                        <div className="space-y-2.5 relative">
                            <div className="flex justify-between items-center">
                                <span style={labelStyle}>Layer</span>
                                {feedback && (
                                    <span className="text-[10px] font-semibold text-indigo-600 animate-in fade-in slide-in-from-bottom-1 px-1.5 py-0.5 rounded bg-indigo-50/80 border border-indigo-100/50">
                                        {feedback}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleBringToFront} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors" title="Bring to Front">
                                    <ArrowUpToLine size={16} className="text-slate-600" />
                                </button>
                                <button onClick={handleBringForward} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors" title="Bring Forward">
                                    <ArrowUp size={16} className="text-slate-600" />
                                </button>
                                <button onClick={handleSendBackward} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors" title="Send Backward">
                                    <ArrowDown size={16} className="text-slate-600" />
                                </button>
                                <button onClick={handleSendToBack} className="p-1.5 hover:bg-black/5 rounded-lg transition-colors" title="Send to Back">
                                    <ArrowDownToLine size={16} className="text-slate-600" />
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Grouping Actions */}
                {(isMultipleSelected || isGroupSelected) && (
                    <>
                        <div style={dividerStyle} />
                        <div className="space-y-2.5 relative">
                            <span style={labelStyle}>Group Actions</span>
                            <div className="flex gap-2 w-full">
                                {isMultipleSelected && (
                                    <button
                                        onClick={() => { onGroupShapes(); showFeedback("Grouped"); }}
                                        className="flex-1 flex justify-center items-center gap-1.5 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        <Group size={14} /> Group
                                    </button>
                                )}
                                {isGroupSelected && (
                                    <button
                                        onClick={() => { onUngroupShapes(); showFeedback("Ungrouped"); }}
                                        className="flex-1 flex justify-center items-center gap-1.5 py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg text-xs font-semibold transition-colors"
                                    >
                                        <Ungroup size={14} /> Ungroup
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div>
    );
}
