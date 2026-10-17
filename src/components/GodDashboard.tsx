import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, GameTimer, GameLog, EliminationReason, SecretVoteState, NightActions } from '../types/mafia';
import { ROLE_MAP, ALL_ROLES } from '../data/roles';
import { getActiveNightRoles, resolveNight } from '../services/nightEngine';
import { 
  ROLES_RULES_MATRIX, 
  getValidTargets, 
  getMafiaShooter, 
  isMafiaRoleId, 
  getOutPlayersStatus,
  QuotaTracker 
} from '../data/rolesRulesMatrix';
import { RoleIcon } from './RoleIcons';
import { MafiaChat, MafiaChatMessage } from './MafiaChat';
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
  Smartphone,
  Music,
  Vibrate,
  Sparkles,
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
  const [mafiaChatActive, setMafiaChatActive] = useState(false);
  const [mafiaChatMessages, setMafiaChatMessages] = useState<MafiaChatMessage[]>([]);
  const [isMafiaChatWidgetOpen, setIsMafiaChatWidgetOpen] = useState(false);
  const [speakerId, setSpeakerId] = useState<string>('');
  const [localSeconds, setLocalSeconds] = useState(timer.seconds);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // Night Actions State
  // --- Night / Day Unified Engine States ---
  const [isNightDeskOpen, setIsNightDeskOpen] = useState(false);
  const [currentActiveNightStep, setCurrentActiveNightStep] = useState<string | null>(null);
  const [incomingNightTargets, setIncomingNightTargets] = useState<{
    playerId: string;
    playerName: string;
    roleId: string;
    targetId: string;
    targetName: string;
    extraType?: string;
    time: string;
  }[]>([]);
  const [showMorningReportModal, setShowMorningReportModal] = useState(false);
  const [showCityInquiry, setShowCityInquiry] = useState(false);
  const [morningReportText, setMorningReportText] = useState<string[]>([]);
  const [quotas, setQuotas] = useState<QuotaTracker>({});
  const [dayGuns, setDayGuns] = useState<{ targetId: string; targetName: string; type: "war" | "blank"; used: boolean }[]>([]);

  const [nightActions, setNightActions] = useState<NightActions>({
    mafiaShotId: undefined,
    doctorSaveId: undefined,
    doctorLecterSaveId: undefined,
    detectiveInquiryId: undefined,
    detectiveResult: null,
    sniperShotId: undefined,
    gunsmithTargetId: undefined,
    gunsmithGunType: 'war',
    silencerTargetId: undefined,
    hostageTargetId: undefined,
    bomberTargetId: undefined,
    jokerTargetId: undefined,
    priestTargetId: undefined,
    watcherTargetId: undefined,
  });

  // Secret Voting State
  const [activeSecretVote, setActiveSecretVote] = useState<SecretVoteState | null>(null);

  // Day Voting & Defense Court States
  const [dayVotes, setDayVotes] = useState<Record<string, number>>({});
  const [courtDefendants, setCourtDefendants] = useState<string[]>([]);
  const [exitVotes, setExitVotes] = useState<Record<string, number>>({});
  const [dayVotePhase, setDayVotePhase] = useState<'idle' | 'nomination' | 'court_entry' | 'defense'>('idle');

  const [challengeRequests, setChallengeRequests] = useState<{ playerId: string; playerName: string; time: string }[]>([]);

  // Sync timer state
  useEffect(() => {
    const unGodMafiaChat = network.on("mafia_chat_sync", (data: any) => {
      if (typeof data?.active === "boolean") setMafiaChatActive(data.active);
      if (Array.isArray(data?.messages)) setMafiaChatMessages(data.messages);
    });

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
    const unSub = network.on('challenges_updated', (data: any) => {
      if (Array.isArray(data)) {
        setChallengeRequests(data);
      }
    });
    return () => {
      if (typeof unSub === 'function') unSub();
    };
  }, []);

  // Listen to secret vote events
  useEffect(() => {
    const unStart = network.on('secret_vote_started', (data: any) => setActiveSecretVote(data));
    const unUpdate = network.on('secret_vote_updated', (data: any) => {
      setActiveSecretVote((prev: any) => {
        return prev ? { ...prev, votes: data.votes, voterDetails: data.voterDetails } : { votes: data.votes, voterDetails: data.voterDetails };
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

  // دریافت تارگت‌ها و درخواست‌های ارسالی بازیکنان در شب
  useEffect(() => {
    const unNightTarget = network.on("night_target_received", (data: any) => {
      if (data && data.playerId) {
        setIncomingNightTargets((prev) => [
          ...prev.filter((t) => t.playerId !== data.playerId),
          data,
        ]);
        audio.playFlip();
      }
    });

    return () => {
      if (typeof unNightTarget === "function") unNightTarget();
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

  // استخراج نقش‌های فعال شب بر اساس سناریو و بازیکنان زنده
  const activeNightRoleIds = useMemo(() => {
    return new Set(getActiveNightRoles(players).map((r) => r.id));
  }, [players]);

  const hasAliveMafia = useMemo(() => {
    return players.some((p) => {
      if (!p.isAlive || !p.roleId) return false;
      return ROLE_MAP[p.roleId]?.team === 'mafia';
    });
  }, [players]);

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
    setDayVotes((prev) => {
      const current = prev[playerId] || 0;
      const maxAllowed = alivePlayers.length;
      if (delta > 0 && current >= maxAllowed) return prev;
      const next = Math.min(maxAllowed, Math.max(0, current + delta));
      return { ...prev, [playerId]: next };
    });
  };

  const handleCalculateCourt = () => {
    const qualified = alivePlayers
      .filter((p) => (dayVotes[p.id] || 0) >= courtThreshold)
      .map((p) => p.id);
    setCourtDefendants(qualified);
    setExitVotes({});
    if (qualified.length > 0) {
      setDayVotePhase('defense');
      audio.playCourt();
    } else {
      alert('هیچ بازیکنی به حد نصاب ورود به دادگاه (' + courtThreshold + ' رأی) نرسید.');
    }
  };

  const handleLaunchSingleDefendantNightVote = () => {
    if (courtDefendants.length !== 1) return;
    const defId = courtDefendants[0];
    const defPlayer = players.find((p) => p.id === defId);

    const eligibleVoterIds = alivePlayers.filter((p) => p.id !== defId).map((p) => p.id);

    network.startSecretVote({
      title: 'رأی‌گیری خروج شب: ' + (defPlayer ? defPlayer.name : ''),
      startsLocked: true,
      targetDefendantId: defId,
      eligibleVoterIds,
      candidates: [{ id: defId, name: defPlayer ? defPlayer.name : 'متهم' }],
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

    const results = courtDefendants.map((id) => {
      const p = players.find((x) => x.id === id);
      return { id, name: p ? p.name : 'نامشخص', votes: exitVotes[id] || 0 };
    });

    results.sort((a, b) => b.votes - a.votes);
    const maxVotes = results[0].votes;

    if (maxVotes < quorum) {
      alert('⚖️ نتیجه دادگاه:\n\nبیشترین رأی (' + maxVotes + ' رأی) کمتر از حد نصاب (' + quorum + ' رأی) است.\n\n❌ هیچ بازیکنی حذف نمی‌شود.');
      handleResetDayVoting();
      return;
    }

    const topCandidates = results.filter((r) => r.votes === maxVotes);
    if (topCandidates.length > 1) {
      const tiedNames = topCandidates.map((c) => '«' + c.name + '»').join(' و ');
      alert('⚖️ نتیجه دادگاه:\n\nتساوی آرا بین ' + tiedNames + ' با ' + maxVotes + ' رأی!\n\n❌ هیچ بازیکنی خارج نمی‌شود و بازی ادامه می‌یابد.');
      handleResetDayVoting();
      return;
    }

    const condemned = topCandidates[0];
    const isConfirmed = confirm(
      '⚖️ نتیجه دادگاه:\n\n«' + condemned.name + '» با ' + condemned.votes + ' رأی (حد نصاب: ' + quorum + ') باید از بازی اخراج شود.\n\nآیا اخراج قطعی این بازیکن را تأیید می‌کنید؟'
    );

    if (isConfirmed) {
      onUpdatePlayer(condemned.id, { isAlive: false, eliminationReason: 'court_vote' });
      handleResetDayVoting();
    }
  };

  const handleExitVoteChange = (playerId: string, delta: number) => {
    setExitVotes((prev) => {
      const current = prev[playerId] || 0;
      const maxAllowed =
        courtDefendants.length >= 4
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
    setDayVotePhase('idle');
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

  const handleBuzzPlayer = (playerId: string, name: string) => {
    audio.playWakeBuzz();
    network.buzzPlayer(playerId, 'warning', `اخطار / بیدارباش اختصاصی از سوی گرداننده برای «${name}»`);
  };

  const handleBuzzAll = () => {
    audio.playWarningBeep();
    network.buzzAll('warning', '📢 اعلامیه و بیدارباش همگانی از سوی گرداننده!');
  };

  // Detective Inquiry Logic
  const handleRunDetectiveInquiry = (targetId: string) => {
    const targetPlayer = players.find((p) => p.id === targetId);
    if (!targetPlayer || !targetPlayer.roleId) return;

    let result: 'positive' | 'negative' = 'negative';
    if (targetPlayer.roleId === 'godfather') {
      result = 'negative';
    } else if (targetPlayer.roleId === 'joker') {
      result = 'negative';
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

  // اعمال خودکار نتایج شب و انتقال به فاز روز
  const handleTransitionToDay = () => {
    const currentArmors: Record<string, boolean> = {};
    players.forEach((p) => {
      currentArmors[p.id] = p.hasArmor;
    });

    const { updatedPlayers, report, updatedArmors } = resolveNight(players, nightActions, currentArmors);

    updatedPlayers.forEach((up) => {
      const orig = players.find((p) => p.id === up.id);
      if (orig) {
        const updates: Partial<Player> = {};
        if (orig.isAlive !== up.isAlive) {
          updates.isAlive = up.isAlive;
          if (!up.isAlive) updates.eliminationReason = 'mafia_shot';
        }
        if (orig.isSilenced !== up.isSilenced) {
          updates.isSilenced = up.isSilenced;
        }
        if (orig.hasArmor !== updatedArmors[up.id]) {
          updates.hasArmor = updatedArmors[up.id];
        }
        if (Object.keys(updates).length > 0) {
          onUpdatePlayer(up.id, updates);
        }
      }
    });

    // ثبت تفنگ اعطایی تفنگدار برای فاز روز
    if (nightActions.gunsmithTargetId && nightActions.gunsmithGunType) {
      const targetP = players.find((p) => p.id === nightActions.gunsmithTargetId);
      if (targetP) {
        setDayGuns((prev) => [
          ...prev.filter((g) => g.targetId !== targetP.id),
          {
            targetId: targetP.id,
            targetName: targetP.name,
            type: nightActions.gunsmithGunType as "war" | "blank",
            used: false,
          },
        ]);
        // ثبت رسمی تفنگ اهدا شده روی شیء پلیر جهت نمایش در کارت بازیکن
        onUpdatePlayer(targetP.id, { 
          gunGiven: nightActions.gunsmithGunType as "war" | "blank"
        });
      }
    }

    // آماده‌سازی گزارش صبحگاهی شهر
    const reportAnnouncement = (report as any).publicAnnouncement || [];
    if (reportAnnouncement.length === 0) {
      if (report.deaths.length === 0 && !report.silencedId) {
        reportAnnouncement.push("☀️ شهروندان محترم! دیشب شب آرامی بود و هیچ بازیکنی حذف یا سایلنت نشد.");
      } else {
        report.deaths.forEach((dId) => {
          const dp = players.find((p) => p.id === dId);
          if (dp) reportAnnouncement.push(`❌ بازیکن «${dp.name}» در فاز شب از بازی خارج شد.`);
        });
        if (report.silencedId) {
          const sp = players.find((p) => p.id === report.silencedId);
          if (sp) reportAnnouncement.push(`🤫 بازیکن «${sp.name}» برای امروز سایلنت است.`);
        }
      }
    }

    setMorningReportText(reportAnnouncement);
    setShowMorningReportModal(true);
    setShowCityInquiry(false);
    setIsNightDeskOpen(false);

    if (report.deaths.length > 0) {
      audio.playShot();
    } else {
      audio.playFlip();
    }

    setNightActions({
      mafiaShotId: undefined,
      doctorSaveId: undefined,
      doctorLecterSaveId: undefined,
      detectiveInquiryId: undefined,
      detectiveResult: null,
      sniperShotId: undefined,
      gunsmithTargetId: undefined,
      gunsmithGunType: undefined,
      silencerTargetId: undefined,
      hostageTargetId: undefined,
      bomberTargetId: undefined,
      jokerTargetId: undefined,
      priestTargetId: undefined,
      watcherTargetId: undefined,
    });
  };

  const handleApplyNightActions = handleTransitionToDay;

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

      {/* 3. TIMER & TALKING STATION */}
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
              {dayVotePhase !== 'idle' && (
                <button
                  onClick={handleResetDayVoting}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold border border-neutral-700 transition-colors"
                >
                  🔄 ریست رأی‌گیری
                </button>
              )}
              {dayVotePhase === 'idle' && (
                <button
                  onClick={() => {
                    setDayVotePhase('court_entry');
                    audio.playCourt();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 text-xs font-black transition-all shadow-md active:scale-95"
                >
                  شروع ثبت آرای ورود به دادگاه
                </button>
              )}
            </div>
          </div>

          {dayVotePhase === 'court_entry' && (
            <div className="space-y-3">
              <p className="text-xs text-neutral-300">
                دست‌های بلند شده برای هر بازیکن را ثبت کنید (حداقل رأی ورود:{' '}
                <strong className="text-amber-400">{courtThreshold}</strong>):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {alivePlayers.map((p) => {
                  const votes = dayVotes[p.id] || 0;
                  const isQualified = votes >= courtThreshold;
                  return (
                    <div
                      key={p.id}
                      className={
                        'p-2.5 rounded-2xl border flex items-center justify-between ' +
                        (isQualified ? 'bg-amber-950/40 border-amber-600' : 'bg-neutral-950 border-neutral-800')
                      }
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

          {dayVotePhase === 'defense' && (
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
                {courtDefendants.map((id) => {
                  const def = players.find((p) => p.id === id);
                  const votes = exitVotes[id] || 0;
                  return (
                    <div key={id} className="p-3 rounded-2xl bg-neutral-900 border border-neutral-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">{def?.name}</span>
                        <button
                          onClick={() => onTimerControl('start', 45, 'دفاع: ' + (def?.name || ''), id, 'defense')}
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
                            disabled={
                              (exitVotes[id] || 0) >=
                              (courtDefendants.length >= 4
                                ? Math.max(0, alivePlayers.length - 1)
                                : Math.max(0, alivePlayers.length - courtDefendants.length))
                            }
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

              {courtDefendants.length === 1 && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-3 mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-purple-300">🌙 رأی‌گیری مخفی شبانه (تک‌متهم دادگاه)</span>
                      {activeSecretVote && activeSecretVote.votes && Object.keys(activeSecretVote.votes).length > 0 && (
                        <div className="mt-2 p-2 rounded-xl bg-black/60 border border-purple-900 text-xs text-neutral-300">
                          <span className="font-bold text-amber-400">رأی‌دهندگان به خروج: </span>
                          {Object.keys(activeSecretVote.votes)
                            .map((voterId) => {
                              const detailName = activeSecretVote.voterDetails?.[voterId]?.voterName;
                              const voter = players.find((p) => p.id === voterId);
                              return voter ? voter.name : detailName || voterId;
                            })
                            .join(' ، ')}
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

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-800">
                <button
                  onClick={() => setDayVotePhase('nomination')}
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

            {/* 4. UNIFIED NIGHT / DAY PHASE CONTROLLER */}
      {cardsDistributed && (
        <div className="space-y-3">
          {/* پنل وضعیت تفنگ‌های اهدا شده در فاز روز */}
          {dayGuns.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-3xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  🔫 اسلحه‌های فعال در فاز روز (اهدایی تفنگدار):
                </span>
                <span className="text-[10px] text-amber-400/80">برای اعمال شلیک، نوع اسلحه را بررسی کنید</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {dayGuns.map((gun, idx) => (
                  <div key={idx} className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{gun.targetName}</span>
                      <span className={`text-[10px] font-mono ${gun.type === "war" ? "text-rose-400 font-bold" : "text-sky-400"}`}>
                        نوع سلاح: {gun.type === "war" ? "تیر جنگی 💥" : "تیر مشقی 💨"}
                      </span>
                    </div>
                    {!gun.used ? (
                      <button
                        onClick={() => {
                          if (gun.type === "war") {
                            network.updatePlayerStatus(gun.targetId, { isAlive: false, eliminationReason: "court_vote" });
                          }
                          setDayGuns(prev => prev.map((g, i) => i === idx ? { ...g, used: true } : g));
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all"
                      >
                        ثبت شلیک
                      </button>
                    ) : (
                      <span className="text-[10px] text-neutral-500 font-bold">شلیک شد ✓</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نوار بالایی فاز شب: دکمه باز کردن میز شب */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-3.5 sm:p-4 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🌙</span>
              <div>
                <h3 className="text-sm font-black text-white">مدیریت فاز شب و روز بازی</h3>
                <p className="text-[11px] text-neutral-400">استعلام خودکار کارت‌های زنده و اجرای گام‌به‌گام سناریو</p>
              </div>
            </div>
            <button
              onClick={() => {
                const nextState = !isNightDeskOpen;
                setIsNightDeskOpen(nextState);
                network.toggleNightPhase(nextState);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                isNightDeskOpen
                  ? "bg-purple-950 text-purple-300 border border-purple-700/80 hover:bg-purple-900"
                  : "bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-lg shadow-purple-950/50 hover:brightness-110 active:scale-95"
              }`}
            >
              <span>{isNightDeskOpen ? "🔼 بستن موقت میز شب" : "🌙 ورود به فاز شب"}</span>
            </button>
          </div>

          {/* میز شبانه باز شونده هوشمند بر اساس کارت‌های زنده */}
          {isNightDeskOpen && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in duration-200">
              {/* نوار کنترل ترتیبی بیدارباش نقش‌ها در فاز شب */}
              <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                  <span>🌙 بیدارباش نوبتی نقش‌ها:</span>
                  {currentActiveNightStep ? (
                    <span className="text-[11px] text-amber-400 animate-pulse bg-amber-950/60 border border-amber-800 px-2.5 py-0.5 rounded-full">
                      نوبت فعال: {currentActiveNightStep}
                    </span>
                  ) : (
                    <span className="text-[11px] text-neutral-500">همه خواب هستند 💤</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = currentActiveNightStep === "mafia" ? null : "mafia";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next);
                      network.toggleMafiaChat(next === "mafia");
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentActiveNightStep === "mafia"
                        ? "bg-red-700 text-white shadow-lg ring-2 ring-red-500"
                        : "bg-red-950/50 text-red-300 border border-red-900/60 hover:bg-red-900/70"
                    }`}
                  >
                    🕶️ بیدارباش مافیا (چت + شات)
                  </button>

            {alivePlayers.some(p => p.roleId === "doctor") && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = currentActiveNightStep === "doctor" ? null : "doctor";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next);
                      if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentActiveNightStep === "doctor"
                        ? "bg-sky-700 text-white shadow-lg ring-2 ring-sky-500"
                        : "bg-sky-950/50 text-sky-300 border border-sky-900/60 hover:bg-sky-900/70"
                    }`}
                  >
                    💉 بیدارباش پزشک
                  </button>
            )}

            {alivePlayers.some(p => p.roleId === "detective") && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = currentActiveNightStep === "detective" ? null : "detective";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next);
                      if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      currentActiveNightStep === "detective"
                        ? "bg-emerald-700 text-white shadow-lg ring-2 ring-emerald-500"
                        : "bg-emerald-950/50 text-emerald-300 border border-emerald-900/60 hover:bg-emerald-900/70"
                    }`}
                  >
                    🔍 بیدارباش کارآگاه
                  </button>
            )}

                  {alivePlayers.some(p => p.roleId === "sniper") && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentActiveNightStep === "sniper" ? null : "sniper";
                        setCurrentActiveNightStep(next);
                        network.setNightStep(next);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        currentActiveNightStep === "sniper"
                          ? "bg-purple-700 text-white shadow-lg ring-2 ring-purple-500"
                          : "bg-purple-950/50 text-purple-300 border border-purple-900/60 hover:bg-purple-900/70"
                      }`}
                    >
                      🔫 بیدارباش اسنایپر
                    </button>
                  )}

                  {alivePlayers.some(p => p.roleId === "gunsmith") && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentActiveNightStep === "gunsmith" ? null : "gunsmith";
                        setCurrentActiveNightStep(next);
                        network.setNightStep(next);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        currentActiveNightStep === "gunsmith"
                          ? "bg-amber-600 text-white shadow-lg ring-2 ring-amber-400"
                          : "bg-amber-950/50 text-amber-300 border border-amber-900/60 hover:bg-amber-900/70"
                      }`}
                    >
                      🔫 بیدارباش تفنگدار
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentActiveNightStep(null);
                      network.setNightStep(null);
                      network.toggleMafiaChat(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 text-xs font-bold border border-neutral-800 cursor-pointer"
                  >
                    💤 خواباندن همه
                  </button>
                </div>
              </div>

              {/* تارگت‌های ارسال شده توسط بازیکنان در فاز شب */}
              {incomingNightTargets.length > 0 && (
                <div className="bg-purple-950/40 border border-purple-800/80 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                    <span>📥 انتخاب‌های ارسال‌شده توسط بازیکنان در شب:</span>
                    <button 
                      type="button"
                      onClick={() => setIncomingNightTargets([])}
                      className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer"
                    >
                      پاک‌سازی لیست
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {incomingNightTargets.map((item, idx) => (
                      <div key={idx} className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-white block">{item.playerName} ({item.roleId})</span>
                          <span className="text-purple-300 text-[11px]">هدف: {item.targetName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {item.roleId === "detective" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  network.sendNightResultToPlayer(item.playerId, "استعلام شما: مثبت 🟢 (مافیا)", "positive");
                                  network.setNightStep(null);
                                  setCurrentActiveNightStep(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 text-[10px] font-bold hover:bg-rose-900 cursor-pointer"
                              >
                                مثبت 🟢
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  network.sendNightResultToPlayer(item.playerId, "استعلام شما: منفی ⚪ (شهروند)", "negative");
                                  network.setNightStep(null);
                                  setCurrentActiveNightStep(null);
                                }}
                                className="px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold hover:bg-emerald-900 cursor-pointer"
                              >
                                منفی ⚪
                              </button>
                            </>
                          ) : item.roleId === "gunsmith" ? (
                            <button
                              type="button"
                              onClick={() => {
                                const isReal = item.extraType !== "blank";
                                setNightActions(prev => ({
                                  ...prev,
                                  gunsmithTargetId: item.targetId,
                                  gunsmithGunType: isReal ? "war" : "blank",
                                }));
                                setDayGuns(prev => [
                                  ...prev.filter(g => g.targetId !== item.targetId),
                                  {
                                    targetId: item.targetId,
                                    targetName: item.targetName,
                                    type: isReal ? "war" : "blank",
                                    used: false,
                                  }
                                ]);
                                network.sendNightResultToPlayer(
                                  item.playerId,
                                  `اسلحه (${isReal ? "جنگی 💥" : "مشقی ⚪"}) با موفقیت به «${item.targetName}» تحویل داده شد ✓`
                                );
                                network.setNightStep(null);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-700 text-amber-200 text-[10px] font-bold hover:bg-amber-900 cursor-pointer"
                            >
                              تایید اهدا اسلحه 🔫
                            </button>
                          ) : item.roleId === "godfather" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNightActions(prev => ({ ...prev, mafiaShotId: item.targetId }));
                                network.sendNightResultToPlayer(item.playerId, `شلیک مافیا روی «${item.targetName}» تایید و ثبت شد 💥`);
                                network.toggleMafiaChat(false);
                                network.setNightStep(null);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-700 text-red-200 text-[10px] font-bold hover:bg-red-900 cursor-pointer"
                            >
                              تایید و ثبت شات مافیا 💥
                            </button>
                          ) : item.roleId === "doctor" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNightActions(prev => ({ ...prev, doctorSaveId: item.targetId }));
                                network.sendNightResultToPlayer(item.playerId, `انتخاب نجات «${item.targetName}» تایید شد 💉`);
                                network.setNightStep(null);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 text-[10px] font-bold hover:bg-emerald-900 cursor-pointer"
                            >
                              تایید نجات 💉
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => network.sendNightResultToPlayer(item.playerId, `اقدام شما روی «${item.targetName}» ثبت شد ✓`)}
                              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold cursor-pointer"
                            >
                              تایید به بازیکن ✓
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-sm font-black text-white">میز تصمیمات شبانه گرداننده</h3>
                </div>
                <button
                  onClick={handleTransitionToDay}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 hover:from-amber-500 hover:to-rose-600 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>☀️ رفتن به فاز روز و اعلام نتایج</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* ۱. شلیک شب مافیا (تا زمانی که حداقل یک مافیا زنده باشد) */}
                {hasAliveMafia && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-rose-950 space-y-2">
                    <span className="font-bold text-rose-400 flex items-center gap-1">
                      🎯 هدف شات مافیا:
                    </span>
                    <select
                      value={nightActions.mafiaShotId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, mafiaShotId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون شلیک --</option>
                      {alivePlayers.filter((p) => !isMafiaRoleId(p.roleId)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۲. سیو پزشک */}
                {activeNightRoleIds.has("doctor") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-sky-950 space-y-2">
                    <span className="font-bold text-sky-400 flex items-center gap-1">
                      💉 هدف سیو پزشک:
                    </span>
                    <select
                      value={nightActions.doctorSaveId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, doctorSaveId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون محافظت --</option>
                      {alivePlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۳. سیو دکتر لکتور */}
                {activeNightRoleIds.has("dr_lecter") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-rose-950 space-y-2">
                    <span className="font-bold text-rose-300 flex items-center gap-1">
                      🩸 سیو دکتر لکتور (مافیا):
                    </span>
                    <select
                      value={nightActions.doctorLecterSaveId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, doctorLecterSaveId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون سیو --</option>
                      {alivePlayers.filter((p) => isMafiaRoleId(p.roleId)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۴. استعلام کارآگاه */}
                {activeNightRoleIds.has("detective") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-emerald-950 space-y-2">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      🔍 استعلام کارآگاه:
                    </span>
                    <select
                      value={nightActions.detectiveInquiryId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, detectiveInquiryId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون استعلام --</option>
                      {alivePlayers.filter((p) => p.roleId !== "detective").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۵. شلیک اسنایپر */}
                {activeNightRoleIds.has("sniper") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-purple-950 space-y-2">
                    <span className="font-bold text-purple-400 flex items-center gap-1">
                      🔫 شلیک اسنایپر:
                    </span>
                    <select
                      value={nightActions.sniperShotId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, sniperShotId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون شلیک --</option>
                      {alivePlayers.filter((p) => p.roleId !== "sniper").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۶. سکوت ناتاشا */}
                {activeNightRoleIds.has("natasha") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-fuchsia-950 space-y-2">
                    <span className="font-bold text-fuchsia-400 flex items-center gap-1">
                      🤫 سکوت ناتاشا:
                    </span>
                    <select
                      value={nightActions.silencerTargetId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, silencerTargetId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white"
                    >
                      <option value="">-- بدون سایلنس --</option>
                      {alivePlayers.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ۷. تفنگدار (اهدای سلاح) */}
                {activeNightRoleIds.has("gunsmith") && (
                  <div className="bg-neutral-950 p-3.5 rounded-2xl border border-amber-950 space-y-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      🛠️ اهدای سلاح تفنگدار:
                    </span>
                    <select
                      value={nightActions.gunsmithTargetId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, gunsmithTargetId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white mb-1.5"
                    >
                      <option value="">-- بدون اهدا --</option>
                      {alivePlayers.filter((p) => p.roleId !== "gunsmith").map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {nightActions.gunsmithTargetId && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNightActions((prev) => ({ ...prev, gunsmithGunType: "war" }))}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            nightActions.gunsmithGunType === "war"
                              ? "bg-rose-950 text-rose-300 border-rose-700"
                              : "bg-neutral-900 text-neutral-400 border-neutral-800"
                          }`}
                        >
                          تیر جنگی 💥
                        </button>
                        <button
                          type="button"
                          onClick={() => setNightActions((prev) => ({ ...prev, gunsmithGunType: "blank" }))}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                            nightActions.gunsmithGunType === "blank"
                              ? "bg-sky-950 text-sky-300 border-sky-700"
                              : "bg-neutral-900 text-neutral-400 border-neutral-800"
                          }`}
                        >
                          تیر مشقی 💨
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* پنجره مودال گزارش صبحگاهی فاز روز + دو دکمه بستن و استعلام */}
          {showMorningReportModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">☀️</span>
                    <h3 className="text-base font-black text-white">گزارش رسمی صبحگاهی برای قرائت در شهر</h3>
                  </div>
                </div>

                <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-850 space-y-2 text-sm text-neutral-200 leading-relaxed">
                  {morningReportText.map((line, idx) => (
                    <p key={idx} className="font-medium">{line}</p>
                  ))}
                </div>

                {/* استعلام وضعیت شهر در صورت فعال شدن */}
                {showCityInquiry && (
                  <div className="bg-purple-950/40 border border-purple-800/80 rounded-2xl p-4 space-y-2 animate-in fade-in">
                    <span className="text-xs font-bold text-purple-300 block">📊 استعلام وضعیت شهر و خارج‌شدگان:</span>
                    {(() => {
                      const stat = getOutPlayersStatus(players);
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800">
                            <span className="text-neutral-400 block text-[11px]">شهروندان بیرون از شهر:</span>
                            <span className="text-base font-black text-emerald-400">{stat.deadCitizensCount} نفر</span>
                          </div>
                          <div className="bg-neutral-900/80 p-2 rounded-xl border border-neutral-800">
                            <span className="text-neutral-400 block text-[11px]">مافیاهای بیرون از شهر:</span>
                            <span className="text-base font-black text-rose-400">{stat.deadMafiaCount} نفر</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* دو دکمه بستن و استعلام */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                  <button
                    onClick={() => setShowMorningReportModal(false)}
                    className="flex-1 py-2.5 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    بستن پنجره گزارش
                  </button>
                  <button
                    onClick={() => setShowCityInquiry(!showCityInquiry)}
                    className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-purple-950/40"
                  >
                    {showCityInquiry ? "مخفی‌سازی استعلام" : "📊 استعلام شهر (تعداد کشته‌ها)"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. UNIFIED MASTER PLAYERS LIST */}
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
                        <span
                          className="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded-md border border-purple-800"
                          title={`اولویت شبانه #${role.nightOrder}`}
                        >
                          #{role.nightOrder}
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-neutral-500">{index + 1}</span>
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
                              const newName = prompt('ویرایش نام بازیکن:', player.name);
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

                  {/* Right Column: Game Master Tools */}
                  <div className="flex flex-wrap items-center justify-end gap-2 text-xs">




                    {/* Elimination Reason Selector */}
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

                    {/* Silent Wake-up / Buzz Button */}
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
      {/* Mafia Chat Audit & Control Widget for God */}
      <div className="fixed bottom-6 left-6 z-40">
        {isMafiaChatWidgetOpen ? (
          <div className="w-80 shadow-2xl animate-fade-in">
            <div className="flex justify-end mb-1">
              <button
                type="button"
                onClick={() => setIsMafiaChatWidgetOpen(false)}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-2 py-0.5 rounded cursor-pointer"
              >
                ✕ بستن کادر
              </button>
            </div>
            <MafiaChat
              isGod={true}
              isActive={mafiaChatActive}
              messages={mafiaChatMessages}
              onSendMessage={(text) => {
                setMafiaChatMessages((prev) => [
                  ...prev,
                  {
                    id: Math.random().toString(),
                    senderId: 'god',
                    senderName: 'گرداننده 👑',
                    senderRole: 'god',
                    text,
                    time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              onToggleChat={(active) => network.toggleMafiaChat(active)}
              onClearChat={() => network.clearMafiaChat()}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsMafiaChatWidgetOpen(true)}
            className="flex items-center gap-2 bg-red-950/90 hover:bg-red-900 border border-red-700/60 text-red-200 px-3.5 py-2 rounded-2xl shadow-xl text-xs font-bold cursor-pointer transition-all active:scale-95"
          >
            <span>🕶️ مانیتور چت مافیا</span>
            <span className={"w-2 h-2 rounded-full " + (mafiaChatActive ? "bg-emerald-500 animate-ping" : "bg-neutral-500")} />
          </button>
        )}
      </div>
    </div>
  );
};
