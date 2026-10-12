import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Copy, Check, Wifi, X, QrCode, Globe, Edit3, ExternalLink } from 'lucide-react';

interface HostShareModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const HostShareModal: React.FC<HostShareModalProps> = ({
  roomCode,
  isOpen,
  onClose,
}) => {
  const [activeMode, setActiveMode] = useState<'origin' | 'lan' | 'custom'>('origin');
  const [lanIps, setLanIps] = useState<{ name: string; address: string }[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [customHost, setCustomHost] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Fetch local LAN IPs detected by Node server
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setLanIps(data.addresses);
          // Auto-select first real LAN IP (192.168.x or 10.x or 172.x)
          const bestLan = data.addresses.find(
            (a: { address: string }) =>
              a.address.startsWith('192.168.') || a.address.startsWith('10.') || a.address.startsWith('172.')
          );
          const chosen = bestLan ? bestLan.address : data.addresses[0].address;
          setSelectedIp(chosen);

          // If current host is localhost or 127.0.0.1, auto-switch to LAN Wi-Fi mode so phones can connect!
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname === '0.0.0.0')
          ) {
            setActiveMode('lan');
          }
        }
      })
      .catch(() => {
        // Fallback to origin
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Compute final QR URL based on chosen mode
  const getShareUrl = () => {
    if (typeof window === 'undefined') return `http://localhost:3000/?code=${roomCode}`;

    // If LAN mode is active OR current host is localhost/127.0.0.1 and a LAN IP exists: prioritize LAN IP!
    if ((activeMode === 'lan' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && selectedIp) {
      const port = window.location.port ? `:${window.location.port}` : ':3000';
      return `http://${selectedIp}${port}/?code=${roomCode}`;
    }

    if (activeMode === 'custom' && customHost.trim()) {
      const cleanHost = customHost.trim().replace(/^https?:\/\//, '');
      return `http://${cleanHost}/?code=${roomCode}`;
    }

    // Default: current window origin
    return `${window.location.origin}/?code=${roomCode}`;
  };

  const shareUrl = getShareUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative max-h-[95vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 via-rose-800 to-neutral-950 flex items-center justify-center border border-rose-500/40 shadow-lg shadow-rose-950/40 mb-2">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-black text-white">اتصال فوری بازیکنان به بازی</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            بازیکنان با دوربین گوشی این بارکد را اسکن کنند یا لینک را باز کنند
          </p>
        </div>

        {/* Room Code Badge */}
        <div className="mb-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between">
          <span className="text-xs text-neutral-400">کد دعوت ۴ رقمی اتاق:</span>
          <span className="font-mono text-2xl font-black text-amber-400 tracking-widest">
            {roomCode}
          </span>
        </div>

        {/* LAN IP active alert notice */}
        {selectedIp && (
          <div className="mb-3 bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-2 text-[11px] text-emerald-300 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              آی‌پی Wi-Fi شناسایی شد: <strong className="font-mono font-bold text-white">{selectedIp}:3000</strong> (گوشی‌های متصل به مودم مستقیم وارد می‌شوند)
            </span>
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1 rounded-2xl border border-neutral-800 mb-3.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveMode('origin')}
            className={`py-1.5 px-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1 cursor-pointer ${
              activeMode === 'origin'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>آدرس فعلی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('lan')}
            className={`py-1.5 px-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1 cursor-pointer ${
              activeMode === 'lan'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>آی‌پی Wi-Fi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('custom')}
            className={`py-1.5 px-2 rounded-xl transition-all font-semibold flex items-center justify-center gap-1 cursor-pointer ${
              activeMode === 'custom'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>دستی / دلخواه</span>
          </button>
        </div>

        {/* Custom Mode Inputs */}
        {activeMode === 'lan' && lanIps.length > 0 && (
          <div className="mb-3.5 bg-neutral-950/80 p-2.5 rounded-2xl border border-neutral-800">
            <label className="block text-[11px] text-neutral-400 mb-1">انتخاب کارت شبکه محلی:</label>
            <select
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-750 text-neutral-200 text-xs rounded-xl px-2.5 py-2 font-mono outline-none"
            >
              {lanIps.map((ip) => (
                <option key={ip.address} value={ip.address}>
                  {ip.address} ({ip.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeMode === 'custom' && (
          <div className="mb-3.5 bg-neutral-950/80 p-2.5 rounded-2xl border border-neutral-800">
            <label className="block text-[11px] text-neutral-400 mb-1">
              آی‌پی یا دامنه لپ‌تاپ (مثال: 192.168.1.15:3000):
            </label>
            <input
              type="text"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              placeholder="مثال: 192.168.1.5:3000"
              className="w-full bg-neutral-900 border border-neutral-750 text-amber-400 text-xs rounded-xl px-2.5 py-2 font-mono outline-none direction-ltr text-left"
              dir="ltr"
            />
          </div>
        )}

        {/* QR Code Canvas */}
        <div className="bg-white p-3.5 rounded-2xl shadow-xl flex items-center justify-center mx-auto w-fit border-4 border-neutral-800 mb-3.5">
          <QRCodeSVG
            value={shareUrl}
            size={190}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* URL Box & Copy */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-mono text-neutral-300 truncate direction-ltr text-left flex-1" dir="ltr">
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs text-neutral-200 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>کپی لینک</span>
              </>
            )}
          </button>
        </div>

        {/* Helper Instructions */}
        <div className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
          <p className="flex items-center gap-1.5 text-neutral-300 font-bold">
            <Wifi className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>نکته مهم اتصال در شبکه محلی (Wi-Fi):</span>
          </p>
          <p className="text-[10px] text-neutral-400 leading-relaxed pr-5">
            گوشی‌های بازیکنان و این سیستم باید به یک مودم Wi-Fi یا هات‌اسپات مشترک وصل باشند. به هیچ عنوان نیازی به اینترنت نیست.
          </p>
        </div>
      </div>
    </div>
  );
};
