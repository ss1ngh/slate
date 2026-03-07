import type { Shape } from './shapes';

export interface PeerInfo {
    userId: string;
    userName: string;
    userColor: string;
}

// Client → Server
export type ClientMessage =
    | { type: 'create-room'; password?: string; userName: string; userColor: string }
    | { type: 'join-room'; roomId: string; password?: string; userName: string; userColor: string }
    | { type: 'cursor'; x: number; y: number }
    | { type: 'shape-add'; shape: Shape }
    | { type: 'shape-update'; shape: Shape }
    | { type: 'shape-delete'; shapeId: string }
    | { type: 'full-sync'; shapes: Shape[]; targetId?: string };

// Server → Client
export type ServerMessage =
    | { type: 'room-created'; roomId: string; userId: string }
    | { type: 'joined'; roomId: string; userId: string; peers: PeerInfo[] }
    | { type: 'peer-joined'; peer: PeerInfo }
    | { type: 'peer-left'; userId: string; userName: string }
    | { type: 'cursor'; userId: string; x: number; y: number }
    | { type: 'shape-add'; shape: Shape }
    | { type: 'shape-update'; shape: Shape }
    | { type: 'shape-delete'; shapeId: string }
    | { type: 'request-sync'; requesterId: string }
    | { type: 'full-sync'; shapes: Shape[]; targetId?: string }
    | { type: 'error'; message: string };
