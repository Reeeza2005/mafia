import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, FileCode, CheckCircle2 } from 'lucide-react';

interface OfflineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineExportModal: React.FC<OfflineExportModalProps> = ({ isOpen, onClose }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'server' | 'package' | 'index' | 'guide'>('guide');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const serverJsContent = `/**
 * Mafia Game - Standalone Local Server
 * اجرا روی لپتاپ بدون اینترنت در شبکه وای‌فای محلی
 * اجرا با دستور: node server.js
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

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(__dirname));

app.get('/api/network-info', async (_req, res) => {
  const ips = getLocalIps();
  const host = ips.length > 0 ? ips[0].address : 'localhost';
  const localUrl = \`http://\${host}:\${PORT}\`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(localUrl, { margin: 1, width: 300 });
  } catch (e) {}
  res.json({ ips, localUrl, qrDataUrl });
});

const rooms = {};
function getRoom(code = 'MAFIA') {
  const c = code.toUpperCase();
  if (!rooms[c]) {
    rooms[c] = { code: c, players: {}, gameStarted: false, cardsDistributed: false, timer: { seconds: 60, isRunning: false }, logs: [] };
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
    room.players[socket.id] = { id: socket.id, name: playerName || \`بازیکن \${Object.keys(room.players).length + 1}\`, isAlive: true, isSilenced: false, hasArmor: false, connected: true };
    room.logs.push({ time: new Date().toLocaleTimeString('fa-IR'), text: \`«\${room.players[socket.id].name}» وارد بازی شد.\` });
    socket.emit('player_state', { player: room.players[socket.id], ...room });
    io.to(room.code).emit('players_updated', { players: Object.values(room.players), logs: room.logs });
  });

  socket.on('distribute_roles', ({ roomCode, selectedRoleIds }) => {
    const room = getRoom(roomCode);
    const players = Object.values(room.players).filter((p) => p.connected);
    if (selectedRoleIds.length !== players.length) return;
    const shuffled = [...selectedRoleIds].sort(() => Math.random() - 0.5);
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
    Object.values(room.players).forEach((p) => { p.roleId = null; p.isAlive = true; p.isSilenced = false; });
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
  console.log(\`[بازی مافیا] سرور آماده اجرا روی پورت \${PORT}\`);
  if (ips.length > 0) {
    console.log(\`[وای‌فای محلی] آدرس گوشی بازیکنان: http://\${ips[0].address}:\${PORT}\`);
  }
});`;

  const packageJsonContent = `{
  "name": "mafia-local-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "socket.io": "^4.8.4",
    "qrcode": "^1.5.4"
  }
}`;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Terminal className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-black text-white">
            کدهای اجرای آفلاین روی لپ‌تاپ (بدون اینترنت)
          </h3>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          این پروژه به گونه‌ای ساخته شده که بدون نیاز به اینترنت، روی شبکه لوکال وای‌فای با Node.js اجرا شود.
        </p>

        {/* Code tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 mb-3">
          <button
            onClick={() => setActiveCodeTab('guide')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCodeTab === 'guide'
                ? 'bg-amber-600 text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-950'
            }`}
          >
            📋 راهنمای اجرای سریع
          </button>
          <button
            onClick={() => setActiveCodeTab('server')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCodeTab === 'server'
                ? 'bg-rose-600 text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-950'
            }`}
          >
            📄 فایل server.js
          </button>
          <button
            onClick={() => setActiveCodeTab('index')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCodeTab === 'index'
                ? 'bg-sky-600 text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-950'
            }`}
          >
            🌐 تک‌فایل index.html
          </button>
          <button
            onClick={() => setActiveCodeTab('package')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeCodeTab === 'package'
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:text-white bg-neutral-950'
            }`}
          >
            📦 فایل package.json
          </button>
        </div>

        {activeCodeTab === 'guide' && (
          <div className="space-y-3 text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-4 rounded-2xl border border-neutral-800 text-right">
            <h4 className="font-bold text-white text-sm">مراحل راه‌اندازی روی لپتاپ (آفلاین بدون اینترنت):</h4>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center shrink-0 font-bold text-[10px]">۱</span>
                <span>فایل‌های <code className="text-rose-400">server.js</code> و <code className="text-rose-400">package.json</code> را در یک پوشه قرار دهید.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center shrink-0 font-bold text-[10px]">۲</span>
                <span>ترمینال را در آن پوشه باز کرده و وابستگی‌ها را نصب کنید:</span>
              </div>
              <pre className="bg-neutral-900 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 dir-ltr text-left overflow-x-auto">
npm install express socket.io qrcode
              </pre>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center shrink-0 font-bold text-[10px]">۳</span>
                <span>دستور اجرا را بزنید:</span>
              </div>
              <pre className="bg-neutral-900 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 dir-ltr text-left overflow-x-auto">
node server.js
              </pre>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 flex items-center justify-center shrink-0 font-bold text-[10px]">۴</span>
                <span>آدرس آی‌پی محلی (مثلاً <code className="text-amber-400">http://192.168.1.100:3000</code>) به همراه QR Code در ترمینال و مرورگر باز می‌شود و بازیکنان بدون اینترنت وصل می‌شوند.</span>
              </div>
            </div>
          </div>
        )}

        {activeCodeTab === 'server' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">server.js</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(serverJsContent)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  کپی کد
                </button>
                <button
                  onClick={() => downloadFile('server.js', serverJsContent)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  دانلود فایل
                </button>
              </div>
            </div>
            <pre className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl font-mono text-[11px] text-neutral-300 h-64 overflow-y-auto dir-ltr text-left">
              {serverJsContent}
            </pre>
          </div>
        )}

        {activeCodeTab === 'index' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">index.html (تک‌فایل شامل تمام استایل‌ها، SVGها و منطق دوگانه)</span>
              <div className="flex items-center gap-2">
                <a
                  href="/standalone.html"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 text-xs flex items-center gap-1"
                >
                  مشاهده زنده در صفحه جدید ↗
                </a>
                <button
                  onClick={async () => {
                    const res = await fetch('/standalone.html');
                    const text = await res.text();
                    downloadFile('index.html', text);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs text-white font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  دانلود index.html
                </button>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl text-right text-xs text-neutral-300 space-y-2">
              <p>
                این فایل یک <strong>HTML مستقل (Single File)</strong> است که تمام ۲۰ نقش مافیا، وکتورهای SVG داخلی، انیمیشن ۳D کارت، پنل گرداننده، تایمر نوبت و منطق دوگانه (Local Socket.io / PeerJS P2P) را در خود دارد.
              </p>
              <p className="text-neutral-400 text-[11px]">
                می‌توانید آن را در کنار <code className="text-rose-400">server.js</code> قرار داده و آفلاین اجرا کنید، یا آن را مستقیماً روی <strong>GitHub Pages</strong> آپلود نمایید.
              </p>
            </div>
          </div>
        )}

        {activeCodeTab === 'package' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400 font-mono">package.json</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(packageJsonContent)}
                  className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs text-white flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  کپی کد
                </button>
                <button
                  onClick={() => downloadFile('package.json', packageJsonContent)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  دانلود فایل
                </button>
              </div>
            </div>
            <pre className="bg-neutral-950 border border-neutral-800 p-3 rounded-2xl font-mono text-[11px] text-neutral-300 h-48 overflow-y-auto dir-ltr text-left">
              {packageJsonContent}
            </pre>
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs transition-colors"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
};
