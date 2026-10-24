import { getSniperBulletQuota } from "../utils/sniperQuota";
import { MafiaChat, MafiaChatMessage } from "./MafiaChat";
import { BomberAction } from "./night/BomberAction";
import { GuardAction } from "./night/GuardAction";
import React, { useState, useEffect } from 'react';
import { Player, GameTimer, SecretVoteState } from '../types/mafia';
import { ROLE_MAP } from '../data/roles';
import { getMafiaShooter } from '../data/rolesRulesMatrix';
import { RoleIcon } from './RoleIcons';
import { audio } from '../utils/audio';
import { network } from '../services/network';
import {
  Eye,
  EyeOff,
  Clock,
  Shield,
  Skull,
  FileEdit,
  Sparkles,
  Lock,
  Vote,
  Vibrate,
  CheckCircle2,
  Zap,
  Target,
  Lightbulb,
  Trophy,
} from 'lucide-react';

interface PlayerViewProps {
  player: Player | null;
  players?: Player[];
  cardsDistributed: boolean;
  gameStarted: boolean;
  timer: GameTimer;
  secretVote?: SecretVoteState;
  isVoteUnlocked?: boolean;
  onJoin: (name: string) => void;
  onToggleReady?: () => void;
}


const MAFIA_ROLE_IDS = new Set([
  "godfather", "dr_lecter", "doctor_lecter", "saul_goodman", "simple_mafia", "mafia_simple", "mafia",
  "matador", "hostage_taker", "bomber", "natasha", "silencer", "mistress", "sweetheart",
  "burglar", "negotiator", "joker", "ghost_mafia", "ghost", "informant",
  
]);
  const isMafia = (roleId?: string): boolean => Boolean(roleId && ["simple_mafia", "godfather", "dr_lecter", "natasha", "hostage_taker", "bomber", "joker", "negotiator", "mistress"].includes(roleId));

