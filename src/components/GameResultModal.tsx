import React, { useEffect } from 'react';
import { Player } from '../types/mafia';
import { ROLE_MAP } from '../data/roles';
import { RoleIcon } from './RoleIcons';
import { Trophy, RotateCcw, X, Skull, Shield, Sparkles, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audio } from '../utils/audio';

interface GameResultModalProps {
  isOpen: boolean;
  winner: 'mafia' | 'citizen' | null;
  reason?: string;
  players: Player[];
  isGod: boolean;
  onResetGame: () => void;
  onClose: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  winner,
  reason,
  players,
  isGod,
  onResetGame,
  onClose,
}) => {
  useEffect(() => {
    if (isOpen && winner) {
      audio.playVictory();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: winner === 'mafia' ? ['#e11d48', '#881337', '#f43f5e', '#ffffff'] : ['#0284c7', '#0369a1', '#38bdf8', '#ffffff'],
        });
      } catch {
        // Ignore confetti error
      }
    }
  }, [isOpen, winner]);

  if (!isOpen || !winner) return null;

  const isMafiaWin = winner === 'mafia';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div
            className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center border shadow-xl mb-3 ${
              isMafiaWin
                ? 'bg-gradient-to-br from-rose-600 to-rose-950 border-rose-500/50 shadow-rose-950/60'
                : 'bg-gradient-to-br from-sky-600 to-sky-950 border-sky-500/50 shadow-sky-950/60'
            }`}
          >
            <Trophy className="w-8 h-8 text-amber-300" />
          </div>

          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest block mb-1">
            GAME OVER • اعلام نتیجه نهایی
          </span>
          <h2
            className={`text-2xl font-black ${
              isMafiaWin ? 'text-rose-400' : 'text-sky-400'
            }`}
          >
            {isMafiaWin ? '🏆 پیروزی ساید مافیا' : '🏆 پیروزی ساید شهروندان'}
          </h2>
          <p className="text-xs text-neutral-300 mt-1 max-w-sm mx-auto leading-relaxed">
            {reason || (isMafiaWin ? 'تعداد اعضای مافیا برابر یا بیشتر از شهروندان شد.' : 'تمام اعضای مافیا از بازی حذف شدند.')}
          </p>
        </div>

        {/* Master Role Reveal Section */}
        <div className="space-y-2 flex-1 mb-4">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>آشکارسازی نقش‌های تمام بازیکنان:</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              {players.length} بازیکن
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {players.map((p) => {
              const role = p.roleId ? ROLE_MAP[p.roleId] : null;
              const isPlayerMafia = role?.team === 'mafia';
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                    isPlayerMafia
                      ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                      {role ? <RoleIcon roleId={role.id} /> : <span>❓</span>}
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-white block truncate">{p.name}</span>
                      <span className="text-[10px] text-neutral-400">
                        {role ? role.name : 'نقش نامشخص'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        isPlayerMafia
                          ? 'bg-rose-900/60 text-rose-300'
                          : 'bg-sky-900/60 text-sky-300'
                      }`}
                    >
                      {isPlayerMafia ? 'مافیا' : 'شهروند'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                        p.isAlive
                          ? 'text-emerald-400 bg-emerald-950/60'
                          : 'text-neutral-500 bg-neutral-900 line-through'
                      }`}
                    >
                      {p.isAlive ? 'زنده' : 'حذف‌شده'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-neutral-800 flex flex-col sm:flex-row items-center gap-2">
          {isGod && (
            <button
              onClick={() => {
                onResetGame();
                onClose();
              }}
              className="w-full sm:flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>ریست بازی و شروع دست جدید</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
