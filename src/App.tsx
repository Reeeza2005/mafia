/**
 * Mafia Game - Universal Web Application
 * بازی مافیا: دستیار و گرداننده آنلاین و محلی
 */
import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { network } from './services/network';
import { Player, GameTimer, GameLog, NetworkMode } from './types/mafia';
import { PRESETS } from './data/roles';
import { Header } from './components/Header';
import { RoleSelectionPanel } from './components/RoleSelectionPanel';
import { GodDashboard } from './components/GodDashboard';
import { PlayerView } from './components/PlayerView';
import { QrCodeModal } from './components/QrCodeModal';
import { OfflineExportModal } from './components/OfflineExportModal';
import { AudioPlayerModal } from './components/AudioPlayerModal';
import { audio } from './utils/audio';
import { Crown, User, Smartphone, Wifi, Play, Sparkles, RefreshCw } from 'lucide-react';

export default function App() {
  // App view state: 'welcome' | 'god' | 'player'
  const [clientType, setClientType] = useState<'god' | 'player' | null>(null);
  const [roomCode, setRoomCode] = useState<string>('MAFIA');
  const [networkMode, setNetworkMode] = useState<NetworkMode>('socket');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // God state
  const [selectedRoleCounts, setSelectedRoleCounts] = useState<Record<string, number>>(PRESETS[1].roles);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rolesInGame, setRolesInGame] = useState<string[]>([]);
  const [cardsDistributed, setCardsDistributed] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [timer, setTimer] = useState<GameTimer>({ seconds: 60, isRunning: false });
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [secretVote, setSecretVote] = useState<any>(undefined);

  // Player state
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // URL query parameter parsing on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rCode = urlParams.get('room') || 'MAFIA';
    setRoomCode(rCode.toUpperCase());

    const roleParam = urlParams.get('role');
    if (roleParam === 'god') {
      setClientType('god');
    } else if (roleParam === 'player') {
      setClientType('player');
    }
  }, []);

  // Setup networking listeners
  useEffect(() => {
    network.setMode(networkMode);
    if (networkMode === 'socket') {
      network.initSocket();
    }

    const unConnected = network.on('connected', () => setIsConnected(true));
    const unDisconnected = network.on('disconnected', () => setIsConnected(false));

    const unRoomState = network.on('room_state', (data: any) => {
      if (data.players) setPlayers(Object.values(data.players));
      if (data.rolesInGame) setRolesInGame(data.rolesInGame);
      if (data.cardsDistributed !== undefined) setCardsDistributed(data.cardsDistributed);
      if (data.gameStarted !== undefined) setGameStarted(data.gameStarted);
      if (data.timer) setTimer(data.timer);
      if (data.logs) setLogs(data.logs);
    });

    const unPlayerState = network.on('player_state', (data: any) => {
      if (data.player) setMyPlayer(data.player);
      if (data.cardsDistributed !== undefined) setCardsDistributed(data.cardsDistributed);
      if (data.gameStarted !== undefined) setGameStarted(data.gameStarted);
      if (data.timer) setTimer(data.timer);
    });

    const unPlayersUpdated = network.on('players_updated', (data: any) => {
      if (data.players) {
        setPlayers(data.players);
        // Update myPlayer if I am in the list
        if (myPlayer) {
          const updatedSelf = data.players.find((p: Player) => p.id === myPlayer.id);
          if (updatedSelf) setMyPlayer(updatedSelf);
        }
      }
      if (data.logs) setLogs(data.logs);
    });

    const unRoleAssigned = network.on('role_assigned', (data: any) => {
      if (data.player) {
        setMyPlayer(data.player);
        setCardsDistributed(true);
        setGameStarted(true);
        audio.playFlip();
      }
    });

    const unPlayerStatusChanged = network.on('player_status_changed', (updatedPlayer: any) => {
      if (myPlayer && myPlayer.id === updatedPlayer.id) {
        setMyPlayer(updatedPlayer);
      }
    });

    const unGameStarted = network.on('game_started', (data: any) => {
      setCardsDistributed(true);
      setGameStarted(true);
      if (data.players) setPlayers(data.players);
      if (data.rolesInGame) setRolesInGame(data.rolesInGame);
      if (data.logs) setLogs(data.logs);

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#e11d48', '#38bdf8', '#f59e0b', '#ffffff'],
        });
      } catch {
        // Ignore
      }
    });

    const unGameReset = network.on('game_reset', (data: any) => {
      setCardsDistributed(false);
      setGameStarted(false);
      setRolesInGame([]);
      setTimer({ seconds: 60, isRunning: false });
      if (data.players) setPlayers(data.players);
      if (data.logs) setLogs(data.logs);
      if (myPlayer) {
        setMyPlayer((prev) => (prev ? { ...prev, roleId: undefined, isAlive: true, isSilenced: false } : null));
      }
    });

    const unTimerUpdated = network.on('timer_updated', (t: any) => {
      setTimer(t);
    });

    const unKicked = network.on('kicked', () => {
      setMyPlayer(null);
      setErrorMessage('شما توسط گرداننده از بازی اخراج شدید.');
    });

    const unErrorMessage = network.on('error_message', (msg: any) => {
      setErrorMessage(typeof msg === 'string' ? msg : 'خطایی رخ داد.');
    });

    const unSecretVoteStarted = network.on('secret_vote_started', (data: any) => setSecretVote(data));
    const unSecretVoteEnded = network.on('secret_vote_ended', () => setSecretVote(undefined));

    return () => {
      unConnected();
      unDisconnected();
      unRoomState();
      unPlayerState();
      unPlayersUpdated();
      unRoleAssigned();
      unPlayerStatusChanged();
      unGameStarted();
      unGameReset();
      unTimerUpdated();
      unKicked();
      unErrorMessage();
      unSecretVoteStarted();
      unSecretVoteEnded();
    };
  }, [networkMode, myPlayer]);

  // Join Room as God
  const handleJoinAsGod = () => {
    setClientType('god');
    network.joinRoom(roomCode, 'god', 'گرداننده');
    audio.playGavel();
  };

  // Join Room as Player
  const handleJoinAsPlayer = (name: string) => {
    network.joinRoom(roomCode, 'player', name);
    audio.playFlip();
  };

  // Toggle Single Role Count
  const handleUpdateRoleCount = (roleId: string, count: number) => {
    setSelectedRoleCounts((prev) => ({
      ...prev,
      [roleId]: count,
    }));
  };

  // Distribute Cards
  const handleDistributeCards = () => {
    const list: string[] = [];
    Object.entries(selectedRoleCounts).forEach(([roleId, count]) => {
      for (let i = 0; i < count; i++) {
        list.push(roleId);
      }
    });

    network.distributeRoles(list);
  };

  // Timer Control
  const handleTimerControl = (
    action: 'start' | 'pause' | 'reset' | 'set',
    seconds?: number,
    speakerName?: string,
    speakerId?: string,
    timerType?: 'speech' | 'challenge' | 'defense' | 'voting'
  ) => {
    network.controlTimer(action, seconds, speakerName, speakerId, timerType);
  };

  // Update Player Status (God)
  const handleUpdatePlayer = (playerId: string, updates: Partial<Player>) => {
    network.updatePlayerStatus(playerId, updates);
  };

  // Kick Player (God)
  const handleKickPlayer = (playerId: string) => {
    network.kickPlayer(playerId);
  };

  // Reset Game
  const handleResetGame = () => {
    if (window.confirm('آیا مطمئن هستید که می‌خواهید بازی را ریست کنید و کارت‌ها را پس بگیرید؟')) {
      network.resetGame();
      audio.playGavel();
    }
  };

  // Mode Switcher (Socket vs PeerJS)
  const handleToggleMode = (mode: NetworkMode) => {
    setNetworkMode(mode);
    setIsConnected(false);
    if (clientType) {
      network.joinRoom(roomCode, clientType, clientType === 'god' ? 'گرداننده' : (myPlayer?.name || 'بازیکن'));
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* App Header */}
      <Header
        roomCode={roomCode}
        clientType={clientType || 'player'}
        networkMode={networkMode}
        isConnected={isConnected}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenAudio={() => setIsAudioOpen(true)}
        onToggleMode={handleToggleMode}
        onResetGame={clientType === 'god' ? handleResetGame : undefined}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Error notification popup */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-200">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="font-bold px-2 py-0.5 rounded-lg bg-red-900">
              متوجه شدم
            </button>
          </div>
        )}

        {/* 1. WELCOME SCREEN: Select Role (God or Player) */}
        {!clientType ? (
          <div className="max-w-xl mx-auto py-10 sm:py-16 text-center space-y-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>نسخه جامع مافیا لوکال و آنلاین P2P</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                بازی مافیا <span className="text-rose-500">نوار</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                مدیریت هوشمند سناریوهای مافیا، دارای بیش از ۲۰ نقش اختصاصی، انیمیشن ۳ بعدی کارت، تایمر نوبت و اتصال خودکار با QR کد
              </p>
            </div>

            {/* Room code input */}
            <div className="max-w-xs mx-auto bg-neutral-900 border border-neutral-800 p-2 rounded-2xl flex items-center justify-center gap-2">
              <span className="text-xs text-neutral-400">کد اتاق:</span>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1 text-center font-mono font-bold text-rose-400 text-sm focus:outline-none focus:border-rose-500 w-28 uppercase"
              />
            </div>

            {/* Role Entrance Choices */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* God Selection Card */}
              <button
                onClick={handleJoinAsGod}
                className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-600/40 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-950/30 text-right group transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Crown className="w-7 h-7 text-amber-400" />
                </div>
                <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                  پنل گرداننده (God)
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  انتخاب نقش‌ها، توزیع تصادفی کارت‌ها، تایمر صحبت، نظارت زنده و تولید QR Code برای گوشی‌ها.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <span>ورود به مدیریت</span>
                  <Play className="w-3.5 h-3.5 fill-amber-400 rotate-180" />
                </div>
              </button>

              {/* Player Selection Card */}
              <button
                onClick={() => setClientType('player')}
                className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-rose-600/40 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-950/30 text-right group transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-600/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7 text-rose-400" />
                </div>
                <h3 className="text-base font-black text-white group-hover:text-rose-400 transition-colors">
                  ورود بازیکن (Player)
                </h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  دریافت کارت محرمانه با انیمیشن چرخش ۳ بعدی، مشاهده وظایف نقش، وضعیت زنده و دفترچه یادداشت.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <span>ورود به بازی</span>
                  <Play className="w-3.5 h-3.5 fill-rose-400 rotate-180" />
                </div>
              </button>
            </div>

            {/* Offline Local Wi-Fi info banner */}
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-amber-400 border border-neutral-800 shrink-0">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">اجرای ۱۰۰٪ بدون اینترنت در دورهمی‌ها</h4>
                  <p className="text-[11px] text-neutral-400">
                    لپ‌تاپ و گوشی‌ها را به یک وای‌فای یا هات‌اسپات وصل کنید تا بازی بدون اینترنت اجرا شود.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportOpen(true)}
                className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 shrink-0"
              >
                مشاهده کدهای سرور
              </button>
            </div>
          </div>
        ) : clientType === 'god' ? (
          /* 2. GOD / NARRATOR VIEW */
          <div className="space-y-6">
            {/* View Switcher / Banner */}
            <div className="flex items-center justify-between bg-neutral-900/70 border border-neutral-800 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <span className="text-sm font-bold text-white">اتاق {roomCode} — پنل گرداننده بازی</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsQrOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  QR کد گوشی‌ها
                </button>
                <button
                  onClick={() => setClientType('player')}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
                >
                  تغییر به نمای بازیکن
                </button>
              </div>
            </div>

            {/* If game cards have NOT been distributed yet, show the Role Selection System */}
            {!cardsDistributed ? (
              <div className="space-y-4">
                {/* Connected Players Live Counter & List */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h3 className="text-sm font-bold text-white">
                        بازیکنان متصل شده: ({players.length} نفر)
                      </h3>
                    </div>
                    <span className="text-xs text-neutral-400">
                      منتظر انتخاب نقش‌ها و زدن دکمه «توزیع کارتها»
                    </span>
                  </div>

                  {players.length === 0 ? (
                    <div className="bg-neutral-950/70 border border-neutral-850 rounded-xl p-4 text-center space-y-2">
                      <p className="text-xs text-neutral-400">
                        هنوز بازیکنی به اتاق متصل نشده است. QR کد را باز کنید تا بازیکنان با دوربین گوشی اسکن کنند.
                      </p>
                      <button
                        onClick={() => setIsQrOpen(true)}
                        className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold"
                      >
                        نمایش QR کد اتصال
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {players.map((p, idx) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl text-xs text-neutral-200"
                        >
                          <span className="w-5 h-5 rounded-md bg-neutral-800 text-[10px] flex items-center justify-center font-bold text-neutral-400">
                            {idx + 1}
                          </span>
                          <span className="font-bold">{p.name}</span>
                          <button
                            onClick={() => handleKickPlayer(p.id)}
                            className="text-neutral-500 hover:text-red-400 font-bold ml-1 text-xs"
                            title="اخراج بازیکن"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Role Selection Panel adhering to prompt rules */}
                <RoleSelectionPanel
                  selectedRoleCounts={selectedRoleCounts}
                  onUpdateRoleCount={handleUpdateRoleCount}
                  onSetPreset={(counts) => setSelectedRoleCounts(counts)}
                  connectedPlayersCount={players.length}
                  onDistribute={handleDistributeCards}
                />
              </div>
            ) : (
              /* If cards ARE distributed, show the complete God Dashboard */
              <div className="space-y-4">
                <GodDashboard
                  players={players}
                  timer={timer}
                  logs={logs}
                  rolesInGame={rolesInGame}
                  cardsDistributed={cardsDistributed}
                  onUpdatePlayer={handleUpdatePlayer}
                  onKickPlayer={handleKickPlayer}
                  onTimerControl={handleTimerControl}
                  onOpenQr={() => setIsQrOpen(true)}
                  onOpenAudio={() => setIsAudioOpen(true)}
                  onReconfigureRoles={() => setCardsDistributed(false)}
                />
              </div>
            )}
          </div>
        ) : (
          /* 3. PLAYER VIEW (MOBILE OPTIMIZED) */
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-neutral-900/60 border border-neutral-800 p-2.5 rounded-2xl mb-2">
              <span className="text-xs text-neutral-400">اتاق بازی: <strong className="text-rose-400">{roomCode}</strong></span>
              <button
                onClick={() => setClientType('god')}
                className="text-xs px-2.5 py-1 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white"
              >
                تغییر به پنل گرداننده
              </button>
            </div>

            <PlayerView
              player={myPlayer}
              cardsDistributed={cardsDistributed}
              gameStarted={gameStarted}
              timer={timer}
              secretVote={secretVote}
              onJoin={handleJoinAsPlayer}
            />
          </div>
        )}
      </main>

      {/* QR Code Modal for scanning with phones */}
      <QrCodeModal
        roomCode={roomCode}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />

      {/* Audio Player and Soundboard Modal */}
      <AudioPlayerModal
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
      />

      {/* Standalone server.js and offline instructions modal */}
      <OfflineExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
