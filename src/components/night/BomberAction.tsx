import React, { useState, useEffect } from "react";
import { Bomb, AlertTriangle, Send } from "lucide-react";

interface Player { id: string; name: string; isAlive: boolean; }
interface Props {
  socket: any;
  roomCode: string;
  currentPlayerId: string;
  players: Record<string, Player>;
  onActionCompleted: () => void;
}

type WireColor = "red" | "blue" | "yellow";
type Outcome = "defuse" | "target_death" | "bomber_death";

const OUTCOMES = [
  { value: "defuse", label: "🟢 خنثی‌سازی (بدون تلفات)" },
  { value: "target_death", label: "🔴 چاشنی انفجار (حذف هدف)" },
  { value: "bomber_death", label: "💥 تله معکوس (مرگ خودم)" }
];

export const BomberAction: React.FC<Props> = ({ socket, roomCode, currentPlayerId, players, onActionCompleted }) => {
  const [targetId, setTargetId] = useState<string>("");
  const [wires, setWires] = useState<Partial<Record<WireColor, Outcome>>>({});

  const handleWireChange = (color: WireColor, outcome: Outcome) => {
    const newWires = { ...wires, [color]: outcome };
    
    // منطق پر شدن خودکار سیم سوم
    const colors: WireColor[] = ["red", "blue", "yellow"];
    const allOutcomeValues = OUTCOMES.map(o => o.value as Outcome);
    
    const configuredColors = colors.filter(c => newWires[c]);
    if (configuredColors.length === 2) {
      const remainingColor = colors.find(c => !newWires[c])!;
      const usedOutcomes = Object.values(newWires);
      const remainingOutcome = allOutcomeValues.find(o => !usedOutcomes.includes(o))!;
      newWires[remainingColor] = remainingOutcome;
    }
    
    setWires(newWires);
  };

  const isFormValid = targetId && Object.keys(wires).length === 3 && new Set(Object.values(wires)).size === 3;

  const handleSubmit = () => {
    if (!isFormValid) return;
    if ((window as any).network) { (window as any).network.plantBomb(targetId, wires, roomCode); } else { socket.emit("bomb:plant", { roomCode, victimId: targetId, wires }); }
    onActionCompleted();
  };

  const alivePlayers = Object.values(players).filter(p => p.isAlive && p.id !== currentPlayerId);

  return (
    <div className="bg-neutral-900 border border-red-900/50 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-red-500 mb-2">
        <Bomb className="w-5 h-5" />
        <h3 className="font-bold">عملیات بمب‌گذاری (۳ سیم)</h3>
      </div>
      
      <div>
        <label className="block text-xs text-neutral-400 mb-1">انتخاب هدف (قربانی):</label>
        <select 
          className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm text-white focus:border-red-500 outline-none"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          <option value="">-- انتخاب بازیکن --</option>
          {alivePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {targetId && (
        <div className="space-y-3 pt-2">
          <p className="text-xs text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            عواقب سیم‌ها را برای {players[targetId]?.name} مشخص کنید:
          </p>
          {(["red", "blue", "yellow"] as WireColor[]).map((color) => {
            const colorClass = color === "red" ? "bg-red-500/10 border-red-500/30 text-red-400" : 
                               color === "blue" ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : 
                               "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
            const colorName = color === "red" ? "سیم قرمز" : color === "blue" ? "سیم آبی" : "سیم زرد";
            
            return (
              <div key={color} className={`flex flex-col gap-1 p-2 rounded-lg border ${colorClass}`}>
                <span className="text-xs font-bold">{colorName}</span>
                <select 
                  className="w-full bg-black/40 border border-transparent rounded p-1.5 text-xs text-white outline-none"
                  value={wires[color] || ""}
                  onChange={(e) => handleWireChange(color, e.target.value as Outcome)}
                >
                  <option value="" disabled>-- انتخاب پیامد --</option>
                  {OUTCOMES.map(out => (
                    <option key={out.value} value={out.value} disabled={Object.values(wires).includes(out.value) && wires[color] !== out.value}>
                      {out.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isFormValid}
        className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:bg-neutral-800 disabled:text-neutral-500 bg-red-600 hover:bg-red-500 text-white"
      >
        <Send className="w-4 h-4" />
        تأیید و کارگذاری بمب
      </button>
    </div>
  );
};
