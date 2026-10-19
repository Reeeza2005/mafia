import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

interface GodAuthModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const GodAuthModal: React.FC<GodAuthModalProps> = ({ isOpen, onSuccess, onCancel }) => {
  const [hasPassword, setHasPassword] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPass = localStorage.getItem('mafia_god_password');
      setHasPassword(!!savedPass);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput || passwordInput.trim().length < 4) {
      setError('رمز عبور باید حداقل ۴ رقم یا کاراکتر باشد.');
      return;
    }
    if (passwordInput !== confirmPassword) {
      setError('رمز عبور و تکرار آن همخوانی ندارند.');
      return;
    }
    try {
      localStorage.setItem('mafia_god_password', passwordInput.trim());
      setError(null);
      onSuccess();
    } catch {
      setError('خطا در ذخیره رمز در حافظه مرورگر.');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPass = localStorage.getItem('mafia_god_password');
    if (savedPass && savedPass === passwordInput.trim()) {
      setError(null);
      onSuccess();
    } else {
      setError('رمز عبور اشتباه است.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-amber-900/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/60 border border-amber-600/40 flex items-center justify-center text-amber-400">
          {hasPassword ? <Lock className="w-7 h-7" /> : <KeyRound className="w-7 h-7" />}
        </div>

        <div className="text-center">
          <h3 className="text-base font-black text-white">
            {hasPassword ? 'احراز هویت گرداننده (God)' : 'تنظیم رمز عبور اولیه گرداننده'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
            {hasPassword
              ? 'برای دسترسی به پنل مدیریت بازی، رمز عبور را وارد کنید.'
              : 'برای جلوگیری از ورود بازیکنان به پنل گاد، یک رمز عبور تعیین کنید.'}
          </p>
        </div>

        <form onSubmit={hasPassword ? handleLogin : handleRegister} className="space-y-3 pt-1">
          <div>
            <label className="text-xs font-bold text-neutral-300 block mb-1">
              {hasPassword ? 'رمز عبور مدیریت:' : 'رمز عبور جدید:'}
            </label>
            <input
              type="password"
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2 text-center text-sm font-bold text-white tracking-widest outline-none transition-colors"
            />
          </div>

          {!hasPassword && (
            <div>
              <label className="text-xs font-bold text-neutral-300 block mb-1">تکرار رمز عبور:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-neutral-950 border border-neutral-700 focus:border-amber-500 rounded-xl px-3 py-2 text-center text-sm font-bold text-white tracking-widest outline-none transition-colors"
              />
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{hasPassword ? 'ورود به پنل گاد' : 'ثبت و ورود'}</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-bold transition-all border border-neutral-700 cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>بازگشت به صفحه ورود بازیکنان</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
