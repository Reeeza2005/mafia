import React, { useState, useRef, useEffect } from 'react';
import { Crown, Users, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
  onJoin: (code: string, name: string) => void;
  onGodClick: () => void;
  initialCode?: string;
  errorMessage?: string | null;
  isJoining?: boolean;
}

export const JoinCard: React.FC<Props> = ({
  onJoin,
  onGodClick,
  initialCode = '',
  errorMessage,
  isJoining = false,
}) => {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasSubmittedRef = useRef(false);

  // If error occurs from server or props, unlock submit state so user can retry
  useEffect(() => {
    if (errorMessage) {
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }, [errorMessage]);

  // Keep state synced with external isJoining
  useEffect(() => {
    if (!isJoining) {
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }, [isJoining]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isJoining || hasSubmittedRef.current) {
      return;
    }

    setLocalError(null);
    const cleanCode = code.trim();
    const cleanName = name.trim();

    if (!cleanCode) {
      setLocalError('لطفاً کد دعوت اتاق را وارد کنید.');
      return;
    }
    if (cleanCode.length !== 4) {
      setLocalError('کد دعوت باید ۴ رقم باشد.');
      return;
    }
    if (!cleanName) {
      setLocalError('لطفاً نام خود را برای بازی وارد کنید.');
      return;
    }

    // Set flag immediately to prevent duplicate emits or double clicks
    setIsSubmitting(true);
    hasSubmittedRef.current = true;

    // Sole trigger: strictly only on form submit click
    onJoin(cleanCode, cleanName);
  };

  const isBusy = isSubmitting || isJoining;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 dir-rtl text-right">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center mb-6 relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 via-rose-800 to-neutral-950 flex items-center justify-center border border-rose-500/40 shadow-xl shadow-rose-950/50 mb-3">
            <span className="text-3xl">🎭</span>
          </div>
          <h2 className="text-xl font-black text-white">ورود به بازی مافیا</h2>
          <p className="text-xs text-neutral-400 mt-1">
            کد دعوت ۴ رقمی گرداننده و نام خود را وارد کنید
          </p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 font-medium">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>ظرفیت اتاق: حداکثر ۵۰ بازیکن</span>
          </div>
        </div>

        {/* Errors if any */}
        {(localError || errorMessage) && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200 text-center font-bold">
            ⚠️ {localError || errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>کد دعوت اتاق (۴ رقم)</span>
              <span className="text-[10px] text-neutral-500">دریافت از گرداننده</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              disabled={isBusy}
              value={code}
              onChange={(e) => {
                setLocalError(null);
                setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4));
              }}
              placeholder="مثال: ۴۸۲۱"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-rose-500 disabled:opacity-60 rounded-2xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-amber-400 placeholder-neutral-700 outline-none transition-all shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">نام بازیکن</label>
            <input
              type="text"
              disabled={isBusy}
              value={name}
              onChange={(e) => {
                setLocalError(null);
                setName(e.target.value);
              }}
              placeholder="نام شما در بازی..."
              maxLength={20}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-rose-500 disabled:opacity-60 rounded-2xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isBusy || code.trim().length !== 4 || !name.trim()}
            className="w-full mt-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-xl shadow-rose-950/50 transition-all text-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>در حال ورود به اتاق...</span>
              </>
            ) : (
              <>
                <span>ورود به بازی</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
          <button
            type="button"
            disabled={isBusy}
            onClick={onGodClick}
            className="text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 border border-amber-500/20 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>👑 من گرداننده بازی (God) هستم</span>
          </button>
        </div>
      </div>
    </div>
  );
};
