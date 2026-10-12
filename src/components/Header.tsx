import React, { useState } from 'react';
import { Volume2, VolumeX, Wifi, Share2, HelpCircle, Download, RefreshCw, Smartphone, Music } from 'lucide-react';
import { NetworkMode } from '../types/mafia';
import { audio } from '../utils/audio';

interface HeaderProps {
  roomCode: string;
  clientType: 'god' | 'player';
  networkMode: NetworkMode;
  isConnected: boolean;
  playersCount?: number;
  onOpenQr: () => void;
  onOpenExport: () => void;
  onOpenAudio: () => void;
  onToggleMode: (mode: NetworkMode) => void;
  onResetGame?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  clientType,
  networkMode,
  isConnected,
  playersCount,
  onOpenQr,
  onOpenExport,
  onOpenAudio,
  onToggleMode,
  onResetGame,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    audio.setMuted(next);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-600 via-rose-800 to-neutral-950 flex items-center justify-center border border-rose-500/40 shadow-lg shadow-rose-950/50">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-wide">
                بازی مافیا
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                clientType === 'god' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                {clientType === 'god' ? '👑 گرداننده' : '🎭 بازیکن'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              دستیار و ناظر هوشمند سناریوهای مافیا
            </p>
          </div>
        </div>

        {/* Center / Room badge */}
        <div className="flex items-center gap-2">
          <button
            onClick={copyRoomCode}
            title="کلیک برای کپی کد اتاق"
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 px-2.5 py-1.5 rounded-xl border border-neutral-700/60 text-xs font-mono transition-all"
          >
            <span className="text-neutral-400 text-[11px]">اتاق:</span>
            <span className="text-amber-400 font-black tracking-wider">{roomCode}</span>
            {playersCount !== undefined && (
              <span className="text-[10px] text-neutral-400 border-r border-neutral-700 pr-1.5 mr-0.5 font-bold font-mono">
                {playersCount}/50
              </span>
            )}
            {copied ? (
              <span className="text-[10px] text-emerald-400 mr-1">کپی شد!</span>
            ) : (
              <Share2 className="w-3 h-3 text-neutral-400" />
            )}
          </button>
        </div>

        {/* Actions & Connections */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Network Mode Switcher */}
          <div className="hidden md:flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
            <button
              onClick={() => onToggleMode('socket')}
              className={`px-2 py-1 rounded-md transition-colors ${
                networkMode === 'socket'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="حالت شبکه محلی Wi-Fi و سرور Node.js"
            >
              شبکه محلی (Socket)
            </button>
            <button
              onClick={() => onToggleMode('peer')}
              className={`px-2 py-1 rounded-md transition-colors ${
                networkMode === 'peer'
                  ? 'bg-purple-600 text-white font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="حالت P2P آنلاین برای GitHub Pages"
            >
              آنلاین P2P (PeerJS)
            </button>
          </div>

          {/* Connection status indicator */}
          <div
            title={isConnected ? 'متصل به شبکه' : 'در حال اتصال یا قطع'}
            className="flex items-center gap-1.5 px-2 py-1 bg-neutral-900 border border-neutral-800 rounded-lg text-xs"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] text-neutral-300 hidden sm:inline">
              {isConnected ? 'متصل' : 'انتظار'}
            </span>
          </div>

          {/* QR Code button */}
          <button
            onClick={onOpenQr}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:text-white transition-colors"
            title="نمایش QR Code برای اتصال گوشی بازیکنان"
          >
            <Smartphone className="w-4 h-4 text-rose-400" />
          </button>

          {/* Music & Soundboard modal */}
          <button
            onClick={onOpenAudio}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-rose-400 border border-neutral-800 hover:text-white transition-colors"
            title="پلیر موسیقی و فایل‌های صوتی مافیا"
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:text-white transition-colors"
            title={isMuted ? 'فعال‌سازی صدا' : 'قطع صدا'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Standalone Export / Info */}
          <button
            onClick={onOpenExport}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 hover:text-white transition-colors"
            title="دانلود فایل server.js برای اجرای آفلاین لپتاپ"
          >
            <Download className="w-4 h-4 text-amber-400" />
          </button>

          {/* Reset button (God only) */}
          {clientType === 'god' && onResetGame && (
            <button
              onClick={onResetGame}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950/50 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-900/60 transition-colors"
              title="ریست کردن بازی و پس گرفتن کارت‌ها"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
