'use client'

import {
    Pen,
    Hand,
    Type,
    Square,
    Circle,
    MousePointer2,
    Image as ImageIcon,
    Eraser,
    Undo2,
    Redo2,
    Trash2,
    Layers,
    Search,
    Download,
    BoxSelect,
    LogOut
} from 'lucide-react'
import Link from 'next/link'

const FeatureCard = ({
    icon: Icon,
    title,
    description
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
        <div className="p-2 bg-slate-100 rounded-lg">
            <Icon size={20} className="text-slate-700" />
        </div>
        <div>
            <h3 className="font-medium text-slate-900 mb-1">{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>
    </div>
)

const ShortcutRow = ({ keys, action }: { keys: string[]; action: string }) => (
    <div className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-medium text-slate-700">{action}</span>
        <div className="flex gap-1">
            {keys.map((k, i) => (
                <kbd key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-600 shadow-sm">
                    {k}
                </kbd>
            ))}
        </div>
    </div>
)

const GuidePage = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900">

            {/* Header */}
            <div className="max-w-4xl mx-auto px-6 pt-16 pb-12 text-center">
                <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200 mb-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Pen className="text-white" size={24} />
                    </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                    Guide
                </h1>
                <p className="text-slate-500 text-lg max-w-xl mx-auto">
                    Master the collaborative whiteboard. Everything from basic drawing to advanced grouping and z-index management.
                </p>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-6 pb-24 space-y-12">

                {/* Getting Started */}
                <section>
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
                        <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
                            🚀 Getting Started
                        </h2>
                        <ol className="space-y-4 text-slate-600">
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                                <span className="pt-1">Select a tool from the floating toolbar at the bottom center of the screen.</span>
                            </li>
                            <li className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                                <span className="pt-1">Your drawings are <strong>saved automatically</strong> to your browser. You can refresh safely.</span>
                            </li>
                        </ol>
                    </div>
                </section>

                {/* Tools */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 mb-6 px-2">🎨 Core Tools</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <FeatureCard
                            icon={MousePointer2}
                            title="Select & Move (V)"
                            description="Click any shape to select it. Drag to move, or use the 8 handles to perfectly scale and resize it."
                        />
                        <FeatureCard
                            icon={Hand}
                            title="Pan / Hand Tool (H)"
                            description="Click and drag the canvas to move around the infinite workspace without drawing."
                        />
                        <FeatureCard
                            icon={Pen}
                            title="Pencil (P)"
                            description="Draw smooth, pressure-simulated freehand strokes. Perfect for handwritten notes."
                        />
                        <FeatureCard
                            icon={Square}
                            title="Shapes (R, C, D)"
                            description="Draw Rectangles, Circles, Diamonds, Lines, and Arrows using precise vector math."
                        />
                        <FeatureCard
                            icon={ImageIcon}
                            title="Image (I)"
                            description="Insert local images directly onto the canvas. They can be resized and grouped like any shape."
                        />
                        <FeatureCard
                            icon={Eraser}
                            title="Eraser (E)"
                            description="Click or drag across shapes to instantly delete them from the canvas."
                        />
                    </div>
                </section>

                {/* Advanced Features */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 mb-6 px-2">✨ Advanced Features</h2>
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">

                        <div>
                            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <BoxSelect size={18} className="text-indigo-500" /> Multi-Selection
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Using the Select tool, click and drag on the empty canvas to create a blue selection box. Any shape caught inside the box will be selected simultaneously. You can then move or delete them all at once.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Layers size={18} className="text-indigo-500" /> Grouping & Z-Index
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                When you have multiple items selected, you can Group them (<kbd className="font-mono text-xs">Cmd+G</kbd>). Grouped items scale and move as a single perfect unit.
                                You can also arrange overlapping objects. Right-click or use the context menu to Bring Forward, Send Backward, Send to Back, or Bring to Front.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                <Search size={18} className="text-indigo-500" /> Infinite Canvas & Zoom
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Use your trackpad, scroll wheel, or the on-screen zoom controls (-/+) to zoom in and out of your designs. Press the "Zoom to 100%" button to quickly snap back to default scale.
                            </p>
                        </div>

                    </div>
                </section>

                {/* Shortcuts Cheat Sheet */}
                <section>
                    <h2 className="text-xl font-semibold text-slate-900 mb-6 px-2">⌨️ Keyboard Shortcuts</h2>
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">

                            {/* Left Column */}
                            <div className="p-4">
                                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">Tools</h3>
                                <ShortcutRow action="Select Tool" keys={['V']} />
                                <ShortcutRow action="Hand / Pan" keys={['H']} />
                                <ShortcutRow action="Pencil" keys={['P']} />
                                <ShortcutRow action="Rectangle" keys={['R']} />
                                <ShortcutRow action="Circle" keys={['C']} />
                                <ShortcutRow action="Diamond" keys={['D']} />
                                <ShortcutRow action="Line" keys={['L']} />
                                <ShortcutRow action="Arrow" keys={['A']} />
                                <ShortcutRow action="Image" keys={['I']} />
                                <ShortcutRow action="Eraser" keys={['E']} />
                            </div>

                            {/* Right Column */}
                            <div className="p-4">
                                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 px-3">Actions</h3>
                                <ShortcutRow action="Undo" keys={['Cmd', 'Z']} />
                                <ShortcutRow action="Redo" keys={['Cmd', 'Shift', 'Z']} />
                                <ShortcutRow action="Delete Selected" keys={['Backspace']} />
                                <ShortcutRow action="Group" keys={['Cmd', 'G']} />
                                <ShortcutRow action="Ungroup" keys={['Cmd', 'Shift', 'G']} />
                                <ShortcutRow action="Select All" keys={['Cmd', 'A']} />
                                <ShortcutRow action="Zoom In" keys={['Cmd', '+']} />
                                <ShortcutRow action="Zoom Out" keys={['Cmd', '-']} />
                                <ShortcutRow action="Reset Zoom" keys={['Cmd', '0']} />
                            </div>

                        </div>
                    </div>
                </section>

                <div className="text-center pt-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-full px-6 py-2 hover:scale-95"
                    >
                        Back to Canvas
                        <LogOut size={18} className="ml-2" />
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default GuidePage
