/**
 * Mafia Game - Universal Local Wi-Fi Web Application
 * بازی مافیا: دستیار و گرداننده آفلاین در شبکه محلی
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { network } from './services/network';
import { Player, GameTimer, GameLog, SecretVoteState } from './types/mafia';
import { PRESETS } from './data/roles';
import { Header } from './components/Header';
import { RoleSelectionPanel } from './components/RoleSelectionPanel';
import { GodDashboard } from './components/GodDashboard';
import { PlayerView } from './components/PlayerView';
import { JoinCard } from './components/JoinCard';
import { HostShareModal } from './components/HostShareModal';
import { AudioPlayerModal } from './components/AudioPlayerModal';
import { OfflineExportModal } from './components/OfflineExportModal';
import { GameResultModal } from './components/GameResultModal';
import { audio } from './utils/audio';
import { Crown, Sparkles, User, Play, RefreshCw, Smartphone, QrCode, Download, RotateCcw } from 'lucide-react';

const generate4DigitCode = () => Math.floor(1000 + Math.random() * 9000).toString();

export default function App() {
  // View mode: null (Welcome Portal) | 'god' | 'player'
  const [clientType, setClientType] = useState<'god' | 'player' | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'god') return 'god';
      // If user came via QR Code or direct code link (?code=... or ?room=...), auto-route to Player view
      if (params.get('code') || params.get('room')) return 'player';
    }
    return null;
  });

  // Room code: read from ?code= or ?room=, or generate a random 4-digit code
  const [roomCode, setRoomCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const c = params.get('code') || params.get('room');
      if (c && c.trim()) return c.trim().replace(/[^0-9]/g, '').slice(0, 4);
    }
    return Math.floor(1000 + Math.random() * 9000).toString();
  });

  const [isConnected, setIsConnected] = useState<boolean>(false);

  // God state
  const [selectedRoleCounts, setSelectedRoleCounts] = useState<Record<string, number>>(PRESETS?.[1]?.roles || PRESETS?.[0]?.roles || {});
  const [players, setPlayers] = useState<Player[]>([]);
  const [rolesInGame, setRolesInGame] = useState<string[]>([]);
  const [cardsDistributed, setCardsDistributed] = useState<boolean>(false);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [timer, setTimer] = useState<GameTimer>({ seconds: 60, isRunning: false });
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [secretVote, setSecretVote] = useState<SecretVoteState | undefined>(undefined);
  const [isVoteUnlocked, setIsVoteUnlocked] = useState<boolean>(false);

  // Game Victory / Results state
  const [gameResult, setGameResult] = useState<{
    winner: 'mafia' | 'citizen';
    reason: string;
    players?: Player[];
  } | null>(null);

  // Player state
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const hasJoinedRef = useRef<boolean>(false);

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Parse URL query parameter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code') || params.get('room');
    if (codeParam && codeParam.trim()) {
      setRoomCode(codeParam.trim().replace(/[^0-9]/g, '').slice(0, 4));
    }

    const pathname = window.location.pathname.toLowerCase();
    const roleParam = params.get('role');
    if (pathname.includes("/admin") || roleParam === "god") {
      setClientType("god");
    } else {
      setClientType("player");
    }
  }, []);

  // Setup networking listeners once on mount
  useEffect(() => {
    network.initSocket();

        const unConnected = network.on('connected', () => {
      setIsConnected(true);
      try {
        const savedRoom = localStorage.getItem('mafia_room');
        const savedName = localStorage.getItem('mafia_player_name');
        const urlParams = new URLSearchParams(window.location.search);
        const isGodUrl = urlParams.get("role") === "god";

        if (!isGodUrl && savedRoom && savedName) {
          console.log("[AUTO-REJOIN] Joining room:", savedRoom, "as:", savedName);
          setRoomCode(savedRoom);
          setClientType("player");
          network.joinRoom(savedRoom, "player", savedName);
        }
      } catch (e) {}
    });
    const unDisconnected = network.on('disconnected', () => setIsConnected(false));
    const unNameChanged = network.on('player_name_changed', (data: any) => {
      if (data?.newName) {
        try {
          localStorage.setItem('mafia_player_name', data.newName);
        } catch (e) {}
      }
    });

    const unRoomState = network.on('room_state', (data: any) => {
      if (data.players) setPlayers(Object.values(data.players));
      if (data.rolesInGame) setRolesInGame(data.rolesInGame);
      if (data.cardsDistributed !== undefined) setCardsDistributed(data.cardsDistributed);
      if (data.gameStarted !== undefined) setGameStarted(data.gameStarted);
      if (data.timer) setTimer(data.timer);
      if (data.logs) setLogs(data.logs);
    });

    const unPlayerState = network.on('player_state', (data: any) => {
      setIsJoining(false);
      setClientType('player');
      if (data.player) setMyPlayer(data.player);
      if (data.cardsDistributed !== undefined) setCardsDistributed(data.cardsDistributed);
      if (data.gameStarted !== undefined) setGameStarted(data.gameStarted);
      if (data.timer) setTimer(data.timer);
    });

    const unPlayersUpdated = network.on('players_updated', (data: any) => {
      if (data.players) {
        setPlayers(data.players);
        // Functional update so myPlayer is never a stale dependency
        setMyPlayer((prev) => {
          if (!prev) return null;
          const updatedSelf = (data.players as Player[]).find((p) => p.id === prev.id || (Boolean(prev.name) && p.name === prev.name));
          return updatedSelf ? { ...prev, ...updatedSelf } : prev;
        });
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
      setMyPlayer((prev) => {
        if (prev && prev.id === updatedPlayer.id) {
          return { ...prev, ...updatedPlayer };
        }
        return prev;
      });
    });

    const unGameStarted = network.on('game_started', (data: any) => {
      setCardsDistributed(true);
      setGameStarted(true);
      if (data.players) {
        setPlayers(data.players);
        setMyPlayer((prev) => {
          if (!prev) return null;
          const updatedSelf = (data.players as Player[]).find((p) => p.id === prev.id || (prev.name && p.name === prev.name));
          return updatedSelf ? { ...prev, ...updatedSelf } : prev;
        });
      }
      if (data.rolesInGame) setRolesInGame(data.rolesInGame);
      if (data.logs) setLogs(data.logs);

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
      setGameResult(null);
      setTimer({ seconds: 60, isRunning: false });
      if (data.players) setPlayers(data.players);
      if (data.logs) setLogs(data.logs);
      setMyPlayer((prev) => (prev ? { ...prev, roleId: undefined, isAlive: true, isSilenced: false } : null));
    });

    const unGameEnded = network.on('game_ended', (data: any) => {
      setGameResult({
        winner: data.winner,
        reason: data.reason,
        players: data.players || players,
      });
    });

    const unTimerUpdated = network.on('timer_updated', (t: any) => {
      setTimer(t);
    });

    const unKicked = network.on('kicked', () => {
      setIsJoining(false);
      hasJoinedRef.current = false;
      network.resetJoined();
      setMyPlayer(null);
      setErrorMessage('شما توسط گرداننده از بازی اخراج شدید.');
    });

    const unErrorMessage = network.on('error_message', (msg: any) => {
      setIsJoining(false);
      hasJoinedRef.current = false;
      network.resetJoined();
      setErrorMessage(typeof msg === 'string' ? msg : 'خطایی رخ داد.');
    });

    const unSecretVoteStarted = network.on('secret_vote_started', (data: any) => {
      console.log('[CLIENT APP] secret_vote_started received:', data);
      setIsVoteUnlocked(!data?.isLocked);
      setSecretVote(data);
    });
    const unSecretVoteEnded = network.on('secret_vote_ended', () => {
      setSecretVote(undefined);
      setIsVoteUnlocked(false);
    });
    const unSecretVoteUnlocked = network.on('secret_vote_unlocked', ({ duration }: any) => {
      console.log('[CLIENT APP] secret_vote_unlocked received, duration:', duration);
      setIsVoteUnlocked(true);
      setSecretVote((prev: any) => prev ? { ...prev, isLocked: false } : prev);
      const timerSec = (typeof duration === 'number' && duration > 0) ? duration : 5;
      setTimeout(() => {
        setIsVoteUnlocked(false);
      }, timerSec * 1000);
    });
    const unSecretVoteUpdated = network.on('secret_vote_updated', (data: any) => {
      setSecretVote((prev: any) => prev ? { ...prev, votes: data.votes } : prev);
    });

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
      unGameEnded();
      unTimerUpdated();
      unKicked();
      unErrorMessage();
      unSecretVoteStarted();
      unSecretVoteEnded();
      if (typeof unSecretVoteUnlocked === 'function') unSecretVoteUnlocked();
    };
  }, []);

  // When clientType changes to 'god', join room as God
  useEffect(() => {
    if (clientType === 'god' && roomCode) {
      network.joinRoom(roomCode, 'god', 'گرداننده');
    }
  }, [clientType, roomCode]);

  // God generates a new 4-digit invite code
  const handleGenerateNewRoomCode = useCallback(() => {
    const newCode = generate4DigitCode();
    setRoomCode(newCode);
    if (clientType === 'god') {
      network.joinRoom(newCode, 'god', 'گرداننده');
    }
  }, [clientType]);

  // Join Room as God
  const handleJoinAsGod = (customCode?: string) => {
    const targetCode = (customCode || roomCode || generate4DigitCode()).trim().toUpperCase();
    setRoomCode(targetCode);
    setClientType('god');
    network.joinRoom(targetCode, 'god', 'گرداننده');
    audio.playGavel();
  };

  // Join Room as Player - strictly triggered on Submit click
  const handleJoinAsPlayer = (code: string, name: string) => {
    const cleanCode = (code || roomCode).trim().toUpperCase();
    const cleanName = (name || '').trim();

    if (!cleanCode || !cleanName) return;
    // اجازه اتصال مجدد در صورت تغییر سوکت یا بازگشت پس از اسلیپ
    if (isJoining) return;

    setIsJoining(true);
    hasJoinedRef.current = true;
    setErrorMessage(null);
    setRoomCode(cleanCode);
    setClientType('player');
    try {
      localStorage.setItem('mafia_room', cleanCode);
      localStorage.setItem('mafia_player_name', cleanName);
    } catch (e) {}
    network.joinRoom(cleanCode, 'player', cleanName);
    audio.playFlip();
  };

  // Toggle Single Role Count (God)
  const handleUpdateRoleCount = (roleId: string, count: number) => {
    setSelectedRoleCounts((prev) => ({
      ...prev,
      [roleId]: count,
    }));
  };

  // Distribute Cards (God)
  const handleDistributeCards = () => {
    const list: string[] = [];
    Object.entries(selectedRoleCounts).forEach(([roleId, count]) => {
      for (let i = 0; i < count; i++) {
        list.push(roleId);
      }
    });
    network.distributeRoles(list);
  };

  // Timer Control (God)
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

  // Reset Game Trigger (God) - opens custom confirmation modal (avoid window.confirm)
  const handleResetGame = () => {
    setIsResetConfirmOpen(true);
  };

  // Confirmed Reset Action
  const handleConfirmReset = () => {
    network.resetGame();
    setCardsDistributed(false);
    setGameStarted(false);
    setRolesInGame([]);
    setGameResult(null);
    setIsResetConfirmOpen(false);
    audio.playGavel();
  };

  // End Game & Declare Winner (God)
  const handleEndGame = (winner: 'mafia' | 'citizen', reason: string) => {
    network.endGame(winner, reason);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none">
      {/* App Header */}
      {clientType === 'god' && (
      <Header
        roomCode={roomCode}
        clientType={clientType || 'player'}
        isConnected={isConnected}
        playersCount={players.length}
        onOpenQr={() => setIsQrOpen(true)}
        onOpenAudio={() => setIsAudioOpen(true)}
        onOpenOfflineExport={() => setIsExportOpen(true)}
        onResetGame={clientType === 'god' ? handleResetGame : undefined}
      />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-2xl flex items-center justify-between text-xs text-red-200">
            <span>⚠️ {errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="font-bold px-2 py-0.5 rounded-lg bg-red-900 hover:bg-red-800 transition-colors cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        )}

        {/* 1. WELCOME SCREEN: Dual Entrance Portal (Both God and Player accessible) */}
        {!clientType ? (
          <div className="max-w-xl mx-auto py-10 sm:py-16 text-center space-y-8 animate-in fade-in duration-300">
            {/* Title & Badge */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>دستیار هوشمند مافیا در شبکه محلی Wi-Fi (آفلاین)</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                بازی مافیا <span className="text-rose-500">نوار</span>
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                مدیریت آسان سناریوها، توزیع کارت‌ها، تایمر نوبت و اتصال خودکار با بارکد QR در شبکه محلی
              </p>
            </div>

            {/* Room code input with Randomize button */}
            <div className="max-w-xs mx-auto bg-neutral-900 border border-neutral-800 p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-400">کد دعوت:</span>
                <input
                  type="text"
                  maxLength={4}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  className="bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-1.5 text-center font-mono font-bold text-amber-400 text-base focus:outline-none focus:border-amber-500 w-24 tracking-widest"
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateNewRoomCode}
                className="text-xs bg-neutral-800 hover:bg-neutral-750 text-neutral-200 px-2.5 py-1.5 rounded-xl border border-neutral-700/60 flex items-center gap-1 transition-all cursor-pointer"
                title="تولید کد ۴ رقمی جدید"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>کد جدید</span>
              </button>
            </div>

            {/* Role Entrance Choices: God or Player */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* God Selection Card */}
              <button
                onClick={() => handleJoinAsGod(roomCode)}
                className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-600/40 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-950/30 text-right group transition-all cursor-pointer text-right flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Crown className="w-7 h-7 text-amber-400" />
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-amber-400 transition-colors">
                    پنل گرداننده (God)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    تولید کد دعوت، انتخاب نقش‌ها، توزیع کارت‌ها، تایمر نوبت و QR کد اتصال بازیکنان.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <span>ورود به مدیریت بازی</span>
                  <Play className="w-3.5 h-3.5 fill-amber-400 rotate-180" />
                </div>
              </button>

              {/* Player Selection Card */}
              <button
                onClick={() => {
                  if (roomCode && roomCode.trim()) {
                    try { localStorage.setItem('mafia_room', roomCode.trim()); } catch(e){}
                  }
                  setClientType('player');
                }}
                className="p-6 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-rose-600/40 hover:border-rose-500 hover:shadow-xl hover:shadow-rose-950/30 text-right group transition-all cursor-pointer text-right flex flex-col justify-between"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-600/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <User className="w-7 h-7 text-rose-400" />
                  </div>
                  <h3 className="text-base font-black text-white group-hover:text-rose-400 transition-colors">
                    ورود بازیکن (Player)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                    ورود با نام و کد ۴ رقمی، مشاهده کارت نقش محرمانه و وضعیت زنده بازی.
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-xs font-bold text-rose-400">
                  <span>ورود به عنوان بازیکن</span>
                  <Play className="w-3.5 h-3.5 fill-rose-400 rotate-180" />
                </div>
              </button>
            </div>

            {/* Offline Bundle Download Banner */}
            <div className="bg-neutral-900/80 border border-neutral-800 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-950 border border-sky-800 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white">
                    دانلود بازی برای اجرای آفلاین در ویندوز و لینوکس
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    آموزش مرحله‌به‌مرحله و فایل‌های اجرایی یک‌کلیکه در شبکه محلی بدون اینترنت
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExportOpen(true)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>دانلود و آموزش آفلاین</span>
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
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-950/40 cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>QR کد گوشی‌ها</span>
                </button>
                <button
                  onClick={() => setClientType('player')}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs cursor-pointer"
                >
                  مشاهده نمای بازیکن
                </button>
              </div>
            </div>

            {/* If game cards have NOT been distributed yet, show Role Selection */}
            {!cardsDistributed ? (
              <div className="space-y-4">
                <RoleSelectionPanel
                  selectedRoleCounts={selectedRoleCounts}
                  onUpdateRoleCount={handleUpdateRoleCount}
                  onSetPreset={(counts) => setSelectedRoleCounts(counts)}
                  connectedPlayersCount={players.length}
                  onDistribute={handleDistributeCards}
                  roomCode={roomCode}
                  players={players}
                  onOpenQr={() => setIsQrOpen(true)}
                  onGenerateNewCode={handleGenerateNewRoomCode}
                  onKickPlayer={handleKickPlayer}
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
                  roomCode={roomCode}
                  onUpdatePlayer={handleUpdatePlayer}
                  onKickPlayer={handleKickPlayer}
                  onTimerControl={handleTimerControl}
                  onOpenQr={() => setIsQrOpen(true)}
                  onOpenAudio={() => setIsAudioOpen(true)}
                  onOpenOfflineExport={() => setIsExportOpen(true)}
                  onReconfigureRoles={() => setCardsDistributed(false)}
                  onEndGame={handleEndGame}
                  onResetGame={handleResetGame}
                />
              </div>
            )}
          </div>
        ) : (
          /* 3. PLAYER VIEW (MOBILE OPTIMIZED) */
          !myPlayer ? (
            <JoinCard
              initialCode={roomCode}
              errorMessage={errorMessage}
              isJoining={isJoining}
              onJoin={handleJoinAsPlayer}
              onGodClick={undefined}
              onBack={() => setClientType(null)}
            />
          ) : (
            <div className="space-y-4">
                            <div className="flex items-center justify-between bg-neutral-900/80 border border-neutral-800 p-2 rounded-2xl mb-2 gap-2">
                <div className="flex items-center gap-1.5 flex-1">
                  <span className="text-xs text-neutral-400 shrink-0">اتاق:</span>
                  <input
                    type="text"
                    maxLength={4}
                    defaultValue={roomCode}
                    id="player-edit-room-input"
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-400 text-sm focus:outline-none focus:border-amber-500 w-16 tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inp = document.getElementById('player-edit-room-input') as HTMLInputElement;
                      const newCode = (inp?.value || '').replace(/[^0-9]/g, '').slice(0, 4);
                      if (newCode && newCode.length === 4) {
                        try {
                          localStorage.setItem('mafia_room', newCode);
                        } catch(e) {}
                        setRoomCode(newCode);
                        if (myPlayer?.name) {
                          network.joinRoom(newCode, 'player', myPlayer.name);
                        }
                      }
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-sm"
                  >
                    تغییر اتاق
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem('mafia_room');
                    } catch(e) {}
                    setMyPlayer(null);
                    setClientType(null);
                  }}
                  className="text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-2 py-1 rounded-lg shrink-0 cursor-pointer"
                >
                  خروج
                </button>
              </div>

              <PlayerView
                player={myPlayer}
                cardsDistributed={cardsDistributed}
                gameStarted={gameStarted}
                timer={timer}
                secretVote={secretVote}
                isVoteUnlocked={isVoteUnlocked}
                onJoin={(name) => handleJoinAsPlayer(roomCode, name)}
              />
            </div>
          )
        )}
      </main>

      {/* Host QR Code Modal */}
      <HostShareModal
        roomCode={roomCode}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />

      {/* Audio Player and Soundboard Modal */}
      <AudioPlayerModal
        isOpen={isAudioOpen}
        onClose={() => setIsAudioOpen(false)}
      />

      {/* Offline Export and Tutorial Modal */}
      <OfflineExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      {/* Game Over and Victory Announcement Modal */}
      <GameResultModal
        isOpen={!!gameResult}
        winner={gameResult?.winner || null}
        reason={gameResult?.reason}
        players={gameResult?.players || players}
        isGod={clientType === 'god'}
        onResetGame={handleConfirmReset}
        onClose={() => setGameResult(null)}
      />

      {/* Custom Reset Confirmation Modal (Reliable in Iframes & Mobile) */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-black text-white">ریست کامل و شروع دست جدید؟</h3>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                با ریست کردن بازی، تمامی کارت‌ها و نقش‌ها پس گرفته می‌شوند، وضعیت حذف یا سکوت بازیکنان پاک شده و بازی برای دست بعدی آماده می‌گردد.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleConfirmReset}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-xs shadow-lg shadow-red-950/50 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بله، ریست بازی و پس گرفتن کارت‌ها</span>
              </button>

              <button
                onClick={() => setIsResetConfirmOpen(false)}
                className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
              >
                انصراف و ادامه بازی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
