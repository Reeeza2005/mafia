import React, { useState } from "react";

export interface MafiaChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  time: string;
}

interface MafiaChatProps {
  isGod?: boolean;
  isActive: boolean;
  messages: MafiaChatMessage[];
  currentUserId?: string;
  onSendMessage: (text: string) => void;
  onToggleChat?: (active: boolean) => void;
  onClearChat?: () => void;
}

export const MafiaChat: React.FC<MafiaChatProps> = ({
  isGod = false,
  isActive,
  messages,
  currentUserId,
  onSendMessage,
  onToggleChat,
  onClearChat,
}) => {
  const [inputText, setInputText] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [isDraftOpen, setIsDraftOpen] = useState(false);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || (!isActive && !isGod)) return;
    onSendMessage(text);
    if (!textToSend) setInputText("");
  };

  const copyDraftToChat = () => {
    if (!draftNote.trim()) return;
    setInputText(draftNote);
  };

  const quickChips = ["موافقم 👍", "مخالفم ❌", "سکوت 🤫", "تارگت روی دکتر 🩺", "شلیک به کارآگاه 🔍"];

  return (
    <div className="bg-black/95 border border-red-950/80 rounded-2xl flex flex-col overflow-hidden text-neutral-200 shadow-2xl backdrop-blur-md">
      {/* هدر چت */}
      <div className="bg-neutral-950 px-4 py-2.5 border-b border-red-950/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🕶️</span>
          <div>
            <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
              چت محرمانه مافیا
              <span className={"inline-block w-2 h-2 rounded-full " + (isActive ? "bg-emerald-500 animate-pulse" : "bg-neutral-600")} />
            </div>
            <div className="text-[10px] text-neutral-500">
              {isActive ? "اتصال زنده و فعال" : "توسط گرداننده قفل شده است"}
            </div>
          </div>
        </div>

        {/* کنترل‌های اختصاصی گاد */}
        {isGod && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleChat?.(!isActive)}
              className={"text-xs px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer " + (
                isActive
                  ? "bg-amber-950/80 text-amber-300 border border-amber-700/60 hover:bg-amber-900"
                  : "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900"
              )}
            >
              {isActive ? "🔒 بستن چت" : "🔓 فعال‌سازی چت"}
            </button>
            <button
              type="button"
              onClick={onClearChat}
              className="text-xs px-2 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-800/60 hover:bg-red-900 cursor-pointer"
              title="پاک‌سازی کامل پیام‌ها"
            >
              🧹 پاک‌سازی
            </button>
          </div>
        )}
      </div>

      {/* بخش باکس یادداشت / پیش‌نویس محرمانه (برای بازیکنان) */}
      {!isGod && (
        <div className="border-b border-neutral-900 bg-neutral-950/60 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <button
              type="button"
              onClick={() => setIsDraftOpen(!isDraftOpen)}
              className="text-[11px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>📝 پیش‌نویس و یادداشت شخصی</span>
              <span>{isDraftOpen ? "▲" : "▼"}</span>
            </button>
            {draftNote.trim() && (
              <button
                type="button"
                onClick={copyDraftToChat}
                className="text-[10px] bg-red-950 hover:bg-red-900 text-red-200 px-2 py-0.5 rounded border border-red-800/50 cursor-pointer transition-all"
              >
                انتقال به کادر چت ⬆️
              </button>
            )}
          </div>

          {isDraftOpen && (
            <textarea
              value={draftNote}
              onChange={(e) => setDraftNote(e.target.value)}
              placeholder="نکات خود را اینجا بنویسید تا هنگام باز شدن چت فوراً ارسال کنید..."
              className="w-full h-16 bg-neutral-900/90 text-neutral-200 text-xs rounded-lg p-2 border border-neutral-800 focus:outline-none focus:border-red-900 resize-none placeholder-neutral-600"
            />
          )}
        </div>
      )}

      {/* نمایش پیام‌ها */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-56 min-h-[140px] text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-600 text-center py-6 text-[11px]">
            پیامی در کانال مافیا ثبت نشده است.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={"flex flex-col " + (isMe ? "items-end" : "items-start")}
              >
                <div className="text-[10px] text-neutral-500 mb-0.5 flex items-center gap-1">
                  <span>{msg.senderName}</span>
                  <span>•</span>
                  <span>{msg.time}</span>
                </div>
                <div
                  className={"px-3 py-1.5 rounded-xl max-w-[85%] break-words " + (
                    isMe
                      ? "bg-red-950/70 border border-red-800/60 text-red-100 rounded-br-xs"
                      : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-xs"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* چیپ‌های پیام آماده */}
      {isActive && !isGod && (
        <div className="px-2.5 py-1.5 flex gap-1.5 overflow-x-auto border-t border-neutral-900/80 bg-neutral-950/40">
          {quickChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleSend(chip)}
              className="text-[10px] whitespace-nowrap bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-red-900/60 text-neutral-300 px-2 py-1 rounded-full cursor-pointer transition-all active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* ورودی متن و دکمه ارسال */}
      <div className="p-2 border-t border-neutral-900 bg-neutral-950 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          disabled={!isActive && !isGod}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            !isActive && !isGod
              ? "چت مافیا غیرفعال است..."
              : "پیام هماهنگی شب..."
          }
          className="flex-1 bg-neutral-900 text-neutral-200 text-xs px-3 py-2 rounded-xl border border-neutral-800 focus:outline-none focus:border-red-900 disabled:opacity-40 disabled:cursor-not-allowed placeholder-neutral-600"
        />
        <button
          type="button"
          disabled={(!isActive && !isGod) || !inputText.trim()}
          onClick={() => handleSend()}
          className="bg-red-950 hover:bg-red-900 disabled:opacity-30 disabled:cursor-not-allowed text-red-200 border border-red-800/80 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95"
        >
          ارسال
        </button>
      </div>
    </div>
  );
};
