import React, { useState } from 'react';
import { Player } from '../../types/mafia';
import { Eye, Shield, Check, X, UserCheck } from 'lucide-react';
import { network } from '../../services/network';

interface GuardActionProps {
  players: Player[];
  myPlayerId: string;
  roomCode: string;
  lastGuardedId?: string | null;
  onActionCompleted: () => void;
}

export const GuardAction: React.FC<GuardActionProps> = ({
  players,
  myPlayerId,
  roomCode,
  lastGuardedId,
  onActionCompleted,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // بازیکنان زنده (به جز کسانی که دیشب انتخاب شده بودند)
  const selectablePlayers = players.filter((p) => p.isAlive && p.id !== myPlayerId);

  const handleSubmit = (isSkip: boolean = false) => {
    if (isSubmitted) return;

    const targetId = isSkip ? "skip" : selectedTargetId;
    if (!isSkip && !targetId) return;

    const activeSocket = (network as any)?.socket || (network as any)?.getSocket?.() || null;
    const effectiveRoom = roomCode || (network as any)?.getRoomCode?.() || '';

    const payload = {
      roomCode: effectiveRoom,
      playerId: myPlayerId,
      roleId: "bodyguard",
      targetId: targetId,
      isSkip: isSkip,
    };

    if (activeSocket) {
      activeSocket.emit("night_target_submit", payload);
      activeSocket.emit("guard:submit_night", payload);
    } else {
      network.sendNightTarget(targetId || "skip", "bodyguard");
    }

    setIsSubmitted(true);
    onActionCompleted();
  };

  if (isSubmitted) {
    return (
      <div className="bg-neutral-900/90 border border-emerald-500/40 rounded-2xl p-6 text-center space-y-3 animate-in fade-in">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-950/80 border border-emerald-500 flex items-center justify-center text-emerald-400">
          <Check className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-black text-white">کشیک شبانه شما ثبت شد</h4>
        <p className="text-xs text-neutral-400">
          پنجره بسته شد. اول صبح گزارش رفت‌وآمدها به هدف شما مخابره خواهد شد.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-white">کشیک شبانه دیده‌بان</h3>
          <p className="text-[11px] text-neutral-400">یک نفر را انتخاب کنید تا رفت‌وآمدهای خانه‌اش را ثبت کنید.</p>
        </div>
      </div>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {selectablePlayers.map((player) => {
          const isLastGuarded = player.id === lastGuardedId;
          const isSelected = selectedTargetId === player.id;

          return (
            <button
              key={player.id}
              disabled={isLastGuarded}
              onClick={() => setSelectedTargetId(player.id)}
              className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                isLastGuarded
                  ? 'bg-neutral-950/50 border-neutral-800 text-neutral-600 cursor-not-allowed opacity-50'
                  : isSelected
                  ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md'
                  : 'bg-neutral-800/60 border-neutral-700/60 text-neutral-200 hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Shield className={`w-4 h-4 ${isSelected ? 'text-amber-400' : 'text-neutral-500'}`} />
                <span>{player.name}</span>
              </div>
              {isLastGuarded ? (
                <span className="text-[10px] text-neutral-500 font-normal">دیشب کشیک بودید</span>
              ) : isSelected ? (
                <UserCheck className="w-4 h-4 text-amber-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-800">
        <button
          onClick={() => handleSubmit(true)}
          className="py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>انصراف در این شب</span>
        </button>

        <button
          disabled={!selectedTargetId}
          onClick={() => handleSubmit(false)}
          className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md ${
            selectedTargetId
              ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white cursor-pointer active:scale-95'
              : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Check className="w-4 h-4" />
          <span>تایید و ارسال کشیک ✓</span>
        </button>
      </div>
    </div>
  );
};