export const PlayerView: React.FC<PlayerViewProps> = ({

  player,
  players = [],
  cardsDistributed,
  gameStarted,
  timer,
  secretVote,
  isVoteUnlocked,
  onJoin,
}) => {
  // معشوقه فقط زمانی مرده محسوب می‌شود که نقشش در بازی بوده و هیچ معشوقه زنده‌ای وجود نداشته باشد
  const hasMistressDied = (() => {
    if (!Array.isArray(players) || players.length === 0) return false;
    const isMistress = (p: any) => p.roleId === "mistress" || p.roleId === "sweetheart";
    const hasAnyMistressInGame = players.some(isMistress);
    const hasAliveMistress = players.some(p => isMistress(p) && p.isAlive);
    return hasAnyMistressInGame && !hasAliveMistress;
  })();

  const [nameInput, setNameInput] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [mafiaChatActive, setMafiaChatActive] = useState(false);
  const [mafiaChatMessages, setMafiaChatMessages] = useState<MafiaChatMessage[]>([]);
  const [isMafiaChatOpen, setIsMafiaChatOpen] = useState(false);
  const [selectedNightTargetId, setSelectedNightTargetId] = useState<string>("");
  const [selectedNightTargetId2, setSelectedNightTargetId2] = useState<string>("");
  const [selectedWarTargetId, setSelectedWarTargetId] = useState("");
  const [selectedBlankTargetId, setSelectedBlankTargetId] = useState("");
  const [gunType, setGunType] = useState<"bullet" | "blank">("bullet");
  const [currentNightRole, setCurrentNightRole] = useState<string | null>(null);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [nightActionSent, setNightActionSent] = useState(false);
  const [nightPhaseActive, setNightPhaseActive] = useState(false);
  const [activeBomb, setActiveBomb] = useState<any>(null);
  const [bombResultBanner, setBombResultBanner] = useState<string | null>(null);
  const [bombTimer, setBombTimer] = useState<number>(15);
  const [nightResultMessage, setNightResultMessage] = useState<{ message: string; resultType?: string; time: string } | null>(null);


  useEffect(() => {
    const sock = network?.socket || (network as any)?.getSocket?.();
    if (!sock) return;

    const handleBombStatus = (data: any) => {
      console.log('[💣 سوکت مستقیم] آپدیت وضعیت بمب:', data?.activeBomb);
      setActiveBomb(data?.activeBomb || null);
      if (data?.resultText) {
        setBombResultBanner(data.resultText);
        setTimeout(() => setBombResultBanner(null), 8000);
      }
    };

    const handleBombTriggered = (data: any) => setActiveBomb(data?.bomb || null);
    const handleBombReset = () => setActiveBomb(null);
    const handleBombExploded = (data: any) => {
      console.log("[💣 کلاینت] انفجار بمب دریافت شد:", data);
      setActiveBomb(null);
      if (data?.victimId === player?.id || (player?.name && data?.victimName === player?.name)) {
        player.isAlive = false;
        player.eliminationReason = "انفجار بمب ساعتی (اتمام زمان)";
        if (activePlayer) {
          activePlayer.isAlive = false;
          activePlayer.eliminationReason = "انفجار بمب ساعتی (اتمام زمان)";
        }
      }
    };

    sock.on('bomb_status_updated', handleBombStatus);
    sock.on('bomb_triggered', handleBombTriggered);
    sock.on('bomb_exploded', handleBombExploded);
    sock.on('bomb_defused', handleBombReset);
sock.on('game_reset', () => {
      console.log('[💣 کلاینت] بازی ریست شد؛ پاکسازی کامل اکشن‌ها و بمب');
      setActiveBomb(null);
      setBombResultBanner(null);
      setBombTimer(15);
      setNightActionDone(false);
      setNightActionSent(false);
      setSelectedNightTargetId("");
    });
    sock.on('game_started', () => {
      setActiveBomb(null);
      setBombResultBanner(null);
      setNightActionDone(false);
      setNightActionSent(false);
      setSelectedNightTargetId("");
    });
    sock.on('game_started', () => {
      setActiveBomb(null);
      setBombResultBanner(null);
      setNightActionDone(false);
      setNightActionSent(false);
      setSelectedNightTargetId("");
    });

    return () => {
      sock.off('bomb_status_updated', handleBombStatus);
      sock.off('bomb_triggered', handleBombTriggered);
      sock.off('bomb_exploded', handleBombExploded);
      sock.off('bomb_defused', handleBombReset);
      sock.off('game_reset', handleBombReset);
    };
  }, [network]);

  // ⏱️ شمارش معکوس ۱۵ ثانیه‌ای خنثی‌سازی بمب
  useEffect(() => {
    if (activeBomb?.status === 'detonating' && activeBomb?.victimId === player?.id) {
      setBombTimer(15);
      const interval = setInterval(() => {
        setBombTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            const rCode = (network as any)?.getRoomCode?.() || (network as any)?.roomCode || '';
            const sock = network?.socket || (network as any)?.getSocket?.();
            sock?.emit('bomb:timeout', { roomCode: rCode });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeBomb?.status, activeBomb?.victimId, player?.id]);
  const [livePlayers, setLivePlayers] = useState<Player[]>([]);
    const [myDayGun, setMyDayGun] = useState<{ type: string; used: boolean } | null>(null);
  const [showGunReceivedModal, setShowGunReceivedModal] = useState<boolean>(false);
  const [showShootModal, setShowShootModal] = useState<boolean>(false);
  const [selectedShootTargetId, setSelectedShootTargetId] = useState<string>("");
  const [gunShotPending, setGunShotPending] = useState<boolean>(false);
  const activePlayer = (livePlayers && player) ? (livePlayers.find(p => p.id === player.id) || player) : player;

  useEffect(() => {
    if (!activePlayer?.gunGiven) {
      setGunShotPending(false);
      setSelectedShootTargetId("");
    }
  }, [activePlayer?.gunGiven]);
  const [gunShotAnnouncement, setGunShotAnnouncement] = useState<{ message: string; isReal: boolean } | null>(null);
  const [doctorSelfSavesUsed, setDoctorSelfSavesUsed] = useState<number>(0);
  const [natashaLastSilencedId, setNatashaLastSilencedId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(`mafia_natasha_last_${player?.id}`) || null;
    } catch {
      return null;
    }
  });
  const [lecterSelfSavesUsed, setLecterSelfSavesUsed] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(`mafia_lecter_self_${player?.id}`) || "0", 10) || 0;
    } catch {
      return 0;
    }
  });
  const [sniperBulletsUsed, setSniperBulletsUsed] = useState<number>(0);

  useEffect(() => {
    const unPlayers = network.on("players_updated", (data: any) => {
      if (Array.isArray(data?.players)) setLivePlayers(data.players);
    });

    const unNotif = network.on("player_notification", (data: any) => {
      console.log("[PlayerView] player_notification received:", data);
      if (data && (!data.targetPlayerId || data.targetPlayerId === player.id)) {
        setNightResultMessage({
          message: data.message,
          resultType: data.resultType,
          time: data.time || new Date().toLocaleTimeString("fa-IR")
        });
      }
    });

    const unNightRes = network.on("night_result_received", (data: any) => {
      console.log("[PlayerView] night_result_received received:", data);
      if (data) {
        setNightResultMessage({
          message: data.message,
          resultType: data.resultType,
          time: data.time || new Date().toLocaleTimeString("fa-IR")
        });
      }
    });

    
    const unDayGuns = network.on("day_guns_updated", (data: any) => {
      if (Array.isArray(data?.guns)) {
        const found = data.guns.find((g: any) => g.targetId === player.id && !g.used);
        if (found) {
          setMyDayGun(found);
          setShowGunReceivedModal(true);
        } else {
          setMyDayGun(null);
        }
      }
    });

    const unShotResult = network.on("day_gun_shot_result", (data: any) => {
      audio.playShot();
      setGunShotAnnouncement({
        message: data.isReal 
          ? `💥 «${data.shooterName}» به «${data.targetName}» شلیک کرد و گلوله جنگی بود!`
          : `💨 «${data.shooterName}» به «${data.targetName}» شلیک کرد اما تیر مشقی بود!`,
        isReal: data.isReal
      });
      setTimeout(() => setGunShotAnnouncement(null), 7000);
    });

    return () => {
      unDayGuns();
      unShotResult();
      unPlayers();
      unNotif();
      unNightRes();
    };
  }, [player?.id]);

  const [hasVoted, setHasVoted] = useState(false);
  const [buzzAlert, setBuzzAlert] = useState<{ message: string; type: string } | null>(null);
  const [isChallengeRequested, setIsChallengeRequested] = useState(false);
  const [voteCountdown, setVoteCountdown] = useState(5);

  useEffect(() => {
    if (isVoteUnlocked) {
      setVoteCountdown(5);
      const timer = setInterval(() => {
        setVoteCountdown(prev => (prev > 1 ? prev - 1 : 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isVoteUnlocked]);
  const [localSeconds, setLocalSeconds] = useState(timer.seconds);

  // Sync localSeconds when timer updates from socket
  useEffect(() => {
    setLocalSeconds(timer.seconds);
  }, [timer.seconds]);

  // Smooth client-side countdown on player's phone
  useEffect(() => {
    let interval: number | null = null;
    if (timer.isRunning) {
      interval = window.setInterval(() => {
        setLocalSeconds((prev) => {
          if (prev <= 1) {
            return 0;
          }
          if (prev <= 5) {
            audio.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning]);

  // Load saved notes
  useEffect(() => {
    const saved = localStorage.getItem('mafia_personal_notes');
    if (saved) setPersonalNotes(saved);
  }, []);

  // Listen to buzz and timer_ended events
  useEffect(() => {
    const unBuzz = network.on('buzz', (data: any) => {
      audio.playWarningBeep();
      setBuzzAlert({
        message: data.message || 'اخطار / بیدارباش از سوی گرداننده!',
        type: data.type || 'warning',
      });
      setTimeout(() => setBuzzAlert(null), 5000);
    });

    const unTimerEnded = network.on('timer_ended', (data: any) => {
      if (!data.speakerId || (player && data.speakerId === player.id)) {
        audio.playWarningBeep();
        setBuzzAlert({
          message: '⏰ وقت شما به پایان رسید!',
          type: 'danger',
        });
        setTimeout(() => setBuzzAlert(null), 6000);
      }
    });

    const unVoteRecorded = network.on('vote_recorded', () => {
      setHasVoted(true);
      audio.playFlip();
    });

    const unChallenges = network.on('challenges_updated', (data: any) => {
      if (Array.isArray(data) && player) {
        setIsChallengeRequested(data.some((r: any) => r.playerId === player.id));
      }
    });

        const unNightStep = network.on("night_step_state", (data: any) => {
      console.log("[PlayerView] دریافت وضعیت نوبت شب:", data, "| نقش من:", player?.roleId, "| شناسه من:", player?.id);
      setCurrentNightRole(data?.role || null);
      setNightActionDone(false);
      setSelectedNightTargetId("");
      if (data?.role) {
        setNightPhaseActive(true);
      }
    });

    const unNightPhase = network.on("night_phase_state", (data: any) => {
      if (typeof data?.active === "boolean") setNightPhaseActive(data.active);
    });
    const unNightToggled = network.on("night_phase_toggled", (data: any) => {
      if (typeof data?.active === "boolean") setNightPhaseActive(data.active);
    });

    const unPlayerNotif = network.on("player_notification", (data: any) => {
      if (player && data?.targetPlayerId === player.id) {
        setNightResultMessage(data);
        audio.playFlip();
      }
    });
    const unNightResult = network.on("night_result_received", (data: any) => {
      if (data?.message) {
        setNightResultMessage(data);
        setNightActionDone(true);
        audio.playFlip();
      }
    });

    const unMafiaChat = network.on("mafia_chat_sync", (data: any) => {
      if (typeof data?.active === "boolean") setMafiaChatActive(data.active);
      if (Array.isArray(data?.messages)) setMafiaChatMessages(data.messages);
    });

    const unMafiaChatState = network.on("mafia_chat_state", (data: any) => {
      if (typeof data?.active === "boolean") setMafiaChatActive(data.active);
    });

    const unChallengeDismissed = network.on('challenge_dismissed', (data: any) => {
      if (player && data?.playerId === player.id) {
        setIsChallengeRequested(false);
      }
    });

    return () => {
      unMafiaChat();
      unMafiaChatState();
      unBuzz();
      unTimerEnded();
      unVoteRecorded();
      unChallenges();
      unChallengeDismissed();
    };
  }, [player]);

  // Reset vote status on new secret vote
  useEffect(() => {
    if (secretVote && secretVote.isActive) {
      setHasVoted(false);
      setSelectedCandidateId('');
    }
  }, [secretVote?.id]);

  const handleNotesChange = (val: string) => {
    setPersonalNotes(val);
    localStorage.setItem('mafia_personal_notes', val);
  };

  const handleRequestChallenge = () => {
    if (!player || !player.isAlive || player.isSilenced || activePlayer?.isSilenced || player.usedDailyChallenge || isChallengeRequested) return;
    audio.playFlip();
    network.requestChallenge(player.id);
    setIsChallengeRequested(true);
  };

  const handleFlipCard = () => {
    audio.playFlip();
    setIsFlipped((prev) => !prev);
  };

  const handleTestVibrate = () => {
    audio.playWarningBeep();
  };

  const handleSubmitVote = () => {
    if (!selectedCandidateId || !player) return;
    network.submitSecretVote(player.id, selectedCandidateId, player.name);
    setHasVoted(true);
  };

  // Fallback name registration screen
  if (!player) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-rose-600 via-rose-900 to-black p-0.5 shadow-xl shadow-rose-950/50 flex items-center justify-center">
            <div className="w-full h-full bg-neutral-950 rounded-[22px] flex items-center justify-center">
              <Skull className="w-10 h-10 text-rose-500" />
            
        

        {!nightPhaseActive && player.roleId === "bomber" && player.isAlive && activeBomb && activeBomb.status === "planted" && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 my-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <p className="text-red-400 text-sm font-bold flex items-center gap-2">
                <span>💣</span> چاشنی فعال بمب کارگذاشته‌شده
              </p>
              <span className="text-xs bg-red-900/60 text-red-200 px-2.5 py-1 rounded-full border border-red-700/50">
                آماده انفجار
              </span>
            </div>
            <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
              بمب با موفقیت کار گذاشته شده است. در صورت تمایل می‌توانید در زمان مناسب فاز روز، چاشنی را فعال کنید تا چالش انتخاب سیم برای قربانی آغاز گردد.
            </p>
            <button
              type="button"
              onClick={() => network.getSocket()?.emit("bomb:trigger", { roomCode })}
              className="w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg transition-all text-xs flex items-center justify-center gap-2"
            >
              <span>💥</span> فعال‌سازی چاشنی بمب
            </button>
          </div>
        )}

        

      
</div>
          
        

        

      
</div>

          <div>
            <h2 className="text-xl font-black text-white">ورود به اتاق بازی مافیا</h2>
            <p className="text-xs text-neutral-200 font-medium mt-1">
              نام خود را وارد کنید تا به بازی متصل شوید.
            </p>
          
        

        

      
</div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nameInput.trim()) {
                onJoin(nameInput.trim());
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="مثال: رضا، علی، مهدی..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-3 text-center font-bold text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
              autoFocus
              maxLength={20}
              required
            />

            <button
              type="submit"
              disabled={!nameInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-rose-950/50 active:scale-95 transition-all cursor-pointer"
            >
              اتصال و ورود به بازی
            </button>
          </form>
        
        

        

      
</div>
      
        

        

      
</div>
    );
  }

  const role = player.roleId ? ROLE_MAP[player.roleId] : null;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-8 dir-rtl text-right select-none">

      {/* 💣 پیام سراسری نتیجه انفجار / خنثی‌سازی */}
      {bombResultBanner && (
        <div className="fixed top-4 inset-x-4 z-50 p-4 rounded-2xl bg-neutral-900 border-2 border-amber-500 shadow-2xl text-center font-black text-sm text-amber-200 animate-bounce">
          {bombResultBanner}
        </div>
      )}

        {/* 💣 دکمه چاشنی فاز روز برای بمب‌گذار */}
        {player?.isAlive && (player?.roleId === 'bomber' || activePlayer?.roleId === 'bomber') && activeBomb && activeBomb.status === 'planted' && (
          <div className="bg-red-950/90 border-2 border-red-500 rounded-2xl p-4 my-3 text-center space-y-3 shadow-2xl shadow-red-950 animate-pulse">
            <div className="text-xs text-red-200 font-black flex items-center justify-center gap-1.5">
              <span>💣</span>
              <span>بمب شما روی «{activeBomb.victimName || 'قربانی'}» آماده انفجار است!</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const rCode = (network as any)?.getRoomCode?.() || (network as any)?.roomCode || '';
                console.log('[💣 کلاینت] ارسال دستور چاشنی bomb:detonate_day به اتاق:', rCode);
                const sock = network.socket || (network as any).getSocket?.();
                sock?.emit('bomb:detonate_day', { roomCode: rCode });
              }}
              className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 text-white font-black text-sm rounded-xl shadow-lg shadow-red-900/60 cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2 border border-red-400"
            >
              <span>💥 کشیدن چاشنی و انفجار بمب!</span>
            </button>
          </div>
        )}

          {/* 💣 مودال همگانی بمب فعال (قربانی با ۳ سیم + سایر بازیکنان با کادر زنده) */}
          {player?.isAlive && activeBomb?.status === "detonating" && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
              {activeBomb?.victimId === player?.id ? (
                /* 🔴 نمای اختصاصی قربانی (دارای ۳ سیم خنثی‌سازی) */
                <div className="bg-neutral-900 border-2 border-red-600 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_50px_rgba(220,38,38,0.6)] animate-pulse">
                  <div className="text-5xl animate-bounce">💣⚠️</div>
                  <div>
                    <h2 className="text-xl font-black text-red-500">بمب در دستان شما فعال شد!</h2>
                    <p className="text-xs text-neutral-300 mt-1 font-medium">
                      تنها یکی از سیم‌ها نجات‌بخش است؛ سریع انتخاب کن!
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2">
                    <div className={`text-4xl font-black font-mono px-6 py-2 rounded-2xl border-2 ${
                      bombTimer <= 5 ? "bg-red-950/90 text-red-500 border-red-600 animate-ping" : "bg-neutral-800 text-amber-400 border-amber-500"
                    }`}>
                      00:{bombTimer < 10 ? `0${bombTimer}` : bombTimer}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1">ثانیه تا انفجار قطعی</span>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const rCode = (network as any)?.getRoomCode?.() || (network as any)?.roomCode || "";
                        const sock = network?.socket || (network as any)?.getSocket?.();
                        sock?.emit("bomb:cut_wire", { roomCode: rCode, wire: "red" });
                      }}
                      className="w-full py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg border-2 border-red-400 cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span>✂️</span>
                      <span>قطع سیم قرمز 🔴</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rCode = (network as any)?.getRoomCode?.() || (network as any)?.roomCode || "";
                        const sock = network?.socket || (network as any)?.getSocket?.();
                        sock?.emit("bomb:cut_wire", { roomCode: rCode, wire: "blue" });
                      }}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg border-2 border-blue-400 cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span>✂️</span>
                      <span>قطع سیم آبی 🔵</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const rCode = (network as any)?.getRoomCode?.() || (network as any)?.roomCode || "";
                        const sock = network?.socket || (network as any)?.getSocket?.();
                        sock?.emit("bomb:cut_wire", { roomCode: rCode, wire: "yellow" });
                      }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-sm rounded-xl shadow-lg border-2 border-yellow-300 cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span>✂️</span>
                      <span>قطع سیم زرد 🟡</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* 🟡 نمای همگانی سایر بازیکنان (کادر هیجانی با نام قربانی و بدون سیم‌ها) */
                <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-[0_0_40px_rgba(245,158,11,0.5)] animate-pulse">
                  <div className="text-5xl animate-bounce">💣⚠️</div>
                  <div className="space-y-1">
                    <span className="inline-block px-3 py-1 bg-red-950/80 border border-red-500/40 rounded-full text-red-400 text-[11px] font-bold">
                      چاشنی انفجار کشیده شد!
                    </span>
                    <h2 className="text-lg font-black text-white pt-2 leading-snug">
                      بمب در دستان <span className="text-red-500 underline underline-offset-4">«{activeBomb?.victimName}»</span> فعال شده است!
                    </h2>
                    <p className="text-xs text-neutral-300 font-medium">
                      او در حال انتخاب یکی از ۳ سیم بمب ساعتی است...
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-2">
                    <div className={`text-4xl font-black font-mono px-6 py-2 rounded-2xl border-2 ${
                      bombTimer <= 5 ? "bg-red-950/90 text-red-500 border-red-600 animate-ping" : "bg-neutral-800 text-amber-400 border-amber-500"
                    }`}>
                      00:{bombTimer < 10 ? `0${bombTimer}` : bombTimer}
                    </div>
                    <span className="text-[10px] text-neutral-400 mt-1">ثانیه تا انفجار قطعی</span>
                  </div>

                  <div className="bg-neutral-800/80 border border-neutral-700 rounded-xl p-3 text-xs text-neutral-300 font-semibold">
                    نفس‌ها در سینه حبس شده؛ سرنوشت بازی در دستان «{activeBomb?.victimName}» است!
                  </div>
                </div>
              )}
            </div>
          )}
      {/* Modal شناور استعلام کارآگاه و اعلان‌های شب */}
      {nightResultMessage && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-neutral-900 border-2 border-amber-500 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-3xl shadow-inner">
              {nightResultMessage.resultType === "positive" ? "🟢" : nightResultMessage.resultType === "negative" ? "⚪" : "📩"}
            
        

        

      
</div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-amber-300">
                نتیجه رسمی از سوی گرداننده
              </h3>
              <span className="text-[10px] text-neutral-400 block font-mono">
                {nightResultMessage.time}
              </span>
            
        

        

      
</div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4">
              <p className="text-sm font-bold text-white leading-relaxed">
                {nightResultMessage.message}
              </p>
            
        

        

      
</div>

            <button
              type="button"
              onClick={() => setNightResultMessage(null)}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              متوجه شدم ✓
            </button>
          
        

        

      
</div>
        
        

        

      
</div>
      )}

      
      {/* Real-time Buzz / Alarm Notification Banner */}
      {buzzAlert && (
        <div className="bg-rose-600 text-white p-4 rounded-2xl border-2 border-white shadow-2xl flex items-center justify-between gap-3 animate-bounce">
          <div className="flex items-center gap-2.5">
            <Vibrate className="w-6 h-6 animate-pulse" />
            <span className="font-black text-sm">{buzzAlert.message}</span>
          
        

        

      
</div>
          <button
            onClick={() => setBuzzAlert(null)}
            className="text-xs bg-rose-800 px-2.5 py-1 rounded-lg"
          >
            بستن
          </button>
        
        

        

      
</div>
      )}

      {/* Player Status Top Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center font-black text-white text-sm">
            {player.name.slice(0, 1)}
          
        

        

      
</div>
          <div>
            <h3 className="text-sm font-bold text-white">{player.name}</h3>
            <span className="text-[11px] text-neutral-200 font-medium">
              {player.isAlive ? '🟢 در بازی (زنده)' : '🔴 حذف شده از بازی'}
            </span>
          
        

        

      
</div>
        
        

        

      
</div>

        {/* Badges & Vibration test */}
        <div className="flex items-center gap-1.5">
          {player.isSilenced && (
            <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-800 text-[10px] text-amber-300 font-bold animate-pulse">
              سایلنت 🔇
            </span>
          )}
          {player.hasArmor && (
            <span className="px-2 py-0.5 rounded-md bg-sky-950 border border-sky-800 text-[10px] text-sky-300 font-bold">
              جلیقه‌دار 🛡️
            </span>
          )}
          {activePlayer?.gunGiven && (
            <span className="px-2 py-0.5 rounded-md bg-rose-950 border border-rose-800 text-[10px] text-rose-300 font-bold animate-pulse">
              مسلح 🔫
            </span>
          )}
          <button
            onClick={handleTestVibrate}
            className="p-1.5 rounded-lg bg-neutral-950 text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer"
            title="تست صدا و هشدار"
          >
            <Vibrate className="w-3.5 h-3.5" />
          </button>
        
        

        

      
