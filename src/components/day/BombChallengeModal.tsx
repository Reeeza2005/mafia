import React, { useState, useEffect } from "react";
import { AlertOctagon, Scissors } from "lucide-react";

interface Props {
  socket: any;
  roomCode: string;
  bomb: any; // ActiveBombState
  currentPlayerId: string;
}

export const BombChallengeModal: React.FC<Props> = ({ socket, roomCode, bomb, currentPlayerId }) => {
  const [timeLeft, setTimeLeft] = useState(15);
  const [cutWire, setCutWire] = useState<string | null>(null);

  // آیا بمب روی این بازیکن فعال شده است؟
  const isTarget = bomb?.victimId === currentPlayerId;
  const isTriggered = bomb?.status === "triggered";
  const showModal = isTarget && isTriggered;

  // هماهنگی تایمر کلاینت (تایمر اصلی روی سرور است، این فقط برای نمایش است)
  useEffect(() => {
    if (showModal && bomb.timerSecondsLeft) {
      setTimeLeft(bomb.timerSecondsLeft);
    }
  }, [showModal, bomb?.timerSecondsLeft]);

  if (!showModal) return null;

  const handleCutWire = (color: string) => {
    if (cutWire) return; // جلوگیری از کلیک مجدد
    setCutWire(color);
    socket.emit("bomb:cut", { roomCode, color });
  };

  const isDanger = timeLeft <= 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* هدر و اخطار */}
      <div className="flex flex-col items-center text-center mb-8">
        <AlertOctagon className={`w-16 h-16 mb-4 ${isDanger ? "text-red-500 animate-pulse" : "text-amber-500"}`} />
        <h2 className="text-2xl font-bold text-white mb-2">بمب روی شما فعال شد!</h2>
        <p className="text-neutral-400 text-sm">یکی از سیم‌ها را ببُرید، در غیر این صورت بمب منفجر می‌شود.</p>
      </div>

      {/* تایمر معکوس */}
      <div className={`text-6xl font-black mb-12 font-mono ${isDanger ? "text-red-500 animate-bounce" : "text-white"}`}>
        00:{timeLeft.toString().padStart(2, "0")}
      </div>

      {/* کابل‌ها */}
      <div className="flex gap-6 w-full max-w-sm justify-center">
        {(["red", "blue", "yellow"] as const).map((color) => {
          const isCut = cutWire === color;
          
          let wireColorClass = "bg-red-500 shadow-red-500/50";
          if (color === "blue") wireColorClass = "bg-blue-500 shadow-blue-500/50";
          if (color === "yellow") wireColorClass = "bg-yellow-500 shadow-yellow-500/50";

          return (
            <button
              key={color}
              disabled={!!cutWire}
              onClick={() => handleCutWire(color)}
              className="relative group flex flex-col items-center gap-4 cursor-pointer outline-none"
            >
              {/* آیکون قیچی که با هاور نمایش داده می‌شود */}
              <div className={`transition-all duration-300 ${isCut ? "opacity-0" : "opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0"}`}>
                <Scissors className="w-6 h-6 text-neutral-300 -rotate-90" />
              </div>
              
              {/* بدنه سیم */}
              <div className={`w-6 h-32 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-200 ${wireColorClass} ${isCut ? "h-12 opacity-50 sepia" : "hover:scale-110"}`}>
                {/* افکت درخشندگی سیم */}
                <div className="w-1 h-full bg-white/30 rounded-full mx-auto"></div>
              </div>
            </button>
          );
        })}
      </div>

    </div>
  );
};
