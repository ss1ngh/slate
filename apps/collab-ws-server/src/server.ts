import { WebSocketServer } from 'ws';
import { handleMessage } from './handlers';
import { cleanupPeer, generateUserId } from './utils';
import { peerMap } from './state';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  //register a placeholder peer immediately in the global lobby
  peerMap.set(ws, {
    ws,
    userId: generateUserId(),
    userName: 'Unknown',
    userColor: '#6366f1',
    roomId: null,
    isHost: false,
  });

  console.log('User connected');

  ws.on('error', (err) => console.error('WS error:', err.message));

  //pass the raw buffer directly to your switchboard
  ws.on('message', (raw) => handleMessage(ws, raw.toString()));

  ws.on('close', () => {
    cleanupPeer(ws);
    console.log('User disconnected');
  });
});

console.log(`✅ Collab WS server running on ws://localhost:${PORT}`);