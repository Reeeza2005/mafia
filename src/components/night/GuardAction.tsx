import React, { useState } from 'react';
import { Shield, Check, X } from 'lucide-react';
import { network } from '../../services/network';

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
}

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

  // حذف خود بادیگارد از لیست اهداف قابل محافظت
  const selectablePlayers = players.filter((p) => p.isAlive && p.id !== myPlayerId);

  const handleSubmit = (isSkip: boolean = false) => {
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
    } else {
      network.sendNightTarget(targetId || "skip", "bodyguard");
    }

    setIsSubmitted(true);
    onActionCompleted();
  };

  if (isSubmitted) {
    const targetName = players.find((p) => p.id === selectedTargetId)?.name;
    return (
      <div className="bg-blue-950/40 border border-blue-600/40 rounded-2xl p-4 text-center space-y-2 animate-fade-in shadow-lg">
        <div className="w-10 h-10 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-1 border border-blue-500/30">
          <Shield className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-black text-white">محافظت شبانه شما ثبت شد 🛡️</h4>
        <p className="text-xs text-blue-200">
          {selectedTargetId === "skip" ? "امشب از کسی محافظت نکردید." : `شما امشب سپر جان «${targetName || "بازیکن انتخاب‌شده"}» شدید.`}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/90 border border-blue-900/40 rounded-2xl p-4 space-y-3.5 shadow-xl text-right">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <span className="text-[11px] font-bold text-neutral-400">فاز شب: نوبت محافظ (جان‌فدا)</span>
        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-black">
          <Shield className="w-4 h-4" />
          <span>سپر محافظتی شهر</span>
        </div>
      </div>

      <p className="text-xs text-neutral-300 leading-relaxed">
        یک بازیکن را برای محافظت فیزیکی انتخاب کنید تا در برابر شلیک شبانه مافیا از او دفاع کنید:
      </p>

      <div className="space-y-1.5 max-h-48 overflow-y-auto pl-1 pr-1">
        {selectablePlayers.map((player) => {
          const isSelected = selectedTargetId === player.id;
          const isLastGuarded = lastGuardedId === player.id;

          return (
            <button
              key={player.id}
              type="button"
              disabled={isLastGuarded}
              onClick={() => setSelectedTargetId(player.id)}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-blue-600/20 border-blue-500 text-blue-200 shadow-md ring-1 ring-blue-500/50'
                  : isLastGuarded
                  ? 'bg-neutral-950/40 border-neutral-800/40 text-neutral-600 cursor-not-allowed opacity-60'
                  : 'bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-neutral-600'}`} />
                <span>{player.name}</span>
              </div>
              {isLastGuarded && <span className="text-[10px] text-neutral-500">دیشب محافظت کردید</span>}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
        <button
          type="button"
          onClick={() => handleSubmit(false)}
          disabled={!selectedTargetId}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>تایید محافظت 🛡️</span>
        </button>
        <button
          type="button"
          onClick={() => handleSubmit(true)}
          className="px-3 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>صرف‌نظر</span>
        </button>
      </div>
    </div>
  );
};
