/**
 * Mafia Game - Standalone Local Server
 * اجرا روی لپتاپ بدون اینترنت در شبکه وای‌فای محلی (Local Wi-Fi)
 * دستور اجرا: node server.js
 */
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());

// پیدا کردن آی‌پی محلی لپ‌تاپ در شبکه وای‌فای
function getLocalIps() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address });
      }
    }
  }
  return results;
}

// سرو فایل‌های فرانت‌اند
const staticDir = path.join(__dirname, 'dist');
app.use(express.static(staticDir));
app.use(express.static(__dirname));

// دریافت اطلاعات شبکه و QR کد برای بازیکنان
app.get('/api/network-info', async (_req, res) => {
  const ips = getLocalIps();
  const host = ips.length > 0 ? ips[0].address : 'localhost';
  const localUrl = `http://${host}:${PORT}`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(localUrl, { margin: 1, width: 300 });
  } catch (e) {
    console.error(e);
  }
  res.json({ ips, localUrl, qrDataUrl });
});

// حافظه بازی
const rooms = {};

function getRoom(code = 'MAFIA') {
  const c = code.toUpperCase();
  if (!rooms[c]) {
    rooms[c] = {
      code: c,
      players: {},
      gameStarted: false,
      cardsDistributed: false,
      roles: [],
      timer: { seconds: 60, isRunning: false },
      logs: [],
    };
  }
  return rooms[c];
}

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomCode, clientType, playerName }) => {
    const room = getRoom(roomCode);
    socket.join(room.code);

    if (clientType === 'god') {
      socket.emit('room_state', { ...room, isGod: true });
      return;
    }

    room.players[socket.id] = {
      id: socket.id,
      name: playerName || `بازیکن ${Object.keys(room.players).length + 1}`,
      isAlive: true,
      isSilenced: false,
      hasArmor: false,
      connected: true,
    };

    room.logs.push({
      time: new Date().toLocaleTimeString('fa-IR'),
      text: `«${room.players[socket.id].name}» وارد بازی شد.`,
    });

    socket.emit('player_state', { player: room.players[socket.id], ...room });
    io.to(room.code).emit('players_updated', { players: Object.values(room.players), logs: room.logs });
  });

  socket.on('distribute_roles', ({ roomCode, selectedRoleIds }) => {
    const room = getRoom(roomCode);
    const players = Object.values(room.players).filter((p) => p.connected);
    if (selectedRoleIds.length !== players.length) return;

    // بر زدن نقش‌ها
    const shuffled = [...selectedRoleIds].sort(() => Math.random() - 0.5);
    room.roles = selectedRoleIds;
    room.gameStarted = true;
    room.cardsDistributed = true;

    players.forEach((p, idx) => {
      p.roleId = shuffled[idx];
      p.isAlive = true;
      p.isSilenced = false;
      p.hasArmor = p.roleId === 'armored';
      io.to(p.id).emit('role_assigned', { roleId: p.roleId, player: p });
    });

    io.to(room.code).emit('game_started', { players: Object.values(room.players), logs: room.logs });
  });

  socket.on('update_player_status', ({ roomCode, playerId, updates }) => {
    const room = getRoom(roomCode);
    if (room.players[playerId]) {
      Object.assign(room.players[playerId], updates);
      io.to(playerId).emit('player_status_changed', room.players[playerId]);
      io.to(room.code).emit('players_updated', { players: Object.values(room.players), logs: room.logs });
    }
  });

  socket.on('timer_control', ({ roomCode, action, seconds, speakerName }) => {
    const room = getRoom(roomCode);
    if (action === 'start') room.timer = { seconds: seconds ?? 60, isRunning: true, speakerName };
    if (action === 'pause') room.timer.isRunning = false;
    if (action === 'reset') room.timer = { seconds: seconds ?? 60, isRunning: false };
    io.to(room.code).emit('timer_updated', room.timer);
  });

  socket.on('reset_game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    room.gameStarted = false;
    room.cardsDistributed = false;
    Object.values(room.players).forEach((p) => {
      p.roleId = null;
      p.isAlive = true;
      p.isSilenced = false;
    });
    io.to(room.code).emit('game_reset', { players: Object.values(room.players), logs: room.logs });
  });

  socket.on('disconnect', () => {
    for (const c of Object.keys(rooms)) {
      if (rooms[c].players[socket.id]) {
        rooms[c].players[socket.id].connected = false;
        io.to(c).emit('players_updated', { players: Object.values(rooms[c].players), logs: rooms[c].logs });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalIps();
  console.log('\n======================================================');
  console.log('  🎭 سرور لوکال بازی مافیا آماده است! (بدون اینترنت)');
  console.log(`  🔗 آدرس محلی سیستم: http://localhost:${PORT}`);
  if (ips.length > 0) {
    console.log(`  📱 آدرس اتصال بازیکنان (وای‌فای): http://${ips[0].address}:${PORT}`);
  }
  console.log('======================================================\n');
});
