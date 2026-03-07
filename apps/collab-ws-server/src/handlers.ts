import { WebSocket } from "ws";
import { ClientMessage } from "@repo/shared";
import { peerMap, rooms } from "./state";
import { broadcast, generateRoomId, getPeerInfo, send } from "./utils";
import { Room } from "./types";

export function handleMessage(ws: WebSocket, raw: string) {
    let msg: ClientMessage;

    try {
        msg = JSON.parse(raw) as ClientMessage;
    } catch {
        return;
    }

    const peer = peerMap.get(ws);
    if (!peer) return;

    switch (msg.type) {
        case 'create-room': {
            const roomId = generateRoomId();
            peer.userName = msg.userName;
            peer.userColor = msg.userColor;
            peer.roomId = roomId;
            peer.isHost = true;

            const room: Room = {
                roomId,
                password: msg.password,
                peers: new Map([[peer.userId, peer]])
            };

            rooms.set(roomId, room);

            send(ws, { type: 'room-created', roomId, userId: peer.userId });
            console.log(`[${roomId}] Created by ${peer.userName}`);
            break;
        }

        case 'join-room': {
            const room = rooms.get(msg.roomId);
            if (!room) {
                send(ws, { type: 'error', message: 'Room not found.' });
                return;
            }
            if (room.password && room.password !== msg.password) {
                send(ws, { type: 'error', message: 'Incorrect password.' });
                return;
            }


            peer.userName = msg.userName;
            peer.userColor = msg.userColor;
            peer.roomId = msg.roomId;
            peer.isHost = false;

            room.peers.set(peer.userId, peer);

            const existingPeers = [...room.peers.values()]
                .filter(p => p.userId !== peer.userId)
                .map(getPeerInfo);

            send(ws, { type: 'joined', roomId: msg.roomId, userId: peer.userId, peers: existingPeers });
            broadcast(room, { type: 'peer-joined', peer: getPeerInfo(peer) }, peer.userId);

            //ask the host for a full canvas sync so the new guy can see what was already drawn
            const host = [...room.peers.values()].find(p => p.isHost);
            if (host && host.userId !== peer.userId) {
                send(host.ws, { type: 'request-sync', requesterId: peer.userId });
            }

            console.log(`[${msg.roomId}] ${peer.userName} joined (${room.peers.size} total)`);
            break;
        }

        case 'cursor': {
            if (!peer.roomId) return;
            const room = rooms.get(peer.roomId);
            if (!room) return;
            broadcast(room, { type: 'cursor', userId: peer.userId, x: msg.x, y: msg.y }, peer.userId);
            break;
        }

        case 'shape-add': {
            if (!peer.roomId) return;
            const room = rooms.get(peer.roomId);
            if (!room) return;
            broadcast(room, { type: 'shape-add', shape: msg.shape }, peer.userId);
            break;
        }

        case 'shape-update': {
            if (!peer.roomId) return;
            const room = rooms.get(peer.roomId);
            if (!room) return;
            broadcast(room, { type: 'shape-update', shape: msg.shape }, peer.userId);
            break;
        }

        case 'shape-delete': {
            if (!peer.roomId) return;
            const room = rooms.get(peer.roomId);
            if (!room) return;
            broadcast(room, { type: 'shape-delete', shapeId: msg.shapeId }, peer.userId);
            break;
        }

        case 'full-sync': {
            if (!peer.roomId) return;
            const room = rooms.get(peer.roomId);
            if (!room) return;

            // Relay the full canvas state to all non-host peers waiting for sync
            for (const p of room.peers.values()) {
                if (!p.isHost && (!msg.targetId || p.userId === msg.targetId)) {
                    send(p.ws, { type: 'full-sync', shapes: msg.shapes });
                }
            }
            break;
        }
    }
}