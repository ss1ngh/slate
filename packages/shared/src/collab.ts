export interface PeerInfo {
    userId: string;
    userName: string;
    userColor: string;
    isHost: boolean;
}

export type ServerMessage =
    | { type: 'room-joined'; roomId: string; peers: PeerInfo[] }
    | { type: 'peer-joined'; peer: PeerInfo }
    | { type: 'peer-left'; userId: string; userName : string }
    | { type: 'error'; message: string }
    | { type: 'draw-update'; userId: string; payload: unknown };
