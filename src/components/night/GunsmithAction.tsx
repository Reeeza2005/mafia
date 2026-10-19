import React, { useState } from "react";
import { Crosshair, ShieldAlert, Send } from "lucide-react";

interface Player { id: string; name: string; isAlive: boolean; }
interface Props {
  socket: any;
  roomCode: string;
  currentPlayerId: string;
  players: Record<string, Player>;
  onActionCompleted: () => void;
}

export const GunsmithAction: React.FC<Props> = ({ socket, roomCode, currentPlayerId, players, onActionCompleted }) => {
  const [targetId, setTargetId] = useState<string>("");
  const [bulletType, setBulletType] = useState<"live" | "blank" | "">("");

  const alivePlayers = Object.values(players).filter(p => p.isAlive);
  const isSelfTarget = targetId === currentPlayerId;

  // اگر هدف خودش باشد، فقط تیر مشقی مجاز است
  React.useEffect(() => {
    if (isSelfTarget && bulletType === "live") {
      setBulletType("blank");
    }
  }, [targetId]);

  const handleSubmit = () => {
    if (!targetId || !bulletType) return;
    socket.emit("gun:give", { roomCode, targetId, bulletType });
    onActionCompleted();
  };

  return (
    <div className="bg-neutral-900 border border-emerald-900/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-emerald-500 mb-2">
        <Crosshair className="w-5 h-5" />
        <h3 className="font-bold">توزیع اسلحه</h3>
      </div>
      
      <div>
        <label className="block text-xs text-neutral-400 mb-1">انتخاب گیرنده اسلحه:</label>
        <select 
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-white outline-none"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">-- انتخاب بازیکن --</option>
          {alivePlayers.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.id === currentPlayerId ? "(خودم)" : ""}
            </option>
          ))}
        </select>
      </div>

      {targetId && (
        <div>
          <label className="block text-xs text-neutral-400 mb-2">نوع تیر:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setBulletType("blank")}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                bulletType === "blank" ? "bg-blue-600 border-blue-500 text-white" : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              تیر مشقی
            </button>
            <button
              onClick={() => setBulletType("live")}
              disabled={isSelfTarget}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                isSelfTarget ? "opacity-30 cursor-not-allowed grayscale" :
                bulletType === "live" ? "bg-orange-600 border-orange-500 text-white" : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              تیر جنگی
            </button>
          </div>
          {isSelfTarget && (
            <p className="text-[10px] text-orange-400 mt-2 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" />
              قانون: اعطای تیر جنگی به خود غیرمجاز است.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!targetId || !bulletType}
        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        <Send className="w-4 h-4" />
        ارسال اسلحه
      </button>
    </div>
  );
};
