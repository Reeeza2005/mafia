import { io, Socket } from 'socket.io-client';
import Peer, { DataConnection } from 'peerjs';
import { Player, GameLog, GameTimer, NetworkMode } from '../types/mafia';

export type EventCallback = (data: unknown) => void;

class NetworkService {
  private mode: NetworkMode = 'socket';
  private socket: Socket | null = null;
  private peer: Peer | null = null;
  private peerConnections: Map<string, DataConnection> = new Map();
  private godConnection: DataConnection | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private roomCode: string = 'MAFIA';
  private clientType: 'god' | 'player' = 'player';
  private playerName: string = '';
  private myPlayerId: string = '';

  // Local simulated state for PeerJS God mode
  private peerGodState: {
    players: Record<string, Player>;
    gameStarted: boolean;
    cardsDistributed: boolean;
    rolesInGame: string[];
    timer: GameTimer;
    logs: GameLog[];
  } = {
    players: {},
    gameStarted: false,
    cardsDistributed: false,
    rolesInGame: [],
    timer: { seconds: 60, isRunning: false },
    logs: [],
  };

  public getMode(): NetworkMode {
    return this.mode;
  }

  public setMode(mode: NetworkMode) {
    this.mode = mode;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emitLocal(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error(`Error in listener for ${event}:`, e);
      }
    });
  }

  // Initialize Socket.io connection
  public initSocket(serverUrl?: string) {
    if (this.socket) {
      this.socket.disconnect();
    }

    const url = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    this.socket = io(url, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'],
    });

    this.socket.on('connect_error', () => {
      // Graceful fallback to avoid unhandled WebSocket/polling errors
    });

    this.socket.on('connect', () => {
      this.myPlayerId = this.socket?.id || '';
      this.emitLocal('connected', { id: this.myPlayerId, mode: 'socket' });
      // If we had already joined, rejoin
      if (this.roomCode) {
        this.socket?.emit('join_room', {
          roomCode: this.roomCode,
          clientType: this.clientType,
          playerName: this.playerName,
          existingPlayerId: this.myPlayerId,
        });
      }
    });

    this.socket.on('disconnect', () => {
      this.emitLocal('disconnected', { mode: 'socket' });
    });

    this.socket.on('room_state', (data) => this.emitLocal('room_state', data));
    this.socket.on('player_state', (data) => this.emitLocal('player_state', data));
    this.socket.on('players_updated', (data) => this.emitLocal('players_updated', data));
    this.socket.on('role_assigned', (data) => this.emitLocal('role_assigned', data));
    this.socket.on('player_status_changed', (data) => this.emitLocal('player_status_changed', data));
    this.socket.on('game_started', (data) => this.emitLocal('game_started', data));
    this.socket.on('game_reset', (data) => this.emitLocal('game_reset', data));
    this.socket.on('timer_updated', (data) => this.emitLocal('timer_updated', data));
    this.socket.on('timer_ended', (data) => this.emitLocal('timer_ended', data));
    this.socket.on('buzz', (data) => this.emitLocal('buzz', data));
    this.socket.on('secret_vote_started', (data) => this.emitLocal('secret_vote_started', data));
    this.socket.on('secret_vote_updated', (data) => this.emitLocal('secret_vote_updated', data));
    this.socket.on('secret_vote_ended', (data) => this.emitLocal('secret_vote_ended', data));
    this.socket.on('vote_recorded', (data) => this.emitLocal('vote_recorded', data));
    this.socket.on('night_actions_updated', (data) => this.emitLocal('night_actions_updated', data));
    this.socket.on('kicked', () => this.emitLocal('kicked', {}));
    this.socket.on('error_message', (msg) => this.emitLocal('error_message', msg));
  }

  // Initialize PeerJS connection (For GitHub Pages / Offline P2P)
  public initPeer(roomCode: string, isGod: boolean, playerName: string) {
    if (this.peer) {
      this.peer.destroy();
    }

    this.mode = 'peer';
    this.roomCode = (roomCode || 'MAFIA').toUpperCase();
    this.clientType = isGod ? 'god' : 'player';
    this.playerName = playerName;

    const peerRoomId = `mafia-god-${this.roomCode.toLowerCase()}`;
    const peerConfig = {
      debug: 1,
      config: {
        iceServers: [
          { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302', 'stun:stun.services.mozilla.com'] },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    };

    if (isGod) {
      // God hosts with fixed ID for the room code
      this.peer = new Peer(peerRoomId, peerConfig);

      this.peer.on('open', (id) => {
        this.myPlayerId = id;
        this.emitLocal('connected', { id, mode: 'peer', peerRoomId });
        this.peerGodState.logs = [
          {
            id: 'peer-init',
            time: new Date().toLocaleTimeString('fa-IR'),
            text: `اتاق آنلاین P2P با شناسه ${this.roomCode} باز شد.`,
            type: 'info',
          },
        ];
        this.emitLocal('room_state', { ...this.peerGodState, isGod: true, code: this.roomCode });
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error (God):', err);
        // If ID taken, generate random id fallback
        if (err.type === 'unavailable-id') {
          this.peer = new Peer(peerConfig);
          this.peer.on('open', (newId) => {
            this.myPlayerId = newId;
            this.emitLocal('connected', { id: newId, mode: 'peer' });
          });
        }
      });

      this.peer.on('connection', (conn) => {
        conn.on('open', () => {
          this.peerConnections.set(conn.peer, conn);
        });

        conn.on('data', (raw: unknown) => {
          this.handlePeerGodIncoming(conn, raw as { type: string; payload: any });
        });

        conn.on('close', () => {
          this.peerConnections.delete(conn.peer);
          if (this.peerGodState.players[conn.peer]) {
            this.peerGodState.players[conn.peer].connected = false;
            this.broadcastPeerUpdate();
          }
        });
      });
    } else {
      // Player connects to God
      this.peer = new Peer(peerConfig);

      this.peer.on('open', (id) => {
        this.myPlayerId = id;
        this.emitLocal('connected', { id, mode: 'peer' });

        const conn = this.peer!.connect(peerRoomId, { reliable: true });
        this.godConnection = conn;

        conn.on('open', () => {
          conn.send({
            type: 'join_room',
            payload: {
              roomCode: this.roomCode,
              playerName: this.playerName,
              playerId: id,
            },
          });
        });

        conn.on('data', (raw: unknown) => {
          const { type, payload } = raw as { type: string; payload: any };
          this.emitLocal(type, payload);
        });

        conn.on('close', () => {
          this.emitLocal('disconnected', { mode: 'peer' });
        });
      });

      this.peer.on('error', (err) => {
        console.warn('Peer error (Player):', err);
        this.emitLocal('error_message', `اتصال به اتاق ${this.roomCode} برقرار نشد. لطفاً مطمئن شوید گرداننده ابتدا اتاق را باز کرده است.`);
      });
    }
  }

  // Handle messages when in God mode with PeerJS
  private handlePeerGodIncoming(conn: DataConnection, msg: { type: string; payload: any }) {
    if (msg.type === 'join_room') {
      const { playerName, playerId } = msg.payload;
      const pid = playerId || conn.peer;

      this.peerGodState.players[pid] = {
        id: pid,
        name: playerName || `بازیکن ${Object.keys(this.peerGodState.players).length + 1}`,
        isAlive: true,
        isSilenced: false,
        hasArmor: false,
        connected: true,
      };

      this.peerGodState.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: `«${playerName}» متصل شد (P2P).`,
        type: 'info',
      });

      // Send initial state to player
      conn.send({
        type: 'player_state',
        payload: {
          player: this.peerGodState.players[pid],
          roomCode: this.roomCode,
          gameStarted: this.peerGodState.gameStarted,
          cardsDistributed: this.peerGodState.cardsDistributed,
          timer: this.peerGodState.timer,
        },
      });

      this.broadcastPeerUpdate();
    }
  }

  private broadcastPeerUpdate() {
    const playersList = Object.values(this.peerGodState.players);
    this.emitLocal('players_updated', {
      players: playersList,
      logs: this.peerGodState.logs,
    });
    this.peerConnections.forEach((conn) => {
      conn.send({
        type: 'players_updated',
        payload: {
          players: playersList,
          logs: this.peerGodState.logs,
        },
      });
    });
  }

  // Unified Actions
  public joinRoom(roomCode: string, clientType: 'god' | 'player', playerName: string) {
    this.roomCode = (roomCode || 'MAFIA').toUpperCase();
    this.clientType = clientType;
    this.playerName = playerName;

    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('join_room', {
        roomCode: this.roomCode,
        clientType,
        playerName,
      });
    } else if (this.mode === 'peer') {
      this.initPeer(this.roomCode, clientType === 'god', playerName);
    }
  }

  public distributeRoles(selectedRoleIds: string[]) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('distribute_roles', {
        roomCode: this.roomCode,
        selectedRoleIds,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      const activePlayers = Object.values(this.peerGodState.players).filter((p) => p.connected);
      if (selectedRoleIds.length !== activePlayers.length) return;

      const shuffled = [...selectedRoleIds].sort(() => Math.random() - 0.5);
      this.peerGodState.rolesInGame = [...selectedRoleIds];
      this.peerGodState.gameStarted = true;
      this.peerGodState.cardsDistributed = true;

      activePlayers.forEach((p, idx) => {
        p.roleId = shuffled[idx];
        p.isAlive = true;
        p.isSilenced = false;
        p.hasArmor = p.roleId === 'armored';

        const conn = this.peerConnections.get(p.id);
        if (conn) {
          conn.send({
            type: 'role_assigned',
            payload: { roleId: p.roleId, player: p },
          });
        }
      });

      this.broadcastPeerUpdate();
      this.emitLocal('game_started', {
        players: Object.values(this.peerGodState.players),
        rolesInGame: this.peerGodState.rolesInGame,
        logs: this.peerGodState.logs,
      });
    }
  }

  public updatePlayerStatus(playerId: string, updates: Partial<Player>) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('update_player_status', {
        roomCode: this.roomCode,
        playerId,
        updates,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      const player = this.peerGodState.players[playerId];
      if (player) {
        Object.assign(player, updates);
        const conn = this.peerConnections.get(playerId);
        if (conn) {
          conn.send({
            type: 'player_status_changed',
            payload: player,
          });
        }
        this.broadcastPeerUpdate();
      }
    }
  }

  public kickPlayer(playerId: string) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('kick_player', {
        roomCode: this.roomCode,
        playerId,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      const conn = this.peerConnections.get(playerId);
      if (conn) {
        conn.send({ type: 'kicked', payload: {} });
        conn.close();
      }
      delete this.peerGodState.players[playerId];
      this.broadcastPeerUpdate();
    }
  }

  public controlTimer(
    action: 'start' | 'pause' | 'reset' | 'set',
    seconds?: number,
    speakerName?: string,
    speakerId?: string,
    timerType?: 'speech' | 'challenge' | 'defense' | 'voting'
  ) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('timer_control', {
        roomCode: this.roomCode,
        action,
        seconds,
        speakerName,
        speakerId,
        timerType,
      });
    } else if (this.mode === 'peer') {
      if (action === 'start') {
        this.peerGodState.timer = {
          seconds: seconds ?? 60,
          isRunning: true,
          speakerName,
          speakerId,
          timerType,
        };
      }
      if (action === 'pause') this.peerGodState.timer.isRunning = false;
      if (action === 'reset') {
        this.peerGodState.timer = {
          seconds: seconds ?? 60,
          isRunning: false,
          speakerName: undefined,
          speakerId: undefined,
          timerType: undefined,
        };
      }

      this.emitLocal('timer_updated', this.peerGodState.timer);
      this.peerConnections.forEach((conn) => {
        conn.send({ type: 'timer_updated', payload: this.peerGodState.timer });
      });
    }
  }

  public notifyTimerEnded(speakerId?: string, timerType?: string) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('timer_ended', {
        roomCode: this.roomCode,
        speakerId,
        timerType,
      });
    } else if (this.mode === 'peer') {
      this.emitLocal('timer_ended', { speakerId, timerType });
      if (speakerId) {
        const conn = this.peerConnections.get(speakerId);
        if (conn) {
          conn.send({
            type: 'buzz',
            payload: { type: 'warning', message: '⏰ وقت شما به پایان رسید!' },
          });
        }
      }
      this.peerConnections.forEach((conn) => {
        conn.send({
          type: 'timer_ended',
          payload: { speakerId, timerType },
        });
      });
    }
  }

  public buzzPlayer(playerId: string, type: 'wake' | 'warning' = 'wake', message?: string) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('buzz_player', {
        roomCode: this.roomCode,
        playerId,
        type,
        message,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      const conn = this.peerConnections.get(playerId);
      if (conn) {
        conn.send({
          type: 'buzz',
          payload: { type, message: message || (type === 'wake' ? 'بیدارباش شبانه' : 'اخطار گرداننده') },
        });
      }
    }
  }

  public buzzAll(type: 'wake' | 'warning' = 'warning', message?: string) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('buzz_all', {
        roomCode: this.roomCode,
        type,
        message,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      this.peerConnections.forEach((conn) => {
        conn.send({
          type: 'buzz',
          payload: { type, message: message || 'اعلامیه سراسری گرداننده' },
        });
      });
    }
  }

  public startSecretVote(voteData: {
    title: string;
    eligibleTeam?: 'all' | 'mafia' | 'citizen';
    candidates: { id: string; name: string }[];
  }) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('start_secret_vote', {
        roomCode: this.roomCode,
        voteData,
      });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      const voteState = {
        id: Math.random().toString(36).substring(2, 9),
        isActive: true,
        title: voteData.title,
        eligibleTeam: voteData.eligibleTeam || 'all',
        candidates: voteData.candidates,
        votes: {},
        ended: false,
      };
      this.emitLocal('secret_vote_started', voteState);
      this.peerConnections.forEach((conn) => {
        conn.send({ type: 'secret_vote_started', payload: voteState });
      });
    }
  }

  public submitSecretVote(candidateId: string) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('submit_secret_vote', {
        roomCode: this.roomCode,
        voterId: this.myPlayerId,
        candidateId,
      });
    } else if (this.mode === 'peer' && this.godConnection) {
      this.godConnection.send({
        type: 'submit_secret_vote',
        payload: { voterId: this.myPlayerId, candidateId },
      });
      this.emitLocal('vote_recorded', { candidateId });
    }
  }

  public endSecretVote() {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('end_secret_vote', { roomCode: this.roomCode });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      this.emitLocal('secret_vote_ended', {});
      this.peerConnections.forEach((conn) => {
        conn.send({ type: 'secret_vote_ended', payload: {} });
      });
    }
  }

  public updateNightActions(nightActions: any) {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('update_night_actions', {
        roomCode: this.roomCode,
        nightActions,
      });
    } else if (this.mode === 'peer') {
      this.emitLocal('night_actions_updated', nightActions);
      this.peerConnections.forEach((conn) => {
        conn.send({ type: 'night_actions_updated', payload: nightActions });
      });
    }
  }

  public resetGame() {
    if (this.mode === 'socket' && this.socket) {
      this.socket.emit('reset_game', { roomCode: this.roomCode });
    } else if (this.mode === 'peer' && this.clientType === 'god') {
      this.peerGodState.gameStarted = false;
      this.peerGodState.cardsDistributed = false;
      Object.values(this.peerGodState.players).forEach((p) => {
        p.roleId = undefined;
        p.isAlive = true;
        p.isSilenced = false;
      });
      this.peerConnections.forEach((conn) => {
        conn.send({
          type: 'game_reset',
          payload: { players: Object.values(this.peerGodState.players), logs: this.peerGodState.logs },
        });
      });
      this.broadcastPeerUpdate();
    }
  }
}

export const network = new NetworkService();
