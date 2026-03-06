import type { WebSocket } from 'ws';

export interface Peer {
    ws: WebSocket;
    userId: string;
    userName: string;
    userColor: string;
    roomId: string | null;
    isHost: boolean;
}

export interface Room {
    roomId: string;
    password: string | undefined;
    peers: Map<string, Peer>;
}
