import { Peer, DataConnection } from 'peerjs';

export interface NetworkPlayerInfo {
  id: string;
  name: string;
  avatar: string;
  color?: string;
}

export type NetworkMessageHandler = (msg: any) => void;

class MultiplayerNetwork {
  private peer: Peer | null = null;
  private peerConn: DataConnection | null = null;
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private roomId: string = '';
  private isHost: boolean = false;
  private localPlayer: NetworkPlayerInfo | null = null;
  private onMessageCallback: NetworkMessageHandler | null = null;
  private onStatusCallback: ((status: 'idle' | 'connecting' | 'waiting' | 'ready' | 'error', message?: string) => void) | null = null;
  private processedMessageIds: Set<string> = new Set();
  private clientId: string = `client-${Math.random().toString(36).substring(2, 9)}`;

  public init(
    roomId: string,
    level: number,
    isHost: boolean,
    player: NetworkPlayerInfo,
    onMessage: NetworkMessageHandler,
    onStatus: (status: 'idle' | 'connecting' | 'waiting' | 'ready' | 'error', message?: string) => void
  ) {
    this.destroy();

    const cleanRoomId = roomId.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'LAUT81';
    this.roomId = cleanRoomId;
    this.isHost = isHost;
    this.localPlayer = player;
    this.onMessageCallback = onMessage;
    this.onStatusCallback = onStatus;

    if (this.onStatusCallback) {
      this.onStatusCallback('connecting', 'Menghubungkan jaringan P2P Cloud...');
    }

    // 1. BroadcastChannel (works locally across tabs on same device)
    try {
      this.broadcastChannel = new BroadcastChannel(`pa_channel_${cleanRoomId}`);
      this.broadcastChannel.onmessage = (evt) => {
        this.handleRawMessage(evt.data);
      };
    } catch {}

    // 2. Try Node WebSocket (if running on Node server with /ws endpoint)
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      this.ws = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: cleanRoomId,
          level,
          player: this.localPlayer
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRawMessage(data);
        } catch {}
      };

      ws.onerror = () => {
        // Expected when deployed on static Netlify host; PeerJS will handle connectivity!
      };
    } catch {}

    // 3. WebRTC PeerJS (Crucial for Netlify / Static hosting across different devices!)
    this.initPeer(cleanRoomId, level);
  }

  private initPeer(cleanRoomId: string, level: number) {
    try {
      const hostPeerId = `pa-pecahan-v1-host-${cleanRoomId.toLowerCase()}`;

      if (this.isHost) {
        // HOST: Registers standard ID so guest can discover it
        this.peer = new Peer(hostPeerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', () => {
          if (this.onStatusCallback) {
            this.onStatusCallback('waiting', `Room siap! Menunggu lawan di room ${cleanRoomId}...`);
          }
          this.handleRawMessage({
            type: 'room-joined',
            roomId: cleanRoomId,
            role: 'p1',
            status: 'waiting',
            p1: this.localPlayer,
            p2: null
          });
        });

        this.peer.on('connection', (conn) => {
          this.peerConn = conn;
          this.setupConnectionHandlers(conn, level);
        });

        this.peer.on('error', (err: any) => {
          if (err.type === 'unavailable-id') {
            // Room already has an active host
            if (this.onStatusCallback) {
              this.onStatusCallback('error', `Room ${cleanRoomId} sudah aktif. Silakan pilih kode lain atau masuk sebagai tamu.`);
            }
          }
        });

      } else {
        // GUEST: Generates unique guest peer ID and connects to host
        const guestId = `pa-pecahan-v1-g-${cleanRoomId.toLowerCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
        this.peer = new Peer(guestId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });

        this.peer.on('open', () => {
          const conn = this.peer!.connect(hostPeerId, {
            reliable: true
          });
          this.peerConn = conn;
          this.setupConnectionHandlers(conn, level);
        });

        this.peer.on('error', () => {
          // Retry connect on failure
        });
      }
    } catch (e) {
      console.warn('PeerJS init failed:', e);
    }
  }

  private setupConnectionHandlers(conn: DataConnection, level: number) {
    conn.on('open', () => {
      if (this.isHost) {
        // Host sends handshake to guest
        conn.send({
          _mid: `msg-${Date.now()}-${Math.random()}`,
          _sender: this.clientId,
          type: 'room-ready',
          roomId: this.roomId,
          level,
          p1: this.localPlayer
        });
        if (this.onStatusCallback) {
          this.onStatusCallback('ready', 'Lawan terhubung via WebRTC P2P!');
        }
      } else {
        // Guest sends info to host
        conn.send({
          _mid: `msg-${Date.now()}-${Math.random()}`,
          _sender: this.clientId,
          type: 'guest-hello',
          roomId: this.roomId,
          p2: this.localPlayer
        });
        this.handleRawMessage({
          type: 'room-joined',
          roomId: this.roomId,
          role: 'p2',
          status: 'ready',
          level,
          p2: this.localPlayer
        });
        if (this.onStatusCallback) {
          this.onStatusCallback('ready', 'Terhubung ke Host via WebRTC P2P!');
        }
      }
    });

    conn.on('data', (data: any) => {
      if (data && typeof data === 'object') {
        if (data.type === 'guest-hello' && this.isHost) {
          // Host receives guest info, responds with full room-ready
          this.send({
            type: 'room-ready',
            roomId: this.roomId,
            p1: this.localPlayer,
            p2: data.p2
          });
          this.handleRawMessage({
            type: 'room-ready',
            roomId: this.roomId,
            p1: this.localPlayer,
            p2: data.p2
          });
          return;
        }
      }
      this.handleRawMessage(data);
    });

    conn.on('close', () => {
      this.handleRawMessage({
        type: 'opponent-left',
        message: 'Lawan terputus dari jaringan P2P.'
      });
    });
  }

  public send(message: any) {
    const enriched = {
      ...message,
      roomId: this.roomId,
      _mid: message._mid || `msg-${Date.now()}-${Math.random()}`,
      _sender: this.clientId
    };

    // Mark as seen so we don't handle our own reflection
    this.processedMessageIds.add(enriched._mid);

    // 1. Send via WebRTC DataChannel
    if (this.peerConn && this.peerConn.open) {
      try {
        this.peerConn.send(enriched);
      } catch {}
    }

    // 2. Send via WebSocket if open
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(enriched));
      } catch {}
    }

    // 3. Send via BroadcastChannel for multi-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(enriched);
      } catch {}
    }
  }

  private handleRawMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;

    // Ignore self-reflected messages
    if (msg._sender === this.clientId) return;

    // Deduplicate identical messages sent through multiple pathways
    if (msg._mid) {
      if (this.processedMessageIds.has(msg._mid)) return;
      this.processedMessageIds.add(msg._mid);
      if (this.processedMessageIds.size > 200) {
        const first = this.processedMessageIds.values().next().value;
        if (first) this.processedMessageIds.delete(first);
      }
    }

    if (this.onMessageCallback) {
      this.onMessageCallback(msg);
    }
  }

  public destroy() {
    if (this.peerConn) {
      try { this.peerConn.close(); } catch {}
      this.peerConn = null;
    }
    if (this.peer) {
      try { this.peer.destroy(); } catch {}
      this.peer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if (this.broadcastChannel) {
      try { this.broadcastChannel.close(); } catch {}
      this.broadcastChannel = null;
    }
    this.processedMessageIds.clear();
  }
}

export const multiplayerNet = new MultiplayerNetwork();
