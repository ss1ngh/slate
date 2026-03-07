'use client';

import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { UseCollabReturn } from '../../hooks/useCollab';

interface CollabModalProps {
    onClose: () => void;
    collab: UseCollabReturn;
}

const PRESET_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6',
];

export default function CollabModal({ onClose, collab }: CollabModalProps) {
    const [tab, setTab] = useState<'create' | 'join'>('create');
    const [userName, setUserName] = useState('');
    const [userColor, setUserColor] = useState(PRESET_COLORS[0]!);
    const [password, setPassword] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [copied, setCopied] = useState(false);

    const { status, roomId, isHost, error, createRoom, joinRoom } = collab;
    const isLoading = status === 'connecting';

    // Auto-close for joiners as soon as they successfully join
    React.useEffect(() => {
        if (roomId && !isHost) {
            onClose();
        }
    }, [roomId, isHost, onClose]);

    const handleCreate = () => {
        if (!userName.trim()) return;
        createRoom({ userName: userName.trim(), userColor, ...(password ? { password } : {}) });
    };

    const handleJoin = () => {
        if (!userName.trim() || !joinRoomId.trim()) return;
        joinRoom({ roomId: joinRoomId.trim(), userName: userName.trim(), userColor, ...(password ? { password } : {}) });
    };

    const copyRoomId = () => {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Show share screen only for the host after room is created
    if (roomId && isHost && status === 'connected') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                        <h3 className="text-base font-semibold text-slate-900">Room Created 🎉</h3>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <p className="text-sm text-slate-500">Share this Room ID with others so they can join:</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-slate-100 rounded-xl px-4 py-3 font-mono text-lg font-bold text-slate-800 tracking-widest text-center">
                                {roomId}
                            </div>
                            <button
                                onClick={copyRoomId}
                                className="p-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors"
                                title="Copy Room ID"
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 text-center">Waiting for others to join…</p>
                    </div>
                    <div className="px-5 pb-5">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
                        >
                            Start Drawing
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <h3 className="text-base font-semibold text-slate-900">Collaborate</h3>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    {(['create', 'join'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab === t
                                ? 'text-indigo-600 border-b-2 border-indigo-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            {t === 'create' ? 'Create Room' : 'Join Room'}
                        </button>
                    ))}
                </div>

                <div className="p-5 space-y-4">
                    {/* Join: Room ID input */}
                    {tab === 'join' && (
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Room ID</label>
                            <input
                                type="text"
                                value={joinRoomId}
                                onChange={e => setJoinRoomId(e.target.value)}
                                placeholder="e.g. Ab12cD"
                                maxLength={6}
                                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono tracking-widest text-center"
                            />
                        </div>
                    )}

                    {/* Your name */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Your Name</label>
                        <input
                            type="text"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                            placeholder="Enter your name"
                            maxLength={20}
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Color picker */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Your Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setUserColor(c)}
                                    className="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                                    style={{
                                        backgroundColor: c,
                                        outline: userColor === c ? `3px solid ${c}` : 'none',
                                        outlineOffset: '2px',
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Optional password */}
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Password <span className="text-slate-400 font-normal">(optional)</span></label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Leave blank for open room"
                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5">
                    <button
                        onClick={tab === 'create' ? handleCreate : handleJoin}
                        disabled={isLoading || !userName.trim() || (tab === 'join' && !joinRoomId.trim())}
                        className="w-full py-2.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl transition-colors"
                    >
                        {isLoading ? 'Connecting…' : tab === 'create' ? 'Create Room' : 'Join Room'}
                    </button>
                </div>
            </div>
        </div>
    );
}
