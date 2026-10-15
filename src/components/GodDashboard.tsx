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
  
  // Day Voting & Defense Court States
  const [dayVotes, setDayVotes] = useState<Record<string, number>>({});
  const [courtDefendants, setCourtDefendants] = useState<string[]>([]);
  const [exitVotes, setExitVotes] = useState<Record<string, number>>({});
  const [dayVotePhase, setDayVotePhase] = useState<"idle" | "nomination" | "court_entry" | "defense">("idle");

  const [challengeRequests, setChallengeRequests] = useState<{ playerId: string; playerName: string; time: string }[]>([]);

  const timerRef = useRef<number | null>(null);

  // Sync timer state
  useEffect(() => {
    setLocalSeconds(timer.seconds);
    if (timer.speakerId) setSpeakerId(timer.speakerId);
  }, [timer.seconds, timer.speakerId]);

  // Play audio tick/warning based on server-synced seconds
  useEffect(() => {
    if (timer.isRunning) {
      if (timer.seconds > 0 && timer.seconds <= 5) {
        audio.playTick();
      } else if (timer.seconds === 0) {
        audio.playWarningBeep();
      }
    }
  }, [timer.seconds, timer.isRunning]);

  // Listen to challenge queue updates
  useEffect(() => {
    const unSub = network.on("challenges_updated", (data: any) => {
      if (Array.isArray(data)) {
        setChallengeRequests(data);
      }
    });
    return () => {
      if (typeof unSub === "function") unSub();
    };
  }, []);

  // Listen to secret vote events
  useEffect(() => {
    const unStart = network.on('secret_vote_started', (data: any) => setActiveSecretVote(data));
    const unUpdate = network.on('secret_vote_updated', (data: any) => {
      setActiveSecretVote((prev: any) => {
        const nextState = prev ? { ...prev, votes: data.votes, voterDetails: data.voterDetails } : { votes: data.votes, voterDetails: data.voterDetails };
        return nextState;
      });
      if (data.votes) {
        const counts: Record<string, number> = {};
        Object.values(data.votes).forEach((cId: any) => {
          if (cId) counts[cId] = (counts[cId] || 0) + 1;
        });
        setExitVotes((prev) => ({ ...prev, ...counts }));
      }
    });
    const unEnd = network.on('secret_vote_ended', (data: any) => {
      setActiveSecretVote((prev: any) => (prev ? { ...prev, ...(data || {}), isActive: false, ended: true } : null));
    });

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

  // Required votes calculation
  const requiredCourtVotes = Math.max(1, Math.ceil(aliveCount / 2));
  const requiredEliminationVotes = Math.max(1, Math.floor(aliveCount / 2) + 1);

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
    const handleAcceptChallenge = (playerId: string, playerName: string) => {
    audio.playFlip();
    onTimerControl('set', 20, `چالش: ${playerName}`, playerId, 'challenge');
    onTimerControl('start', 20, `چالش: ${playerName}`, playerId, 'challenge');
    network.consumeChallenge(playerId);
  };

  const handleDismissChallenge = (playerId: string) => {
    network.dismissChallenge(playerId);
  };

  const handleResetDailyChallenges = () => {
    if (confirm('آیا سهمیه چالش روزانه تمام بازیکنان برای روز جدید بازنشانی شود؟')) {
      network.resetDailyChallenges();
    }
  };

  
  const courtThreshold = Math.ceil(alivePlayers.length / 2);

  const handleDayVoteChange = (playerId: string, delta: number) => {
    setDayVotes(prev => {
      const current = prev[playerId] || 0;
      const maxAllowed = alivePlayers.length;
      if (delta > 0 && current >= maxAllowed) return prev;
      const next = Math.min(maxAllowed, Math.max(0, current + delta));
      return { ...prev, [playerId]: next };
    });
  };

  const handleCalculateCourt = () => {
    const qualified = alivePlayers
      .filter(p => (dayVotes[p.id] || 0) >= courtThreshold)
      .map(p => p.id);
    setCourtDefendants(qualified);
    setExitVotes({});
    if (qualified.length > 0) {
      setDayVotePhase("defense");
      audio.playCourt();
    } else {
      alert("هیچ بازیکنی به حد نصاب ورود به دادگاه (" + courtThreshold + " رأی) نرسید.");
    }
  };

    // بررسی هوشمند نتیجه دادگاه بر اساس حد نصاب و تساوی
    // بررسی نتیجه رأی‌گیری نهایی دادگاه (۳ حالت)
  
  // حالت دوم: راه‌اندازی رأی‌گیری شبانه برای متهم تک‌نفره
  const handleLaunchSingleDefendantNightVote = () => {
    if (courtDefendants.length !== 1) return;
    const defId = courtDefendants[0];
    const defPlayer = players.find(p => p.id === defId);
    
    // رأی‌دهندگان: همه زنده‌ها به جز خود متهم
    const eligibleVoterIds = alivePlayers.filter(p => p.id !== defId).map(p => p.id);

    network.startSecretVote({
      title: "رأی‌گیری خروج شب: " + (defPlayer ? defPlayer.name : ""),
      startsLocked: true,
      targetDefendantId: defId,
      eligibleVoterIds,
      candidates: [{ id: defId, name: defPlayer ? defPlayer.name : "متهم" }],
    });
    audio.playGong();
  };

  const handleTrigger5SecondVote = () => {
    audio.playFlip();
    network.unlockSecretVote(5);
  };

  const handleEvaluateCourtResult = () => {
    if (courtDefendants.length === 0) return;
    const quorum = Math.ceil(alivePlayers.length / 2);

    const results = courtDefendants.map(id => {
      const p = players.find(x => x.id === id);
      return { id, name: p ? p.name : "نامشخص", votes: exitVotes[id] || 0 };
    });

    results.sort((a, b) => b.votes - a.votes);
    const maxVotes = results[0].votes;

    // زیر حد نصاب خروج
    if (maxVotes < quorum) {
      alert("⚖️ نتیجه دادگاه:\n\nبیشترین رأی (" + maxVotes + " رأی) کمتر از حد نصاب (" + quorum + " رأی) است.\n\n❌ هیچ بازیکنی حذف نمی‌شود.");
      handleResetDayVoting();
      return;
    }

    const topCandidates = results.filter(r => r.votes === maxVotes);
    if (topCandidates.length > 1) {
      const tiedNames = topCandidates.map(c => "«" + c.name + "»").join(" و ");
      alert("⚖️ نتیجه دادگاه:\n\nتساوی آرا بین " + tiedNames + " با " + maxVotes + " رأی!\n\n❌ هیچ بازیکنی خارج نمی‌شود و بازی ادامه می‌یابد.");
      handleResetDayVoting();
      return;
    }

    // حالت سوم: رسیدن به حد نصاب با یک نامزد قطعی
    const condemned = topCandidates[0];
    const isConfirmed = confirm(
      "⚖️ نتیجه دادگاه:\n\n«" + condemned.name + "» با " + condemned.votes + " رأی (حد نصاب: " + quorum + ") باید از بازی اخراج شود.\n\nآیا اخراج قطعی این بازیکن را تأیید می‌کنید؟"
    );

    if (isConfirmed) {
      onUpdatePlayer(condemned.id, { isAlive: false, eliminationReason: "court_vote" });
      handleResetDayVoting();
    }
  };

  const handleExitVoteChange = (playerId: string, delta: number) => {
    setExitVotes(prev => {
      const current = prev[playerId] || 0;
      const maxAllowed = courtDefendants.length >= 4
        ? Math.max(0, alivePlayers.length - 1)
        : Math.max(0, alivePlayers.length - courtDefendants.length);
      if (delta > 0 && current >= maxAllowed) return prev;
      const next = Math.min(maxAllowed, Math.max(0, current + delta));
      return { ...prev, [playerId]: next };
    });
  };

  const handleResetDayVoting = () => {
    setActiveSecretVote(null);
    setDayVotes({});
    setCourtDefendants([]);
    setExitVotes({});
    setDayVotePhase("idle");
    network.endSecretVote();
  };

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
              <span className="text-[10px] text-neutral-400 block">رأی لازم دادگاه:</span>
              <span className="text-base font-black text-amber-400 font-mono">
                {requiredCourtVotes} رأی
              </span>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-neutral-950 border border-red-900/60 text-right">
              <span className="text-[10px] text-neutral-400 block">رأی خروج دادگاه:</span>
              <span className="text-base font-black text-red-400 font-mono">
                {requiredEliminationVotes} رأی
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

            {/* Secret Night Vote Modal Trigger removed to prevent conflicts */}

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

        {/* Challenge Requests Queue Panel */}
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-black text-xs">🙋‍♂️ صف درخواست چالش</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-[10px] text-amber-300 font-bold">
                {challengeRequests.length} درخواست
              </span>
            </div>
            <button
              onClick={handleResetDailyChallenges}
              className="text-[11px] text-neutral-400 hover:text-white px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 transition-colors cursor-pointer"
            >
              🔄 ریست سهمیه روزانه همه
            </button>
          </div>

          {challengeRequests.length === 0 ? (
            <div className="text-center py-2 text-neutral-500 text-xs">
              هیچ درخواست چالشی در صف نیست.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {challengeRequests.map((req) => (
                <div
                  key={req.playerId}
                  className="bg-neutral-950 border border-amber-800/60 rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-sm"
                >
                  <div className="text-right">
                    <span className="text-xs font-bold text-white block">{req.playerName}</span>
                    <span className="text-[10px] text-neutral-400">{req.time}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleAcceptChallenge(req.playerId, req.playerName)}
                      className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 font-black text-[11px] transition-colors cursor-pointer"
                    >
                      اعطای ۲۰ ثانیه
                    </button>
                    <button
                      onClick={() => handleDismissChallenge(req.playerId)}
                      className="p-1 rounded-lg bg-neutral-800 hover:bg-rose-900/60 text-neutral-400 hover:text-rose-300 text-[11px] transition-colors cursor-pointer"
                      title="رد درخواست"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      
      {/* ================= DAY VOTING & DEFENSE COURT DESK ================= */}
      {cardsDistributed && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-amber-400">🗳️ میز رأی‌گیری روز و دادگاه</span>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-bold text-neutral-300">
                زنده‌ها: {alivePlayers.length} نفر | حد نصاب ورود: {courtThreshold} رأی
              </span>
            </div>
            <div className="flex items-center gap-2">
              {dayVotePhase !== "idle" && (
                <button
                  onClick={handleResetDayVoting}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold border border-neutral-700 transition-colors"
                >
                  🔄 ریست رأی‌گیری
                </button>
              )}
              {dayVotePhase === "idle" && (
                <button
                  onClick={() => { setDayVotePhase("court_entry"); audio.playCourt(); }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 text-xs font-black transition-all shadow-md active:scale-95"
                >
                  شروع ثبت آرای ورود به دادگاه
                </button>
              )}
            </div>
          </div>

          {dayVotePhase === "court_entry" && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-300">
                دست‌های بلند شده برای هر بازیکن را ثبت کنید (حداقل رأی ورود: <strong className="text-amber-400">{courtThreshold}</strong>):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {alivePlayers.map(p => {
                  const votes = dayVotes[p.id] || 0;
                  const isQualified = votes >= courtThreshold;
                  return (
                    <div
                      key={p.id}
                      className={"p-2.5 rounded-2xl border flex items-center justify-between " + (
                        isQualified ? "bg-amber-950/40 border-amber-600" : "bg-neutral-950 border-neutral-800"
                      )}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{p.name}</span>
                        {isQualified && <span className="text-[10px] text-amber-400 font-bold">ورود به دادگاه ✓</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDayVoteChange(p.id, -1)}
                          className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-black text-white">{votes}</span>
                        <button
                          disabled={(dayVotes[p.id] || 0) >= alivePlayers.length}
                          onClick={() => handleDayVoteChange(p.id, 1)}
                          className="w-7 h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 font-black text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCalculateCourt}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-950/50 active:scale-95 transition-all"
                >
                  تشکیل دادگاه و انتقال واجدین شرایط ⚖️
                </button>
              </div>


            </div>
          )}

          {dayVotePhase === "defense" && (
            <div className="space-y-4 bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-amber-300">
                    ⚖️ دادگاه دفاعیه ({courtDefendants.length} متهم در دفاع)
                  </h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {courtDefendants.length >= 4 ? (
                      <span className="text-sky-400 font-bold">
                        ★ ۴ نفر یا بیشتر در دفاع هستند: متهمان نیز حق رأی خروج دارند (به جز به خودشان).
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold">
                        ★ ۲ یا ۳ نفر در دفاع هستند: متهمان حق رأی خروج ندارند.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {courtDefendants.map(id => {
                  const def = players.find(p => p.id === id);
                  const votes = exitVotes[id] || 0;
                  return (
                    <div key={id} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{def?.name}</span>
                        <button
                          onClick={() => onTimerControl("start", 45, "دفاع: " + (def?.name || ""), id, "defense")}
                          className="px-2 py-0.5 rounded-lg bg-sky-950 border border-sky-800 text-[10px] text-sky-300 font-bold hover:bg-sky-900"
                        >
                          تایمر دفاع (۴۵s)
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-xl border border-neutral-800">
                        <span className="text-[11px] text-neutral-400">آرای خروج:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleExitVoteChange(id, -1)}
                            className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-black text-amber-400">{votes}</span>
                          <button
                            disabled={(exitVotes[id] || 0) >= (courtDefendants.length >= 4 ? Math.max(0, alivePlayers.length - 1) : Math.max(0, alivePlayers.length - courtDefendants.length))}
                            onClick={() => handleExitVoteChange(id, 1)}
                            className="w-6 h-6 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                    </div>
                  );
                })}
              </div>

              {/* پنل اختصاصی حالت ۲: دقیقاً ۱ متهم و رأی‌گیری مخفی در شب */}
              {courtDefendants.length === 1 && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-3 mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-purple-300">🌙 رأی‌گیری مخفی شبانه (تک‌متهم دادگاه)</span>
                      {activeSecretVote && activeSecretVote.votes && Object.keys(activeSecretVote.votes).length > 0 && (
                        <div className="mt-2 p-2 rounded-xl bg-black/60 border border-purple-900 text-xs text-neutral-300">
                          <span className="font-bold text-amber-400">رأی‌دهندگان به خروج: </span>
                          {Object.keys(activeSecretVote.votes).map(voterId => {
                            const detailName = activeSecretVote.voterDetails?.[voterId]?.voterName;
                            const voter = players.find(p => p.id === voterId);
                            return voter ? voter.name : (detailName || voterId);
                          }).join(" ، ")}
                        </div>
                      )}
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        کارت هم‌اندازه کارت بازی روی گوشی همه زنده‌ها (به جز متهم) ظاهر می‌شود و با لمس آن هیچ نوری نمی‌افتد (Anti-Peek).
                      </p>
                    </div>
                    {activeSecretVote && (
                      <span className="px-3 py-1 rounded-xl bg-purple-900 border border-purple-600 text-xs font-black text-purple-200">
                        آرای ثبت‌شده در سکوت: {Object.keys(activeSecretVote.votes || {}).length} رأی
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={handleLaunchSingleDefendantNightVote}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs transition-all shadow-md active:scale-95"
                    >
                      ۱. ارسال کارت شب به گوشی‌ها 📱
                    </button>
                    <button
                      onClick={handleTrigger5SecondVote}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all shadow-md active:scale-95 animate-pulse"
                    >
                      ۲. باز کردن مهلت ۵ ثانیه‌ای رأی‌گیری ⏳
                    </button>
                  </div>
                </div>
              )}

              {/* دکمه‌های کنترل و محاسبه نتیجه نهایی دادگاه */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setDayVotePhase("nomination")}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-all"
                >
                  ← بازگشت به مرحله شمارش آرا
                </button>

                <button
                  onClick={handleEvaluateCourtResult}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 text-xs font-black shadow-lg shadow-amber-950/50 active:scale-95 transition-all"
                >
                  ⚖️ ارزیابی و محاسبه نتیجه دادگاه
                </button>
              </div>

            </div>
          )}
        </div>
      )}


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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm text-white">{player.name}</h4>
                          <button
                            onClick={() => {
                              const newName = prompt("ویرایش نام بازیکن:", player.name);
                              if (newName && newName.trim() && newName.trim() !== player.name) {
                                onUpdatePlayer(player.id, { name: newName.trim() });
                              }
                            }}
                            title="تغییر نام بازیکن"
                            className="text-xs text-neutral-400 hover:text-amber-400 p-1 rounded transition-colors"
                          >
                            ✏️
                          </button>
                        </div>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            player.connected ? 'bg-emerald-500 shadow-sm shadow-emerald-500' : 'bg-neutral-600'
                          }`}
                          title={player.connected ? 'متصل' : 'قطع ارتباط'}
                        />
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

                  {/* Right Column: Game Master Tools (چگونه حذف شدن، ویبره، وضعیت، یادداشت) */}
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
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

      </div>
  );
};
