import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Copy, Check, Wifi, X, QrCode } from 'lucide-react';

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
  const [lanIps, setLanIps] = useState<{ name: string; address: string }[]>([]);
  const [selectedIp, setSelectedIp] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Fetch local LAN IPs detected by Node server
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses && Array.isArray(data.addresses) && data.addresses.length > 0) {
          setLanIps(data.addresses);
          // If current host is localhost or 127.0.0.1, auto-select LAN IP for mobile scan
          if (
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ) {
            setSelectedIp(data.addresses[0].address);
          }
        }
      })
      .catch(() => {
        // Fallback to window.location.origin
      });
  }, [isOpen]);

  if (!isOpen) return null;

  // Build target URL for mobile players
  const getShareUrl = () => {
    if (typeof window === 'undefined') return `http://localhost:3000/?code=${roomCode}`;
    
    if (selectedIp) {
      const port = window.location.port ? `:${window.location.port}` : ':3000';
      return `http://${selectedIp}${port}/?code=${roomCode}`;
    }
    
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-rose-600 via-rose-800 to-neutral-950 flex items-center justify-center border border-rose-500/40 shadow-lg shadow-rose-950/40 mb-2.5">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-base font-black text-white">اتصال سریع بازیکنان با QR Code</h3>
          <p className="text-xs text-neutral-400 mt-1">
            بازیکنان دوربین گوشی را روی این بارکد بگیرند تا خودکار وارد شوند
          </p>
        </div>

        {/* Room Code Banner */}
        <div className="mb-4 bg-neutral-950 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between">
          <span className="text-xs text-neutral-400">کد دعوت اتاق:</span>
          <span className="font-mono text-xl font-black text-amber-400 tracking-widest">
            {roomCode}
          </span>
        </div>

        {/* QR Code Canvas */}
        <div className="bg-white p-4 rounded-2xl shadow-xl flex items-center justify-center mx-auto w-fit border-4 border-neutral-800">
          <QRCodeSVG
            value={shareUrl}
            size={200}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* LAN IP Switcher if multiple interfaces available */}
        {lanIps.length > 0 && (
          <div className="mt-4">
            <label className="block text-[11px] text-neutral-400 mb-1 flex items-center gap-1">
              <Wifi className="w-3 h-3 text-amber-400" />
              <span>آدرس IP شبکه محلی Wi-Fi:</span>
            </label>
            <select
              value={selectedIp}
              onChange={(e) => setSelectedIp(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-750 text-neutral-200 text-xs rounded-xl px-2.5 py-2 font-mono outline-none"
            >
              <option value="">پیش‌فرض ({typeof window !== 'undefined' ? window.location.hostname : 'لوکال'})</option>
              {lanIps.map((ip) => (
                <option key={ip.address} value={ip.address}>
                  {ip.address} ({ip.name})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* URL Box & Copy */}
        <div className="mt-3 bg-neutral-950 border border-neutral-800 rounded-xl p-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-neutral-300 truncate direction-ltr text-left flex-1" dir="ltr">
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-xs text-neutral-200 flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
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

        {/* Wi-Fi reminder */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-neutral-500 leading-tight">
            💡 گوشی‌ها و لپ‌تاپ باید به یک وای‌فای متصل باشند (نیاز به اینترنت نیست).
          </p>
        </div>
      </div>
    </div>
  );
};
