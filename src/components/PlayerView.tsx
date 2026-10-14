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
  cardsDistributed: boolean;
  gameStarted: boolean;
  timer: GameTimer;
  secretVote?: SecretVoteState;
  onJoin: (name: string) => void;
  onToggleReady?: () => void;
}

export const PlayerView: React.FC<PlayerViewProps> = ({
  player,
  cardsDistributed,
  gameStarted,
  timer,
  secretVote,
  onJoin,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [personalNotes, setPersonalNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [hasVoted, setHasVoted] = useState(false);
  const [buzzAlert, setBuzzAlert] = useState<{ message: string; type: string } | null>(null);
  const [isChallengeRequested, setIsChallengeRequested] = useState(false);

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

    const unChallengeDismissed = network.on('challenge_dismissed', (data: any) => {
      if (player && data?.playerId === player.id) {
        setIsChallengeRequested(false);
      }
    });

    return () => {
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
    if (!selectedCandidateId) return;
    network.submitSecretVote(selectedCandidateId);
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
          <button
            onClick={handleTestVibrate}
            className="p-1.5 rounded-lg bg-neutral-950 text-neutral-200 font-medium hover:text-white transition-colors cursor-pointer"
            title="تست صدا و هشدار"
          >
            <Vibrate className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Synchronized Speech Timer Box */}
      <div
        className={`rounded-2xl border p-3 flex items-center justify-between transition-all ${
          timer.seconds <= 10 && timer.isRunning
            ? 'bg-rose-950/40 border-rose-600 shadow-lg shadow-rose-950/40 animate-pulse'
            : 'bg-neutral-900/80 border-neutral-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 ${
              timer.isRunning ? 'text-rose-400 animate-spin' : 'text-neutral-300'
            }`}
          />
          <span className="text-xs text-white font-medium">
            {timer.speakerName ? `نوبت: ${timer.speakerName}` : 'تایمر نوبت صحبت'}
          </span>
        </div>

        <div className="font-mono font-black text-lg text-white">
          {String(Math.floor(timer.seconds / 60)).padStart(2, '0')}:
          {String(timer.seconds % 60).padStart(2, '0')}
        </div>
      </div>

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
      {secretVote && secretVote.isActive && (
        <div className="bg-neutral-900 border-2 border-purple-600 rounded-3xl p-5 shadow-2xl space-y-3.5">
          <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
            <Vote className="w-5 h-5 text-purple-400" />
            <div>
              <h4 className="font-black text-sm text-white">
                🗳️ {secretVote.title || 'رأی‌گیری مخفی شبانه'}
              </h4>
              <p className="text-[11px] text-purple-300">
                رأی شما کاملاً مخفی است و هویت شما برای هیچ بازیکنی آشکار نخواهد شد.
              </p>
            </div>
          </div>

          {hasVoted ? (
            <div className="py-4 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-xs text-emerald-300 font-bold">
                رأی شما با موفقیت و به صورت محرمانه ثبت گردید.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-xs text-neutral-200 font-medium block font-bold">انتخاب گزینه / بازیکن:</span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {secretVote.candidates?.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      selectedCandidateId === candidate.id
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-neutral-950 text-white font-medium border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {candidate.name}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={!selectedCandidateId}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-purple-950/50 active:scale-95 transition-all cursor-pointer"
              >
                ثبت رأی محرمانه
              </button>
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
        /* FOOLPROOF 3D CARD: ZERO TEXT BLEEDING OR OVERLAPPING     */
        /* ========================================================= */
        <div className="space-y-3">
          {/* Top Toggle Button & Indicator */}
          <div className="text-center">
            <button
              onClick={handleFlipCard}
              className="text-xs text-white font-medium hover:text-white px-3.5 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {isFlipped ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-neutral-200 font-medium" />
                  <span>برای بستن و پنهان‌سازی نقش کلیک کنید</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>برای مشاهده نقش محرمانه کلیک کنید</span>
                </>
              )}
            </button>
          </div>

          <div
            onClick={handleFlipCard}
            className="w-full min-h-[480px] cursor-pointer select-none relative"
          >
            {/* Card Flip Transition Wrapper */}
            <div
              className={`relative w-full min-h-[500px] transition-transform duration-700  ${
                isFlipped ? '' : ''
              }`}
            >
              {/* ---------------------------------------------------- */}
              {/* 1. BACK FACE (SECRET CLOSED COVER)                   */}
              {/* Fully hidden when isFlipped is true to stop bleeding */}
              {/* ---------------------------------------------------- */}
              <div
                className={`w-full min-h-[500px] rounded-3xl bg-neutral-950 border-2 border-rose-900/60 shadow-2xl p-6 flex flex-col items-center justify-between overflow-hidden transition-all duration-300 ${
                  isFlipped
                    ? 'opacity-0 pointer-events-none invisible absolute inset-0 hidden'
                    : 'opacity-100 pointer-events-auto visible relative flex'
                }`}
                style={{
                  background: 'linear-gradient(180deg, #18181b 0%, #09090b 50%, #000000 100%)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  display: isFlipped ? 'none' : 'flex',
                }}
              >
                <div className="w-full flex items-center justify-between text-neutral-300 text-[10px] font-mono uppercase tracking-widest relative z-10">
                  <span>MAFIA NOIR</span>
                  <span>CONFIDENTIAL</span>
                </div>

                <div className="flex flex-col items-center gap-3.5 relative z-10 py-6">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-rose-950 via-neutral-900 to-neutral-950 border-2 border-rose-600/40 p-4 shadow-xl shadow-rose-950/60 flex items-center justify-center glow-mafia">
                    <Skull className="w-14 h-14 text-rose-500" />
                  </div>
                  <h4 className="text-xl font-black text-white tracking-wider">
                    کارت محرمانه نقش
                  </h4>
                  <p className="text-xs text-neutral-200 font-medium text-center max-w-[240px] leading-relaxed">
                    فقط زمانی که مطمئنید کسی به صفحه گوشی شما نگاه نمی‌کند لمس کنید
                  </p>
                </div>

                <div className="relative z-10 w-full">
                  <div className="w-full py-3 rounded-2xl bg-rose-950/70 border border-rose-800/60 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-inner">
                    <Sparkles className="w-4 h-4 text-rose-400" />
                    <span>لمس برای باز کردن کارت نقش</span>
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* 2. FRONT FACE (RICH DETAILED ROLE DOSSIER)           */}
              {/* Fully hidden when isFlipped is false to stop bleeding*/}
              {/* ---------------------------------------------------- */}
              <div
                className={`w-full min-h-[500px] rounded-3xl border-2 p-5 flex flex-col justify-between shadow-2xl transition-all duration-300  bg-neutral-950 ${
                  role.team === 'mafia'
                    ? 'border-rose-600/80 glow-mafia'
                    : role.team === 'citizen'
                    ? 'border-sky-500/80 glow-citizen'
                    : 'border-purple-500/80 glow-neutral'
                } ${
                  isFlipped
                    ? 'opacity-100 pointer-events-auto visible relative flex'
                    : 'opacity-0 pointer-events-none invisible absolute inset-0 hidden'
                }`}
                style={{
                  background:
                    role.team === 'mafia'
                      ? 'linear-gradient(180deg, #1c0b11 0%, #09090b 45%, #050505 100%)'
                      : role.team === 'citizen'
                      ? 'linear-gradient(180deg, #0b1522 0%, #09090b 45%, #050505 100%)'
                      : 'linear-gradient(180deg, #180b22 0%, #09090b 45%, #050505 100%)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  display: isFlipped ? 'flex' : 'none',
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

                  <span className="text-[10px] text-neutral-200 font-medium flex items-center gap-1 bg-neutral-900 px-2 py-0.5 rounded-lg border border-neutral-800">
                    <EyeOff className="w-3 h-3 text-neutral-200 font-medium" />
                    <span>لمس = پنهان‌سازی</span>
                  </span>
                </div>

                {/* Role Emblem & Title */}
                <div className="flex flex-col items-center text-center my-3">
                  <div className="w-20 h-20 rounded-2xl bg-neutral-950/90 p-2.5 border border-neutral-800 shadow-xl mb-2 flex items-center justify-center">
                    <RoleIcon roleId={role.id} />
                  </div>

                  <h3 className="text-xl font-black text-white tracking-wide">{role.name}</h3>
                  <span className="text-[11px] font-mono text-neutral-200 font-medium">{role.englishName}</span>

                  <div className="mt-2 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white font-medium font-medium leading-relaxed">
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
                <div className="pt-2 text-center">
                  <div className="w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 font-medium text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors">
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>لمس کارت برای بستن و پنهان‌سازی نقش</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
