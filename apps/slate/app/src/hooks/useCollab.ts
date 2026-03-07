'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PeerInfo, ServerMessage } from '@repo/shared';
import type { SlateEngine } from '../canvas-engine/engine';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

export interface RemoteCursor {
    userId: string;
    userName: string;
    userColor: string;
    x: number;
    y: number;
}

export type CollabStatus = 'idle' | 'connecting' | 'connected';

export interface UseCollabReturn {
    status: CollabStatus;
    roomId: string | null;
    userId: string | null;
    isHost: boolean;
    peers: PeerInfo[];
    remoteCursors: Map<string, RemoteCursor>;
    remoteDrawingUser: { userId: string; userName: string } | null;
    remoteClearEvent: { userId: string; userName: string } | null;
    createRoom: (opts: { userName: string; userColor: string; password?: string }) => void;
    joinRoom: (opts: { roomId: string; userName: string; userColor: string; password?: string }) => void;
    leaveRoom: () => void;
    sendCursor: (x: number, y: number) => void;
    acceptRemoteClear: () => void;
    error: string | null;
}

export function useCollab(engineRef: React.RefObject<SlateEngine | null>): UseCollabReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<CollabStatus>('idle');
    const [roomId, setRoomId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [peers, setPeers] = useState<PeerInfo[]>([]);
    const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [remoteDrawingUser, setRemoteDrawingUser] = useState<{ userId: string; userName: string } | null>(null);
    const [remoteClearEvent, setRemoteClearEvent] = useState<{ userId: string; userName: string } | null>(null);

    // Keep a stable ref to roomId for use inside callbacks
    const roomIdRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);
    roomIdRef.current = roomId;
    userIdRef.current = userId;

    // --- Send helper ---
    const sendMsg = useCallback((msg: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(msg));
        }
    }, []);

    // --- Wire engine callbacks so local changes go out to the server ---
    const bindEngine = useCallback((engine: SlateEngine) => {
        engine.onShapeAdd = (shape) => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'shape-add', shape });
        };

        engine.onShapeUpdate = (shape) => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'shape-update', shape });
        };

        engine.onShapeDelete = (ids) => {
            if (!roomIdRef.current) return;
            ids.forEach(shapeId => sendMsg({ type: 'shape-delete', shapeId }));
        };

        // Stream in-progress shape to peers so they see drawing in real-time
        engine.onShapePreview = (shape) => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'shape-update', shape });
        };

        engine.onDrawingStart = () => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'drawing-lock' });
        };

        engine.onDrawingEnd = () => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'drawing-unlock' });
        };

        engine.onCanvasClear = () => {
            if (!roomIdRef.current) return;
            sendMsg({ type: 'canvas-clear' });
        };
    }, [sendMsg]);

    // --- Open WebSocket and handle incoming messages ---
    const openSocket = useCallback((): Promise<WebSocket> => {
        return new Promise((resolve, reject) => {
            // Close any existing connection
            wsRef.current?.close();

            setStatus('connecting');
            setError(null);

            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                resolve(ws);
            };

            ws.onerror = () => {
                setStatus('idle');
                setError('Could not connect to the collab server.');
                reject(new Error('WS connect failed'));
            };

            ws.onclose = () => {
                setStatus('idle');
                setRoomId(null);
                setUserId(null);
                setPeers([]);
                setRemoteCursors(new Map());
            };

            ws.onmessage = (event) => {
                let msg: ServerMessage;
                try {
                    msg = JSON.parse(event.data as string) as ServerMessage;
                } catch {
                    return;
                }

                const engine = engineRef.current;

                switch (msg.type) {
                    case 'room-created': {
                        setRoomId(msg.roomId);
                        setUserId(msg.userId);
                        setIsHost(true);
                        setPeers([]);
                        break;
                    }

                    case 'joined': {
                        setRoomId(msg.roomId);
                        setUserId(msg.userId);
                        setIsHost(false);
                        setPeers(msg.peers);
                        break;
                    }

                    case 'peer-joined': {
                        setPeers(prev => [...prev, msg.peer]);
                        break;
                    }

                    case 'peer-left': {
                        setPeers(prev => prev.filter(p => p.userId !== msg.userId));
                        setRemoteCursors(prev => {
                            const next = new Map(prev);
                            next.delete(msg.userId);
                            return next;
                        });
                        // If the peer who left was drawing, clear the lock
                        setRemoteDrawingUser(prev => prev?.userId === msg.userId ? null : prev);
                        break;
                    }

                    case 'cursor': {
                        setRemoteCursors(prev => {
                            const next = new Map(prev);
                            const existing = next.get(msg.userId);
                            if (existing) {
                                next.set(msg.userId, { ...existing, x: msg.x, y: msg.y });
                            }
                            return next;
                        });
                        break;
                    }

                    case 'shape-add': {
                        engine?.applyRemoteShapeAdd(msg.shape);
                        break;
                    }

                    case 'shape-update': {
                        engine?.applyRemoteShapeUpdate(msg.shape);
                        break;
                    }

                    case 'shape-delete': {
                        engine?.applyRemoteShapeDelete(msg.shapeId);
                        break;
                    }

                    case 'request-sync': {
                        if (!engine) return;
                        const shapes = engine.getShapes();
                        sendMsg({ type: 'full-sync', shapes, targetId: msg.requesterId });
                        break;
                    }

                    case 'full-sync': {
                        if (!engine) return;
                        engine.importDrawing(JSON.stringify(msg.shapes));
                        break;
                    }

                    case 'peer-drawing-start': {
                        setRemoteDrawingUser({ userId: msg.userId, userName: msg.userName });
                        break;
                    }

                    case 'peer-drawing-end': {
                        setRemoteDrawingUser(prev => prev?.userId === msg.userId ? null : prev);
                        break;
                    }

                    case 'peer-canvas-clear': {
                        setRemoteClearEvent({ userId: msg.userId, userName: msg.userName });
                        break;
                    }

                    case 'host-promoted': {
                        setIsHost(true);
                        break;
                    }

                    case 'error': {
                        setError(msg.message);
                        break;
                    }
                }
            };
        });
    }, [engineRef, sendMsg]);

    // --- Public API ---

    const createRoom = useCallback(async (opts: { userName: string; userColor: string; password?: string }) => {
        try {
            const ws = await openSocket();
            ws.send(JSON.stringify({
                type: 'create-room',
                userName: opts.userName,
                userColor: opts.userColor,
                ...(opts.password ? { password: opts.password } : {}),
            }));
        } catch {
            // error already set in openSocket
        }
    }, [openSocket]);

    const joinRoom = useCallback(async (opts: { roomId: string; userName: string; userColor: string; password?: string }) => {
        try {
            const ws = await openSocket();
            ws.send(JSON.stringify({
                type: 'join-room',
                roomId: opts.roomId,
                userName: opts.userName,
                userColor: opts.userColor,
                ...(opts.password ? { password: opts.password } : {}),
            }));
        } catch {
            // error already set in openSocket
        }
    }, [openSocket]);

    const leaveRoom = useCallback(() => {
        wsRef.current?.close();
    }, []);

    const sendCursor = useCallback((x: number, y: number) => {
        sendMsg({ type: 'cursor', x, y });
    }, [sendMsg]);

    const acceptRemoteClear = useCallback(() => {
        if (engineRef.current) {
            engineRef.current.applyRemoteCanvasClear();
        }
        setRemoteClearEvent(null);
    }, [engineRef]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    // When a new peer joins we need to track their cursor slot too
    useEffect(() => {
        setRemoteCursors(prev => {
            const next = new Map(prev);
            for (const peer of peers) {
                if (!next.has(peer.userId)) {
                    next.set(peer.userId, { userId: peer.userId, userName: peer.userName, userColor: peer.userColor, x: -999, y: -999 });
                }
            }
            // Remove cursors for peers who left
            for (const id of next.keys()) {
                if (!peers.find(p => p.userId === id)) next.delete(id);
            }
            return next;
        });
    }, [peers]);

    return { status, roomId, userId, isHost, peers, remoteCursors, remoteDrawingUser, remoteClearEvent, createRoom, joinRoom, leaveRoom, sendCursor, acceptRemoteClear, bindEngine, error };
}

export interface UseCollabReturn {
    status: CollabStatus;
    roomId: string | null;
    userId: string | null;
    isHost: boolean;
    peers: PeerInfo[];
    remoteCursors: Map<string, RemoteCursor>;
    remoteDrawingUser: { userId: string; userName: string } | null;
    remoteClearEvent: { userId: string; userName: string } | null;
    createRoom: (opts: { userName: string; userColor: string; password?: string }) => void;
    joinRoom: (opts: { roomId: string; userName: string; userColor: string; password?: string }) => void;
    leaveRoom: () => void;
    sendCursor: (x: number, y: number) => void;
    acceptRemoteClear: () => void;
    bindEngine: (engine: SlateEngine) => void;
    error: string | null;
}
