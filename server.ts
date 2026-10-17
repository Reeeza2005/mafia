import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const httpServer = http.createServer(app);

// Initialize Socket.io with CORS for cross-device connections
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 30000,
  pingInterval: 10000,
});

app.use(express.json());

// Enable CORS for all local requests and phones
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (_req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Helper to get local Wi-Fi / LAN IP addresses
function getLocalNetworkAddresses(): { name: string; address: string }[] {
  const interfaces = os.networkInterfaces();
  const addresses: { name: string; address: string }[] = [];
  for (const name of Object.keys(interfaces)) {
    // Avoid virtual/docker bridges if physical interfaces exist
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }
  // Sort Wi-Fi / LAN IPs first (192.168.x.x or 10.x.x.x)
  return addresses.sort((a, b) => {
    const aIsLan = a.address.startsWith('192.168.') || a.address.startsWith('10.');
    const bIsLan = b.address.startsWith('192.168.') || b.address.startsWith('10.');
    if (aIsLan && !bIsLan) return -1;
    if (!aIsLan && bIsLan) return 1;
    return 0;
  });
}

// API endpoint to return local IP addresses for God panel QR display
app.get('/api/network-info', async (_req, res) => {
  const addresses = getLocalNetworkAddresses();
  const hostIp = addresses.length > 0 ? addresses[0].address : 'localhost';
  const localUrl = `http://${hostIp}:${PORT}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(localUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: '#ffffff',
        light: '#09090b',
      },
    });
  } catch (err) {
    console.error('QR generation error:', err);
  }

  res.json({
    addresses,
    port: PORT,
    primaryIp: hostIp,
    localUrl,
    qrDataUrl,
  });
});

// API endpoint to generate custom QR Code on the fly
app.get('/api/generate-qr', async (req, res) => {
  const url = (req.query.url as string) || '';
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      margin: 1,
      width: 320,
      color: {
        dark: '#ffffff',
        light: '#09090b',
      },
    });
    res.json({ qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR' });
  }
});

// Standalone server export file endpoint (for laptop without internet)
app.get('/api/standalone-bundle', (_req, res) => {
  res.json({
    instructions: 'Save server.js and index.html in one folder, run npm install express socket.io qrcode, then node server.js',
  });
});

// Game state management in memory
interface Player {
  id: string;
  socketId?: string; // socket.id or player unique id
  name: string;
  roleId?: string;
  isAlive: boolean;
  isSilenced: boolean;
  hasArmor: boolean;
  eliminationReason?: string;
  gunGiven?: 'war' | 'blank';
  usedDailyChallenge?: boolean;
  notes?: string;
  connected: boolean;
  joinedAt: number;
}

interface SecretVoteState {
  id: string;
  targetDefendantId?: string | null;
  eligibleVoterIds?: string[] | null;
  isLocked?: boolean;
  isActive: boolean;
  title: string;
  eligibleTeam?: 'all' | 'mafia' | 'citizen';
  candidates: { id: string; name: string }[];
  votes: Record<string, string>; // voterId -> candidateId
  voterDetails?: Record<string, { candidateId: string; voterName: string }>;
  ended: boolean;
}

interface NightActions {
  mafiaShotId?: string;
  doctorSaveId?: string;
  detectiveInquiryId?: string;
  detectiveResult?: 'positive' | 'negative' | null;
  sniperShotId?: string;
  gunsmithTargetId?: string;
  gunsmithGunType?: 'war' | 'blank';
  silencerTargetId?: string;
}

export interface MafiaChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
}

interface GameRoom {
  code: string;
  godSocketId?: string;
  gameStarted: boolean;
  cardsDistributed: boolean;
  players: Record<string, Player>;
  rolesInGame: string[];
  timer: {
    seconds: number;
    isRunning: boolean;
    speakerName?: string;
    speakerId?: string;
    timerType?: 'speech' | 'challenge' | 'defense' | 'voting';
  };
  timerInterval?: NodeJS.Timeout;
  challengeRequests?: { playerId: string; playerName: string; time: string }[];
  secretVote?: SecretVoteState;
  nightActions?: NightActions;
  mafiaChatActive?: boolean;
  mafiaChatMessages?: MafiaChatMessage[];
  logs: { id: string; time: string; text: string; type: 'info' | 'danger' | 'action' | 'challenge' }[];
}

const rooms: Record<string, GameRoom> = {};

function stopRoomTimer(room: GameRoom) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = undefined;
  }
}

function getOrCreateRoom(code: string): GameRoom {
  const upperCode = (code || '').trim().toUpperCase() || Math.floor(1000 + Math.random() * 9000).toString();
  if (!rooms[upperCode]) {
    rooms[upperCode] = {
      code: upperCode,
      gameStarted: false,
      cardsDistributed: false,
      players: {},
      rolesInGame: [],
      timer: {
        seconds: 60,
        isRunning: false,
      },
      secretVote: undefined,
      nightActions: {},
      mafiaChatActive: false,
      mafiaChatMessages: [],
      logs: [
        {
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString('fa-IR'),
          text: `اتاق بازی ${upperCode} ایجاد شد.`,
          type: 'info',
        },
      ],
    };
  }
  return rooms[upperCode];
}

// REST endpoints for reliable local Wi-Fi or polling fallback
app.get('/api/room/:code', (req, res) => {
  const room = getOrCreateRoom(req.params.code);
  res.json({
    code: room.code,
    gameStarted: room.gameStarted,
    cardsDistributed: room.cardsDistributed,
    players: Object.values(room.players),
    rolesInGame: room.rolesInGame,
    timer: room.timer,
    secretVote: room.secretVote,
    nightActions: room.nightActions,
    logs: room.logs,
  });
});

app.post('/api/room/:code/join', (req, res) => {
  const room = getOrCreateRoom(req.params.code);
  const { playerName, playerId } = req.body;
  const cleanName = (playerName || '').trim();
  if (!cleanName) {
    return res.status(400).json({ error: 'نام بازیکن الزامی است.' });
  }

  const id = playerId || `http-${Math.random().toString(36).substring(2, 9)}`;
  if (!room.players[id]) {
    if (Object.keys(room.players).length >= 50) {
      return res.status(400).json({ error: 'ظرفیت اتاق تکمیل است (حداکثر ۵۰ بازیکن).' });
    }
    room.players[id] = {
      id,
      name: cleanName,
      isAlive: true,
      isSilenced: false,
      hasArmor: false,
      connected: true,
      joinedAt: Date.now(),
    };
    room.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('fa-IR'),
      text: `«${cleanName}» متصل شد.`,
      type: 'info',
    });
    io.to(room.code).emit('players_updated', {
      players: Object.values(room.players),
      logs: room.logs,
    });
  } else {
    room.players[id].name = cleanName;
    room.players[id].connected = true;
  }
  res.json({ player: room.players[id], roomCode: room.code });
});

app.post('/api/room/:code/buzz', (req, res) => {
  const room = getOrCreateRoom(req.params.code);
  const { playerId, type, message } = req.body;
  if (playerId) {
    io.to(playerId).emit('buzz', { type: type || 'warning', message: message || 'اخطار / بیدارباش از سوی گرداننده!' });
  } else {
    io.to(room.code).emit('buzz', { type: type || 'warning', message: message || 'اخطار سراسری گرداننده!' });
  }
  res.json({ success: true });
});

// Socket.io handlers

const MAFIA_ROLES = new Set(['godfather', 'dr_lecter', 'doctor_lecter', 'saul_goodman', 'simple_mafia', 'mafia_simple', 'matador', 'bomber', 'natasha']);

function isMafiaRole(roleId?: string): boolean {
  if (!roleId) return false;
  return MAFIA_ROLES.has(roleId.toLowerCase());
}

function broadcastMafiaChatUpdate(io: any, room: GameRoom) {
  const payload = {
    active: !!room.mafiaChatActive,
    messages: room.mafiaChatMessages || []
  };

  // 1. Send to God
  if (room.godSocketId) {
    io.to(room.godSocketId).emit('mafia_chat_sync', payload);
  }

  // 2. Send to all mafia players (by socketId or player id)
  Object.values(room.players).forEach((p) => {
    if (p.isAlive && isMafiaRole(p.roleId)) {
      if (p.socketId) io.to(p.socketId).emit('mafia_chat_sync', payload);
      io.to(p.id).emit('mafia_chat_sync', payload);
    }
  });
  // Also emit room-wide event with team filter in client
  io.to(room.code).emit('mafia_chat_state', { active: !!room.mafiaChatActive });
}

io.on('connection', (socket) => {
    // --- MAFIA PRIVATE CHAT SYSTEM ---
    socket.on('god_toggle_mafia_chat', (data: { roomCode?: string; active: boolean }) => {
      const rCode = data?.roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
      if (!rCode) return;
      const room = rooms[rCode.toString().toUpperCase()];
      if (!room) return;

      room.mafiaChatActive = !!data.active;
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: room.mafiaChatActive ? '💬 چت شبانه مافیا توسط گرداننده باز شد.' : '🔒 چت شبانه مافیا توسط گرداننده بسته شد.',
        type: 'action',
      });

      broadcastMafiaChatUpdate(io, room);
      io.to(room.code).emit('room_state_update', room);
    });

    socket.on('god_clear_mafia_chat', (data: { roomCode?: string }) => {
      const rCode = data?.roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
      if (!rCode) return;
      const room = rooms[rCode.toString().toUpperCase()];
      if (!room) return;

      room.mafiaChatMessages = [];
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: '🧹 تاریخچه چت مافیا توسط گرداننده پاک‌سازی شد.',
        type: 'info',
      });

      broadcastMafiaChatUpdate(io, room);
    });

    socket.on('mafia_send_message', (data: { roomCode?: string; text: string; playerId: string }) => {
      const rCode = data?.roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
      if (!rCode) return;
      const room = rooms[rCode.toString().toUpperCase()];
      if (!room) return;

      // Security Checks:
      // 1. Is chat currently activated by God?
      if (!room.mafiaChatActive) {
        socket.emit('buzz', { type: 'warning', message: 'چت مافیا در حال حاضر توسط گرداننده بسته است!' });
        return;
      }

      // 2. Identify Player & Role
      const sender = room.players[data.playerId] || Object.values(room.players).find(p => p.socketId === socket.id);
      if (!sender || !sender.isAlive || !isMafiaRole(sender.roleId)) {
        socket.emit('buzz', { type: 'danger', message: 'شما دسترسی به چت گروه مافیا را ندارید!' });
        return;
      }

      const cleanText = (data.text || '').trim();
      if (!cleanText) return;

      const newMsg: MafiaChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.roleId || 'mafia',
        text: cleanText,
        time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      if (!room.mafiaChatMessages) room.mafiaChatMessages = [];
      room.mafiaChatMessages.push(newMsg);

      // Log in God audit history
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: newMsg.time,
        text: `[چت مافیا] ${sender.name}: ${cleanText}`,
        type: 'danger'
      });

      broadcastMafiaChatUpdate(io, room);
    });

  socket.on('join_room', ({ roomCode, clientType, playerName, existingPlayerId }) => {
    const targetCode = roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
    const room = getOrCreateRoom(targetCode);
    socket.join(room.code);

    if (clientType === 'god') {
      room.godSocketId = socket.id;
      socket.emit('room_state', {
        ...room,
        isGod: true,
      });
      return;
    }

    // Player joining - require non-empty name
    const cleanName = (playerName || '').trim();
    if (!cleanName) {
      // Do not create empty/phantom players!
      socket.emit('error_message', 'لطفاً برای ورود به بازی نام خود را وارد کنید.');
      return;
    }

    // 1. If this exact socket.id is already registered in this room
    if (room.players[socket.id]) {
      const existingPlayer = room.players[socket.id];
      const isDuplicate = existingPlayer.name === cleanName && existingPlayer.connected;

      // Update player info
      existingPlayer.name = cleanName;
      existingPlayer.connected = true;

      // Send current state back to this client
      socket.emit('player_state', {
        player: existingPlayer,
        roomCode: room.code,
        gameStarted: room.gameStarted,
        cardsDistributed: room.cardsDistributed,
        timer: room.timer,
        secretVote: room.secretVote,
      });

      // If it's a duplicate request from the same connected socket, return immediately
      if (isDuplicate) {
        return;
      }

      // If name or connection changed, notify room
      io.to(room.code).emit('players_updated', {
        players: Object.values(room.players),
        logs: room.logs,
      });
      return;
    }

    // 2. If reconnecting with an existing player ID (e.g. from previous socket)
    if (existingPlayerId && room.players[existingPlayerId]) {
      const existing = room.players[existingPlayerId];
      existing.connected = true;
      // نام سرور اولویت دارد مگر نام قبلی خالی باشد
      if (!existing.name) existing.name = cleanName;
      existing.id = socket.id;
      room.players[socket.id] = existing;
      delete room.players[existingPlayerId];

      socket.emit('player_state', {
        player: existing,
        roomCode: room.code,
        gameStarted: room.gameStarted,
        cardsDistributed: room.cardsDistributed,
        timer: room.timer,
        secretVote: room.secretVote,
      });

      io.to(room.code).emit('players_updated', {
        players: Object.values(room.players),
        logs: room.logs,
      });
      return;
    }

    // 2.5 Re-attach if player reconnects with same name in same room (e.g. page refresh on phone)
    const existingSameName = Object.values(room.players).find(
      (p) => p.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existingSameName) {
      const oldId = existingSameName.id;
      delete room.players[oldId];
      existingSameName.id = socket.id;
      existingSameName.connected = true;
      room.players[socket.id] = existingSameName;

      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: `«${cleanName}» مجدداً متصل شد.`,
        type: 'info',
      });

      socket.emit('player_state', {
        player: existingSameName,
        roomCode: room.code,
        gameStarted: room.gameStarted,
        cardsDistributed: room.cardsDistributed,
        timer: room.timer,
        secretVote: room.secretVote,
      });

      io.to(room.code).emit('players_updated', {
        players: Object.values(room.players),
        logs: room.logs,
      });
      return;
    }

    // 3. New player joining - check room capacity limit: 50 players max
    if (Object.keys(room.players).length >= 50) {
      socket.emit('error_message', 'ظرفیت این اتاق تکمیل است (حداکثر ۵۰ بازیکن مجاز است).');
      return;
    }

    const newPlayer: Player = {
      id: socket.id,
      name: cleanName,
      isAlive: true,
      isSilenced: false,
      hasArmor: false,
      connected: true,
      joinedAt: Date.now(),
    };
    room.players[socket.id] = newPlayer;

    room.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('fa-IR'),
      text: `«${cleanName}» وارد اتاق بازی شد.`,
      type: 'info',
    });

    // Inform the joined player
    socket.emit('player_state', {
      player: newPlayer,
      roomCode: room.code,
      gameStarted: room.gameStarted,
      cardsDistributed: room.cardsDistributed,
      timer: room.timer,
      secretVote: room.secretVote,
    });

    // Broadcast updated player list to all in the room (especially God)
    io.to(room.code).emit('players_updated', {
      players: Object.values(room.players),
      logs: room.logs,
    });
  });

  // God distributes roles
  socket.on('distribute_roles', ({ roomCode, selectedRoleIds }) => {
    const targetCode = roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
    const room = getOrCreateRoom(targetCode);
    const activePlayers = Object.values(room.players).filter((p) => p.connected);

    if (selectedRoleIds.length !== activePlayers.length) {
      socket.emit('error_message', 'تعداد نقش‌های انتخاب‌شده با تعداد بازیکنان متصل برابر نیست!');
      return;
    }

    // Shuffle roles (Fisher-Yates)
    const shuffledRoles = [...selectedRoleIds];
    for (let i = shuffledRoles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledRoles[i], shuffledRoles[j]] = [shuffledRoles[j], shuffledRoles[i]];
    }

    room.rolesInGame = [...selectedRoleIds];
    room.cardsDistributed = true;
    room.gameStarted = true;

    // Assign to players
    activePlayers.forEach((player, idx) => {
      player.roleId = shuffledRoles[idx];
      player.isAlive = true;
      player.isSilenced = false;
      player.eliminationReason = undefined;
      // If armored citizen, initial armor is true
      if (player.roleId === 'armored') {
        player.hasArmor = true;
      }
    });

    room.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('fa-IR'),
      text: `کارت‌ها با موفقیت بین ${activePlayers.length} بازیکن توزیع شدند.`,
      type: 'action',
    });

    // Notify each player individually of their card
    activePlayers.forEach((player) => {
      io.to(player.id).emit('role_assigned', {
        roleId: player.roleId,
        player,
      });
    });

    // Inform God panel with full master list
    io.to(room.code).emit('game_started', {
      players: Object.values(room.players),
      rolesInGame: room.rolesInGame,
      logs: room.logs,
    });
  });

  // God updates player status (kill, silence, armor, notes, eliminationReason, kick)
    // Player requests self rename from phone
  socket.on("player_rename", ({ roomCode, playerId, newName }) => {
    const targetCode = roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
    const room = getOrCreateRoom(targetCode);
    if (!room) return;
    const clean = (newName || "").trim();
    if (!clean) return;

    let player = Object.values(room.players).find(p => p.id === playerId || p.socketId === socket.id);
    if (!player) player = room.players[socket.id];
    if (player) {
      const old = player.name;
      player.name = clean;
      io.to(room.code).emit("players_updated", {
        players: Object.values(room.players),
        logs: room.logs,
      });
      socket.emit("player_name_changed", { newName: clean });
    }
  });

  socket.on('update_player_status', ({ roomCode, playerId, updates }) => {
    const room = getOrCreateRoom(roomCode);
    const player = room.players[playerId];
    if (player) {
      Object.assign(player, updates);
      if (updates.name && player.socketId) {
        io.to(player.socketId).emit("player_name_changed", { newName: updates.name });
      }

      if (updates.isAlive === false) {
        const reasonText = updates.eliminationReason === 'mafia_shot' ? ' (شات شب مافیا)'
          : updates.eliminationReason === 'court_vote' ? ' (رأی دادگاه)'
          : updates.eliminationReason === 'sniper_shot' ? ' (تیر تک‌تیرانداز)'
          : updates.eliminationReason === 'gunsmith_shot' ? ' (شلیک تفنگدار)'
          : updates.eliminationReason === 'misfire_death' ? ' (شلیک اشتباه)'
          : updates.eliminationReason === 'disciplinary' ? ' (انضباطی)'
          : '';
        room.logs.push({
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString('fa-IR'),
          text: `«${player.name}» از بازی حذف شد${reasonText}.`,
          type: 'danger',
        });
      } else if (updates.isSilenced === true) {
        room.logs.push({
          id: Math.random().toString(36).substring(2, 9),
          time: new Date().toLocaleTimeString('fa-IR'),
          text: `«${player.name}» سکوت (سایلنت) گرفت.`,
          type: 'action',
        });
      }

      // Notify player
      io.to(playerId).emit('player_status_changed', player);

      // Broadcast to room
      io.to(room.code).emit('players_updated', {
        players: Object.values(room.players),
        logs: room.logs,
      });
    }
  });

  // Night Actions Desk
  socket.on('update_night_actions', ({ roomCode, nightActions }) => {
    const room = getOrCreateRoom(roomCode);
    room.nightActions = { ...(room.nightActions || {}), ...nightActions };
    io.to(room.code).emit('night_actions_updated', room.nightActions);
  });

  // Secret Night Voting
  socket.on('start_secret_vote', (payload: any) => {
    try {
      const roomCode = payload?.roomCode;
      const room = getOrCreateRoom(roomCode);
      const safeData = payload?.voteData || payload || {};
      console.log('[SERVER VOTE START] room:', roomCode, 'title:', safeData.title, 'candidates:', safeData.candidates);
      room.secretVote = {
        id: Math.random().toString(36).substring(2, 9),
        isActive: true,
        isLocked: safeData.startsLocked === true,
        title: safeData.title || 'رأی‌گیری مخفی شبانه',
        eligibleTeam: safeData.eligibleTeam || 'all',
        eligibleVoterIds: Array.isArray(safeData.eligibleVoterIds) ? safeData.eligibleVoterIds : null,
        targetDefendantId: safeData.targetDefendantId || null,
        candidates: Array.isArray(safeData.candidates) ? safeData.candidates : [],
        votes: {},
        ended: false,
      };
      if (!Array.isArray(room.logs)) room.logs = [];
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: `رأی‌گیری مخفی «${room.secretVote?.title}» آغاز شد.`,
        type: 'action',
      });
      io.to(room.code).emit('secret_vote_started', room.secretVote);
    } catch (err) {
      console.error('[ERROR in start_secret_vote]', err);
    }
  });

  socket.on('unlock_secret_vote', (payload: any) => {
    try {
      const targetCode = payload?.roomCode || Array.from(socket.rooms).find(r => r !== socket.id);
      const room = getOrCreateRoom(targetCode);
      console.log('[SERVER UNLOCK TRIGGERED] room:', targetCode, 'hasSecretVote:', !!room?.secretVote);
      if (!room || !room.secretVote) {
        console.warn('[SERVER UNLOCK WARN] Room or secretVote not found for:', targetCode);
        return;
      }
      room.secretVote.isLocked = false;
      const dur = (typeof payload?.duration === 'number' && payload.duration > 0) ? payload.duration : 5;
      console.log('[SERVER EMITTING secret_vote_unlocked] to room:', room.code, 'duration:', dur);
      io.to(room.code).emit('secret_vote_unlocked', { duration: dur });

      setTimeout(() => {
        try {
          if (room.secretVote && !room.secretVote.ended) {
            room.secretVote.isActive = false;
            room.secretVote.ended = true;
            io.to(room.code).emit('secret_vote_ended', room.secretVote);
          }
        } catch (e) {
          console.error(e);
        }
      }, dur * 1000);
    } catch (err) {
      console.error('[ERROR in unlock_secret_vote]', err);
    }
  });

  socket.on('submit_secret_vote', ({ roomCode, voterId, candidateId, voterName }: any) => {
    try {
      const room = getOrCreateRoom(roomCode);
      if (!room) return;

      const vId = voterId || socket.id;
      const cId = candidateId || 'exit';

      if (!room.secretVote) {
        room.secretVote = {
          id: 'vote_' + Date.now(),
          isActive: true,
          votes: {},
          title: 'رأی‌گیری شبانه'
        } as any;
      }
      if (!room.secretVote) return;
      if (!room.secretVote.votes) room.secretVote.votes = {};

      let voterPlayer = room.players ? room.players[vId] : null;
      if (!voterPlayer && room.players) {
        voterPlayer = Object.values(room.players).find((p: any) => p.id === vId || p.socketId === vId || p.socketId === socket.id) || null;
      }
      const vName = voterName || (voterPlayer ? voterPlayer.name : (socket.data?.name || "ناشناس"));
      if (!room.secretVote.voterDetails) room.secretVote.voterDetails = {};
      room.secretVote.voterDetails[vId] = { candidateId: cId, voterName: vName };
      room.secretVote.votes[vId] = cId;
      console.log(`[VOTE] ${vName} (${vId}) -> ${cId} in Room: ${roomCode}`);

      io.to(room.code).emit('secret_vote_updated', {
        totalVotes: Object.keys(room.secretVote.votes).length,
        votes: room.secretVote.votes,
        voterDetails: room.secretVote.voterDetails,
      });
    } catch (err) {
      console.error('[ERROR in submit_secret_vote]', err);
    }
  });

  socket.on('end_secret_vote', ({ roomCode }) => {
    const room = getOrCreateRoom(roomCode);
    if (room.secretVote) {
      room.secretVote.isActive = false;
      room.secretVote.ended = true;
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: `رأی‌گیری مخفی «${room.secretVote?.title}» پایان یافت.`,
        type: 'info',
      });
      io.to(room.code).emit('secret_vote_ended', room.secretVote);
    }
  });

  // Silent Wake-up / Warning Buzz to player
  socket.on('buzz_player', ({ roomCode: _rc, playerId, type, message }) => {
    io.to(playerId).emit('buzz', {
      type: type || 'wake',
      message: message || 'نوتیفیکیشن بیدارباش / اخطار گرداننده',
    });
  });

  // Buzz to all players
  socket.on('buzz_all', ({ roomCode, type, message }) => {
    io.to(roomCode).emit('buzz', {
      type: type || 'warning',
      message: message || 'اعلامیه سراسری گرداننده',
    });
  });

  // Kick player
  socket.on('kick_player', ({ roomCode, playerId }) => {
    const room = getOrCreateRoom(roomCode);
    const player = room.players[playerId];
    if (player) {
      const name = player.name;
      delete room.players[playerId];
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString('fa-IR'),
        text: `«${name}» توسط گرداننده اخراج شد.`,
        type: 'danger',
      });
      io.to(playerId).emit('kicked');
      io.to(room.code).emit('players_updated', {
        players: Object.values(room.players),
        logs: room.logs,
      });
    }
  });

  // Timer sync & Expire Alert
  socket.on('timer_control', ({ roomCode, action, seconds, speakerName, speakerId, timerType }) => {
    const room = getOrCreateRoom(roomCode);
    if (action === 'set') {
      stopRoomTimer(room);
      room.timer.isRunning = false;
      room.timer.seconds = seconds ?? 60;
      room.timer.speakerName = speakerName;
      room.timer.speakerId = speakerId;
      room.timer.timerType = timerType;
      io.to(room.code).emit('timer_updated', room.timer);
    } else if (action === 'start') {
      stopRoomTimer(room);
      room.timer.isRunning = true;
      if (seconds !== undefined) room.timer.seconds = seconds;
      if (speakerName !== undefined) room.timer.speakerName = speakerName;
      if (speakerId !== undefined) room.timer.speakerId = speakerId;
      if (timerType !== undefined) room.timer.timerType = timerType;

      io.to(room.code).emit('timer_updated', room.timer);

      room.timerInterval = setInterval(() => {
        if (room.timer.seconds > 1) {
          room.timer.seconds -= 1;
          io.to(room.code).emit('timer_updated', room.timer);
        } else {
          stopRoomTimer(room);
          room.timer.seconds = 0;
          room.timer.isRunning = false;
          io.to(room.code).emit('timer_updated', room.timer);
          io.to(room.code).emit('timer_ended', {
            speakerId: room.timer.speakerId,
            speakerName: room.timer.speakerName,
            timerType: room.timer.timerType || 'speech',
          });
          if (room.timer.speakerId) {
            io.to(room.timer.speakerId).emit('buzz', {
              type: 'warning',
              message: '⏰ وقت شما به پایان رسید!',
            });
          }
        }
      }, 1000);
    } else if (action === 'pause') {
      stopRoomTimer(room);
      room.timer.isRunning = false;
      io.to(room.code).emit('timer_updated', room.timer);
    } else if (action === 'reset') {
      stopRoomTimer(room);
      room.timer.isRunning = false;
      room.timer.seconds = seconds ?? 60;
      room.timer.speakerName = undefined;
      room.timer.speakerId = undefined;
      io.to(room.code).emit('timer_updated', room.timer);
    }
  });

  // Notify speaker and players when timer hits 0
  socket.on('timer_ended', ({ roomCode, speakerId, timerType }) => {
    const room = getOrCreateRoom(roomCode);
    room.timer.isRunning = false;
    room.timer.seconds = 0;
    io.to(room.code).emit('timer_ended', {
      speakerId,
      speakerName: room.timer.speakerName,
      timerType: timerType || room.timer.timerType || 'speech',
    });
    // Send direct buzz to the speaker
    if (speakerId) {
      io.to(speakerId).emit('buzz', {
        type: 'warning',
        message: '⏰ وقت شما به پایان رسید!',
      });
    }
  });

  // End game and declare victory
  socket.on('end_game', ({ roomCode, winner, reason }) => {
    const room = getOrCreateRoom(roomCode);
    room.gameStarted = false;
    room.logs.push({
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('fa-IR'),
      text: `🏆 بازی به پایان رسید! برنده: ${winner === 'mafia' ? 'تیم مافیا' : 'تیم شهروندان'} (${reason || ''})`,
      type: 'action',
    });
    io.to(room.code).emit('game_ended', {
      winner,
      reason,
      logs: room.logs,
      players: Object.values(room.players),
    });
  });

  // Reset entire game
  
  // Challenge Management
    // Challenge Management
  socket.on("request_challenge", (data) => {
    const pId = typeof data === "object" ? data.playerId : data;
    const rCode = (typeof data === "object" && data.roomCode) || Array.from(socket.rooms).find(r => r !== socket.id);
    const room = getOrCreateRoom(rCode);
    if (!room) return;

    let player = Object.values(room.players).find(p => p.id === pId || p.socketId === socket.id);
    if (!player) player = room.players[socket.id];
    if (!player || !player.isAlive) return;

    if (!room.challengeRequests) room.challengeRequests = [];
    const exists = room.challengeRequests.some(r => r.playerId === player.id);
    if (!exists) {
      room.challengeRequests.push({
        playerId: player.id,
        playerName: player.name,
        time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
      });
      // ارسال به تمام سوکت‌های اتاق و خود سوکت
      io.to(room.code).emit("challenges_updated", room.challengeRequests);
      socket.emit("challenges_updated", room.challengeRequests);
      room.logs.push({
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }),
        text: "«" + player.name + "» تقاضای چالش کرد.",
        type: "challenge",
      });
      io.to(room.code).emit("challenges_updated", room.challengeRequests);
    io.to(room.code).emit("logs_updated", room.logs);
    }
  });

    
  // 1. Dismiss / Cancel challenge (not consumed - unlocked for player)
  socket.on("dismiss_challenge", (data) => {
    const rCode = (typeof data === "object" && data?.roomCode) || Array.from(socket.rooms).find(r => r !== socket.id);
    const playerId = typeof data === "object" ? data?.playerId : data;
    const room = getOrCreateRoom(rCode);
    if (!room) return;

    if (Array.isArray(room.challengeRequests)) {
      room.challengeRequests = room.challengeRequests.filter(req => req.playerId !== playerId);
    }

    io.to(room.code).emit("challenges_updated", room.challengeRequests || []);

    // Broadcast to room so any device for this player instantly unlocks
    io.to(room.code).emit("challenge_dismissed", { playerId });
  });

  // 2. Consume challenge (consumed for the day - locks button until reset)
  socket.on("consume_challenge", (data) => {
    const rCode = (typeof data === "object" && data?.roomCode) || Array.from(socket.rooms).find(r => r !== socket.id);
    const playerId = typeof data === "object" ? data?.playerId : data;
    const room = getOrCreateRoom(rCode);
    if (!room) return;

    if (Array.isArray(room.challengeRequests)) {
      room.challengeRequests = room.challengeRequests.filter(req => req.playerId !== playerId);
    }

    const player = room.players[playerId] || Object.values(room.players).find(p => p.id === playerId || p.socketId === playerId);
    if (player) {
      player.usedDailyChallenge = true;
    }

    io.to(room.code).emit("challenges_updated", room.challengeRequests || []);
    io.to(room.code).emit("players_updated", {
      players: Object.values(room.players),
      logs: room.logs
    });
  });

  socket.on("reset_daily_challenges", (data) => {
    const rCode = (typeof data === "object" && data?.roomCode) || Array.from(socket.rooms).find(r => r !== socket.id);
    const room = getOrCreateRoom(rCode);
    if (!room) return;

    room.challengeRequests = [];
    Object.values(room.players).forEach(p => {
      p.usedDailyChallenge = false;
    });

    io.to(room.code).emit("challenges_updated", []);
    io.to(room.code).emit("daily_challenges_reset");
    io.to(room.code).emit("players_updated", {
      players: Object.values(room.players),
      logs: room.logs
    });
  });

  socket.on('disconnect', () => {
    // Look up player across rooms
    for (const roomCode of Object.keys(rooms)) {
      const room = rooms[roomCode];
      if (room.players[socket.id]) {
        room.players[socket.id].connected = false;
        io.to(room.code).emit('players_updated', {
          players: Object.values(room.players),
          logs: room.logs,
        });
      }
    }
  });
});


// Vite middleware in dev or static files in production
async function startServer() {
  const isProd = false;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkAddresses();
    console.log(`[Mafia Game] Server running on http://0.0.0.0:${PORT}`);
    if (ips.length > 0) {
      ips.forEach((ip) => {
        console.log(`[Mafia Game] Local Wi-Fi network address: http://${ip.address}:${PORT}`);
      });
      console.log(`[Mafia Game] God Dashboard: http://${ips[0].address}:${PORT}/?role=god&key=secret123`);
    } else {
      console.log(`[Mafia Game] God Dashboard: http://localhost:${PORT}/?role=god&key=secret123`);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});


// Graceful shutdown to release port 3000 cleanly
const cleanupAndExit = () => {
  console.log("\n[Mafia Game] Closing server and freeing port...");
  httpServer.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000);
};

process.on("SIGINT", cleanupAndExit);
process.on("SIGTERM", cleanupAndExit);
