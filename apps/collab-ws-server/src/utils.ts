import { WebSocket } from "ws";
import { ServerMessage, PeerInfo } from '@repo/shared';
import { rooms, peerMap } from "./state";
import { Peer, Room } from "./types";

export function generateRoomId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let id = "";
    for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }

    return rooms.has(id) ? generateRoomId() : id;
}

export function generateUserId(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function send(ws : WebSocket, msg : ServerMessage) {
    if(ws.readyState === 1) {
        ws.send(JSON.stringify(msg));
    }
}

export function broadcast(room : Room, msg : ServerMessage, excludeUserId? : string) {
    for(const peer of room.peers.values()) {
        if(peer.userId !== excludeUserId) {
            send(peer.ws, msg);
        }
    }
}

export function getPeerInfo(peer : Peer) : PeerInfo {
    return { userId : peer.userId, userName : peer.userName, userColor : peer.userColor };
}

export function cleanupPeer(ws : WebSocket) {
    const peer = peerMap.get(ws);
    if(!peer) return;

    peerMap.delete(ws);
    if(!peer.roomId) return;

    const room = rooms.get(peer.roomId);
    if(!room) return; 

    room.peers.delete(peer.userId);
    broadcast(room, { type: 'peer-left', userId: peer.userId, userName: peer.userName   });

    // If host left, promote the next peer
    if (peer.isHost && room.peers.size > 0) {
        const next = [...room.peers.values()][0]!;
        next.isHost = true;
        console.log(`[${peer.roomId}] ${next.userName} promoted to host`);
    }
    
    if (room.peers.size === 0) {
        rooms.delete(peer.roomId);
        console.log(`[${peer.roomId}] Room destroyed`);
    }
}