</div>
      
        

        

      
</div>

      {/* کارت وضعیت فاز شب برای شهروند ساده و نقش‌های فاقد اکشن شبانه */}
        {player.isAlive && nightPhaseActive && (
          player.roleId === "simple_citizen" || 
          player.roleId === "citizen" || 
          (!["godfather", "dr_lecter", "doctor_lecter", "simple_mafia", "mafia", "detective", "doctor", "hostage_taker", "sniper", "bodyguard", "guard", "bodyguard", "guard", "gunsmith", "silencer"].includes(player.roleId))
        ) && !(currentNightRole && ((currentNightRole === player.roleId || ((currentNightRole === "bodyguard" || currentNightRole === "guard") && (player.roleId === "bodyguard" || player.roleId === "guard"))) || (currentNightRole === "mafia" && isMafia(player.roleId) && (getMafiaShooter(livePlayers.length ? livePlayers : players)?.id === player.id || !getMafiaShooter(livePlayers.length ? livePlayers : players))))) && (
          <div className="rounded-2xl border border-indigo-900/40 bg-gradient-to-b from-indigo-950/30 to-black/60 p-4 space-y-2 text-center shadow-lg">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-900/40 border border-indigo-700/50 text-indigo-300 text-lg mb-1 animate-pulse">
              🌙
            
        

        

      
</div>
            <h4 className="text-xs font-black text-indigo-200">شهر در سکوت شب فرو رفته است</h4>
            <p className="text-[11px] leading-relaxed text-neutral-400">
              چشمان خود را ببندید و در آرامش بمانید. به عنوان <strong className="text-sky-300">شهروند ساده</strong>، سرنوشت شما در استدلال‌ها و تصمیمات روز رقم خواهد خورد.
            </p>
            <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-indigo-400/80 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              منتظر طلوع صبح و اعلام گرداننده باشید...
            
        

        

      
</div>
          
        

        

      
</div>
        )}

        {/* پیام راهنما برای اعضای مافیا که تیرانداز امشب نیستند */}
        {player.isAlive && currentNightRole === "mafia" && isMafia(player.roleId) && getMafiaShooter(players)?.id !== player.id && (
          <div className="rounded-2xl border border-rose-950 bg-gradient-to-r from-rose-950/40 to-neutral-900/60 p-3.5 space-y-1.5 shadow-lg mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                🔫 تیرانداز امشب تیم: <span className="text-amber-300 underline font-extrabold">{getMafiaShooter(players)?.name || "تعیین‌نشده"}</span>
              </span>
              <span className="text-[10px] bg-rose-950/80 text-rose-300 border border-rose-800/60 px-2 py-0.5 rounded-full font-bold">
                همفکری در چت
              </span>
            
        

        

      
</div>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              شلیک نهایی توسط سرتیم انجام می‌شود. هدف پیشنهادی خود را در چت تیمی زیر مطرح کنید.
            </p>
          
        

        

      
</div>
        )}

      {/* --- پاپ‌آپ اخطار به بازیکن گروگان گرفته شده --- */}
      {player.isAlive && nightPhaseActive && Boolean(currentNightRole) && Boolean((player as any)?.isHostaged) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-rose-950 to-neutral-950 border border-rose-600 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-500/80 mx-auto flex items-center justify-center text-3xl shadow-inner animate-pulse">
              ⛓️
            </div>
            <h3 className="text-lg font-black text-white">شما به گروگان گرفته شده‌اید!</h3>
            <p className="text-xs text-rose-200/90 leading-relaxed font-bold">
              امشب توسط گروگان‌گیر مافیا در بند کشیده شدید؛ بنابراین تمام توانایی‌ها و ارتباط شبانه شما مسدود شده است.
            </p>
            <button
              type="button"
              onClick={() => {
                setNightActionDone(true);
                setCurrentNightRole(null);
              }}
              className="w-full py-3 rounded-2xl bg-rose-600 text-white font-extrabold text-sm shadow-lg hover:bg-rose-500 active:scale-95 transition-all"
            >
              متوجه شدم (خوابیدن تا صبح) 💤
            </button>
          </div>
        </div>
      )}
      
        {/* --- اکشن شلیک تفنگ در فاز روز (دادگاه) --- */}
        {!nightPhaseActive && myDayGun && !myDayGun.used && player.isAlive && (
          <div className="bg-orange-950/60 border border-orange-500/80 p-4 rounded-2xl my-4 shadow-2xl animate-fade-in text-right">
            <div className="flex items-center justify-between border-b border-orange-800/60 pb-2 mb-3">
              <span className="text-xs font-black text-orange-200">شما دارای اسلحه هستید!</span>
              <span className="text-base">🔫</span>
            </div>
            <p className="text-[11px] text-orange-300/90 mb-3 leading-relaxed">
              تفنگ‌دار به شما یک قبضه سلاح تحویل داده است. در طول فاز روز و دادگاه می‌توانید یک بازیکن را نشانه بگیرید:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                id="gunDayTarget"
                className="flex-1 bg-black/80 border border-orange-800/80 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- انتخاب هدف شلیک --</option>
                {players.filter(p => p.isAlive && p.id !== player.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const sel = document.getElementById("gunDayTarget") as HTMLSelectElement;
                  const tid = sel?.value;
                  if (!tid) {
                    alert("لطفاً ابتدا یک هدف برای شلیک انتخاب کنید.");
                    return;
                  }
                  const sock = (network as any)?.getSocket?.() || (network as any)?.socket;
                  const rCode = (network as any)?.roomCode || (network as any)?.getRoomCode?.() || "";
                  sock?.emit("gun:shoot", { roomCode: rCode, shooterId: player.id, targetId: tid });
                  setMyDayGun(prev => prev ? { ...prev, used: true } : null);
                }}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                💥 شلیک در دادگاه
              </button>
            </div>
          </div>
        )}

        {/* Night Action Selector & In-game Feedback for Player */}
      {/* --- اکشن‌های شب بمب‌گذار و تفنگ‌دار --- */}
        {player.isAlive && player.roleId === "bomber" && nightPhaseActive && currentNightRole === "bomber" && !nightActionDone && (
          <BomberAction
            socket={network?.getSocket?.() || null}
            roomCode={(network as any)?.getRoomCode?.() || (network as any)?.roomCode || ""}
            currentPlayerId={player?.id || ""}
            players={Object.fromEntries(
              ((Array.isArray(livePlayers) && livePlayers.length > 0 ? livePlayers : Array.isArray(players) ? players : [])).map(p => [p.id, p])
            )}
            onActionCompleted={() => setNightActionDone(true)}
          />
        )}
          {/* --- اکشن شب محافظ / جان‌فدا (بادیگارد) --- */}
          {player.isAlive && (player.roleId === "bodyguard" || player.roleId === "guard") &&
           (currentNightRole === "bodyguard" || currentNightRole === "guard") && (
             <GuardAction
               players={Array.isArray(livePlayers) && livePlayers.length > 0 ? livePlayers : Array.isArray(players) ? players : []}
               myPlayerId={player.id}
               roomCode={(network as any)?.getRoomCode?.() || (network as any)?.roomCode || ""}
               lastGuardedId={(player as any).lastGuardedId || null}
               onActionCompleted={() => setNightActionDone(true)}
             />
          )}

          {player.roleId === "gunsmith" && currentNightRole === "gunsmith" && (
          <GunsmithAction 
            socket={network.getSocket()} 
            roomCode={(network as any)?.getRoomCode?.() || (network as any)?.roomCode || ""} 
            currentPlayerId={player.id} 
            players={Object.fromEntries(players.map(p => [p.id, p]))} 
            onActionCompleted={() => setNightActionDone(true)} 
          />
        )}
        
        {/* مخفی کردن منوی پیش‌فرض برای این دو نقش */}
        {((player.roleId !== "bomber" && player.roleId !== "gunsmith") || (currentNightRole === "mafia" && isMafia(player.roleId))) && player.isAlive && !nightActionDone && Boolean(player.roleId) && (
          (currentNightRole === "mafia" && isMafia(player.roleId) && (getMafiaShooter(livePlayers.length ? livePlayers : players)?.id === player.id || !getMafiaShooter(livePlayers.length ? livePlayers : players))) ||
          ((currentNightRole === "doctor_lecter" || currentNightRole === "dr_lecter") && (player.roleId === "doctor_lecter" || player.roleId === "dr_lecter")) ||
          (currentNightRole && currentNightRole === player.roleId)
        ) && (
          <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-3.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
                {currentNightRole === "mafia"
                  ? "💥 انتخاب هدف شلیک شبانه مافیا"
                  : (player.roleId === "hostage_taker" || player.roleId === "hostage")
                        ? livePlayers.filter(p => p.isAlive && p.id !== player.id).map(p => (
                            <option key={p.id} value={p.id}>⛓️ {p.name}</option>
                          ))
                        : (player.roleId === "doctor_lecter" || player.roleId === "dr_lecter")
                  ? "🩺 نجات شبانه یار مافیا (دکتر لکتر)"
                  : player.roleId === "godfather"
                  ? "💥 انتخاب هدف شلیک مافیا (پدرخوانده)"
                  : player.roleId === "detective"
                  ? "🔍 استعلام شبانه هویت (کارآگاه)"
                  : player.roleId === "sniper"
                  ? "🎯 شلیک شبانه تک‌تیرانداز"
                  : "🌙 انتخاب هدف شبانه (ارسال مستقیم به گرداننده)"}
              </span>
              {player.roleId === "sniper" && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-amber-500/40 text-[11px] font-bold text-amber-300">
                  <span>سهمیه فشنگ:</span>
                  <span className="tracking-widest">
                    {(() => {
                      const total = getSniperBulletQuota(players && players.length ? players : livePlayers);
                      const used = (activePlayer as any)?.sniperBulletsUsed ?? sniperBulletsUsed ?? 0;
                      const rem = Math.max(0, total - used);
                      return "🟡".repeat(rem) + "⚪".repeat(Math.max(0, total - rem));
                    })()}
                  </span>
                
        

        

      
</div>
              )}

              {(player.roleId === "doctor_lecter" || player.roleId === "dr_lecter") && currentNightRole !== "mafia" && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-900 border border-rose-500/40 text-[11px] font-bold text-rose-300">
                  <span>سهمیه نجات خود:</span>
                  <span className="tracking-wider">
                    {((activePlayer as any)?.lecterSelfSavesUsed ?? lecterSelfSavesUsed) >= 1 ? "⚪ (مصرف شد)" : "🟢 ۱/۱"}
                  </span>
                
        

        

      
</div>
              )}
              {nightActionSent && (
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                  ✓ در انتظار تایید گاد
                </span>
              )}
            
        

        

      
