import { getFinalTrialConfig } from "../core/rules/trialEngine";
import { resolveSheriffShot, resolveJudgeExecution, resolveMayorVeto, resolveFinalTrialOutcome } from "../services/dayEngine";
import { getSniperBulletQuota } from "../utils/sniperQuota";
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
  const [godAnnouncementText, setGodAnnouncementText] = useState<string | null>(null);
  const [incomingDayShotRequests, setIncomingDayShotRequests] = useState<{ playerId: string; playerName: string }[]>([]);
  const [incomingDayShotTargets, setIncomingDayShotTargets] = useState<{ shooterId: string; shooterName: string; targetId: string; targetName: string }[]>([]);
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
  const [pendingDayShot, setPendingDayShot] = useState<{ shooterId: string; shooterName: string; targetId: string; targetName: string; gunType: string } | null>(null);

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
  const [activeBomb, setActiveBomb] = useState<any>(null);

  // Sync timer state
  // همگام‌سازی ثانیه‌های محلی با تایمر
  useEffect(() => {
    setLocalSeconds(timer.seconds);
    if (timer.speakerId) setSpeakerId(timer.speakerId);
  }, [timer.seconds, timer.speakerId]);

  // لیسنرهای وضعیت بمب برای گرداننده با cleanup
  useEffect(() => {
    const un1 = network.on("bomb_status_updated", (data: any) => setActiveBomb(data?.activeBomb || null));
    const un2 = network.on("bomb_triggered", (data: any) => setActiveBomb(data?.bomb || null));
    const un3 = network.on("bomb_exploded", () => setActiveBomb(null));
    const un4 = network.on("bomb_defused", () => setActiveBomb(null));

    return () => {
      if (typeof un1 === "function") un1();
      if (typeof un2 === "function") un2();
      if (typeof un3 === "function") un3();
      if (typeof un4 === "function") un4();
    };
  }, []);

  // لیسنر چت مافیا با cleanup کامل
  useEffect(() => {
    const unGodMafiaChat = network.on("mafia_chat_sync", (data: any) => {
      if (typeof data?.active === "boolean") setMafiaChatActive(data.active);
      if (Array.isArray(data?.messages)) setMafiaChatMessages(data.messages);
    });
    return () => {
      if (typeof unGodMafiaChat === "function") unGodMafiaChat();
    };
  }, []);

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
    
    const unGunAlert = network.on("day_gun_shot_alert", (data: any) => {
      audio.playFlip();
      setPendingDayShot(data);
    });

    return () => {
      unGunAlert();
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
    const unReq = network.on("day_shot_requested", (data: { playerId: string; playerName: string }) => {
      setIncomingDayShotRequests(prev => [...prev.filter(r => r.playerId !== data.playerId), data]);
    });

    const unTargetRec = network.on("day_shot_target_received", (data: { shooterId: string; shooterName: string; targetId: string; targetName: string }) => {
      setIncomingDayShotRequests(prev => prev.filter(r => r.playerId !== data.shooterId));
      setIncomingDayShotTargets(prev => [...prev.filter(t => t.shooterId !== data.shooterId), data]);
    });

    const unGameReset = network.on("game_reset", () => {
      console.log("[گاد] پاکسازی صف درخواست‌های شب و بمب به علت ریست بازی");
      setIncomingNightTargets([]);
      setIncomingDayShotRequests([]);
      setIncomingDayShotTargets([]);
      setPendingDayShot(null);
      setActiveBomb(null);
      setNightActions({
        mafiaShotId: undefined,
        doctorSaveId: undefined,
        doctorLecterSaveId: undefined,
      });
    });

    const unNightTarget = network.on("night_target_received", (data: any) => {
      if (data && data.playerId) {
        setIncomingNightTargets((prev) => [
          ...prev.filter((t) => !(t.playerId === data.playerId && (t.roleId !== "gunsmith" || t.extraType === data.extraType))),
          data,
        ]);
      }
    });

    return () => {
      if (typeof unReq === "function") unReq();
      if (typeof unTargetRec === "function") unTargetRec();
      if (typeof unNightTarget === "function") unNightTarget();
      if (typeof unGameReset === "function") unGameReset();
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

  const handleLaunchCourtNightVote = () => {
    if (courtDefendants.length < 2) return;
    const trialConfig = getFinalTrialConfig(courtDefendants.length);

    // تعیین واجدین شرایط رأی:
    // در کمتر از ۴ متهم، متهمان اجازه رأی دادن ندارند.
    // در ۴ متهم یا بیشتر، همه زنده‌ها حق رأی دارند.
    const eligibleVoterIds = alivePlayers
      .filter((p) => trialConfig.canDefendantsVoteEachOther || !courtDefendants.includes(p.id))
      .map((p) => p.id);

    const candidates = courtDefendants.map((id) => {
      const p = players.find((x) => x.id === id);
      return { id, name: p ? p.name : "متهم" };
    });

    network.startSecretVote({
      title: `⚖️ رأی‌گیری مخفی دادگاه شبانه (${courtDefendants.length} متهم)`,
      startsLocked: true,
      eligibleVoterIds,
      candidates,
    });
    audio.playGong();
  };

  const handleLaunchSingleDefendantNightVote = () => {
    if (courtDefendants.length !== 1) return;
    const defId = courtDefendants[0];
    const defPlayer = players.find((x) => x.id === defId);

    // واجدین شرایط: تمام افراد زنده به جز خود متهم
    const eligibleVoterIds = alivePlayers
      .filter((p) => p.id !== defId)
      .map((p) => p.id);

    const candidates = [
      { id: defId, name: defPlayer ? defPlayer.name : "متهم دادگاه" }
    ];

    network.startSecretVote({
      title: `⚖️ رأی‌گیری خروج تک‌متهم: «${defPlayer?.name || "متهم"}»`,
      startsLocked: true,
      eligibleVoterIds,
      candidates,
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

    // در دادگاه تک‌متهم (روز)، نیاز به حدنصاب نصف + ۱ است
    if (courtDefendants.length === 1 && maxVotes < quorum) {
      alert('⚖️ نتیجه دادگاه:\n\nآرای خروج متهم (' + maxVotes + ' رأی) به حد نصاب (' + quorum + ' رأی) نرسید.\n\n❌ بازیکن در بازی می‌ماند.');
      handleResetDayVoting();
      return;
    }
    // در دادگاه شبانه (۲ متهم به بالا)، در صورت عدم ثبت رأی هیچ‌کس حذف نمی‌شود
    if (courtDefendants.length > 1 && maxVotes === 0) {
      alert('⚖️ نتیجه دادگاه:\n\nهیچ رأیی برای خروج متهمان ثبت نشده است.\n\n❌ هیچ بازیکنی حذف نمی‌شود.');
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

// ================= DAY ACTION HANDLERS =================
  const handleSheriffShotAction = (sheriffId: string, targetId: string) => {
    const outcome = resolveSheriffShot(players, sheriffId, targetId);
    alert(outcome.log);
    if (outcome.eliminatedPlayerId) {
      onUpdatePlayer(outcome.eliminatedPlayerId, {
        isAlive: false,
        eliminationReason: outcome.eliminationReason || "sheriff_shot",
      });
      audio.playShot();
    }
  };

  const handleJudgeVerdictAction = (judgeId: string, targetId: string) => {
    const outcome = resolveJudgeExecution(players, judgeId, targetId);
    alert(outcome.log);
    if (outcome.eliminatedPlayerId) {
      if (outcome.isJesterWin) {
        alert("🎉 دلقک مستقل با اعدام در دادگاه به تنهایی پیروز بازی شد!");
      }
      onUpdatePlayer(outcome.eliminatedPlayerId, {
        isAlive: false,
        eliminationReason: outcome.eliminationReason || "judge_verdict",
      });
      audio.playGong();
      handleResetDayVoting();
    }
  };

  const handleMayorVetoAction = (mayorId: string, condemnedId: string) => {
    const outcome = resolveMayorVeto(players, mayorId, condemnedId);
    alert(outcome.log);
    audio.playFlip();
    handleResetDayVoting();
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
    // ریست فلگ گروگان‌گیری برای تمام بازیکنان با شروع روز جدید
    players.forEach(p => onUpdatePlayer(p.id, { isHostaged: false } as any));
    try {
      console.log("[GodDashboard] شروع انتقال به فاز روز...");
      console.log("[GodDashboard DEBUG] مقادیر nightActions در لحظه پردازش:", JSON.stringify(nightActions));
      console.log("[GodDashboard DEBUG] مقادیر incomingNightTargets موجود:", JSON.stringify(incomingNightTargets));
      const currentArmors: Record<string, boolean> = {};
      (players || []).forEach((p) => {
        currentArmors[p.id] = !!p.hasArmor;
      });

      // ۱. حل محاسبات شب در موتور بازی
      let nightResult: any = null;
      try {
        const effectiveActions = {
            ...nightActions,
            guardTargetId: (nightActions as any).guardTargetId || (nightActions as any).bodyguardTargetId,
            bodyguardTargetId: (nightActions as any).bodyguardTargetId || (nightActions as any).guardTargetId,
          };
          nightResult = resolveNight(players, effectiveActions, currentArmors, quotas);
        console.log("[GodDashboard DEBUG] خروجی resolveNight:", JSON.stringify(nightResult?.report));
      } catch (err: any) {
        console.error("[GodDashboard] خطا در resolveNight:", err);
      }

      const updatedPlayers = nightResult?.updatedPlayers || players;
      const report = nightResult?.report || { deaths: [], healed: [], logs: [] };
      const updatedArmors = nightResult?.updatedArmors || currentArmors;
      const updatedQuotas = nightResult?.updatedQuotas;

      if (updatedQuotas) {
        setQuotas(updatedQuotas);
      }

      // ۲. اعمال وضعیت مرگ و سکوت بازیکنان
      if (Array.isArray(updatedPlayers)) {
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
            if (Object.keys(updates).length > 0 && typeof onUpdatePlayer === 'function') {
              console.log("[GodDashboard] فراخوانی onUpdatePlayer برای:", up.name, up.id, updates);
              onUpdatePlayer(up.id, updates);
            }
          }
        });
      }

      // ۳. مدیریت تفنگ‌های اهدا شده تفنگدار
      if (nightActions.gunsmithTargetId && nightActions.gunsmithGunType) {
        const targetP = players.find((p) => p.id === nightActions.gunsmithTargetId);
        if (targetP) {
          const newGun = {
            targetId: targetP.id,
            targetName: targetP.name,
            type: nightActions.gunsmithGunType as "war" | "blank",
            used: false,
          };
          setDayGuns((prev) => {
            const updated = [...prev.filter((g) => g.targetId !== targetP.id), newGun];
            if (network && typeof (network as any).syncDayGuns === 'function') {
              (network as any).syncDayGuns(updated, roomCode);
            }
            return updated;
          });
          if (typeof onUpdatePlayer === 'function') {
            onUpdatePlayer(targetP.id, { 
              gunGiven: nightActions.gunsmithGunType as "war" | "blank",
            });
          }
        }
      }

      // ۴. آماده‌سازی متن شکیل، رسمی و ادبی گزارش صبحگاهی
      const reportAnnouncement: string[] = [];
      const deadList: string[] = Array.isArray(report?.deaths) ? report.deaths : [];

      reportAnnouncement.push("☀️ شهروندان محترم، شب به پایان رسید و شهر چشمان خود را گشود...");

      if (deadList.length === 0 && !report.silencedId) {
        reportAnnouncement.push("🕊️ صبح آرام: دیشب هیچ تیری کارساز نشد و هیچ شهروندی کشته یا سایلنت نگردید.");
      } else {
        if (deadList.length > 0) {
          deadList.forEach((dId) => {
            const dp = players.find((p) => p.id === dId);
            if (dp) {
              reportAnnouncement.push(`🥀 حادثه خونین در شب: متأسفانه «${dp.name}» مورد اصابت قرار گرفت و از بازی خارج شد.`);
            }
          });
        }
        if (report.silencedId) {
          const sp = players.find((p) => p.id === report.silencedId);
          if (sp) {
            reportAnnouncement.push(`🤫 سکوت اجباری: بازیکن «${sp.name}» برای امروز سایلنت است و حق تکلم ندارد.`);
          }
        }
      }

      // ۵. ثبت قطعی استیت‌ها و نمایش پاپ‌آپ گزارش در صفحه اصلی
      setMorningReportText(reportAnnouncement);
      setShowMorningReportModal(true);
      setShowCityInquiry(false);
      setIsNightDeskOpen(false);

      // ۶. پخش ملایم صوت مرتبط
      try {
        if (deadList.length > 0) {
          audio.playShot();
        } else {
          audio.playFlip();
        }
      } catch (audioErr) {
        console.warn("[GodDashboard] Audio play error (safely ignored):", audioErr);
      }

      // ۶.۵. بررسی سلامت بمب‌گذار و ابطال بمب در صورت کشته شدن در شب
      if (activeBomb && activeBomb.bomberId && deadList.includes(activeBomb.bomberId)) {
        console.log("[GodDashboard] بمب‌گذار در شب کشته شده است. بمب باطل شد.");
        setActiveBomb(null);
        network.getSocket()?.emit("bomb:cancel", { roomCode, reason: "bomber_died_at_night" });
      }

      // ۷. تغییر فاز شبکه به روز
      try {
        if (network && typeof (network as any).toggleNightPhase === 'function') {
          (network as any).toggleNightPhase(false);
        }
        if (network && typeof (network as any).setNightStep === 'function') {
          (network as any).setNightStep(null, roomCode);
        }
      } catch (netErr) {
        console.warn("[GodDashboard] Network toggle phase error (safely ignored):", netErr);
      }

      // ۸. ریست اکشن‌های شب
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

      console.log("[GodDashboard] انتقال به فاز روز با موفقیت انجام شد.");
        (network.socket || (network as any).getSocket?.())?.emit('bomb:request_status', { roomCode });
    } catch (globalErr: any) {
      console.error("[GodDashboard] خطای سراسری در دکمه فاز روز:", globalErr);
      alert("خطا در انتقال به روز: " + (globalErr?.message || globalErr));
      // حتی در صورت خطای پیش‌بینی نشده، پنجره گزارش باز و پنل شب بسته شود
      setShowMorningReportModal(true);
      setIsNightDeskOpen(false);
    }
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

          {/* پانل عملیات ویژه نقش‌های روز (کلانتر، قاضی، شهردار) */}
            {(() => {
              const sheriff = alivePlayers.find((p) => p.roleId === "sheriff");
              const judge = null;
              const mayor = alivePlayers.find((p) => p.roleId === "mayor");

              if (!sheriff && !judge && !mayor) return null;

              return (
                <div className="p-3 bg-neutral-950/80 border border-amber-900/40 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-300">⚡ اکشن‌های فعال فاز روز</span>
                    <span className="text-[10px] text-neutral-400">نقش‌های ویژه زنده در بازی</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sheriff && (
                      <button
                        onClick={() => {
                          const targets = alivePlayers.filter((p) => p.id !== sheriff.id);
                          const promptMsg = `🚨 شلیک کلانتر (${sheriff.name}):\nنام یا شماره هدف را وارد کنید:\n\n` +
                            targets.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
                          const input = prompt(promptMsg);
                          if (!input) return;
                          const found = targets.find((p, i) => String(i + 1) === input.trim() || p.name === input.trim() || p.id === input.trim());
                          if (found) handleSheriffShotAction(sheriff.id, found.id);
                          else alert("بازیکن نامعتبر است.");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-950 border border-rose-800 text-rose-200 text-xs font-bold hover:bg-rose-900 transition-all shadow-sm active:scale-95"
                      >
                        🔫 شلیک مستقیم کلانتر ({sheriff.name})
                      </button>
                    )}

                    {judge && (
                      <button
                        onClick={() => {
                          const targets = alivePlayers.filter((p) => p.id !== judge.id);
                          const promptMsg = `⚖️ صدور حکم مستقیم قاضی (${judge.name}):\nنام یا شماره متهم برای خروج فوری را وارد کنید:\n\n` +
                            targets.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
                          const input = prompt(promptMsg);
                          if (!input) return;
                          const found = targets.find((p, i) => String(i + 1) === input.trim() || p.name === input.trim() || p.id === input.trim());
                          if (found) handleJudgeVerdictAction(judge.id, found.id);
                          else alert("بازیکن نامعتبر است.");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-purple-950 border border-purple-800 text-purple-200 text-xs font-bold hover:bg-purple-900 transition-all shadow-sm active:scale-95"
                      >
                        ⚖️ حکم قطعی قاضی ({judge.name})
                      </button>
                    )}

                    {mayor && (
                      <button
                        onClick={() => {
                          if (courtDefendants.length === 0) {
                            alert("در حال حاضر دادگاهی برای اعمال وتو وجود ندارد.");
                            return;
                          }
                          const isSure = confirm(`🏛️ آیا وتوی شهردار (${mayor.name}) اعمال شده و دادگاه جاری بدون خروج منحل شود؟`);
                          if (isSure) handleMayorVetoAction(mayor.id, courtDefendants[0]);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-950 border border-amber-800 text-amber-200 text-xs font-bold hover:bg-amber-900 transition-all shadow-sm active:scale-95"
                      >
                        🏛️ وتوی دادگاه توسط شهردار ({mayor.name})
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

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
                      {courtDefendants.length === 1 ? (
                        <span className="text-amber-400 font-bold">
                          ☀️ دادگاه تک‌متهم (فاز روز): رأی‌گیری علنی با دست انجام می‌شود (حداقل رأی خروج: نصف + ۱). متهم حق رأی ندارد.
                        </span>
                      ) : courtDefendants.length >= 4 ? (
                        <span className="text-sky-400 font-bold">
                          🌙 دادگاه ۴ متهم به بالا (فاز شب): رأی‌گیری مخفی در سکوت شب. متهمان می‌توانند به سایر متهمان رأی دهند. بیشترین رأی خروج می‌یابد (تساوی = عدم خروج).
                        </span>
                      ) : (
                        <span className="text-purple-400 font-bold">
                          🌙 دادگاه ۲ یا ۳ متهم (فاز شب): رأی‌گیری مخفی در سکوت شب. متهمان حق رأی به یکدیگر را ندارند. بیشترین رأی خروج می‌یابد (تساوی = عدم خروج).
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

              {courtDefendants.length >= 2 && (
                <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/80 space-y-3 mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-black text-purple-300">
                        🌙 رأی‌گیری مخفی دادگاه در شب ({courtDefendants.length} متهم)
                      </span>
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
                        کارت کاندیداهای دادگاه روی گوشی بازیکنان واجد شرایط باز می‌شود (هر بازیکن ۱ حق رأی - ضد لو رفتن با لمس نامرئی).
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
                      onClick={handleLaunchCourtNightVote}
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
          {/* صف درخواست و اجرای شلیک تفنگ در فاز روز */}
            {(incomingDayShotRequests.length > 0 || incomingDayShotTargets.length > 0) && (
              <div className="bg-rose-950/40 border border-rose-800 rounded-3xl p-4 shadow-xl space-y-3">
                <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                  🔫 درخواست‌های فعال شلیک روزانه:
                </span>

                {/* ۱. درخواست‌های اولیه برای کشیدن تفنگ */}
                {incomingDayShotRequests.map((req, i) => (
                  <div key={i} className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{req.playerName}</span>
                      <span className="text-[11px] text-amber-400">درخواست کشیدن اسلحه و شلیک دارد</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          network.approveDayShot(req.playerId);
                          setIncomingDayShotRequests(prev => prev.filter(r => r.playerId !== req.playerId));
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md"
                      >
                        اجازه هدف‌گیری 🎯
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          network.cancelDayShot(req.playerId);
                          setIncomingDayShotRequests(prev => prev.filter(r => r.playerId !== req.playerId));
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs cursor-pointer"
                      >
                        رد درخواست ✕
                      </button>
                    </div>
                  </div>
                ))}

                {/* ۲. اهداف نهایی ثبت شده برای تایید گاد */}
                {incomingDayShotTargets.map((shot, i) => {
                  const shooter = players.find(p => p.id === shot.shooterId);
                  const target = players.find(p => p.id === shot.targetId);
                  const registeredGun = dayGuns.find(g => g.targetId === shot.shooterId);
                    const gunType = registeredGun?.type || shooter?.gunGiven || "war";
                  const isWar = gunType === "war";
                  const isArmored = target?.roleId === "armored";
                  const hasArmor = target?.hasArmor !== false;
                  const targetSide = (target?.team === "mafia" || target?.roleId?.includes("mafia") || target?.roleId === "godfather") ? "مافیا 🔴" : "شهروند 🟢";

                  return (
                    <div key={i} className="bg-neutral-900 border-2 border-rose-600 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 text-xs">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="font-black text-white text-sm">
                          💥 شلیک روزانه: <span className="text-amber-400">{shot.shooterName}</span> ──▶ هدف: <span className="text-rose-400 font-bold">{shot.targetName}</span>
                        </span>
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${isWar ? "bg-rose-950 text-rose-300 border border-rose-700" : "bg-sky-950 text-sky-300 border border-sky-700"}`}>
                          {isWar ? "گلوله جنگی 💥" : "گلوله مشقی ⚪"}
                        </span>
                      </div>

                      <div className="text-[11px] text-neutral-300 bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800 flex justify-between items-center">
                        <span>هویت هدف (ویژه گاد): <strong className="text-white font-mono">{targetSide}</strong></span>
                        <span className="text-neutral-400">وضعیت هدف: {target?.isAlive ? "زنده" : "مرده"}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIncomingDayShotTargets(prev => prev.filter(t => t.shooterId !== shot.shooterId));
                            network.cancelDayShot(shot.shooterId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold cursor-pointer"
                        >
                          رد شلیک ✕
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            // ۱. باطل کردن اسلحه شلیک‌کننده
                            onUpdatePlayer(shot.shooterId, { gunGiven: null });
                            network.updatePlayerStatus(shot.shooterId, { gunGiven: null });

                            if (isWar) {
                              // الف) تیر جنگی
                              if (isArmored && hasArmor && target) {
                                // زره‌پوش با زره سالم
                                onUpdatePlayer(target.id, { hasArmor: false });
                                network.updatePlayerStatus(target.id, { hasArmor: false });
                                const msg = `🛡️ «${shot.shooterName}» به «${shot.targetName}» شلیک کرد و تیر جنگی بود! اما چون زره‌پوش بود، فقط زره او افتاد و در بازی ماند.`;
                                  network.broadcastDayGunResult(shot.shooterName, shot.targetName, true, shot.targetId, roomCode);
                                setGodAnnouncementText(msg);
                              } else {
                                // مرگ و خروج از بازی
                                onUpdatePlayer(target.id, { isAlive: false, eliminationReason: "gun_shot" });
                                network.updatePlayerStatus(target.id, { isAlive: false, eliminationReason: "gun_shot" });

                                // باطل شدن تیر مشقی باقیمانده در دست دیگران
                                players.forEach(p => {
                                  if (p.id !== shot.shooterId && p.gunGiven) {
                                    onUpdatePlayer(p.id, { gunGiven: null });
                                    network.updatePlayerStatus(p.id, { gunGiven: null });
                                  }
                                });
                                setDayGuns([]);
                                network.syncDayGuns([], roomCode);

                                const msg = `💥 «${shot.shooterName}» به «${shot.targetName}» شلیک کرد و تیر جنگی بود! «${shot.targetName}» با ساید [${targetSide}] از بازی خارج شد. (تیر مشقی باقیمانده نیز باطل شد 🔥)`;
                                  network.broadcastDayGunResult(shot.shooterName, shot.targetName, true, shot.targetId, roomCode);
                                setGodAnnouncementText(msg);
                              }
                            } else {
                              // ب) تیر مشقی: کسی حذف نمی‌شود و تیر جنگی بازیکن دیگر دست‌نخورده می‌ماند
                                const remainingGuns = dayGuns.filter(g => g.targetId !== shot.shooterId);
                                setDayGuns(remainingGuns);
                                network.syncDayGuns(remainingGuns, roomCode);
                              const msg = `⚪ «${shot.shooterName}» به «${shot.targetName}» شلیک کرد، اما تیر مشقی بود! هیچ بازیکنی حذف نشد و بازی ادامه دارد.`;
                                network.broadcastDayGunResult(shot.shooterName, shot.targetName, false, shot.targetId, roomCode);
                              setGodAnnouncementText(msg);
                            }

                            // حذف ردیف شلیک از صف
                            setIncomingDayShotTargets(prev => prev.filter(t => t.shooterId !== shot.shooterId));
                          }}
                          className={`px-4 py-1.5 rounded-xl text-white font-black text-xs shadow-lg transition-all cursor-pointer ${isWar ? "bg-rose-600 hover:bg-rose-500" : "bg-sky-600 hover:bg-sky-500"}`}
                        >
                          {isWar ? "تایید شلیک جنگی و اخراج بازیکن 💥" : "تایید شلیک مشقی و ادامه بازی ⚪"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* پنل وضعیت تفنگ‌های اهدا شده در فاز روز */}
          {dayGuns.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-800/60 rounded-3xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  🔫 اسلحه‌های فعال در فاز روز (اهدایی تفنگدار):
                </span>
                <span className="text-[10px] text-amber-400/80">برای اعمال شلیک، نوع اسلحه را بررسی کنید</span>
              </div>
              {/* هشدار شلیک هدف‌دار بازیکن */}
              {pendingDayShot && (
                <div className="bg-rose-950/70 border-2 border-rose-500 rounded-2xl p-3 animate-pulse space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-rose-200 flex items-center gap-1.5">
                      ⚠️ «{pendingDayShot.shooterName}» به سمت «{pendingDayShot.targetName}» نشانه رفت!
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${pendingDayShot.gunType === "war" ? "bg-rose-700 text-white" : "bg-sky-700 text-white"}`}>
                      {pendingDayShot.gunType === "war" ? "💥 تیر جنگی (کشنده)" : "💨 تیر مشقی (بی‌اثر)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const isReal = pendingDayShot.gunType === "war";
                        audio.playShot();
                        if (isReal) {
                          network.updatePlayerStatus(pendingDayShot.targetId, { isAlive: false, eliminationReason: "mafia_shot" });
                        }
                        network.broadcastDayGunResult(pendingDayShot.shooterName, pendingDayShot.targetName, isReal, pendingDayShot.targetId, roomCode);
                        setDayGuns(prev => {
                          const updated = prev.map(g => g.targetId === pendingDayShot.shooterId ? { ...g, used: true } : g);
                          network.syncDayGuns(updated, roomCode);
                          return updated;
                        });
                        setPendingDayShot(null);
                      }}
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-1.5 rounded-xl transition-all cursor-pointer shadow-lg"
                    >
                      تایید شلیک نهایی 💥
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDayShot(null)}
                      className="px-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs py-1.5 rounded-xl transition-all cursor-pointer"
                    >
                      رد شلیک ❌
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {dayGuns.map((gun, idx) => (
                  <div key={idx} className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{gun.targetName}</span>
                      <span className={`text-[10px] font-mono ${gun.type === "war" ? "text-rose-400 font-bold" : "text-sky-400"}`}>
                        نوع سلاح: {gun.type === "war" ? "تیر جنگی 💥" : "تیر مشقی 💨"}
                      </span>
                    </div>
                    <div>
                      {gun.used ? (
                        <span className="text-[10px] text-neutral-500 font-bold">شلیک شد ✓</span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-800">
                          مسلح در بازی 🔫
                        </span>
                      )}
                    </div>
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
                    {/* دکمه ۱: مافیا */}
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentActiveNightStep === "mafia" ? null : "mafia";
                        setCurrentActiveNightStep(next);
                        network.setNightStep(next, roomCode);
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

                    {/* دکمه اختصاصی: گروگان‌گیر */}
                     {alivePlayers.some(p => p.roleId === "hostage_taker" || p.roleId === "hostage") && (
                       <button
                         type="button"
                         onClick={() => {
                           const next = currentActiveNightStep === "hostage_taker" ? null : "hostage_taker";
                           setCurrentActiveNightStep(next);
                           network.setNightStep(next, roomCode);
                           if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                         }}
                         className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                           currentActiveNightStep === "hostage_taker"
                             ? "bg-rose-700 text-white shadow-lg ring-2 ring-rose-500"
                             : "bg-rose-950/50 text-rose-300 border border-rose-900/60 hover:bg-rose-900/70"
                         }`}
                       >
                         ⛓️ بیدارباش گروگان‌گیر
                       </button>
                     )}

                     {/* دکمه ۲: دیده‌بان (Watcher) - فقط در صورت حضور در بازی */}
                     {alivePlayers.some(p => p.roleId === "watcher") && (
                     <button
                       type="button"
                       onClick={() => {
                         const next = currentActiveNightStep === "watcher" ? null : "watcher";
                         setCurrentActiveNightStep(next);
                         network.setNightStep(next, roomCode);
                         if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                       }}
                       className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                         currentActiveNightStep === "watcher"
                           ? "bg-amber-600 text-white shadow-lg ring-2 ring-amber-400"
                           : "bg-amber-950/50 text-amber-300 border border-amber-900/60 hover:bg-amber-900/70"
                       }`}
                     >
                       👁️ بیدارباش دیده‌بان (کشیک شب)
                     </button>
                     )}

                     {/* دکمه ۳: محافظ / جان‌فدا (Bodyguard) - فقط در صورت حضور در بازی */}
                     {alivePlayers.some(p => p.roleId === "bodyguard" || p.roleId === "guard") && (
                     <button
                       type="button"
                       onClick={() => {
                         const next = currentActiveNightStep === "bodyguard" ? null : "bodyguard";
                         setCurrentActiveNightStep(next);
                         network.setNightStep(next, roomCode);
                         if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                       }}
                       className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                         currentActiveNightStep === "bodyguard"
                           ? "bg-blue-600 text-white shadow-lg ring-2 ring-blue-400"
                           : "bg-blue-950/50 text-blue-300 border border-blue-900/60 hover:bg-blue-900/70"
                       }`}
                     >
                       🛡️ بیدارباش محافظ (بادیگارد)
                     </button>
                     )}

              {alivePlayers.some(p => p.roleId === "doctor") && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = currentActiveNightStep === "doctor" ? null : "doctor";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next, roomCode);
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

            {alivePlayers.some(p => p.roleId === "doctor_lecter" || p.roleId === "dr_lecter") && (
              <button
                type="button"
                onClick={() => {
                  const next = (currentActiveNightStep === "doctor_lecter" || currentActiveNightStep === "dr_lecter") ? null : "doctor_lecter";
                  setCurrentActiveNightStep(next);
                  network.setNightStep(next, roomCode);
                  if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  (currentActiveNightStep === "doctor_lecter" || currentActiveNightStep === "dr_lecter")
                    ? "bg-emerald-700 text-white shadow-lg ring-2 ring-emerald-500"
                    : "bg-emerald-950/50 text-emerald-300 border border-emerald-900/60 hover:bg-emerald-900/70"
                }`}
              >
                🩺 بیدارباش دکتر لکتر (سیو مافیا)
              </button>
            )}

            {alivePlayers.some(p => p.roleId === "detective") && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = currentActiveNightStep === "detective" ? null : "detective";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next, roomCode);
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

                                     {(() => {
                     const sniperAlive = alivePlayers.find(p => p.roleId === "sniper");
                     if (!sniperAlive) return null;

                     const totalQuota = (typeof getSniperBulletQuota === "function") 
                       ? getSniperBulletQuota(players) 
                       : 2;
                     const usedBullets = (sniperAlive as any).sniperBulletsUsed || 0;
                     const remainingBullets = Math.max(0, totalQuota - usedBullets);
                     const isOutOfBullets = remainingBullets <= 0;

                     return (
                       <button
                         type="button"
                         disabled={isOutOfBullets}
                         onClick={() => {
                           if (isOutOfBullets) return;
                           const next = currentActiveNightStep === "sniper" ? null : "sniper";
                           setCurrentActiveNightStep(next);
                           network.setNightStep(next, roomCode);
                         }}
                         title={isOutOfBullets ? "سهمیه فشنگ اسنایپر به پایان رسیده است" : `فشنگ باقی‌مانده: ${remainingBullets}`}
                         className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                           isOutOfBullets
                             ? "bg-neutral-900/60 border border-neutral-800 text-neutral-600 cursor-not-allowed opacity-60 line-through"
                             : currentActiveNightStep === "sniper"
                             ? "bg-purple-700 text-white shadow-lg ring-2 ring-purple-500 cursor-pointer"
                             : "bg-purple-950/50 text-purple-300 border border-purple-900/60 hover:bg-purple-900/70 cursor-pointer"
                         }`}
                       >
                         {isOutOfBullets 
                           ? "🚫 اسنایپر (۰ فشنگ)" 
                           : `🔫 بیدارباش اسنایپر (${remainingBullets} تیر)`}
                       </button>
                     );
                   })()}

                  {alivePlayers.some(p => p.roleId === "gunsmith") && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = currentActiveNightStep === "gunsmith" ? null : "gunsmith";
                        setCurrentActiveNightStep(next);
                        network.setNightStep(next, roomCode);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        currentActiveNightStep === "gunsmith"
                          ? "bg-amber-600 text-white shadow-lg ring-2 ring-amber-400"
                          : "bg-amber-950/50 text-amber-300 border border-amber-900/60 hover:bg-amber-900/70"
                      }`}
                    onClick={() => {
                      const next = currentActiveNightStep === "gunsmith" ? null : "gunsmith";
                      setCurrentActiveNightStep(next);
                      network.setNightStep(next, roomCode);
                      if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                    }}
                    >
                      🔫 بیدارباش تفنگدار
                    </button>
                  )}

                                      {alivePlayers.some(p => p.roleId === "natasha" || p.roleId === "silencer") && (
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrent = currentActiveNightStep === "natasha" || currentActiveNightStep === "silencer";
                          const targetRole = alivePlayers.find(p => p.roleId === "silencer") ? "silencer" : "natasha";
                          const next = isCurrent ? null : targetRole;
                          setCurrentActiveNightStep(next);
                          network.setNightStep(next, roomCode);
                          if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          currentActiveNightStep === "natasha" || currentActiveNightStep === "silencer"
                            ? "bg-fuchsia-600 text-white shadow-lg ring-2 ring-fuchsia-400"
                            : "bg-fuchsia-950/50 text-fuchsia-300 border border-fuchsia-900/60 hover:bg-fuchsia-900/70"
                        }`}
                      >
                        🤫 بیدارباش ناتاشا
                      </button>
                    )}

                    {alivePlayers.some(p => p.roleId === "bomber") && (
                      <button
                        type="button"
                        onClick={() => {
                          const isCurrent = currentActiveNightStep === "bomber";
                          const next = isCurrent ? null : "bomber";
                          setCurrentActiveNightStep(next);
                          network.setNightStep(next, roomCode);
                          if (currentActiveNightStep === "mafia") network.toggleMafiaChat(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          currentActiveNightStep === "bomber"
                            ? "bg-red-600 text-white shadow-lg ring-2 ring-red-400"
                            : "bg-red-950/50 text-red-300 border border-red-900/60 hover:bg-red-900/70"
                        }`}
                      >
                        💣 بیدارباش بمب‌گذار
                      </button>
                    )}

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentActiveNightStep(null);
                      network.setNightStep(null, roomCode);
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
                          {item.roleId === "detective" ? (() => {
                            const targetPlayer = players.find(p => p.id === item.targetId);
                            const tRole = targetPlayer?.roleId || "";
                            // گادفادر منفی، سایر مافیاها مثبت، شهروندان منفی
                            let isPositive = (tRole !== "godfather"  && (ROLE_MAP[tRole]?.team === "mafia" || isMafiaRoleId(tRole)));
                            if (nightActions.jokerTargetId && nightActions.jokerTargetId === item.targetId) {
                              isPositive = !isPositive;
                            }
                            const calculatedResult = isPositive ? "positive" : "negative";
                            const calculatedText = isPositive ? "مثبت 🟢 (مافیا)" : "منفی ⚪ (شهروند)";

                            return (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-neutral-400 font-bold ml-1">
                                  سیستم: <strong className={isPositive ? "text-emerald-400" : "text-neutral-200"}>{calculatedText}</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    network.sendNightResultToPlayer(item.playerId, `استعلام شما: ${calculatedText}`, calculatedResult);
                                    setNightActions(prev => ({
                                      ...prev,
                                      detectiveInquiryId: item.targetId,
                                      detectiveResult: calculatedResult,
                                    }));
                                    setIncomingNightTargets(prev => prev.filter(t => !(t.playerId === item.playerId && (t.extraType || "war") === (item.extraType || "war"))));
                                    network.setNightStep(null, roomCode);
                                    setCurrentActiveNightStep(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black cursor-pointer shadow-lg"
                                >
                                  تایید و ارسال استعلام ✓
                                </button>
                                <button
                                  type="button"
                                  title="تغییر دستی استعلام به حالت برعکس"
                                  onClick={() => {
                                    const altResult = isPositive ? "negative" : "positive";
                                    const altText = isPositive ? "منفی ⚪ (شهروند)" : "مثبت 🟢 (مافیا)";
                                    network.sendNightResultToPlayer(item.playerId, `استعلام شما: ${altText}`, altResult);
                                    setNightActions(prev => ({
                                      ...prev,
                                      detectiveInquiryId: item.targetId,
                                      detectiveResult: altResult,
                                    }));
                                    setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                    network.setNightStep(null, roomCode);
                                    setCurrentActiveNightStep(null);
                                  }}
                                  className="px-1.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 text-[9px] cursor-pointer"
                                >
                                  معکوس ⇄
                                </button>
                              </div>
                            );
                               })() : item.roleId === "bomber" ? (
                                 <button
                                   type="button"
                                   onClick={() => {
                                     const isSkip = item.isSkip || item.targetId === "skip";
                                     (network.socket || (network as any).getSocket?.())?.emit("bomb:god_confirm", {
                                       roomCode,
                                       bomberId: item.playerId,
                                       targetId: item.targetId,
                                       wires: item.wires,
                                       isSkip
                                     });
                                     setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                     setCurrentActiveNightStep(null);
                                   }}
                                   className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-700 text-red-200 text-[10px] font-bold hover:bg-red-900 cursor-pointer shadow-lg shadow-red-950/40"
                                 >
                                   {item.isSkip || item.targetId === "skip" ? "تایید انصراف بمب‌گذار ✓" : "تایید کارگذاری بمب 💣"}
                                 </button>
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
                                setIncomingNightTargets(prev => prev.filter(t => !(t.playerId === item.playerId && t.targetId === item.targetId)));
                                onUpdatePlayer(item.targetId, { gunGiven: isReal ? "war" : "blank" });
                                network.updatePlayerStatus(item.targetId, { gunGiven: isReal ? "war" : "blank" });
                                network.sendNightResultToPlayer(
                                  item.playerId,
                                  `اسلحه (${isReal ? "جنگی 💥" : "مشقی ⚪"}) با موفقیت به «${item.targetName}» تحویل داده شد ✓`
                                );
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-700 text-amber-200 text-[10px] font-bold hover:bg-amber-900 cursor-pointer"
                            >
                              تایید اهدا اسلحه 🔫
                            </button>
                          ) : (item.roleId === "godfather" || item.roleId === "mafia") ? (
                            <button
                              type="button"
                              onClick={() => {
                                const target2 = item.extraType ? players.find(p => p.id === item.extraType) : null;
                                 setNightActions(prev => ({ ...prev, mafiaShotId: item.targetId, mafiaShotId2: item.extraType || prev.mafiaShotId2 }));
                                setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                network.sendNightResultToPlayer(item.playerId, `شلیک مافیا روی «${item.targetName}» تایید و ثبت شد 💥`);
                                network.toggleMafiaChat(false);
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-red-950 border border-red-700 text-red-200 text-[10px] font-bold hover:bg-red-900 cursor-pointer"
                            >
                              تایید شات مافیا 💥
                            </button>
                          ) : item.roleId === "doctor" ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] text-sky-400 font-bold ml-1">
                                  {item.targetId === item.playerId ? "🛡️ نجات خود پزشک (کسر سهمیه)" : `نجات: ${item.targetName}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNightActions(prev => ({ ...prev, doctorSaveId: item.targetId }));
                                    setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                    network.sendNightResultToPlayer(item.playerId, `انتخاب نجات «${item.targetName}» تایید شد 💉`);
                                    network.setNightStep(null, roomCode);
                                    setCurrentActiveNightStep(null);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-200 text-[10px] font-bold hover:bg-emerald-900 cursor-pointer"
                                >
                                  تایید نجات 💉
                                </button>
                              </div>
) : (item.roleId === "watcher") ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-amber-400 font-bold ml-1">
                                      کشیک دیده‌بان: {item.targetName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNightActions(prev => ({ ...prev, watcherTargetId: item.targetId }));
                                        setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                        network.sendNightResultToPlayer(item.playerId, `کشیک شما روی «${item.targetName}» تایید شد 👁️`);
                                        network.setNightStep(null, roomCode);
                                        setCurrentActiveNightStep(null);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-700 text-amber-200 text-[10px] font-bold hover:bg-amber-900 cursor-pointer shadow-md"
                                    >
                                      تایید کشیک دیده‌بان 👁️
                                    </button>
                                  </div>
                                ) : (item.roleId === "bodyguard" || item.roleId === "guard") ? (
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-blue-400 font-bold ml-1">
                                      محافظت از: {item.targetName}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNightActions(prev => ({ ...prev, bodyguardTargetId: item.targetId, guardTargetId: item.targetId } as any));
                                        setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                        network.sendNightResultToPlayer(item.playerId, `محافظت شما از «${item.targetName}» تایید شد 🛡️`);
                                        network.setNightStep(null, roomCode);
                                        setCurrentActiveNightStep(null);
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-blue-950 border border-blue-700 text-blue-200 text-[10px] font-bold hover:bg-blue-900 cursor-pointer shadow-md"
                                    >
                                      تایید محافظت بادیگارد 🛡️
                                    </button>
                                  </div>
                                                              ) : (item.roleId === "doctor_lecter" || item.roleId === "lecter") ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNightActions(prev => ({ ...prev, doctorLecterSaveId: item.targetId }));
                                setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                network.sendNightResultToPlayer(item.playerId, `سیو لکتر روی «${item.targetName}» ثبت شد 🩺`);
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-950 border border-rose-700 text-rose-200 text-[10px] font-bold hover:bg-rose-900 cursor-pointer"
                            >
                              تایید سیو لکتر 🩺
                            </button>
           ) : item.roleId === "sniper" ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // ۱. حذف فوری کارت از پنل گاد
                                      setIncomingNightTargets(prev => prev.filter((_, i) => i !== idx && prev[i]?.playerId !== item.playerId));

                                      const targetPlayer = players.find(p => p.id === item.targetId);
                                      const isTargetMafia = targetPlayer && (ROLE_MAP[targetPlayer.roleId]?.team === "mafia" || isMafiaRoleId(targetPlayer.roleId) || targetPlayer.roleId === "dr_lecter" || targetPlayer.roleId === "doctor_lecter");
                                      const isTargetGodfather = targetPlayer?.roleId === "godfather";
                                      const isSavedByLecter = nightActions.doctorLecterSaveId === item.targetId;

                                      if (item.targetId === "PASS_ACTION") {
                                        network.sendNightResultToPlayer(item.playerId, "انصراف شما از شلیک ثبت شد ⚪");
                                      } else {
                                        // پیام خنثی برای بازیکن
                                        network.sendNightResultToPlayer(item.playerId, "شلیک شما با موفقیت ثبت شد 🎯");

                                        // کسر قطعی ۱ فشنگ
                                        const sniperP = players.find(p => p.id === item.playerId);
                                        if (sniperP) {
                                          const currentUsed = (sniperP as any).sniperBulletsUsed || 0;
                                          network.updatePlayerStatus(item.playerId, { sniperBulletsUsed: currentUsed + 1 } as any);
                                           if (typeof onUpdatePlayer === 'function') onUpdatePlayer(item.playerId, { sniperBulletsUsed: currentUsed + 1 } as any);
                                        }

                                        // ثبت نتیجه در موتور شب و اطلاع به گاد
                                        if (isTargetGodfather) {
                                          alert("🎯 تیر اسنایپر به پدرخوانده اصابت کرد! جلیقه شکست و زنده می‌ماند. (۱ فشنگ مصرف شد)");
                                          setNightActions(prev => ({ ...prev, sniperShotId: item.targetId }));
                                        } else if (isSavedByLecter) {
                                          alert(`🛡️ مافیای هدف (${item.targetName}) توسط دکتر لکتر نجات پیدا کرد! (۱ فشنگ مصرف شد)`);
                                          setNightActions(prev => ({ ...prev, sniperShotId: item.targetId }));
                                        } else if (isTargetMafia) {
                                          alert(`💥 شلیک اسنایپر به مافیا (${item.targetName}) تایید شد! (۱ فشنگ مصرف شد)`);
                                          setNightActions(prev => ({ ...prev, sniperShotId: item.targetId }));
                                        } else {
                                          alert(`⚠️ اسنایپر به شهروند (${item.targetName}) شلیک کرد! اسنایپر در پایان شب حذف می‌شود.`);
                                          setNightActions(prev => ({ ...prev, sniperSuicide: true, sniperShotId: item.targetId }));
                                        }
                                      }

                                      network.setNightStep(null, roomCode);
                                      setCurrentActiveNightStep(null);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-700 text-indigo-200 text-[10px] font-bold hover:bg-indigo-900 cursor-pointer"
                                  >
                                    تایید شات 🎯
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      // رد/لغو درخواست بدون کسر فشنگ
                                      setIncomingNightTargets(prev => prev.filter((_, i) => i !== idx && prev[i]?.playerId !== item.playerId));
                                      network.sendNightResultToPlayer(item.playerId, "شلیک شما لغو شد و انجام نشد ⚪");
                                      network.setNightStep(null, roomCode);
                                      setCurrentActiveNightStep(null);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    لغو ✕
                                  </button>
                                </div>
                          ) : (item.roleId === "natasha" || item.roleId === "silencer") ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNightActions(prev => ({ ...prev, silencerTargetId: item.targetId }));
                                setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                network.sendNightResultToPlayer(item.playerId, `سکوت روی «${item.targetName}» اعمال شد 🤫`);
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-200 text-[10px] font-bold hover:bg-cyan-900 cursor-pointer"
                            >
                              تایید سایلنت 🤫
                            </button>
                          ) : (item.roleId === "hostage_taker" || item.roleId === "hostage") ? (
                            <button
                              type="button"
                              onClick={() => {
                                setNightActions(prev => ({ ...prev, hostageTargetId: item.targetId }));
                            if (item.targetId) {
                              onUpdatePlayer(item.targetId, { isHostaged: true } as any);
                            }
                                setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                network.sendNightResultToPlayer(item.playerId, `گروگان‌گیری «${item.targetName}» تایید شد ⛓️`);
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-orange-950 border border-orange-700 text-orange-200 text-[10px] font-bold hover:bg-orange-900 cursor-pointer"
                            >
                              تایید گروگان ⛓️
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setIncomingNightTargets(prev => prev.filter(t => t.playerId !== item.playerId));
                                network.sendNightResultToPlayer(item.playerId, `اقدام شما روی «${item.targetName}» ثبت شد ✓`);
                                network.setNightStep(null, roomCode);
                                setCurrentActiveNightStep(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold cursor-pointer"
                            >
                              تایید به بازیکن ✓
                            </button>
                          )}</div>
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
                    <span className="font-bold text-rose-400 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1">🎯 هدف اول شات مافیا:</span>
                    </span>
                    <select
                      value={nightActions.mafiaShotId || ""}
                      onChange={(e) => setNightActions((prev) => ({ ...prev, mafiaShotId: e.target.value || undefined }))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-white text-xs"
                    >
                      <option value="">-- بدون شلیک --</option>
                      {alivePlayers.filter((p) => !isMafiaRoleId(p.roleId)).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>

                    {/* شلیک دوم مافیا در صورت کشته شدن معشوقه */}
                    {players.some(p => (p.roleId === "mistress" || p.roleId === "sweetheart") && !p.isAlive) && (
                      <div className="pt-2 mt-2 border-t border-rose-900/40 space-y-1.5">
                        <span className="text-[11px] font-bold text-rose-300 flex items-center gap-1">
                          💔 انتقام معشوقه (تیر دوم مافیا):
                        </span>
                        <select
                          value={nightActions.mafiaShotId2 || ""}
                          onChange={(e) => setNightActions((prev) => ({ ...prev, mafiaShotId2: e.target.value || undefined }))}
                          className="w-full bg-rose-950/40 border border-rose-800/60 rounded-xl p-2 text-rose-100 text-xs"
                        >
                          <option value="">-- بدون تیر دوم --</option>
                          {alivePlayers.filter((p) => !isMafiaRoleId(p.roleId) && p.id !== nightActions.mafiaShotId).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* ۲. سیو پزشک */}
                {alivePlayers.some(p => p.roleId === "doctor") && (
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
                {alivePlayers.some(p => p.roleId === "dr_lecter" || p.roleId === "doctor_lecter") && (
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
                {(activeNightRoleIds.has("natasha") || activeNightRoleIds.has("silencer")) && (
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
                        {alivePlayers.filter(p => p.roleId !== 'natasha' && p.roleId !== 'silencer' && p.id !== (quotas[players.find(x => x.roleId === 'natasha' || x.roleId === 'silencer')?.id || 'natasha_player']?.lastTargetId)).map((p) => (
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
                    {(player.roleId === 'armored' || player.roleId === 'godfather') && (
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
                network.sendMafiaMessage('god', text);
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
    
      {/* مودال رسمی اعلامیه بلند گرداننده (شلیک و استعلام) */}
      {godAnnouncementText && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 text-right">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-base font-black text-amber-400 flex items-center gap-2">
                📢 متن اعلام گرداننده به اتاق (بلند بخوانید)
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-950 border border-amber-700 text-amber-300 text-[10px] font-bold">
                ویژه گاد
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/50 text-neutral-100 text-sm leading-relaxed font-bold">
              {godAnnouncementText}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setGodAnnouncementText(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                قرائت شد و ادامه بازی ✓
              </button>
            </div>
          </div>
        </div>
      )}
</div>
  );
};