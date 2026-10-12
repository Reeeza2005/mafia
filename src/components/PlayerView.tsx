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
  Volume2,
  VolumeX,
  Shield,
  Skull,
  FileEdit,
  Sparkles,
  Lock,
  Vote,
  Vibrate,
  Bell,
  CheckCircle2,
  AlertTriangle,
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
      // If timer ended for this player or general
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

    return () => {
      unBuzz();
      unTimerEnded();
      unVoteRecorded();
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

  // Name registration screen
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
            <p className="text-xs text-neutral-400 mt-1">
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
    <div className="max-w-md mx-auto space-y-4 pb-8">
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
            <span className="text-[11px] text-neutral-400">
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
            className="p-1.5 rounded-lg bg-neutral-950 text-neutral-400 hover:text-white"
            title="تست لرزش و صدا"
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
              timer.isRunning ? 'text-rose-400 animate-spin' : 'text-neutral-500'
            }`}
          />
          <span className="text-xs text-neutral-300">
            {timer.speakerName ? `نوبت: ${timer.speakerName}` : 'تایمر نوبت صحبت'}
          </span>
        </div>

        <div className="font-mono font-black text-lg text-white">
          {String(Math.floor(timer.seconds / 60)).padStart(2, '0')}:
          {String(timer.seconds % 60).padStart(2, '0')}
        </div>
      </div>

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
              <span className="text-xs text-neutral-400 block font-bold">انتخاب گزینه / بازیکن:</span>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {secretVote.candidates?.map((candidate) => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      selectedCandidateId === candidate.id
                        ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {candidate.name}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={!selectedCandidateId}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-40 text-white font-black text-xs shadow-lg shadow-purple-950/50 active:scale-95 transition-all"
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
            <p className="text-xs text-neutral-400 mt-1">
              گرداننده بازی هنوز کارت‌ها را پخش نکرده است. به محض توزیع، کارت محرمانه شما ظاهر خواهد شد.
            </p>
          </div>
        </div>
      ) : (
        /* 3D Flip Card Container */
        <div className="space-y-3">
          <div className="text-center">
            <span className="text-xs text-neutral-400 flex items-center justify-center gap-1.5">
              {isFlipped ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                  برای پنهان کردن نقش، روی کارت ضربه بزنید
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  برای مشاهده نقش، روی کارت ضربه بزنید
                </>
              )}
            </span>
          </div>

          <div
            onClick={handleFlipCard}
            className="perspective-1000 w-full h-[450px] cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full duration-700 transform-style-preserve-3d transition-transform ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* BACK OF CARD (Closed State) */}
              <div className="absolute inset-0 w-full h-full backface-hidden rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-black border-2 border-rose-900/50 shadow-2xl p-6 flex flex-col items-center justify-between overflow-hidden">
                <div className="w-full flex items-center justify-between text-neutral-500 text-[10px] font-mono uppercase tracking-widest relative z-10">
                  <span>MAFIA NOIR</span>
                  <span>CONFIDENTIAL</span>
                </div>

                <div className="flex flex-col items-center gap-3 relative z-10">
                  <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-rose-950 via-neutral-900 to-neutral-950 border-2 border-rose-600/40 p-4 shadow-xl flex items-center justify-center glow-mafia">
                    <Skull className="w-14 h-14 text-rose-500" />
                  </div>
                  <h4 className="text-lg font-black text-white tracking-wider">
                    کارت محرمانه نقش
                  </h4>
                  <p className="text-xs text-neutral-400 text-center max-w-[220px]">
                    فقط زمانی که کسی به صفحه شما نگاه نمی‌کند لمس کنید
                  </p>
                </div>

                <div className="relative z-10 w-full">
                  <div className="w-full py-2.5 rounded-xl bg-rose-950/60 border border-rose-900/60 text-rose-300 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-inner">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    لمس برای مشاهده نقش
                  </div>
                </div>
              </div>

              {/* FRONT OF CARD (Revealed Role Details) */}
              <div
                className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-3xl border-2 p-5 flex flex-col justify-between shadow-2xl overflow-y-auto ${
                  role.team === 'mafia'
                    ? 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-rose-950/40 border-rose-600/80 glow-mafia'
                    : role.team === 'citizen'
                    ? 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-sky-950/40 border-sky-500/80 glow-citizen'
                    : 'bg-gradient-to-b from-neutral-950 via-neutral-900 to-purple-950/40 border-purple-500/80 glow-neutral'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                      role.team === 'mafia'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                        : role.team === 'citizen'
                        ? 'bg-sky-950/80 text-sky-300 border-sky-700'
                        : 'bg-purple-950/80 text-purple-300 border-purple-700'
                    }`}
                  >
                    {role.team === 'mafia' ? 'ساید مافیا' : role.team === 'citizen' ? 'ساید شهروند' : 'ساید مستقل'}
                  </span>

                  <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    لمس = پنهان‌سازی
                  </span>
                </div>

                <div className="flex flex-col items-center text-center my-auto py-2">
                  <div className="w-24 h-24 rounded-2xl bg-neutral-950/90 p-2 border border-neutral-800 shadow-xl mb-3">
                    <RoleIcon roleId={role.id} />
                  </div>

                  <h3 className="text-xl font-black text-white">{role.name}</h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {role.englishName}
                  </span>

                  <p className="text-xs text-neutral-300 mt-2 font-medium leading-relaxed px-2">
                    {role.summary}
                  </p>
                </div>

                <div className="space-y-2 text-right">
                  <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-850 text-[11px] text-neutral-300 leading-relaxed max-h-24 overflow-y-auto">
                    <span className="font-bold text-white block mb-0.5">وظیفه شما:</span>
                    {role.description}
                  </div>

                  {role.wakeUpText && (
                    <div className="bg-amber-950/30 border border-amber-900/50 p-2 rounded-xl text-[10px] text-amber-300">
                      🌙 {role.wakeUpText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Notebook */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        <button
          onClick={() => setIsNotesOpen((prev) => !prev)}
          className="w-full p-3.5 flex items-center justify-between text-xs font-bold text-neutral-300 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileEdit className="w-4 h-4 text-rose-400" />
            دفترچه یادداشت شخصی من
          </span>
          <span className="text-neutral-500 font-mono text-[11px]">
            {isNotesOpen ? 'بستن ▲' : 'باز کردن ▼'}
          </span>
        </button>

        {isNotesOpen && (
          <div className="p-3 pt-0">
            <textarea
              value={personalNotes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="نکات خود درباره مظنونین و استعلام‌ها را اینجا بنویسید (فقط روی گوشی خودتان ذخیره می‌شود)..."
              rows={4}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
};
