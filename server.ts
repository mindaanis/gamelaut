import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory Multiplayer Rooms
interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  color: string;
  ready: boolean;
  score: number;
  correct: number;
  wrong: number;
  ws?: WebSocket;
}

interface RoomState {
  id: string;
  level: number;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  p1: PlayerState | null;
  p2: PlayerState | null;
  createdAt: number;
}

const rooms = new Map<string, RoomState>();

// Clean up stale rooms periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms.entries()) {
    if (now - r.createdAt > 3600000 && (!r.p1?.ws && !r.p2?.ws)) {
      rooms.delete(id);
    }
  }
}, 60000);

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastToRoom(room: RoomState, message: any, excludeWs?: WebSocket) {
  const data = JSON.stringify(message);
  if (room.p1?.ws && room.p1.ws.readyState === WebSocket.OPEN && room.p1.ws !== excludeWs) {
    room.p1.ws.send(data);
  }
  if (room.p2?.ws && room.p2.ws.readyState === WebSocket.OPEN && room.p2.ws !== excludeWs) {
    room.p2.ws.send(data);
  }
}

function publicPlayer(p: PlayerState | null) {
  return p ? { id: p.id, name: p.name, avatar: p.avatar, color: p.color } : null;
}

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let playerSlot: 'p1' | 'p2' | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const { type, roomId } = msg;

      if (type === 'join-room') {
        const targetRoomId = (roomId || 'LAUT81').toUpperCase().trim();
        let room = rooms.get(targetRoomId);

        if (!room) {
          // Create room as Host (P1)
          room = {
            id: targetRoomId,
            level: msg.level || 1,
            status: 'waiting',
            p1: {
              id: msg.player.id || `P1-${Date.now()}`,
              name: msg.player.name || 'Pemain 1',
              avatar: msg.player.avatar || '🐠',
              color: msg.player.color || 'blue',
              ready: true,
              score: 0,
              correct: 0,
              wrong: 0,
              ws: ws
            },
            p2: null,
            createdAt: Date.now()
          };
          rooms.set(targetRoomId, room);
          currentRoomId = targetRoomId;
          playerSlot = 'p1';

          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId: targetRoomId,
            role: 'p1',
            status: 'waiting',
            p1: publicPlayer(room.p1),
            p2: null
          }));
        } else if (!room.p2) {
          // Join room as Guest (P2)
          room.p2 = {
            id: msg.player.id || `P2-${Date.now()}`,
            name: msg.player.name || 'Pemain 2',
            avatar: msg.player.avatar || '🐬',
            color: msg.player.color || 'coral',
            ready: true,
            score: 0,
            correct: 0,
            wrong: 0,
            ws: ws
          };
          room.status = 'ready';
          currentRoomId = targetRoomId;
          playerSlot = 'p2';

          // Notify P2
          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId: targetRoomId,
            role: 'p2',
            status: 'ready',
            level: room.level,
            p1: publicPlayer(room.p1),
            p2: publicPlayer(room.p2)
          }));

          // Notify P1 that P2 joined and room is ready to start!
          broadcastToRoom(room, {
            type: 'room-ready',
            roomId: targetRoomId,
            p1: publicPlayer(room.p1),
            p2: publicPlayer(room.p2)
          });
        } else {
          // Room full
          ws.send(JSON.stringify({
            type: 'room-error',
            message: `Room ${targetRoomId} sudah penuh! Silakan buat atau gabung kode room lain.`
          }));
        }
      }

      if ((type === 'start-game' || type === 'game-started') && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room && (playerSlot === 'p1' || playerSlot === 'p2')) {
          room.status = 'playing';
          room.level = msg.level || room.level;
          broadcastToRoom(room, {
            type: 'game-started',
            level: room.level,
            matchId: msg.matchId,
            p1: publicPlayer(room.p1),
            p2: publicPlayer(room.p2)
          });
        }
      }

      // Relay live gameplay events to the opponent unchanged (keeps _mid so clients
      // can de-duplicate against the same message arriving over WebRTC)
      if ((type === 'player-pos' || type === 'answer-submitted' || type === 'pearl-collected' || type === 'player-finished') && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          broadcastToRoom(room, msg, ws);
        }
      }

      // Bubble popped / answering
      if (type === 'bubble-popped' && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          broadcastToRoom(room, {
            type: 'bubble-popped-broadcast',
            bubbleId: msg.bubbleId,
            playerSlot,
            playerName: playerSlot === 'p1' ? room.p1?.name : room.p2?.name
          });
        }
      }

      // Answer submitted
      if (type === 'answer-submitted' && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          if (playerSlot === 'p1' && room.p1) {
            room.p1.score += msg.points || 0;
            if (msg.isCorrect) room.p1.correct++; else room.p1.wrong++;
          } else if (playerSlot === 'p2' && room.p2) {
            room.p2.score += msg.points || 0;
            if (msg.isCorrect) room.p2.correct++; else room.p2.wrong++;
          }

          broadcastToRoom(room, {
            type: 'scores-updated',
            p1Score: room.p1?.score || 0,
            p2Score: room.p2?.score || 0,
            lastAnswer: {
              playerSlot,
              isCorrect: msg.isCorrect,
              points: msg.points
            }
          });
        }
      }

      // Pearl collected
      if (type === 'pearl-collected' && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          if (playerSlot === 'p1' && room.p1) room.p1.score += 10;
          if (playerSlot === 'p2' && room.p2) room.p2.score += 10;

          broadcastToRoom(room, {
            type: 'pearl-collected-broadcast',
            pearlId: msg.pearlId,
            playerSlot,
            p1Score: room.p1?.score || 0,
            p2Score: room.p2?.score || 0
          });
        }
      }

      // Game finished
      if (type === 'game-completed' && currentRoomId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          broadcastToRoom(room, {
            type: 'match-ended',
            p1: { name: room.p1?.name, score: room.p1?.score, correct: room.p1?.correct },
            p2: { name: room.p2?.name, score: room.p2?.score, correct: room.p2?.correct }
          });
        }
      }

    } catch (e) {
      console.error('WS Error:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId)!;
      if (playerSlot === 'p1') {
        room.p1 = null;
        broadcastToRoom(room, { type: 'opponent-left', message: 'Pemain 1 telah keluar dari room.' });
      } else if (playerSlot === 'p2') {
        room.p2 = null;
        broadcastToRoom(room, { type: 'opponent-left', message: 'Pemain 2 telah keluar dari room.' });
      }
      if (!room.p1 && !room.p2) {
        rooms.delete(currentRoomId);
      }
    }
  });
});

// REST Endpoint to check room status (for devices with strict WS proxies)
app.get('/api/rooms/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ exists: false });
  }
  return res.json({
    exists: true,
    status: room.status,
    p1: room.p1 ? { name: room.p1.name, avatar: room.p1.avatar } : null,
    p2: room.p2 ? { name: room.p2.name, avatar: room.p2.avatar } : null
  });
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`Server Petualangan Pecahan Bawah Laut running on http://0.0.0.0:${port}`);
  });
}

startServer();