</div>

            {/* انتخاب‌های اختصاصی تفنگدار: دو کادر همزمان جنگی و مشقی */}
            {player.roleId === "gunsmith" && (
              <div className="space-y-3 pb-2 border-b border-purple-900/40 mb-3">
                <span className="text-[11px] text-purple-300 font-bold block">
                  توزیع همزمان اسلحه‌ها (جنگی و مشقی):
                </span>
                <div className="space-y-1">
                  <label className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                    💥 دریافت‌کننده تیر جنگی:
                  </label>
                  <select
                    value={selectedWarTargetId}
                    onChange={(e) => setSelectedWarTargetId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl p-2 outline-none focus:border-rose-500"
                  >
                    <option value="">-- عدم اهدا یا انتخاب بازیکن --</option>
                    {players?.filter(p => p.isAlive && p.id !== player.id && (currentNightRole === "mafia" ? !isMafia(p.roleId) : true)).map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.id === player.id ? " (خودم)" : ""}</option>
                    ))}
                  </select>
                
        

        

      
</div>

                <div className="space-y-1">
                  <label className="text-[10px] text-sky-400 font-bold flex items-center gap-1">
                    💨 دریافت‌کننده تیر مشقی:
                  </label>
                  <select
                    value={selectedBlankTargetId}
                    onChange={(e) => setSelectedBlankTargetId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 text-white text-xs rounded-xl p-2 outline-none focus:border-sky-500"
                  >
                    <option value="">-- عدم اهدا یا انتخاب بازیکن --</option>
                    {players?.filter(p => p.isAlive && p.id !== selectedWarTargetId).map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                
        

        

      
</div>
              
        

        

      
</div>
            )}

            {/* وضعیت اتمام فشنگ اسنایپر */}
            {player.roleId === "sniper" && (() => {
              const totalB = getSniperBulletQuota(players && players.length ? players : livePlayers);
              const usedB = (activePlayer as any)?.sniperBulletsUsed ?? sniperBulletsUsed ?? 0;
              return totalB - usedB <= 0;
            })() ? (
              <div className="p-3 rounded-xl bg-neutral-900/80 border border-amber-600/30 text-center">
                <span className="text-xs text-amber-300 font-bold block">⚪ تمامی فشنگ‌های شما مصرف شده است.</span>
                <span className="text-[10px] text-neutral-400 mt-1 block">امکان شلیک در شب‌های بعدی وجود ندارد.</span>
              
        

        

      
</div>
            ) : null}

            {/* انتخاب هدف برای سایر نقش‌ها (کارآگاه، پزشک، مافیا و ...) */}
            {player.roleId !== "gunsmith" && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedNightTargetId}
                  onChange={(e) => {
                    setSelectedNightTargetId(e.target.value);
                    setNightActionSent(false);
                  }}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-600"
                >
                  <option value="">-- انتخاب بازیکن هدف --</option>
                    {player.roleId === "sniper" && (
                      <option value="PASS_ACTION" className="text-amber-400 font-bold">⚪ امشب شلیک نمی‌کنم (انصراف و حفظ تیر)</option>
                    )}
                  {currentNightRole === "mafia"
                      ? livePlayers.filter(p => p.isAlive && !isMafia(p.roleId)).map(p => (
                          <option key={p.id} value={p.id}>🎯 {p.name} (هدف شلیک مافیا)</option>
                        ))
                      : (player.roleId === "doctor_lecter" || player.roleId === "dr_lecter")
                      ? (() => {
                          const usedLecterSelf = (activePlayer as any)?.lecterSelfSavesUsed ?? lecterSelfSavesUsed;
                          const canSelfSave = usedLecterSelf < 1;
                          return livePlayers
                            .filter(p => p.isAlive && ((isMafia(p.roleId) && p.id !== player.id) || (p.id === player.id && canSelfSave)))
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.id === player.id ? `🛡️ ${p.name} (خودم - باقی‌مانده: ${1 - usedLecterSelf})` : `🛡️ ${p.name} (یار مافیا)`}
                              </option>
                            ));
                        })()
                      : (() => {
                        const totalCount = livePlayers.length || players?.length || 10;
                        const maxSelf = (typeof getDoctorMaxSelfSaves === "function") ? getDoctorMaxSelfSaves(totalCount) : (totalCount >= 16 ? 3 : totalCount >= 11 ? 2 : 1);
                        const canSelfSave = player.roleId === "doctor" && doctorSelfSavesUsed < maxSelf;

                        return livePlayers
                          .filter(p => p.isAlive && (p.id !== player.id || canSelfSave))
                          .map(p => (
                            <option key={p.id} value={p.id}>
                              {p.id === player.id ? `🛡️ ${p.name} (خودم - باقی‌مانده: ${maxSelf - doctorSelfSavesUsed})` : p.name}
                            </option>
                          ));
                      })()}
                </select>

              {currentNightRole === "mafia" && hasMistressDied && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/60">
                  <span className="text-[11px] font-bold text-rose-300 block mb-1">
                    💔 انتقام معشوقه (تیر دوم مافیا):
                  </span>
                  <select
                    value={selectedNightTargetId2}
                    onChange={(e) => {
                      setSelectedNightTargetId2(e.target.value);
                      setNightActionSent(false);
                    }}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-rose-600"
                  >
                    <option value="">-- بدون تیر دوم --</option>
                    {livePlayers
                      .filter((p) => p.isAlive && !isMafia(p.roleId) && p.id !== selectedNightTargetId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          🎯 {p.name} (تیر دوم)
                        </option>
                      ))}
                  </select>
                </div>
              )}
              
        

        

      
