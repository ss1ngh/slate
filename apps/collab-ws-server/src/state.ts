import type { WebSocket } from 'ws';
import type { Peer, Room } from './types';

export const rooms = new Map<string, Room>();
export const peerMap = new Map<WebSocket, Peer>();
