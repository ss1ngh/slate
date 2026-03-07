'use client';

import React from 'react';
import type { RemoteCursor } from '../hooks/useCollab';

interface RemoteCursorsProps {
    cursors: Map<string, RemoteCursor>;
}

export default function RemoteCursors({ cursors }: RemoteCursorsProps) {
    return (
        <div className="fixed inset-0 pointer-events-none z-30">
            {[...cursors.values()].map((cursor) => {
                // Hide cursor that hasn't moved yet (default off-screen position)
                if (cursor.x < -100) return null;

                return (
                    <div
                        key={cursor.userId}
                        className="absolute flex flex-col items-start"
                        style={{ left: cursor.x, top: cursor.y, transform: 'translate(0, 0)' }}
                    >
                        {/* SVG cursor arrow */}
                        <svg
                            width="18"
                            height="18"
                            viewBox="0 0 18 18"
                            fill="none"
                            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                        >
                            <path
                                d="M2 2L14 7L8.5 9L7 14L2 2Z"
                                fill={cursor.userColor}
                                stroke="white"
                                strokeWidth="1.5"
                                strokeLinejoin="round"
                            />
                        </svg>

                        {/* Name tag */}
                        <span
                            className="text-white text-xs font-medium px-1.5 py-0.5 rounded-md mt-0.5 whitespace-nowrap"
                            style={{ backgroundColor: cursor.userColor }}
                        >
                            {cursor.userName}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
