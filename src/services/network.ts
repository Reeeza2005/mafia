import { io, Socket } from 'socket.io-client';
import { Player, GameLog, GameTimer, NetworkMode, SecretVoteState } from '../types/mafia';

export type EventCallback = (data: any) => void;

class NetworkService {
  private mode: NetworkMode = 'socket';
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  private roomCode: string = '';
  private clientType: 'god' | 'player' | null = null;
  private playerName: string = '';
  private myPlayerId: string = '';
  private hasExplicitlyJoined: boolean = false;

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

  // Initialize Socket.io connection dynamically using window.location.origin
  public initSocket(serverUrl?: string) {
    if (this.socket && this.socket.connected) {
      return;
    }
    if (this.socket) {
      this.socket.disconnect();
    }

    const url = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    
    this.socket = io(url, {
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      transports: ['polling', 'websocket'],
    });

    this.socket.on('connect_error', () => {
      // Graceful fallback for local Wi-Fi fluctuations
    });

    this.socket.on('connect', () => {
      this.myPlayerId = this.socket?.id || '';
      this.emitLocal('connected', { id: this.myPlayerId, mode: 'socket' });

      // Re-emit join ONLY if user has previously submitted join explicitly and lost connection
      if (this.hasExplicitlyJoined && this.roomCode) {
        if (this.clientType === 'god' || (this.clientType === 'player' && this.playerName.trim())) {
          this.socket?.emit('join_room', {
            roomCode: this.roomCode,
            clientType: this.clientType,
            playerName: this.playerName,
            existingPlayerId: this.myPlayerId,
          });
        }
      }
    });

    this.socket.on('disconnect', () => {
      this.emitLocal('disconnected', { mode: 'socket' });
    });

    // Server-dispatched room and player events
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

  // Explicit Join action - only called upon user Submit click
  public joinRoom(roomCode: string, clientType: 'god' | 'player', playerName: string) {
    const cleanRoom = (roomCode || '').trim().toUpperCase();
    const cleanName = (playerName || '').trim();

    if (!cleanRoom) return;
    if (clientType === 'player' && !cleanName) return;

    this.roomCode = cleanRoom;
    this.clientType = clientType;
    this.playerName = cleanName;
    this.hasExplicitlyJoined = true;

    if (!this.socket) {
      this.initSocket();
    }

    if (this.socket) {
      if (this.socket.connected) {
        this.socket.emit('join_room', {
          roomCode: this.roomCode,
          clientType,
          playerName: this.playerName,
          existingPlayerId: this.socket.id,
        });
      } else {
        this.socket.once('connect', () => {
          this.socket?.emit('join_room', {
            roomCode: this.roomCode,
            clientType,
            playerName: this.playerName,
            existingPlayerId: this.socket?.id,
          });
        });
        this.socket.connect();
      }
    }
  }

  public resetJoined() {
    this.hasExplicitlyJoined = false;
  }

  // God actions
  public distributeRoles(selectedRoleIds: string[]) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('distribute_roles', {
        roomCode: this.roomCode,
        selectedRoleIds,
      });
    }
  }

  public updatePlayerStatus(playerId: string, updates: Partial<Player>) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('update_player_status', {
        roomCode: this.roomCode,
        playerId,
        updates,
      });
    }
  }

  public kickPlayer(playerId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('kick_player', {
        roomCode: this.roomCode,
        playerId,
      });
    }
  }

  public controlTimer(
    action: 'start' | 'pause' | 'reset' | 'set',
    seconds?: number,
    speakerName?: string,
    speakerId?: string,
    timerType?: 'speech' | 'challenge' | 'defense' | 'voting'
  ) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('timer_control', {
        roomCode: this.roomCode,
        action,
        seconds,
        speakerName,
        speakerId,
        timerType,
      });
    }
  }

  public notifyTimerEnded(speakerId?: string, timerType?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('timer_ended', {
        roomCode: this.roomCode,
        speakerId,
        timerType,
      });
    }
  }

  public resetGame() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reset_game', {
        roomCode: this.roomCode,
      });
    }
  }

  public buzzPlayer(playerId?: string, type: 'warning' | 'danger' = 'warning', message?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('buzz_player', {
        roomCode: this.roomCode,
        playerId,
        type,
        message,
      });
    }
  }

  public buzzAll(type: 'warning' | 'danger' = 'warning', message?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('buzz_player', {
        roomCode: this.roomCode,
        playerId: undefined,
        type,
        message,
      });
    }
  }

  public startSecretVote(
    titleOrData: string | { title: string; eligibleTeam?: 'all' | 'mafia' | 'citizen'; candidates: { id: string; name: string }[] },
    eligibleTeam: 'all' | 'mafia' | 'citizen' = 'all',
    candidates: { id: string; name: string }[] = []
  ) {
    if (this.socket && this.socket.connected) {
      if (typeof titleOrData === 'object') {
        this.socket.emit('start_secret_vote', {
          roomCode: this.roomCode,
          ...titleOrData,
        });
      } else {
        this.socket.emit('start_secret_vote', {
          roomCode: this.roomCode,
          title: titleOrData,
          eligibleTeam,
          candidates,
        });
      }
    }
  }

  public submitSecretVote(candidateId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_secret_vote', {
        roomCode: this.roomCode,
        candidateId,
      });
    }
  }

  public endSecretVote() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('end_secret_vote', {
        roomCode: this.roomCode,
      });
    }
  }

  public submitNightAction(actionType: string, targetId: string, extra?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_night_action', {
        roomCode: this.roomCode,
        actionType,
        targetId,
        extra,
      });
    }
  }
}

export const network = new NetworkService();
