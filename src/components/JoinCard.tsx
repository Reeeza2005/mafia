import React, { useState, useRef, useEffect } from 'react';
import { Users, ArrowRight, Loader2, Crown, ShieldCheck } from 'lucide-react';

interface JoinCardProps {
  initialCode?: string;
  errorMessage?: string | null;
  isJoining?: boolean;
  onJoin: (code: string, name: string) => void;
  onGodClick?: () => void;
  onBack?: () => void;
}

export const JoinCard: React.FC<JoinCardProps> = ({
  initialCode = '',
  errorMessage,
  isJoining = false,
  onJoin,
  onGodClick,
  onBack,
}) => {
  // Read code from prop or search params (?code=1234 or ?room=1234)
  const [code, setCode] = useState(() => {
    if (initialCode && initialCode.trim()) {
      return initialCode.replace(/[^0-9]/g, '').slice(0, 4);
    }
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code') || params.get('room');
      if (urlCode) {
        return urlCode.replace(/[^0-9]/g, '').slice(0, 4);
      }
    }
    return '';
  });

  const [name, setName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mafia_player_name') || '';
    }
    return '';
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Auto-reconnect if returning with saved credentials
  useEffect(() => {
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('mafia_player_name') : null;
    const activeCode = code || initialCode;
    if (activeCode && savedName && !hasSubmittedRef.current && !errorMessage && !isJoining) {
      hasSubmittedRef.current = true;
      setIsSubmitting(true);
      onJoin(activeCode, savedName);
    }
  }, []);
  const hasSubmittedRef = useRef(false);

  // Sync initialCode if changed
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode.replace(/[^0-9]/g, '').slice(0, 4));
    }
  }, [initialCode]);

  // Reset submit lock on error
  useEffect(() => {
    if (errorMessage) {
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }, [errorMessage]);

  // Sync with external isJoining
  useEffect(() => {
    if (!isJoining) {
      setIsSubmitting(false);
      hasSubmittedRef.current = false;
    }
  }, [isJoining]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
    setCode(cleaned);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    setName(e.target.value);
  };

  const isCodeValid = /^[0-9]{4}$/.test(code.trim());
  const isNameValid = name.trim().length > 0;
  const isFormValid = isCodeValid && isNameValid;
  const isBusy = isSubmitting || isJoining;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy || hasSubmittedRef.current) return;

    setLocalError(null);
    const cleanCode = code.trim();
    const cleanName = name.trim();

    if (!isCodeValid) {
      setLocalError('کد اتاق باید دقیقاً ۴ رقم عددی باشد.');
      return;
    }
    if (!cleanName) {
      setLocalError('لطفاً نام بازیکن را وارد کنید.');
      return;
    }

    // Set locks to prevent concurrent submits or infinite socket loops
    setIsSubmitting(true);
    hasSubmittedRef.current = true;

    // Safety timeout: unlock if server response takes too long
    setTimeout(() => {
      setIsSubmitting((current) => {
        if (current) {
          hasSubmittedRef.current = false;
          return false;
        }
        return false;
      });
    }, 4500);

    // Single trigger strictly on submit button
    onJoin(cleanCode, cleanName);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 dir-rtl text-right select-none">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card Header */}
        <div className="text-center mb-6 relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 via-rose-800 to-neutral-950 flex items-center justify-center border border-rose-500/40 shadow-xl shadow-rose-950/50 mb-3">
            <span className="text-3xl">🎭</span>
          </div>
          <h2 className="text-xl font-black text-white">ورود بازیکن به بازی مافیا</h2>
          <p className="text-xs text-neutral-400 mt-1">
            کد ۴ رقمی گرداننده و نام خود را برای ورود وارد کنید
          </p>

          <div className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 rounded-full bg-neutral-950/80 border border-neutral-800 text-[11px] text-neutral-400 font-medium">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>اتصال شبکه محلی Wi-Fi (آفلاین)</span>
          </div>
        </div>

        {/* Error notification */}
        {(localError || errorMessage) && (
          <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-2xl text-xs text-red-200 text-center font-bold">
            ⚠️ {localError || errorMessage}
          </div>
        )}

        {/* QR Code pre-filled notice */}
        {isCodeValid && (
          <div className="mb-4 p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl text-[11px] text-emerald-300 text-center font-bold flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
            <span className="text-emerald-400">✓</span>
            <span>کد اتاق ({code}) با موفقیت بارگذاری شد. فقط نام خود را وارد کنید!</span>
          </div>
        )}

        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4 relative">
          {/* 1. Room Code Field */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5 flex items-center justify-between">
              <span>کد دعوت اتاق (۴ رقم)</span>
              <span className="text-[10px] text-neutral-500 font-normal">از گرداننده بپرسید</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              disabled={isBusy}
              value={code}
              onChange={handleCodeChange}
              placeholder="مثال: ۴۸۲۱"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-rose-500 disabled:opacity-60 rounded-2xl px-4 py-3 text-center text-2xl font-mono tracking-widest text-amber-400 placeholder-neutral-700 outline-none transition-all shadow-inner"
            />
          </div>

          {/* 2. Player Name Field */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1.5">نام شما در بازی</label>
            <input
              type="text"
              disabled={isBusy}
              value={name}
              onChange={handleNameChange}
              placeholder="نام مستعار یا اسمتان..."
              maxLength={20}
              autoFocus={isCodeValid}
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-rose-500 disabled:opacity-60 rounded-2xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 outline-none transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isBusy || !isFormValid}
            className="w-full mt-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-black py-3.5 rounded-2xl shadow-xl shadow-rose-950/50 transition-all text-sm cursor-pointer active:scale-95 flex items-center justify-center gap-2"
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

        {/* Optional God entrance or back button */}
        {(onGodClick || onBack) && (
          <div className="mt-5 pt-3.5 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-center">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                ← بازگشت به صفحه انتخاب نقش
              </button>
            )}
            {onGodClick && (
              <button
                type="button"
                onClick={onGodClick}
                className="text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 mx-auto sm:mx-0 sm:mr-auto"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>👑 ورود به عنوان گرداننده (God)</span>
              </button>
            )}
          </div>
        )}

        {/* Security / Confidentiality note */}
        <div className="mt-3 text-center">
          <p className="text-[11px] text-neutral-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>اطلاعات نقش شما محرمانه و اختصاصی است</span>
          </p>
        </div>
      </div>
    </div>
  );
};
