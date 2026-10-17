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
      reconnectionAttempts: 30,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: false,
    });

    this.socket.on('connect_error', (err: any) => {
      // اگر خطای نشست سوخته رخ داد، سشن را نوسازی کن
      if (err?.message?.includes("Session ID unknown") || err?.description === 400) {
        console.warn("[SOCKET] Stale session detected, recovering...");
        if (this.socket) {
          this.socket.io.opts.transports = ['websocket', 'polling'];
        }
      }
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
    this.socket.on('challenges_updated', (data) => this.emitLocal('challenges_updated', data));
    this.socket.on('secret_vote_started', (data) => this.emitLocal('secret_vote_started', data));
    this.socket.on('secret_vote_unlocked', (data) => this.emitLocal('secret_vote_unlocked', data));
    this.socket.on('secret_vote_updated', (data) => this.emitLocal('secret_vote_updated', data));
    this.socket.on('secret_vote_ended', (data) => this.emitLocal('secret_vote_ended', data));
    this.socket.on('vote_recorded', (data) => this.emitLocal('vote_recorded', data));
    this.socket.on('night_actions_updated', (data) => this.emitLocal('night_actions_updated', data));
    this.socket.on('mafia_chat_sync', (data) => this.emitLocal('mafia_chat_sync', data));
    this.socket.on('kicked', () => this.emitLocal('kicked', {}));
    this.socket.on('error_message', (msg) => this.emitLocal('error_message', msg));
    this.socket.on('game_ended', (data) => this.emitLocal('game_ended', data));
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

  public debugCreateSoloTest(roleId: string = 'godfather') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('debug_create_solo_test', {
        roomCode: this.roomCode,
        roleId,
      });
    }
  }

  public debugAssignRole(playerId: string, roleId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('debug_assign_role', {
        roomCode: this.roomCode,
        playerId,
        roleId,
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

  
    public renamePlayer(playerId: string, newName: string) {
    if (this.socket) {
      this.socket.emit("player_rename", { roomCode: this.roomCode, playerId, newName });
    }
  }

  public requestChallenge(playerId: string) {
    if (this.socket) {
      this.socket.emit("request_challenge", { roomCode: this.roomCode, playerId });
    }
  }

  public dismissChallenge(playerId: string) {
    if (this.socket) {
      this.socket.emit("dismiss_challenge", { roomCode: this.roomCode, playerId });
    }
  }

  public consumeChallenge(playerId: string) {
    if (this.socket) {
      this.socket.emit("consume_challenge", { roomCode: this.roomCode, playerId });
    }
  }

  public resetDailyChallenges() {
    if (this.socket && this.socket.connected) {
      this.socket.emit('reset_daily_challenges', {
        roomCode: this.roomCode,
      });
    }
  }

  public startSecretVote(
    titleOrData: string | {
      title: string;
      eligibleTeam?: 'all' | 'mafia' | 'citizen';
      candidates: { id: string; name: string }[];
      startsLocked?: boolean;
      targetDefendantId?: string;
      eligibleVoterIds?: string[];
    },
    eligibleTeam: 'all' | 'mafia' | 'citizen' = 'all',
    candidates: { id: string; name: string }[] = []
  ) {
    if (this.socket && this.socket.connected) {
      const vData = typeof titleOrData === 'object' 
        ? titleOrData 
        : { title: titleOrData, eligibleTeam, candidates };
      
      console.log('[NETWORK] Emitting start_secret_vote:', vData);
      this.socket.emit('start_secret_vote', {
        roomCode: this.roomCode,
        voteData: vData,
        ...vData
      });
    }
  }

    public unlockSecretVote(duration: number = 5) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('unlock_secret_vote', {
        roomCode: this.roomCode,
        duration,
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

  public submitSecretVote(voterId: string, candidateId: string, voterName?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('submit_secret_vote', {
        roomCode: this.roomCode,
        voterId,
        candidateId,
        voterName,
      });
    }
  }



  public endGame(winner: 'mafia' | 'citizen', reason: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('end_game', {
        roomCode: this.roomCode,
        winner,
        reason,
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

sendMafiaMessage(playerId: string, text: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("mafia_send_message", { roomCode: this.roomCode, playerId, text });
    }
  }

  sendNightTarget(playerId: string, roleId: string, targetId: string, extraType?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("night_target_submit", {
        roomCode: this.roomCode,
        playerId,
        roleId,
        targetId,
        extraType,
      });
    }
  }

  sendNightResultToPlayer(targetPlayerId: string, message: string, resultType?: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("god_send_night_result", {
        roomCode: this.roomCode,
        targetPlayerId,
        message,
        resultType,
      });
    }
  }

  setNightStep(role: string | null, overrideRoomCode?: string) {
    const targetRoom = (overrideRoomCode || this.roomCode || "").trim().toUpperCase();
    if (targetRoom) this.roomCode = targetRoom;
    if (this.socket && this.socket.connected) {
      this.socket.emit("god_set_night_step", { roomCode: targetRoom, role });
    }
  }

  toggleNightPhase(active: boolean) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("toggle_night_phase", { roomCode: this.roomCode, active });
    }
  }

  toggleMafiaChat(active: boolean) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("god_toggle_mafia_chat", { roomCode: this.roomCode, active });
    }
  }

  updateNightActions(nightActions: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit("update_night_actions", {
        roomCode: this.roomCode,
        nightActions,
      });
    }
  }

  clearMafiaChat() {
    if (this.socket && this.socket.connected) {
      this.socket.emit("god_clear_mafia_chat", { roomCode: this.roomCode });
    }
  }
}

export const network = new NetworkService();
