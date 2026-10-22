import React, { useState } from "react";
import { Bomb, AlertTriangle, Send } from "lucide-react";
import { network } from "../../services/network";

interface Player {
  id: string;
  name: string;
  isAlive: boolean;
}

interface Props {
  socket?: any;
  roomCode?: string;
  currentPlayerId: string;
  players: Record<string, Player> | Player[];
  onActionCompleted: () => void;
}

type WireColor = "red" | "blue" | "yellow";
type Outcome = "defuse" | "target_death" | "bomber_death";

export const BomberAction: React.FC<Props> = ({
  socket,
  roomCode: propRoomCode,
  currentPlayerId,
  players,
  onActionCompleted,
}) => {
  const [targetId, setTargetId] = useState<string>("");
  const [wires, setWires] = useState<Partial<Record<WireColor, Outcome>>>({});

  const safePlayerList: Player[] = Array.isArray(players)
    ? players
    : players && typeof players === "object"
    ? Object.values(players)
    : [];

  const alivePlayers = safePlayerList.filter(
    (p) => p && p.isAlive && p.id !== currentPlayerId
  );

  const targetPlayer = safePlayerList.find((p) => p.id === targetId);
  const bomberPlayer = safePlayerList.find((p) => p.id === currentPlayerId);
  const targetName = targetPlayer?.name || "هدف";
  const bomberName = bomberPlayer?.name || "خودم";

  const outcomes: { value: Outcome; label: string }[] = [
    { value: "defuse", label: "🟢 خنثی‌سازی (بدون تلفات)" },
    { value: "target_death", label: `🔴 چاشنی انفجار (حذف ${targetName})` },
    { value: "bomber_death", label: `💥 تله معکوس (مرگ ${bomberName})` },
  ];

  const handleTargetChange = (val: string) => {
    setTargetId(val);
    setWires({});
  };

  const handleWireChange = (color: WireColor, outcome: Outcome) => {
    const nextWires: Partial<Record<WireColor, Outcome>> = { ...wires, [color]: outcome };

    (Object.keys(nextWires) as WireColor[]).forEach((c) => {
      if (c !== color && nextWires[c] === outcome) {
        delete nextWires[c];
      }
    });

    const colors: WireColor[] = ["red", "blue", "yellow"];
    const configuredColors = colors.filter((c) => !!nextWires[c]);

    if (configuredColors.length === 2) {
      const remainingColor = colors.find((c) => !nextWires[c])!;
      const usedOutcomes = Object.values(nextWires);
      const remainingOutcome = (["defuse", "target_death", "bomber_death"] as Outcome[]).find(
        (val) => !usedOutcomes.includes(val)
      );
      if (remainingOutcome) {
        nextWires[remainingColor] = remainingOutcome;
      }
    }

    setWires(nextWires);
  };

  const isSkip = targetId === "skip";
  const isConfigured =
    targetId &&
    targetId !== "skip" &&
    Object.keys(wires).length === 3 &&
    new Set(Object.values(wires)).size === 3;

  const handleSubmit = () => {
    const activeSocket = socket || (network as any)?.socket || (network as any)?.getSocket?.() || null;
    const effectiveRoom = propRoomCode || (network as any)?.getRoomCode?.() || (network as any)?.roomCode || '';

    if (isSkip) {
      activeSocket?.emit('bomb:submit_night', {
        roomCode: effectiveRoom,
        isSkip: true
      });
      onActionCompleted();
      return;
    }

    if (!isConfigured) return;

    activeSocket?.emit('bomb:submit_night', {
      roomCode: effectiveRoom,
      isSkip: false,
      targetId,
      wires
    });

    onActionCompleted();
  };

  return (
    <div className="bg-neutral-900 border border-red-900/50 rounded-2xl p-4 space-y-4 shadow-xl">
      <div className="flex items-center gap-2 text-red-500 border-b border-red-950/60 pb-3">
        <Bomb className="w-5 h-5 text-red-400" />
        <h3 className="font-bold text-sm text-red-200">میز کارگذاری بمب شبانه</h3>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
          انتخاب هدف یا انصراف:
        </label>
        <select
          aria-label="انتخاب هدف یا انصراف"
          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl p-2.5 text-sm text-white focus:border-red-500 outline-none transition-all"
          value={targetId}
          onChange={(e) => handleTargetChange(e.target.value)}
        >
          <option value="">-- لطفاً یک گزینه را انتخاب کنید --</option>
          <option value="skip" className="text-amber-400 font-bold">
            ⏭️ انصراف از کارگذاری در این شب
          </option>
          <optgroup label="بازیکنان زنده شهر">
            {alivePlayers.map((p) => (
              <option key={p.id} value={p.id}>
                👤 {p.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {targetId && !isSkip && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/30 p-2.5 rounded-lg border border-amber-900/40">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              هر سه سیم باید یک نقش متفاوت داشته باشند (سیم سوم با انتخاب دو سیم خودکار تنظیم می‌شود).
            </span>
          </div>

          {(["red", "blue", "yellow"] as WireColor[]).map((color) => {
            const colorInfo = {
              red: { label: "سیم قرمز", border: "border-red-600/60", badge: "bg-red-900/40 text-red-300" },
              blue: { label: "سیم آبی", border: "border-blue-600/60", badge: "bg-blue-900/40 text-blue-300" },
              yellow: { label: "سیم زرد", border: "border-yellow-600/60", badge: "bg-yellow-900/40 text-yellow-300" },
            }[color];

            return (
              <div
                key={color}
                className={`bg-neutral-950/70 border ${colorInfo.border} rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${colorInfo.badge}`}>
                    {colorInfo.label}
                  </span>
                </div>
                <select
                  aria-label={colorInfo.label}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg p-2 text-xs text-white focus:border-red-400 outline-none transition-all w-full sm:w-64"
                  value={wires[color] || ""}
                  onChange={(e) => handleWireChange(color, e.target.value as Outcome)}
                >
                  <option value="">-- تعیین پیامد سیم --</option>
                  {outcomes.map((out) => (
                    <option key={out.value} value={out.value}>
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
        type="button"
        disabled={!isSkip && !isConfigured}
        onClick={handleSubmit}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          isSkip
            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20"
            : isConfigured
            ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/30"
            : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/40"
        }`}
      >
        <Send className="w-4 h-4" />
        <span>{isSkip ? "تأیید انصراف و بستن نوبت" : "تأیید نهایی و کارگذاری بمب"}</span>
      </button>
    </div>
  );
};