</div>
            )}

            {/* دکمه ارسال اکشن شب */}
            <button
              type="button"
              disabled={nightActionSent || (player.roleId === "sniper" && (getSniperBulletQuota(players && players.length ? players : livePlayers) - ((activePlayer as any)?.sniperBulletsUsed ?? sniperBulletsUsed ?? 0) <= 0)) || (player.roleId === "gunsmith" ? (!selectedWarTargetId && !selectedBlankTargetId) : !selectedNightTargetId)}
              onClick={() => {
                if (player.roleId === "gunsmith") {
                  network.sendGunsmithTargets(player.id, selectedWarTargetId || undefined, selectedBlankTargetId || undefined);
                } else {
                  if (!selectedNightTargetId) return;
                  const actionRoleToSend = currentNightRole === "hostage_taker" || player.roleId === "hostage_taker" ? "hostage_taker" : (currentNightRole === "mafia" ? "mafia" : (player.roleId === "dr_lecter" ? "doctor_lecter" : ((player.roleId === "natasha" || player.roleId === "silencer") ? "natasha" : (player.roleId || ""))));
                  if ((player.roleId === "doctor_lecter" || player.roleId === "dr_lecter") && currentNightRole !== "mafia" && selectedNightTargetId === player.id) {
                      setLecterSelfSavesUsed(prev => {
                        const nextVal = prev + 1;
                        try { localStorage.setItem(`mafia_lecter_self_${player?.id}`, String(nextVal)); } catch {}
                        return nextVal;
                      });
                    }
                    if (player.roleId === "doctor" && selectedNightTargetId === player.id) {
                      setDoctorSelfSavesUsed(prev => prev + 1);
                    }
                    if ((player.roleId === "doctor_lecter" || player.roleId === "dr_lecter") && currentNightRole !== "mafia" && selectedNightTargetId === player.id) {
                      setLecterSelfSavesUsed(prev => {
                        const nextVal = prev + 1;
                        try { localStorage.setItem(`mafia_lecter_self_${player?.id}`, String(nextVal)); } catch {}
                        return nextVal;
                      });
                    }
                    if (player.roleId === "doctor" && selectedNightTargetId === player.id) {
                      setDoctorSelfSavesUsed(prev => prev + 1);
                    }
                    network.sendNightTarget(player.id, actionRoleToSend, selectedNightTargetId, selectedNightTargetId2 || undefined);
                }
                setNightActionSent(true);
                audio.playFlip();
              }}
              className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer w-full"
            >
              {nightActionSent ? "درخواست ارسال شد (منتظر تایید گاد...) ⏳" : "ثبت و ارسال به گرداننده ✉️"}
            </button>
          
        

        

      
