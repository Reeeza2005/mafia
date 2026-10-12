import React, { useState } from 'react';
import { Wifi, Globe, Server, Check, ArrowRight, RotateCcw } from 'lucide-react';
import { network } from '../services/network';

interface NetworkSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUrlChange?: (url: string) => void;
}

export const NetworkSettingsModal: React.FC<NetworkSettingsModalProps> = ({
  isOpen,
  onClose,
  onServerUrlChange,
}) => {
  const currentSaved = network.getCustomServerUrl() || '';
  const detected = network.getDetectedServerUrl();
  const [customInput, setCustomInput] = useState(currentSaved);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    network.setCustomServerUrl(customInput.trim());
    if (onServerUrlChange) {
      onServerUrlChange(network.resolveServerUrl());
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleResetToAuto = () => {
    setCustomInput('');
    network.setCustomServerUrl(null);
    if (onServerUrlChange) {
      onServerUrlChange(network.resolveServerUrl());
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1 rounded-xl bg-neutral-800 transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">تنظیمات اتصال سرور (شبکه)</h3>
            <p className="text-xs text-neutral-400">تشخیص خودکار یا وارد کردن دامنه تونل / اینترنت</p>
          </div>
        </div>

        <div className="bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800/80 mb-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">آدرس تشخیص داده شده سیستم:</span>
            <span className="font-mono text-emerald-400 font-bold dir-ltr select-all text-[11px] truncate max-w-[200px]">
              {detected}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-800/60 pt-2">
            <span className="text-neutral-400">آدرس فعال در حال حاضر:</span>
            <span className="font-mono text-amber-400 font-bold dir-ltr select-all text-[11px] truncate max-w-[200px]">
              {network.resolveServerUrl()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-200 mb-1.5">
              آدرس سرور اختصاصی / تونل اینترنتی (اختیاری):
            </label>
            <input
              type="text"
              dir="ltr"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="مثال: https://mafia.example.com یا http://192.168.1.5:3000"
              className="w-full bg-neutral-950 border border-neutral-700 focus:border-blue-500 rounded-xl px-3 py-2.5 text-xs text-blue-300 font-mono outline-none placeholder-neutral-600 dir-ltr text-left"
            />
            <p className="text-[11px] text-neutral-500 mt-1.5 leading-relaxed">
              اگر از Cloudflare Tunnel یا Ngrok استفاده می‌کنید، لینک HTTPS آن را در این قسمت قرار دهید. برای شبکه وای‌فای داخلی بگذارید خالی بماند.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>تنظیم شد! در حال اعمال...</span>
                </>
              ) : (
                <span>ذخیره و اتصال مجدد</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetToAuto}
              title="بازنشانی به تشخیص خودکار"
              className="p-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs flex items-center gap-1 font-semibold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>پیش‌فرض</span>
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[11px] text-neutral-400 space-y-1">
          <p className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>لوکال: همه افراد متصل به وای‌فای یا هات‌اسپات گرداننده</span>
          </p>
          <p className="flex items-center gap-1.5 text-purple-400">
            <Globe className="w-3.5 h-3.5" />
            <span>اینترنت: اتصال از هر شهری از طریق دامنه یا تونل HTTPS/WSS</span>
          </p>
        </div>
      </div>
    </div>
  );
};
