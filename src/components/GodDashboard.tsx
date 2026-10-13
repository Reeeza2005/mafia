import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameTimer, GameLog, EliminationReason, SecretVoteState, NightActions } from '../types/mafia';
import { ROLE_MAP } from '../data/roles';
import { RoleIcon } from './RoleIcons';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Clock,
  Shield,
  ShieldAlert,
  VolumeX,
  Skull,
  UserX,
  Moon,
  Sun,
  Smartphone,
  Music,
  Bell,
  Vibrate,
  Vote,
  Target,
  Search,
  Crosshair,
  Award,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Gavel,
  Check,
  ChevronDown,
  Plus,
  Minus,
  Calculator,
} from 'lucide-react';
import { audio } from '../utils/audio';
import { network } from '../services/network';

interface GodDashboardProps {
  players: Player[];
  timer: GameTimer;
  logs: GameLog[];
  rolesInGame: string[];
  cardsDistributed: boolean;
  roomCode?: string;
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void;
  onKickPlayer: (playerId: string) => void;
  onTimerControl: (
    action: 'start' | 'pause' | 'reset' | 'set',
    seconds?: number,
    speakerName?: string,
    speakerId?: string,
    timerType?: 'speech' | 'challenge' | 'defense' | 'voting'
  ) => void;
  onOpenQr: () => void;
  onOpenAudio?: () => void;
  onOpenOfflineExport?: () => void;
  onReconfigureRoles: () => void;
  onEndGame?: (winner: 'mafia' | 'citizen', reason: string) => void;
  onResetGame?: () => void;
}