</div>
        )}

        {/* Gunsmith Action Box for Player Card in Day Phase */}
      {activePlayer?.isAlive && activePlayer?.gunGiven && (
        <div className="rounded-2xl border-2 border-rose-600/70 bg-rose-950/40 p-3.5 shadow-xl space-y-2.5 animate-in fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
              🔫 شما توسط تفنگدار مسلح شده‌اید!
            </span>
            <span className="text-[10px] text-rose-400 font-bold">فاز روز</span>
          
        

        

      
</div>
          <p className="text-[11px] text-neutral-300 leading-relaxed">
            شما یک اسلحه در اختیار دارید. می‌توانید در فاز روز شلیک خود را از طریق اعلام به گرداننده یا کلیک روی دکمه شلیک انجام دهید.
          </p>
          <div className="pt-2 border-t border-rose-900/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-300 font-bold">🎯 هدف شلیک را انتخاب کنید:</span>
              <span className="text-[10px] text-neutral-400">
                {gunShotPending ? "در حال انتظار برای تایید گاد..." : "وضعیت: آماده مسلح"}
              </span>
            
        

        

      
</div>
            
            <div className="flex items-center gap-2">
              <select
                disabled={gunShotPending}
                value={selectedShootTargetId}
                onChange={(e) => setSelectedShootTargetId(e.target.value)}
                className="flex-1 bg-neutral-900 border border-rose-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 disabled:opacity-50"
              >
                <option value="">-- انتخاب بازیکن هدف --</option>
                {(livePlayers?.length ? livePlayers : players)
                  .filter((p) => p.isAlive && p.id !== player.id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>

              <button
                type="button"
                disabled={!selectedShootTargetId || gunShotPending}
                onClick={() => {
                  const targetP = (livePlayers?.length ? livePlayers : players).find((p) => p.id === selectedShootTargetId);
                  if (!targetP) return;
                  if (confirm(`آیا از نشانه رفتن و شلیک به سمت «${targetP.name}» اطمینان دارید؟`)) {
                    network.submitDayShotTarget(player.id, player.name, targetP.id, targetP.name);
                    setGunShotPending(true);
                    audio.playShot();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                {gunShotPending ? "ارسال شد ⏳" : "شلیک به هدف 💥"}
              </button>
            
        

        

      
</div>
            {gunShotPending && (
              <p className="text-[10px] text-amber-300 animate-pulse text-center">
                درخواست شلیک شما به گرداننده ارسال شد و روی صفحه او نمایش داده شده است.
              </p>
            )}
          
        

        

      
</div>
        
        

        

      
</div>
      )}

      {/* Synchronized Speech Timer Box for Mobile */}
      {(() => {
        const isMyTurn = Boolean(timer.speakerId && player && timer.speakerId === player.id);
        const timerTypeLabels: Record<string, string> = {
          speech: 'نوبت صحبت',
          challenge: 'چالش',
          defense: 'دفاعیه',
          voting: 'رأی‌گیری',
        };
        const typeLabel = timer.timerType ? timerTypeLabels[timer.timerType] || 'صحبت' : 'صحبت';
        const isCritical = localSeconds <= 10 && timer.isRunning;

        return (
          <div
            className={`rounded-2xl border-2 p-3.5 transition-all shadow-xl overflow-hidden relative ${
              isCritical
                ? 'bg-rose-950/70 border-rose-500 shadow-rose-950/50 animate-pulse'
                : isMyTurn
                ? 'bg-amber-950/40 border-amber-500 shadow-amber-950/30'
                : timer.isRunning
                ? 'bg-neutral-900 border-neutral-700'
                : 'bg-neutral-900/80 border-neutral-800'
            }`}
          >
            {/* Top row: Status and Speaker info */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Clock
                  className={`w-4 h-4 ${
                    timer.isRunning ? 'text-amber-400 animate-spin' : 'text-neutral-500'
                  }`}
                />
                <div className="text-xs">
                  <span className="text-neutral-400 font-medium ml-1">
                    {typeLabel}:
                  </span>
                  <span
                    className={`font-black ${
                      isMyTurn
                        ? 'text-amber-400 underline decoration-amber-400 decoration-2'
                        : 'text-white'
                    }`}
                  >
                    {isMyTurn
                      ? '🎙️ نوبت صحبت شماست!'
                      : timer.speakerName
                      ? timer.speakerName
                      : 'عمومی / همگانی'}
                  </span>
                
        

        

      
</div>
              
        

        

      
</div>

              {/* Running indicator badge */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    timer.isRunning
                      ? 'bg-emerald-500 animate-ping'
                      : 'bg-neutral-600'
                  }`}
                />
                <span className="text-[10px] font-bold text-neutral-400">
                  {timer.isRunning ? 'در حال شمارش' : 'متوقف'}
                </span>
              
        

        

      
</div>
            
        

        

      
</div>

            {/* Middle row: Large digital timer */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-400 font-medium">
                زمان باقی‌مانده:
              </span>
              <div
                className={`font-mono font-black text-2xl tracking-tight ${
                  isCritical
                    ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                    : timer.isRunning
                    ? 'text-amber-400'
                    : 'text-neutral-300'
                }`}
              >
                {String(Math.floor(localSeconds / 60)).padStart(2, '0')}:
                {String(localSeconds % 60).padStart(2, '0')}
              
        

        

      
</div>
            
        

        

      
</div>

            {/* Bottom progress bar */}
            {timer.isRunning && (
              <div className="w-full bg-neutral-950 rounded-full h-1.5 mt-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${
                    isCritical
                      ? 'bg-rose-500'
                      : isMyTurn
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, (localSeconds / 60) * 100))}%`,
                  }}
                />
              
        

        

      
</div>
            )}
          
        

        

      
</div>
        );
      })()}

      {/* Challenge Button Section */}
      {gameStarted && player.isAlive && (
        <div className="flex justify-center">
          {player.usedDailyChallenge ? (
            <div className="w-full py-2.5 px-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-xs text-neutral-500 font-bold">
              🚫 سهمیه چالش روزانه شما استفاده شده است
            
        

        

      
</div>
          ) : isChallengeRequested ? (
            <div className="w-full py-2.5 px-4 rounded-xl bg-amber-950/40 border border-amber-600/60 text-center text-xs text-amber-300 font-bold flex items-center justify-center gap-2 animate-pulse">
              <span>🙋‍♂️ درخواست چالش شما برای گرداننده ارسال شد (در صف)</span>
            
        

        

      
</div>
          ) : (
            <button
              onClick={handleRequestChallenge}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:scale-95 text-white font-black text-xs shadow-lg shadow-amber-950/40 border border-amber-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>تقاضای نوبت چالش (سهمیه امروز)</span>
            </button>
          )}
        
        

        

      
</div>
      )}

      {/* SECRET NIGHT VOTING PANEL (IF ACTIVE) */}
      {secretVote && secretVote.isActive && player.isAlive && secretVote.targetDefendantId !== player.id && (
        <div className="bg-neutral-950 border-2 border-purple-700/80 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in duration-200 select-none">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Vote className="w-5 h-5 text-purple-400" />
              <div>
                <h4 className="font-black text-sm text-white">
                  🗳️ {secretVote.title || 'رأی‌گیری مخفی شبانه'}
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  حالت شب (Anti-Peek): بدون تغییر نور صفحه
                </p>
              
        

        

      
</div>
            
        

        

      
</div>
            {isVoteUnlocked && (
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-neutral-950 text-xs font-black shadow-lg shadow-amber-500/20 animate-bounce flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                ⏳ مهلت رأی: {voteCountdown} ثانیه
              </span>
            )}
          
        

        

      
</div>

          {(secretVote.isLocked && !isVoteUnlocked) ? (
            <div className="py-8 text-center space-y-2 bg-neutral-900/60 rounded-2xl border border-neutral-800">
              <Lock className="w-8 h-8 text-neutral-500 mx-auto animate-pulse" />
              <p className="text-xs text-neutral-300 font-bold">
                کارت رأی آماده است. منتظر فرمان ۵ ثانیه‌ای گرداننده باشید...
              </p>
            
        

        

      
</div>
          ) : hasVoted ? (
            <div className="py-8 text-center space-y-2 bg-neutral-900/40 rounded-2xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-bold">
                ✓ رأی خروج شما در سکوت ثبت شد. (تا پایان ۵ ثانیه صبر کنید)
              </p>
            
        

        

      
</div>
          ) : (
            <div className="space-y-3">
              {secretVote.candidates && secretVote.candidates.length === 1 ? (
                <button
                  onClick={() => {
                    const cId = secretVote.candidates![0].id;
                    console.log("[VOTE CLICKED] by:", player.name, "for candidate:", cId);
                    setSelectedCandidateId(cId);
                    network.submitSecretVote(player.id, cId, player.name);
                    setHasVoted(true);
                  }}
                  className="w-full py-8 rounded-2xl bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-900 border-2 border-purple-600/60 text-white font-black text-sm shadow-inner transition-none cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <span>لمس برای رأی خروج به «{secretVote.candidates[0].name}»</span>
                  <span className="text-[11px] text-neutral-400 font-normal">(اگر رأی نمی‌دهید، صفحه را لمس نکنید)</span>
                </button>
              ) : (
                <>
                  <span className="text-xs text-neutral-200 font-bold block">برای ثبت فوری رأی، روی نام گزینه لمس کنید:</span>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {secretVote.candidates?.map((candidate) => (
                      <button
                        key={candidate.id}
                        onClick={() => {
                          setSelectedCandidateId(candidate.id);
                          network.submitSecretVote(player.id, candidate.id, player.name);
                          setHasVoted(true);
                        }}
                        className="p-3.5 rounded-xl border bg-neutral-900 text-white font-bold border-purple-700/50 hover:border-purple-500 text-xs cursor-pointer"
                      >
                        رأی به {candidate.name}
                      </button>
                    ))}
                  
        

        

      
</div>
                </>
              )}
            
        

        

      
</div>
          )}
        
        

        

      
</div>
      )}

      {/* Card Section: Waiting vs Distributed */}
      {!cardsDistributed || !role ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4 shadow-xl">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-neutral-950 border border-neutral-800 flex items-center justify-center">
            <Lock className="w-10 h-10 text-neutral-600 animate-bounce" />
          
        

        

      
</div>
          <div>
            <h3 className="text-base font-bold text-white">در انتظار توزیع کارت‌ها...</h3>
            <p className="text-xs text-neutral-200 font-medium mt-1">
              گرداننده بازی هنوز کارت‌ها را پخش نکرده است. به محض توزیع، کارت محرمانه شما ظاهر خواهد شد.
            </p>
          
        

        

      
</div>
        
        

        

      
</div>
      ) : (
        /* ========================================================= */
        /* ========================================================= */
        /* COMPACT ROLE TOGGLE & EXPANDABLE ROLE DOSSIER             */
        /* ========================================================= */
        <div className="space-y-3 mt-6 mb-8">
          {!isFlipped ? (
            <div
              onClick={() => setIsFlipped(true)}
              className="relative w-full h-24 rounded-2xl overflow-hidden border border-neutral-800 hover:border-rose-800/60 active:scale-[0.99] transition-all cursor-pointer shadow-xl flex items-center justify-between p-4 group"
            >
              {/* پس‌زمینه با عکس mafia.jpeg */}
              <div className="absolute inset-0">
                <img src="/images/roles/mafia.jpeg" alt="Mafia Card Back" className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-neutral-950/60" />
              </div>

              <div className="relative z-10 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shadow-inner overflow-hidden">
                  <img src="/images/roles/mafia.jpeg" alt="Icon" className="w-full h-full object-cover" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">کارت نقش محرمانه شما</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/90 border border-rose-800/60 text-rose-300 font-bold">پنهان</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 mt-0.5 font-medium">برای لمس و مشاهده هویت خود کلیک کنید</p>
                </div>
              </div>

              <div className="relative z-10 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs font-bold flex items-center gap-1.5 border border-neutral-700 shadow-md">
                <Eye className="w-4 h-4 text-rose-400" />
                <span>مشاهده</span>
              </div>
            </div>
          ) : (
            <div className="relative w-full min-h-[560px] flex flex-col justify-between rounded-3xl overflow-hidden border border-rose-900/55 shadow-2xl animate-in zoom-in-95 duration-300 bg-neutral-950 p-5">
              {/* عکس به عنوان پس‌زمینه کامل کارت */}
              <div className="absolute inset-0 z-0">
                {role?.image ? (
                  <img src={role.image} alt={role?.name} className="w-full h-full object-cover object-top opacity-75" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-rose-950/40 text-rose-500 text-6xl">🎭</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-neutral-950/40" />
              </div>

              {/* بالا: نام و تیم */}
              <div className="relative z-10 flex justify-between items-start pt-2">
                <div>
                                    {/* نام کارت نقش به صورت بصری مخفی شده تا تداخلی با منطق نقشی ایجاد نکند */}
                    <h2 className="hidden">{role?.name || "نامشخص"}</h2>
                </div>
                <div>
                  <span className={`px-3 py-1.5 rounded-full text-[10px] font-black border shadow-lg backdrop-blur-md ${(role?.team === "mafia" || role?.side === "mafia" || isMafia(player.roleId)) ? "bg-red-950/80 border-red-800 text-red-300" : "bg-blue-950/80 border-blue-800 text-blue-300"}`}>
                    {(role?.team === "mafia" || role?.side === "mafia" || isMafia(player.roleId)) ? "تیم مافیا" : "تیم شهروند"}
                  </span>
                </div>
              </div>

              {/* پایین: کشوی توضیحات و دکمه بستن */}
              <div className="relative z-10 space-y-3 mt-auto pt-6">
                <details className="group bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-neutral-800/80 overflow-hidden transition-all shadow-xl">
                  <summary className="flex items-center justify-between p-3.5 cursor-pointer text-xs font-bold text-neutral-200 hover:text-white select-none">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                      شرح وظایف و نکات استراتژیک نقش
                    </span>
                    <span className="text-neutral-400 group-open:rotate-180 transition-transform duration-300 text-sm">▼</span>
                  </summary>
                    <div className="p-4 pt-2 space-y-3.5 border-t border-neutral-800/80 mt-1 text-right">
                      {/* ۱. شرط پیروزی ساید */}
                      {role?.winningCondition && (
                        <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex items-start gap-2">
                          <span className="text-amber-400 text-sm mt-0.5">🏆</span>
                          <div>
                            <span className="text-[11px] font-black text-amber-300 block">هدف و شرط پیروزی:</span>
                            <p className="text-[11px] text-amber-200/90 mt-0.5 leading-relaxed font-medium">
                              {role.winningCondition}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* ۲. شرح کامل سناریو و وظایف */}
                      <div className="bg-neutral-900/80 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                        <span className="text-[11px] font-black text-neutral-300 flex items-center gap-1.5">
                          <span className="text-rose-400">📜</span> شرح مأموریت و وظایف نقش:
                        </span>
                        <p className="text-xs text-neutral-300 leading-relaxed font-medium pr-1">
                          {role?.description || "توضیحاتی برای این نقش ثبت نشده است."}
                        </p>
                      </div>

                      {/* ۳. توانایی‌ها و اختیارات */}
                      {role?.abilities && role.abilities.length > 0 && (
                        <div className="bg-emerald-950/25 p-3 rounded-xl border border-emerald-900/50 space-y-2">
                          <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                            <span className="text-emerald-400">⚡</span> توانمندی‌ها و قابلیت‌های ویژه:
                          </span>
                          <ul className="space-y-1.5 text-[11px] pr-4 list-disc marker:text-emerald-500 text-emerald-200/90 font-medium">
                            {role.abilities.map((ability, idx) => (
                              <li key={idx} className="leading-relaxed">{ability}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* ۴. نکات استراتژیک و تاکتیک‌های بازی */}
                      {role?.tips && role.tips.length > 0 && (
                        <div className="bg-sky-950/35 p-3 rounded-xl border border-sky-900/50 space-y-2">
                          <span className="text-[11px] font-black text-sky-400 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-sky-400" /> نکات استراتژیک و تکنیک‌های برنده:
                          </span>
                          <ul className="space-y-1.5 text-[11px] pr-4 list-disc marker:text-sky-500 text-sky-200/90 font-medium">
                            {role.tips.map((tip, idx) => (
                              <li key={idx} className="leading-relaxed">{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                </details>

                <button
                  onClick={() => setIsFlipped(false)}
                  className="w-full py-3 rounded-xl bg-rose-950/85 hover:bg-rose-900 border border-rose-800/70 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg backdrop-blur-md"
                >
                  <EyeOff className="w-4 h-4 text-rose-400" />
                  بستن کارت و بازگشت به بازی
                </button>
              </div>
            </div>
          )}
        </div>
        )}
        {/* Personal Notebook */}

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg mt-4">
        <button
          onClick={() => setIsNotesOpen((prev) => !prev)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-white font-medium hover:text-white transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-rose-400" />
            دفترچه یادداشت شخصی من
          </span>
          <span className="text-neutral-300 font-mono text-[11px]">
            {isNotesOpen ? 'بستن ▲' : 'باز کردن ▼'}
          </span>
        </button>

        {isNotesOpen && (
          <div className="p-3 pt-0">
            <textarea
              value={personalNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="نکات خود درباره مظنونین، استعلام‌ها و سرنخ‌ها را اینجا بنویسید (فقط روی گوشی خودتان ذخیره می‌شود)..."
              rows={4}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          
        

        

      
</div>
        )}
      
        

        

      
</div>
    
        

        

      

      {/* چت شبانه اختصاصی مافیا - مینیمال و تاشو */}
      {isMafia(player?.roleId) && (
        <div className="fixed bottom-3 left-3 z-50">
          {!isMafiaChatOpen ? (
            <button
              onClick={() => setIsMafiaChatOpen(true)}
              className="flex items-center gap-2 bg-neutral-900/90 hover:bg-neutral-800 border border-red-700/60 px-3.5 py-2 rounded-full shadow-lg backdrop-blur-md transition-all active:scale-95 text-xs font-bold text-neutral-200 hover:text-white"
            >
              <span className="text-sm">💬</span>
              <span>چت مافیا</span>
              {mafiaChatActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              )}
              {mafiaChatMessages.length > 0 && (
                <span className="bg-red-600/90 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {mafiaChatMessages.length}
                </span>
              )}
            </button>
          ) : (
            <div className="w-[88vw] sm:w-80 max-h-[380px] flex flex-col bg-neutral-950/95 border border-red-600/70 rounded-2xl p-2.5 backdrop-blur-xl shadow-2xl transition-all">
              <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-red-950/80">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💬</span>
                  <span className="text-[11px] font-black text-red-400">گفتگوی مخفی مافیا</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${mafiaChatActive ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' : 'bg-neutral-900 border-neutral-700 text-neutral-400'}`}>
                    {mafiaChatActive ? '🟢 متصل' : '🔒 بسته'}
                  </span>
                </div>
                <button
                  onClick={() => setIsMafiaChatOpen(false)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-y-auto max-h-[290px] text-xs">
                <MafiaChat
                  isActive={mafiaChatActive}
                  messages={mafiaChatMessages}
                  currentUserId={player.id}
                  onSendMessage={(msg) => network.sendMafiaMessage(player.id, msg)}
                />
              </div>
            </div>
          )}
        </div>
      )}

</div>
  );
};
