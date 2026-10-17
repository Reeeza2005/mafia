import { MafiaChat, MafiaChatMessage } from "./MafiaChat";
import React, { useState, useEffect } from 'react';
import { Player, GameTimer, SecretVoteState } from '../types/mafia';
import { ROLE_MAP } from '../data/roles';
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


const MAFIA_ROLE_IDS = new Set(['godfather', 'dr_lecter', 'doctor_lecter', 'saul_goodman', 'simple_mafia', 'mafia_simple', 'matador', 'bomber', 'natasha']);
const isMafia = (roleId?: string) => Boolean(roleId && MAFIA_ROLE_IDS.has(roleId.toLowerCase()));

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
  const [nameInput, setNameInput] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [mafiaChatActive, setMafiaChatActive] = useState(false);
  const [mafiaChatMessages, setMafiaChatMessages] = useState<MafiaChatMessage[]>([]);
  const [selectedNightTargetId, setSelectedNightTargetId] = useState<string>("");
  const [gunType, setGunType] = useState<"bullet" | "blank">("bullet");
  const [currentNightRole, setCurrentNightRole] = useState<string | null>(null);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [nightActionSent, setNightActionSent] = useState(false);
  const [nightPhaseActive, setNightPhaseActive] = useState(false);
  const [nightResultMessage, setNightResultMessage] = useState<{ message: string; resultType?: string; time: string } | null>(null);
  const [livePlayers, setLivePlayers] = useState<Player[]>([]);

  useEffect(() => {
    const unPlayers = network.on("players_updated", (data: any) => {
      if (Array.isArray(data?.players)) setLivePlayers(data.players);
    });
    return () => {
      unPlayers();
    };
  }, []);
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
      setCurrentNightRole(data?.role || null);
      setNightActionDone(false);
      setSelectedNightTargetId("");
    });

    const unNightPhase = network.on("night_phase_state", (data: any) => {
      if (typeof data?.active === "boolean") setNightPhaseActive(data.active);
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
    if (!player || !player.isAlive || player.usedDailyChallenge || isChallengeRequested) return;
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
          {player.gunGiven && (
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

      {/* Night Action Selector & In-game Feedback for Player */}
      {cardsDistributed && player.isAlive && !nightActionDone && (
        (currentNightRole === "mafia" && isMafia(player.roleId) && player.roleId !== "simple_mafia") ||
        (currentNightRole && currentNightRole === player.roleId)
      ) && (
        <div className="rounded-2xl border border-purple-900/60 bg-purple-950/30 p-3.5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-purple-300 flex items-center gap-1.5">
              🌙 انتخاب هدف شبانه (ارسال مستقیم به گرداننده)
            </span>
            {nightActionSent && (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full font-bold">
                ✓ ارسال شد
              </span>
            )}
          </div>

          {player.roleId === "gunsmith" && (
              <div className="flex items-center gap-2 pb-1">
                <span className="text-[11px] text-neutral-300 font-bold">نوع تیر:</span>
                <button
                  type="button"
                  onClick={() => setGunType("bullet")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    gunType === "bullet" ? "bg-red-700 text-white ring-1 ring-red-400" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  جنگی 💥
                </button>
                <button
                  type="button"
                  onClick={() => setGunType("blank")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    gunType === "blank" ? "bg-amber-600 text-white ring-1 ring-amber-300" : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  مشقی ⚪
                </button>
              </div>
            )}

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
              {livePlayers.filter(p => p.id !== player.id && p.isAlive).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedNightTargetId}
              onClick={() => {
                if (!selectedNightTargetId) return;
                network.sendNightTarget(player.id, player.roleId || "", selectedNightTargetId, player.roleId === "gunsmith" ? gunType : undefined);
                setNightActionSent(true);
                audio.playFlip();
              }}
              className="px-3 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black transition-all cursor-pointer shadow-md active:scale-95"
            >
              ارسال به گاد
            </button>
          </div>

          {/* کادر نتیجه و استعلام دریافتی از گاد */}
          {nightResultMessage && (
            <div className="bg-neutral-900/90 border border-amber-600/60 rounded-xl p-3 space-y-1 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                <span>📩 پیام محرمانه گرداننده:</span>
                <span className="text-[10px] text-neutral-500">{nightResultMessage.time}</span>
              </div>
              <p className="text-xs text-neutral-200 font-medium leading-relaxed">
                {nightResultMessage.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gunsmith Action Box for Player Card in Day Phase */}
      {player.isAlive && player.gunGiven && (
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
          <div className="pt-1 flex items-center justify-between border-t border-rose-900/60">
            <span className="text-[10px] text-neutral-400">وضعیت اسلحه: آماده شلیک</span>
            <button
              onClick={() => {
                if (confirm("آیا از شلیک تفنگ خود اطمینان دارید؟")) {
                  network.updatePlayerStatus(player.id, { gunGiven: undefined });
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer"
            >
              ثبت شلیک تفنگ 💥
            </button>
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
        <div className="space-y-3">
          {!isFlipped ? (
            <div
              onClick={handleFlipCard}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 hover:border-rose-800/60 active:scale-[0.99] transition-all cursor-pointer shadow-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shadow-inner">
                  <Lock className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">کارت نقش محرمانه شما</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-300 font-bold">
                      پنهان
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                    هر زمان خواستید نقش خود را مجدداً ببینید لمس کنید
                  </p>
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold flex items-center gap-1.5 border border-neutral-700">
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                <span>مشاهده نقش</span>
              </div>
            </div>
          ) : (
            <div
              onClick={handleFlipCard}
              className="w-full cursor-pointer select-none relative space-y-2.5"
            >
              <div
                className={`w-full rounded-3xl border-2 p-5 flex flex-col justify-between shadow-2xl transition-all duration-300 bg-neutral-950 ${
                  role.team === 'mafia'
                    ? 'border-rose-600/80 glow-mafia'
                    : role.team === 'citizen'
                    ? 'border-sky-500/80 glow-citizen'
                    : 'border-purple-500/80 glow-neutral'
                }`}
                style={{
                  background:
                    role.team === 'mafia'
                      ? 'linear-gradient(180deg, #1c0b11 0%, #09090b 45%, #050505 100%)'
                      : role.team === 'citizen'
                      ? 'linear-gradient(180deg, #0b1522 0%, #09090b 45%, #050505 100%)'
                      : 'linear-gradient(180deg, #180b22 0%, #09090b 45%, #050505 100%)',
                }}
              >
                {/* Header: Team Badge & Hide Button */}
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border shadow-sm ${
                      role.team === 'mafia'
                        ? 'bg-rose-950/90 text-rose-300 border-rose-700/80'
                        : role.team === 'citizen'
                        ? 'bg-sky-950/90 text-sky-300 border-sky-700/80'
                        : 'bg-purple-950/90 text-purple-300 border-purple-700/80'
                    }`}
                  >
                    {role.team === 'mafia' ? '🔴 ساید مافیا' : role.team === 'citizen' ? '🔵 ساید شهروند' : '🟣 ساید مستقل'}
                  </span>

                  <span className="text-[10px] text-rose-300 font-bold flex items-center gap-1 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800/60">
                    <EyeOff className="w-3 h-3 text-rose-400" />
                    <span>بستن و پنهان‌سازی</span>
                  </span>
                </div>

                {/* Role Emblem & Title */}
                <div className="flex flex-col items-center text-center my-3">
                  <div className="w-20 h-20 rounded-2xl bg-neutral-950/90 p-2.5 border border-neutral-800 shadow-xl mb-2 flex items-center justify-center">
                    <RoleIcon roleId={role.id} />
                  </div>

                  <h3 className="text-xl font-black text-white tracking-wide">{role.name}</h3>
                  <span className="text-[11px] font-mono text-neutral-200 font-medium">{role.englishName}</span>

                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white font-medium leading-relaxed">
                    {role.summary}
                  </div>
                </div>

                {/* Comprehensive Details Section */}
                <div className="space-y-2.5 text-right my-1">
                  {/* 1. Full Description & Duties */}
                  <div className="bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800 text-xs text-neutral-200 leading-relaxed">
                    <span className="font-bold text-white block mb-1 text-xs">📋 شرح وظایف و مأموریت:</span>
                    <p className="leading-relaxed text-white font-medium">{role.description}</p>
                  </div>

                  {/* 2. Key Abilities */}
                  {role.abilities && role.abilities.length > 0 && (
                    <div className="bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800 text-xs space-y-1.5">
                      <span className="font-bold text-amber-300 flex items-center gap-1 text-xs">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span>قابلیت‌های ویژه:</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-white font-medium pr-1">
                        {role.abilities.map((ability, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-400 mt-0.5 font-bold">•</span>
                            <span>{ability}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 3. Winning Condition */}
                  {role.winningCondition && (
                    <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 text-xs flex items-start gap-2">
                      <Trophy className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-400 block text-[11px]">شرط پیروزی:</span>
                        <p className="text-[11px] text-white font-medium leading-tight">{role.winningCondition}</p>
                      </div>
                    </div>
                  )}

                  {/* 4. Strategy & Pro Tips */}
                  {role.tips && role.tips.length > 0 && (
                    <div className="bg-neutral-900/80 p-3 rounded-2xl border border-neutral-800 text-xs space-y-1">
                      <span className="font-bold text-sky-300 flex items-center gap-1 text-[11px]">
                        <Lightbulb className="w-3.5 h-3.5 text-sky-400" />
                        <span>نکات استراتژیک بازی با این نقش:</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-neutral-200 font-medium pr-1">
                        {role.tips.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-sky-400 mt-0.5 font-bold">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 5. Night Wake-up Command */}
                  {role.wakeUpText && (
                    <div className="bg-amber-950/30 border border-amber-900/50 p-2.5 rounded-xl text-[11px] text-amber-300 leading-relaxed">
                      🌙 <strong>فرمان شب:</strong> {role.wakeUpText}
                    </div>
                  )}
                </div>

                {/* Bottom Hide Prompt */}
                <div className="pt-3 text-center">
                  <div className="w-full py-2.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800/60 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <EyeOff className="w-4 h-4 text-rose-400" />
                    <span>لمس کارت برای بستن و پنهان‌سازی نقش</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      
      {/* Mafia Night Chat for Mafia Members */}
      {player && isMafia(player.roleId) && mafiaChatActive && (
        <div className="mt-4">
          <MafiaChat
            isGod={false}
            isActive={mafiaChatActive}
            messages={mafiaChatMessages}
            currentUserId={player.id}
            onSendMessage={(text) => network.sendMafiaMessage(player.id, text)}
          />
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
    </div>
  );
};