export const GodDashboard: React.FC<GodDashboardProps> = ({
  players,
  timer,
  logs,
  rolesInGame,
  cardsDistributed,
  roomCode,
  onUpdatePlayer,
  onKickPlayer,
  onTimerControl,
  onOpenQr,
  onOpenAudio,
  onOpenOfflineExport,
  onReconfigureRoles,
  onEndGame,
  onResetGame,
}) => {
  const [isDeclareWinnerModalOpen, setIsDeclareWinnerModalOpen] = useState(false);
  const [speakerId, setSpeakerId] = useState<string>('');
  const [localSeconds, setLocalSeconds] = useState(timer.seconds);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Night Actions State
  const [nightActions, setNightActions] = useState<NightActions>({
    mafiaShotId: undefined,
    doctorSaveId: undefined,
    detectiveInquiryId: undefined,
    detectiveResult: null,
    sniperShotId: undefined,
    gunsmithTargetId: undefined,
    gunsmithGunType: 'war',
    silencerTargetId: undefined,
  });

  // Secret Voting State
  const [isSecretVoteModalOpen, setIsSecretVoteModalOpen] = useState(false);
  const [secretVoteTitle, setSecretVoteTitle] = useState('رأی‌گیری مخفی شبانه مافیا');
  const [secretVoteTargetTeam, setSecretVoteTargetTeam] = useState<'all' | 'mafia' | 'citizen'>('mafia');
  const [activeSecretVote, setActiveSecretVote] = useState<SecretVoteState | null>(null);

  const timerRef = useRef<number | null>(null);

  // Sync timer state
  useEffect(() => {
    setLocalSeconds(timer.seconds);
    if (timer.speakerId) setSpeakerId(timer.speakerId);
  }, [timer.seconds, timer.speakerId]);

  // Client-side smooth countdown
  useEffect(() => {
    if (timer.isRunning) {
      timerRef.current = window.setInterval(() => {
        setLocalSeconds((prev) => {
          if (prev <= 1) {
            audio.playWarningBeep();
            network.notifyTimerEnded(speakerId, timer.timerType);
            onTimerControl('pause');
            return 0;
          }
          if (prev <= 5) {
            audio.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timer.isRunning, speakerId, timer.timerType, onTimerControl]);

  // Listen to secret vote events
  useEffect(() => {
    const unStart = network.on('secret_vote_started', (data: any) => setActiveSecretVote(data));
    const unUpdate = network.on('secret_vote_updated', (data: any) => {
      setActiveSecretVote((prev) => (prev ? { ...prev, votes: data.votes } : null));
    });
    const unEnd = network.on('secret_vote_ended', () => setActiveSecretVote(null));

    return () => {
      unStart();
      unUpdate();
      unEnd();
    };
  }, []);

  // Live game counts
  const alivePlayers = useMemo(() => players.filter((p) => p.isAlive), [players]);
  const aliveCount = alivePlayers.length;
  const totalCount = players.length;

  const mafiaAliveCount = useMemo(() => {
    return alivePlayers.filter((p) => {
      const role = p.roleId ? ROLE_MAP[p.roleId] : null;
      return role?.team === 'mafia';
    }).length;
  }, [alivePlayers]);

  const citizenAliveCount = useMemo(() => {
    return alivePlayers.filter((p) => {
      const role = p.roleId ? ROLE_MAP[p.roleId] : null;
      return role?.team === 'citizen';
    }).length;
  }, [alivePlayers]);

  // Daytime Voting & Defense/Exile Calculator State
  const [voteStage, setVoteStage] = useState<'defense' | 'elimination'>('defense');
  const [playerVotes, setPlayerVotes] = useState<Record<string, number>>({});
  const [customQuorum, setCustomQuorum] = useState<number | null>(null);
  const [voteCalculation, setVoteCalculation] = useState<{
    stage: 'defense' | 'elimination';
    quorum: number;
    qualifiedForDefense: { id: string; name: string; votes: number }[];
    eliminatedPlayer?: { id: string; name: string; votes: number };
    isTie?: boolean;
    tiePlayers?: { id: string; name: string; votes: number }[];
    summary: string;
    calculatedAt: string;
  } | null>(null);

  // Required votes calculation according to Iranian Mafia rules:
  // Defense stage: at least half of alive players: Math.ceil(aliveCount / 2)
  // Elimination stage: strict majority of alive players: Math.floor(aliveCount / 2) + 1
  const defaultDefenseQuorum = Math.max(1, Math.ceil(aliveCount / 2));
  const defaultEliminationQuorum = Math.max(1, Math.floor(aliveCount / 2) + 1);
  const activeQuorum =
    customQuorum ?? (voteStage === 'defense' ? defaultDefenseQuorum : defaultEliminationQuorum);

  const handleVoteChange = (playerId: string, val: number) => {
    const safeVal = Math.max(0, Math.min(aliveCount, val));
    setPlayerVotes((prev) => ({
      ...prev,
      [playerId]: safeVal,
    }));
  };

  const handleResetVotes = () => {
    audio.playFlip();
    setPlayerVotes({});
    setVoteCalculation(null);
  };

  const handleCalculateVotes = () => {
    audio.playGavel();
    const timeStr = new Date().toLocaleTimeString('fa-IR');

    if (voteStage === 'defense') {
      // Rule: Any alive player who received >= activeQuorum votes qualifies for defense
      const qualified = alivePlayers
        .filter((p) => (playerVotes[p.id] || 0) >= activeQuorum)
        .map((p) => ({ id: p.id, name: p.name, votes: playerVotes[p.id] || 0 }))
        .sort((a, b) => b.votes - a.votes);

      let summary = '';
      if (qualified.length > 0) {
        summary = `${qualified.length} بازیکن با کسب حدنصاب (${activeQuorum} رأی از ${aliveCount} نفر زنده) به دفاعیه راه یافتند: ${qualified
          .map((q) => `«${q.name}» (${q.votes} رأی)`)
          .join('، ')}.`;
      } else {
        summary = `هیچ بازیکنی به حدنصاب ورود به دفاعیه (حداقل ${activeQuorum} رأی از ${aliveCount} بازیکن زنده) نرسید. دفاعیه‌ای برگزار نمی‌شود.`;
      }

      setVoteCalculation({
        stage: 'defense',
        quorum: activeQuorum,
        qualifiedForDefense: qualified,
        summary,
        calculatedAt: timeStr,
      });
    } else {
      // Elimination Rule:
      // Must have highest votes and reach activeQuorum
      const ranked = alivePlayers
        .filter((p) => (playerVotes[p.id] || 0) > 0)
        .map((p) => ({ id: p.id, name: p.name, votes: playerVotes[p.id] || 0 }))
        .sort((a, b) => b.votes - a.votes);

      if (ranked.length === 0 || ranked[0].votes < activeQuorum) {
        const topVote = ranked.length > 0 ? ranked[0].votes : 0;
        const topName = ranked.length > 0 ? `«${ranked[0].name}»` : 'هیچ بازیکنی';
        setVoteCalculation({
          stage: 'elimination',
          quorum: activeQuorum,
          qualifiedForDefense: [],
          summary: `هیچ بازیکنی به حدنصاب خروج (${activeQuorum} رأی) نرسید (بیشترین رأی: ${topName} با ${topVote} رأی). کسی با رأی دادگاه از بازی خارج نمی‌شود.`,
          calculatedAt: timeStr,
        });
      } else {
        const topVotes = ranked[0].votes;
        const topPlayers = ranked.filter((p) => p.votes === topVotes);

        if (topPlayers.length > 1) {
          // Tie between multiple candidates
          setVoteCalculation({
            stage: 'elimination',
            quorum: activeQuorum,
            qualifiedForDefense: [],
            isTie: true,
            tiePlayers: topPlayers,
            summary: `تساوی آرا بین ${topPlayers
              .map((p) => `«${p.name}»`)
              .join(' و ')} با ${topVotes} رأی (هر دو به حدنصاب ${activeQuorum} رسیده‌اند)! طبق قانون مافیا: قرعه مرگ / کارت شانس یا بدون خروج.`,
            calculatedAt: timeStr,
          });
        } else {
          // Single player definitively eliminated
          const out = topPlayers[0];
          setVoteCalculation({
            stage: 'elimination',
            quorum: activeQuorum,
            qualifiedForDefense: [],
            eliminatedPlayer: out,
            summary: `«${out.name}» با کسب بیشترین آرا (${out.votes} رأی از حدنصاب ${activeQuorum}) به عنوان خروجی دادگاه مشخص شد!`,
            calculatedAt: timeStr,
          });
        }
      }
    }
  };

  // Sorted players: If cards distributed, sort by night wake-up order!
  const sortedPlayers = useMemo(() => {
    if (!cardsDistributed) {
      return [...players].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
    }

    return [...players].sort((a, b) => {
      const roleA = a.roleId ? ROLE_MAP[a.roleId] : null;
      const roleB = b.roleId ? ROLE_MAP[b.roleId] : null;

      const orderA = roleA?.nightOrder ?? 999;
      const orderB = roleB?.nightOrder ?? 999;

      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  }, [players, cardsDistributed]);

  // Quick timer presets
  const handleStartTimerPreset = (
    seconds: number,
    type: 'speech' | 'challenge' | 'defense' | 'voting',
    title: string
  ) => {
    audio.playFlip();
    const currentSpeaker = players.find((p) => p.id === speakerId);
    const label = currentSpeaker ? `${currentSpeaker.name} (${title})` : title;
    setLocalSeconds(seconds);
    onTimerControl('start', seconds, label, speakerId, type);
  };

  // Quick Buzz player
  const handleBuzzPlayer = (playerId: string, name: string) => {
    audio.playWakeBuzz();
    network.buzzPlayer(playerId, 'warning', `اخطار / بیدارباش اختصاصی از سوی گرداننده برای «${name}»`);
  };

  // Global buzz
  const handleBuzzAll = () => {
    audio.playWarningBeep();
    network.buzzAll('warning', '📢 اعلامیه و بیدارباش همگانی از سوی گرداننده!');
  };

  // Detective Inquiry Logic
  const handleRunDetectiveInquiry = (targetId: string) => {
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.roleId) return;

    // Godfather returns negative; Joker changes inquiry
    let result: 'positive' | 'negative' = 'negative';
    if (targetPlayer.roleId === 'godfather') {
      result = 'negative'; // استعلام پدرخوانده منفی است
    } else if (targetPlayer.roleId === 'joker') {
      result = 'negative'; // جوکر نتیجه را وارونه می‌کند
    } else {
      const role = ROLE_MAP[targetPlayer.roleId];
      result = role?.team === 'mafia' ? 'positive' : 'negative';
    }

    setNightActions((prev) => ({
      ...prev,
      detectiveInquiryId: targetId,
      detectiveResult: result,
    }));
    audio.playGong();
  };

  // Apply night action outcomes automatically
  const handleApplyNightActions = () => {
    let killCount = 0;
    const { mafiaShotId, doctorSaveId, sniperShotId } = nightActions;

    // 1. Mafia Shot vs Doctor Save
    if (mafiaShotId) {
      if (mafiaShotId === doctorSaveId) {
        // Saved by doctor!
        audio.playFlip();
      } else {
        const victim = players.find((p) => p.id === mafiaShotId);
        if (victim && victim.isAlive) {
          if (victim.hasArmor) {
            // Armor broke
            onUpdatePlayer(victim.id, { hasArmor: false });
          } else {
            onUpdatePlayer(victim.id, { isAlive: false, eliminationReason: 'mafia_shot' });
            killCount++;
          }
        }
      }
    }

    // 2. Sniper Shot
    if (sniperShotId) {
      const sniperVictim = players.find((p) => p.id === sniperShotId);
      if (sniperVictim && sniperVictim.isAlive) {
        const victimRole = sniperVictim.roleId ? ROLE_MAP[sniperVictim.roleId] : null;
        if (victimRole?.team === 'mafia') {
          // Mafia killed by sniper
          onUpdatePlayer(sniperVictim.id, { isAlive: false, eliminationReason: 'sniper_shot' });
          killCount++;
        } else {
          // Backfired! Sniper themselves die
          const sniperPlayer = players.find((p) => p.roleId === 'sniper');
          if (sniperPlayer && sniperPlayer.isAlive) {
            onUpdatePlayer(sniperPlayer.id, { isAlive: false, eliminationReason: 'misfire_death' });
            killCount++;
          }
        }
      }
    }

    audio.playShot();
    // Reset night action selections for next round
    setNightActions({
      mafiaShotId: undefined,
      doctorSaveId: undefined,
      detectiveInquiryId: undefined,
      detectiveResult: null,
      sniperShotId: undefined,
      gunsmithTargetId: undefined,
      gunsmithGunType: 'war',
      silencerTargetId: undefined,
    });
  };

  // Start Secret Vote
  const handleLaunchSecretVote = () => {
    const candidates = alivePlayers.map((p) => ({ id: p.id, name: p.name }));
    network.startSecretVote({
      title: secretVoteTitle,
      eligibleTeam: secretVoteTargetTeam,
      candidates,
    });
    setIsSecretVoteModalOpen(false);
    audio.playGong();
  };

  const handleEndSecretVote = () => {
    audio.playGavel();
    network.endSecretVote();
    setActiveSecretVote(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP LIVE GAME METRICS BAR */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Alive stats */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center shrink-0">
              <Skull className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white font-mono">{aliveCount}</span>
                <span className="text-xs text-neutral-400">نفر زنده از {totalCount} بازیکن</span>
              </div>
              <div className="flex items-center gap-3 text-xs mt-0.5">
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  🔴 مافیا: {mafiaAliveCount}
                </span>
                <span className="text-sky-400 font-bold flex items-center gap-1">
                  🔵 شهروند: {citizenAliveCount}
                </span>
              </div>
            </div>
          </div>

          {/* Court & Execution Quotas */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3.5 py-2 rounded-2xl bg-neutral-950 border border-amber-900/60 text-right">
              <span className="text-[10px] text-neutral-400 block">حدنصاب دفاعیه:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {defaultDefenseQuorum} رأی
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-neutral-950 border border-red-900/60 text-right">
              <span className="text-[10px] text-neutral-400 block">حدنصاب خروج:</span>
              <span className="text-base font-black text-red-400 font-mono">
                {defaultEliminationQuorum} رأی
              </span>
            </div>

            {/* Room Invite Code Badge */}
            {roomCode && (
              <div className="px-3 py-2 rounded-2xl bg-neutral-950 border border-amber-500/40 text-right flex items-center gap-2">
                <div>
                  <span className="text-[10px] text-neutral-400 block">کد دعوت ({players.length}/50):</span>
                  <span className="text-sm font-black text-amber-400 font-mono tracking-wider">
                    {roomCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onOpenQr}
                  className="p-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white transition-colors"
                  title="نمایش QR کد اتاق"
                >
                  <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                </button>
              </div>
            )}

            {/* Global Buzz Button */}
            <button
              onClick={handleBuzzAll}
              className="px-3.5 py-2.5 rounded-2xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg"
              title="ارسال لرزش و صدا به تمام بازیکنان"
            >
              <Vibrate className="w-4 h-4 text-rose-400 animate-pulse" />
              <span>📳 بیدارباش همگانی</span>
            </button>

            {/* Secret Night Vote Modal Trigger */}
            <button
              onClick={() => setIsSecretVoteModalOpen(true)}
              className="px-3.5 py-2.5 rounded-2xl bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg"
              title="شروع رأی‌گیری مخفی شبانه بدون اطلاع دیگران"
            >
              <Vote className="w-4 h-4 text-purple-400" />
              <span>🗳️ رأی‌گیری مخفی</span>
            </button>

            {/* End Game / Declare Winner Trigger */}
            {onEndGame && (
              <button
                onClick={() => setIsDeclareWinnerModalOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-amber-950/80 hover:bg-amber-900 text-amber-200 border border-amber-800 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-lg cursor-pointer"
                title="اعلام برنده و ثبت نتیجه نهایی بازی به تمام بازیکنان"
              >
                <span>🏆 اعلام نتیجه</span>
              </button>
            )}

            {/* Offline Guide Button */}
            {onOpenOfflineExport && (
              <button
                onClick={onOpenOfflineExport}
                className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-sky-400 border border-neutral-700 text-xs active:scale-95 transition-all cursor-pointer"
                title="دانلود و اجرای آفلاین در ویندوز و لینوکس"
              >
                <span>📥</span>
              </button>
            )}

            {/* Reset Game Button */}
            {onResetGame && (
              <button
                onClick={onResetGame}
                className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 border border-neutral-700 text-xs active:scale-95 transition-all cursor-pointer"
                title="ریست بازی و بازنشانی کارت‌ها"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Music & Soundboard */}
            {onOpenAudio && (
              <button
                onClick={onOpenAudio}
                className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs active:scale-95 transition-all"
                title="موسیقی و اصوات بازی"
              >
                <Music className="w-4 h-4 text-rose-400" />
              </button>
            )}

            {/* QR Code */}
            <button
              onClick={onOpenQr}
              className="p-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs active:scale-95 transition-all"
              title="بارکد QR اتصال بازیکنان"
            >
              <Smartphone className="w-4 h-4 text-emerald-400" />
            </button>
          </div>
        </div>
      </div>

      {/* 1.1 AUTOMATIC VICTORY ALERT BANNERS */}
      {cardsDistributed && totalCount > 0 && mafiaAliveCount === 0 && (
        <div className="bg-gradient-to-r from-sky-950/90 to-neutral-950 border-2 border-sky-500 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h4 className="font-black text-sm text-sky-300">
                شهروندان پیروز شدند! تمام اعضای مافیا حذف شدند.
              </h4>
              <p className="text-[11px] text-neutral-300">
                می‌توانید نتیجه را رسماً به تمام گوشی‌های بازیکنان اعلام کنید.
              </p>
            </div>
          </div>
          <button
            onClick={() => onEndGame?.('citizen', 'تمام اعضای مافیا از بازی حذف شدند.')}
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
          >
            اعلام رسمی پیروزی شهروندان 🏆
          </button>
        </div>
      )}

      {cardsDistributed && totalCount > 0 && mafiaAliveCount >= citizenAliveCount && mafiaAliveCount > 0 && (
        <div className="bg-gradient-to-r from-rose-950/90 to-neutral-950 border-2 border-rose-500 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h4 className="font-black text-sm text-rose-300">
                مافیا پیروز شد! تعداد اعضای مافیا برابر یا بیشتر از شهروندان شد.
              </h4>
              <p className="text-[11px] text-neutral-300">
                می‌توانید نتیجه را رسماً به تمام گوشی‌های بازیکنان اعلام کنید.
              </p>
            </div>
          </div>
          <button
            onClick={() => onEndGame?.('mafia', 'تعداد اعضای مافیا برابر یا بیشتر از شهروندان شد.')}
            className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all cursor-pointer shrink-0"
          >
            اعلام رسمی پیروزی مافیا 🏆
          </button>
        </div>
      )}

      {/* 2. LIVE SECRET VOTE STATUS (IF RUNNING) */}
      {activeSecretVote && (
        <div className="bg-gradient-to-r from-purple-950/90 to-neutral-950 border border-purple-600 rounded-3xl p-4 shadow-2xl animate-pulse">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Vote className="w-6 h-6 text-purple-400" />
              <div>
                <h4 className="font-black text-sm text-white">
                  رأی‌گیری مخفی فعال: «{activeSecretVote.title}»
                </h4>
                <p className="text-[11px] text-purple-300">
                  آرا به صورت کاملاً محرمانه ثبت می‌شوند. مجموع آرا تا این لحظه:{' '}
                  <span className="font-bold text-white font-mono">
                    {Object.keys(activeSecretVote.votes || {}).length} رأی
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleEndSecretVote}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Gavel className="w-4 h-4" />
                <span>پایان رأی‌گیری و ضربه چکش</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TIMER & TALKING STATION (نوبت، چالش، دفاعیه، رأی‌گیری) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Clock Visual & Speaker Select */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex flex-col items-center justify-center border transition-all ${
                localSeconds <= 10 && timer.isRunning
                  ? 'bg-rose-950/70 border-rose-600 text-rose-400 shadow-xl shadow-rose-950/50 animate-pulse'
                  : 'bg-neutral-950 border-neutral-800 text-white shadow-inner'
              }`}
            >
              <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight">
                {String(Math.floor(localSeconds / 60)).padStart(2, '0')}:
                {String(localSeconds % 60).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-neutral-500" />
                {timer.isRunning ? 'در حال اجرا' : 'متوقف'}
              </span>
            </div>

            <div className="text-center sm:text-right space-y-1.5 w-full sm:w-auto">
              <div>
                <span className="text-xs text-neutral-400 block">گوینده یا وضعیت جاری:</span>
                <span className="text-base font-black text-rose-400">
                  {timer.speakerName || 'بدون گوینده انتخاب‌شده'}
                </span>
              </div>

              {/* Speaker Select */}
              <select
                value={speakerId}
                onChange={(e) => {
                  setSpeakerId(e.target.value);
                  const p = players.find((x) => x.id === e.target.value);
                  onTimerControl('set', 60, p?.name, p?.id, 'speech');
                  setLocalSeconds(60);
                }}
                className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-rose-500 w-full sm:w-48"
              >
                <option value="">-- انتخاب بازیکن گوینده --</option>
                {players
                  .filter((p) => p.isAlive)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.isSilenced ? '(سایلنت)' : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Quick Timer Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full lg:w-auto">
            {/* Play/Pause */}
            {timer.isRunning ? (
              <button
                onClick={() => onTimerControl('pause')}
                className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-950/50 active:scale-95 transition-all"
              >
                <Pause className="w-4 h-4 fill-white" />
                مکث
              </button>
            ) : (
              <button
                onClick={() => {
                  audio.playTick();
                  const p = players.find((x) => x.id === speakerId);
                  onTimerControl('start', localSeconds, p?.name, p?.id, timer.timerType || 'speech');
                }}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 active:scale-95 transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                شروع
              </button>
            )}

            {/* Reset */}
            <button
              onClick={() => {
                audio.playFlip();
                onTimerControl('reset', 60);
                setLocalSeconds(60);
              }}
              className="p-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 active:scale-95 transition-all"
              title="ریست به ۶۰ ثانیه"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Presets */}
            <button
              onClick={() => handleStartTimerPreset(60, 'speech', 'نوبت صحبت')}
              className="px-3.5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold border border-neutral-700 active:scale-95 transition-all"
            >
              ⏱️ نوبت (۶۰ث)
            </button>
            <button
              onClick={() => handleStartTimerPreset(15, 'challenge', 'چالش')}
              className="px-3.5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-amber-300 text-xs font-bold border border-amber-900/60 active:scale-95 transition-all"
            >
              ⚔️ چالش (۱۵ث)
            </button>
            <button
              onClick={() => handleStartTimerPreset(45, 'defense', 'دفاعیه')}
              className="px-3.5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-sky-300 text-xs font-bold border border-sky-900/60 active:scale-95 transition-all"
            >
              🛡️ دفاعیه (۴۵ث)
            </button>
            <button
              onClick={() => handleStartTimerPreset(30, 'voting', 'رأی‌گیری')}
              className="px-3.5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-purple-300 text-xs font-bold border border-purple-900/60 active:scale-95 transition-all"
            >
              🗳️ رأی‌گیری (۳۰ث)
            </button>
          </div>
        </div>
      </div>

      {/* 4. NIGHT ACTION DESK (شات مافیا، سیو دکتر، استعلام کارآگاه، اسنایپر، تفنگدار) */}
      {cardsDistributed && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Moon className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-black text-white">میز تصمیمات شبانه گرداننده</h3>
            </div>
            <button
              onClick={handleApplyNightActions}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-rose-950/50 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>⚡ اعمال خودکار نتایج شب</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
            {/* Mafia Shot */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-rose-950 space-y-1.5">
              <span className="font-bold text-rose-400 flex items-center gap-1">
                🎯 هدف شات شب مافیا:
              </span>
              <select
                value={nightActions.mafiaShotId || ''}
                onChange={(e) => setNightActions((prev) => ({ ...prev, mafiaShotId: e.target.value || undefined }))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
              >
                <option value="">-- بدون شلیک مافیا --</option>
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor Save */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-sky-950 space-y-1.5">
              <span className="font-bold text-sky-400 flex items-center gap-1">
                💉 هدف سیو دکتر:
              </span>
              <select
                value={nightActions.doctorSaveId || ''}
                onChange={(e) => setNightActions((prev) => ({ ...prev, doctorSaveId: e.target.value || undefined }))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
              >
                <option value="">-- بدون نجات پزشک --</option>
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {nightActions.mafiaShotId && nightActions.doctorSaveId === nightActions.mafiaShotId && (
                <span className="text-[10px] text-emerald-400 font-bold block">
                  ✨ سیو موفق! جان بازیکن حفظ می‌شود.
                </span>
              )}
            </div>

            {/* Detective Inquiry */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-amber-950 space-y-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1">
                🔍 استعلام کارآگاه:
              </span>
              <div className="flex gap-1.5">
                <select
                  value={nightActions.detectiveInquiryId || ''}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id) handleRunDetectiveInquiry(id);
                    else setNightActions((prev) => ({ ...prev, detectiveInquiryId: undefined, detectiveResult: null }));
                  }}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                >
                  <option value="">-- انتخاب مظنون --</option>
                  {alivePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              {nightActions.detectiveResult && (
                <span
                  className={`text-[10px] font-bold block ${
                    nightActions.detectiveResult === 'positive' ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  نتیجه: {nightActions.detectiveResult === 'positive' ? 'مثبت 🔴 (مافیا)' : 'منفی 🟢 (شهروند)'}
                </span>
              )}
            </div>

            {/* Sniper Shot */}
            <div className="bg-neutral-950 p-3 rounded-2xl border border-purple-950 space-y-1.5">
              <span className="font-bold text-purple-400 flex items-center gap-1">
                🔫 شلیک تک‌تیرانداز / اسنایپر:
              </span>
              <select
                value={nightActions.sniperShotId || ''}
                onChange={(e) => setNightActions((prev) => ({ ...prev, sniperShotId: e.target.value || undefined }))}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
              >
                <option value="">-- بدون شلیک اسنایپر --</option>
                {alivePlayers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 5. UNIFIED MASTER PLAYERS LIST (یک لیست یکپارچه و جامع از تمام بازیکنان) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>👥 لیست یکپارچه بازیکنان اتاق</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                {players.length} بازیکن
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {cardsDistributed
                ? 'مرتب‌شده بر اساس ترتیب بیدار شدن در فاز شب (نقش‌ها مشخص شده‌اند)'
                : 'به محض ورود هر بازیکن نام او در این لیست اضافه می‌شود'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReconfigureRoles}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-bold transition-all"
            >
              تنظیم مجدد نقش‌ها
            </button>
          </div>
        </div>

        {/* DAYTIME VOTING & DEFENSE/EXILE CALCULATOR HUB */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-inner">
          {/* Top row: Stage selector & Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-850 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-950/70 border border-amber-800/80 flex items-center justify-center text-amber-400">
                <Vote className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  میز رأی‌گیری روز و دادگاه (محاسبه خودکار دفاع و خروج)
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  آرا را کنار نام کاربران بنویسید و با دکمه محاسبه، بر اساس قانون رسمی مافیا راه‌یافتگان به دفاع یا خروجی دادگاه را مشخص کنید.
                </p>
              </div>
            </div>

            {/* Voting Phase Tabs */}
            <div className="flex items-center bg-neutral-900 p-1 rounded-2xl border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setVoteStage('defense');
                  setVoteCalculation(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  voteStage === 'defense'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🛡️ ۱. ورود به دفاعیه
              </button>
              <button
                type="button"
                onClick={() => {
                  setVoteStage('elimination');
                  setVoteCalculation(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  voteStage === 'elimination'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ⚖️ ۲. خروج از بازی (دادگاه)
              </button>
            </div>
          </div>

          {/* Middle row: Quorum explanation and adjuster */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-neutral-900/70 p-3 rounded-2xl border border-neutral-800 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black text-amber-400">
                  {voteStage === 'defense' ? '📌 قانون رسمی ورود به دفاعیه:' : '📌 قانون رسمی خروج از بازی:'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-mono">
                  {aliveCount} بازیکن زنده
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                {voteStage === 'defense'
                  ? `هر بازیکنی که حداقل نصف آرای بازیکنان زنده (حداقل ${activeQuorum} رأی) را کسب کند، به مرحله دفاعیه راه می‌یابد.`
                  : `کسب بالاترین رأی در میان کاندیداها و رسیدن به حدنصاب اکثریت (حداقل ${activeQuorum} رأی). در صورت تساوی، قرعه یا بدون خروج.`}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800">
              <span className="text-[11px] text-neutral-400 font-bold">حدنصاب لازم:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCustomQuorum(Math.max(1, activeQuorum - 1))}
                  className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-black flex items-center justify-center cursor-pointer"
                  title="کاهش حدنصاب"
                >
                  -
                </button>
                <span className="font-mono font-black text-amber-400 text-sm px-1">
                  {activeQuorum} رأی
                </span>
                <button
                  type="button"
                  onClick={() => setCustomQuorum(Math.min(aliveCount, activeQuorum + 1))}
                  className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-black flex items-center justify-center cursor-pointer"
                  title="افزایش حدنصاب"
                >
                  +
                </button>
              </div>
              {customQuorum !== null && (
                <button
                  type="button"
                  onClick={() => setCustomQuorum(null)}
                  className="text-[10px] text-amber-400 hover:underline mr-1 cursor-pointer"
                >
                  پیش‌فرض
                </button>
              )}
            </div>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCalculateVotes}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-950/50 active:scale-95 transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>⚡ محاسبه آرا و اعلام نتیجه</span>
              </button>

              <button
                type="button"
                onClick={handleResetVotes}
                className="px-3.5 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold border border-neutral-800 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                title="صفر کردن تمام آرای وارد شده"
              >
                <RotateCcw className="w-3.5 h-3.5 text-neutral-400" />
                <span>صفر کردن آرا</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartTimerPreset(30, 'voting', 'رأی‌گیری')}
                className="px-3.5 py-2 rounded-2xl bg-purple-950/60 hover:bg-purple-900/70 text-purple-300 text-xs font-bold border border-purple-800 flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>⏱️ تایمر رأی‌گیری (۳۰ث)</span>
              </button>
            </div>
          </div>

          {/* Live Calculation Result Banner */}
          {voteCalculation && (
            <div
              className={`rounded-2xl border-2 p-3.5 transition-all ${
                voteCalculation.stage === 'defense'
                  ? voteCalculation.qualifiedForDefense.length > 0
                    ? 'bg-sky-950/60 border-sky-500 text-sky-100 shadow-lg shadow-sky-950/40'
                    : 'bg-neutral-900 border-neutral-750 text-neutral-300'
                  : voteCalculation.eliminatedPlayer
                  ? 'bg-rose-950/70 border-rose-500 text-rose-100 shadow-xl shadow-rose-950/50'
                  : voteCalculation.isTie
                  ? 'bg-yellow-950/60 border-yellow-500 text-yellow-100'
                  : 'bg-neutral-900 border-neutral-750 text-neutral-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-bold mb-2">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-black text-xs sm:text-sm text-white">
                    نتیجه رسمی رأی‌گیری {voteCalculation.stage === 'defense' ? 'ورود به دفاعیه' : 'خروج دادگاه'}:
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  زمان محاسبه: {voteCalculation.calculatedAt}
                </span>
              </div>

              <p className="text-xs mb-3 leading-relaxed font-medium">
                {voteCalculation.summary}
              </p>

              {/* Action buttons on results */}
              {voteCalculation.stage === 'defense' && voteCalculation.qualifiedForDefense.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-sky-800/60">
                  <span className="text-xs text-sky-300 font-bold">شروع تایمر دفاعیه برای:</span>
                  {voteCalculation.qualifiedForDefense.map((cand) => (
                    <button
                      key={cand.id}
                      type="button"
                      onClick={() => handleStartTimerPreset(45, 'defense', `دفاعیه ${cand.name}`)}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>{cand.name} (۴۵ث)</span>
                    </button>
                  ))}
                </div>
              )}

              {voteCalculation.stage === 'elimination' && voteCalculation.eliminatedPlayer && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-rose-800/60">
                  <span className="text-xs text-rose-200 font-black">
                    ⚖️ کاندیدای خروج با بالاترین رأی: «{voteCalculation.eliminatedPlayer.name}»
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (voteCalculation.eliminatedPlayer) {
                        onUpdatePlayer(voteCalculation.eliminatedPlayer.id, {
                          isAlive: false,
                          eliminationReason: 'court_vote',
                        });
                        audio.playShot();
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer animate-bounce"
                  >
                    <Skull className="w-4 h-4" />
                    <span>اعمال مستقیم خروج با رأی دادگاه 💀</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Players List Table / Cards */}
        {sortedPlayers.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 text-xs">
            هنوز بازیکنی وارد اتاق نشده است. از دکمه QR Code بالا برای دعوت بازیکنان استفاده کنید.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sortedPlayers.map((player, index) => {
              const role = player.roleId ? ROLE_MAP[player.roleId] : null;

              return (
                <div
                  key={player.id}
                  className={`rounded-2xl border p-3.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    !player.isAlive
                      ? 'bg-neutral-950/70 border-neutral-900 opacity-60'
                      : player.isSilenced
                      ? 'bg-amber-950/20 border-amber-900/60'
                      : 'bg-neutral-950/90 border-neutral-850'
                  }`}
                >
                  {/* Left Column: Player Info & Night Order & Role */}
                  <div className="flex items-center gap-3">
                    {/* Index / Night Step badge */}
                    <div className="flex flex-col items-center justify-center w-8 text-center shrink-0">
                      {cardsDistributed && role?.nightOrder ? (
                        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded-md border border-purple-800" title={`اولویت شبانه #${role.nightOrder}`}>
                          #{role.nightOrder}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-neutral-500">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Role Icon */}
                    <div className="w-12 h-12 rounded-xl bg-neutral-900 p-1 border border-neutral-800 shrink-0">
                      {player.roleId ? (
                        <RoleIcon roleId={player.roleId} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-neutral-600 text-center">
                          انتظار کارت
                        </div>
                      )}
                    </div>

                    {/* Name, Connection, and Role */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-white">{player.name}</h4>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            player.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-neutral-600'
                          }`}
                          title={player.connected ? 'متصل' : 'قطع ارتباط'}
                        />

                        {/* Vote result badge on player name */}
                        {player.isAlive && (playerVotes[player.id] || 0) > 0 && (
                          <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800">
                            🗳️ {playerVotes[player.id]} رأی
                          </span>
                        )}

                        {/* Defense Qualification Badge */}
                        {voteCalculation?.stage === 'defense' &&
                          voteCalculation.qualifiedForDefense.some((q) => q.id === player.id) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-600 animate-pulse">
                              🛡️ راهی دفاعیه
                            </span>
                          )}

                        {/* Court Elimination Badge */}
                        {voteCalculation?.stage === 'elimination' &&
                          voteCalculation.eliminatedPlayer?.id === player.id && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-950 text-rose-300 border border-rose-500 animate-pulse">
                              ⚖️ خروجی دادگاه
                            </span>
                          )}

                        {/* Tie Badge */}
                        {voteCalculation?.stage === 'elimination' &&
                          voteCalculation.isTie &&
                          voteCalculation.tiePlayers?.some((t) => t.id === player.id) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-yellow-950 text-yellow-300 border border-yellow-600">
                              ⚠️ تساوی آرا
                            </span>
                          )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-xs font-bold ${
                            role?.team === 'mafia'
                              ? 'text-rose-400'
                              : role?.team === 'citizen'
                              ? 'text-sky-400'
                              : role?.team === 'independent'
                              ? 'text-purple-400'
                              : 'text-neutral-500'
                          }`}
                        >
                          {role ? role.name : 'نقش تعیین‌نشده'}
                        </span>

                        {player.hasArmor && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                            جلیقه 🛡️
                          </span>
                        )}

                        {player.isSilenced && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                            سایلنت 🔇
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Game Master Tools (رأی‌گیری، چگونه حذف شدن، ویبره، وضعیت، یادداشت) */}
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                    {/* Vote input stepper for this player */}
                    {player.isAlive && (
                      <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1">
                        <span className="text-[10px] text-neutral-400 font-bold ml-1">تعداد رأی:</span>
                        <button
                          type="button"
                          onClick={() => handleVoteChange(player.id, (playerVotes[player.id] || 0) - 1)}
                          className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-black flex items-center justify-center active:scale-95 cursor-pointer"
                          title="کاهش یک رأی"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={aliveCount}
                          inputMode="numeric"
                          value={playerVotes[player.id] || 0}
                          onChange={(e) => handleVoteChange(player.id, parseInt(e.target.value) || 0)}
                          className="w-9 text-center bg-neutral-950 border border-neutral-700 rounded py-0.5 text-xs font-mono font-black text-amber-400 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleVoteChange(player.id, (playerVotes[player.id] || 0) + 1)}
                          className="w-5 h-5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-black flex items-center justify-center active:scale-95 cursor-pointer"
                          title="افزایش یک رأی"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Elimination Reason Selector (چگونه حذف شدن) */}
                    <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-1">
                      <span className="text-[10px] text-neutral-400">وضعیت:</span>
                      <select
                        value={
                          !player.isAlive
                            ? player.eliminationReason || 'other'
                            : 'alive'
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'alive') {
                            onUpdatePlayer(player.id, { isAlive: true, eliminationReason: undefined });
                          } else {
                            onUpdatePlayer(player.id, {
                              isAlive: false,
                              eliminationReason: val as EliminationReason,
                            });
                            audio.playShot();
                          }
                        }}
                        className={`bg-transparent text-xs font-bold focus:outline-none ${
                          player.isAlive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        <option value="alive" className="bg-neutral-900 text-emerald-400">
                          ✅ زنده در بازی
                        </option>
                        <option value="mafia_shot" className="bg-neutral-900 text-rose-400">
                          🎯 شات شب مافیا
                        </option>
                        <option value="court_vote" className="bg-neutral-900 text-amber-400">
                          ⚖️ رأی دادگاه روز
                        </option>
                        <option value="sniper_shot" className="bg-neutral-900 text-purple-400">
                          🔫 تیر تک‌تیرانداز
                        </option>
                        <option value="gunsmith_shot" className="bg-neutral-900 text-sky-400">
                          💥 تیر جنگی تفنگدار
                        </option>
                        <option value="misfire_death" className="bg-neutral-900 text-orange-400">
                          ☠️ شلیک اشتباه اسنایپر
                        </option>
                        <option value="disciplinary" className="bg-neutral-900 text-red-400">
                          ❌ خروج انضباطی
                        </option>
                      </select>
                    </div>

                    {/* Silence button */}
                    <button
                      onClick={() => {
                        onUpdatePlayer(player.id, { isSilenced: !player.isSilenced });
                        audio.playFlip();
                      }}
                      className={`p-2 rounded-xl border transition-all ${
                        player.isSilenced
                          ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                      }`}
                      title={player.isSilenced ? 'رفع سکوت' : 'سایلنت کردن'}
                    >
                      {player.isSilenced ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Armor button */}
                    {player.roleId === 'armored' && (
                      <button
                        onClick={() => {
                          onUpdatePlayer(player.id, { hasArmor: !player.hasArmor });
                          audio.playGavel();
                        }}
                        className={`p-2 rounded-xl border transition-all ${
                          player.hasArmor
                            ? 'bg-sky-600 text-white border-sky-500'
                            : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                        }`}
                        title={player.hasArmor ? 'شکستن جلیقه' : 'ترمیم جلیقه'}
                      >
                        {player.hasArmor ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Silent Wake-up / Buzz Button for this player */}
                    <button
                      onClick={() => handleBuzzPlayer(player.id, player.name)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                      title="ارسال ویبره و زنگ اختصاصی به گوشی این بازیکن"
                    >
                      <Vibrate className="w-3.5 h-3.5" />
                      <span>📳 ویبره</span>
                    </button>

                    {/* Note button */}
                    {editingNoteId === player.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="یادداشت..."
                          className="bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white w-28"
                        />
                        <button
                          onClick={() => {
                            onUpdatePlayer(player.id, { notes: noteText });
                            setEditingNoteId(null);
                          }}
                          className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold"
                        >
                          ثبت
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNoteId(player.id);
                          setNoteText(player.notes || '');
                        }}
                        className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800"
                        title={player.notes || 'افزودن یادداشت'}
                      >
                        📝
                      </button>
                    )}

                    {/* Kick */}
                    <button
                      onClick={() => onKickPlayer(player.id)}
                      className="p-2 rounded-xl text-neutral-600 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                      title="اخراج از بازی"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. SECRET VOTING CONFIGURATION MODAL */}
      {isSecretVoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Vote className="w-5 h-5 text-purple-400" />
                شروع رأی‌گیری مخفی شبانه
              </h3>
              <button
                onClick={() => setIsSecretVoteModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs p-1 rounded-lg bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              در این حالت یک نظرسنجی مخفی روی گوشی بازیکنان باز می‌شود تا هیچ‌کس نفهمد چه کسی رأی داده و چه کسی رأی نداده است.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-bold">عنوان رأی‌گیری:</label>
                <input
                  type="text"
                  value={secretVoteTitle}
                  onChange={(e) => setSecretVoteTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold"
                  placeholder="مثال: شات شبانه مافیا یا رأی‌گیری دادگاه"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1 font-bold">شرکت‌کنندگان واجد شرایط:</label>
                <select
                  value={secretVoteTargetTeam}
                  onChange={(e) => setSecretVoteTargetTeam(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="mafia">فقط اعضای مافیا (تصمیم‌گیری شبانه مافیا)</option>
                  <option value="all">تمام بازیکنان زنده (رأی‌گیری مخفی دادگاه)</option>
                  <option value="citizen">فقط شهروندان</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleLaunchSecretVote}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-black text-xs shadow-lg shadow-purple-950/50 active:scale-95 transition-all"
              >
                ارسال رأی‌گیری به گوشی بازیکنان
              </button>
              <button
                onClick={() => setIsSecretVoteModalOpen(false)}
                className="py-3 px-4 rounded-2xl bg-neutral-800 text-neutral-300 font-bold text-xs"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DECLARE WINNER / END GAME MODAL */}
      {isDeclareWinnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span className="text-xl">🏆</span>
                اعلام نتیجه و برنده بازی مافیا
              </h3>
              <button
                onClick={() => setIsDeclareWinnerModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs p-1 rounded-lg bg-neutral-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              با انتخاب برنده، بازی به پایان رسیده، نتیجه به گوشی تمام بازیکنان ارسال شده و کارت‌ها و نقش‌های مخفی برای همه رونمایی می‌شوند.
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  onEndGame?.('citizen', 'شهروندان با کشف و حذف مافیا به پیروزی رسیدند.');
                  setIsDeclareWinnerModalOpen(false);
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white font-black text-sm shadow-xl shadow-sky-950/50 flex items-center justify-between transition-all cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🔵</span>
                  <div className="text-right">
                    <span className="block font-black">پیروزی ساید شهروندان</span>
                    <span className="text-[11px] text-sky-200 font-normal">تمامی اعضای مافیا حذف شدند</span>
                  </div>
                </div>
                <span className="text-xs bg-sky-800/80 px-2.5 py-1 rounded-lg">ثبت پیروزی</span>
              </button>

              <button
                onClick={() => {
                  onEndGame?.('mafia', 'تعداد اعضای مافیا برابر یا بیشتر از شهروندان شد.');
                  setIsDeclareWinnerModalOpen(false);
                }}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black text-sm shadow-xl shadow-rose-950/50 flex items-center justify-between transition-all cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">🔴</span>
                  <div className="text-right">
                    <span className="block font-black">پیروزی ساید مافیا</span>
                    <span className="text-[11px] text-rose-200 font-normal">تعداد مافیا با شهروندان برابر شد</span>
                  </div>
                </div>
                <span className="text-xs bg-rose-800/80 px-2.5 py-1 rounded-lg">ثبت پیروزی</span>
              </button>
            </div>

            <button
              onClick={() => setIsDeclareWinnerModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs transition-colors cursor-pointer"
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
