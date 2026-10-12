import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Smartphone, Copy, Check, Wifi, Globe, Edit3, RefreshCw, Radio } from 'lucide-react';

interface QrCodeModalProps {
  roomCode: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ roomCode, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'web' | 'lan' | 'custom'>('web');
  const [lanIps, setLanIps] = useState<{ name: string; address: string }[]>([]);
  const [selectedLanIp, setSelectedLanIp] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [finalUrl, setFinalUrl] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const getCleanBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    return window.location.href.split("?")[0] + window.location.pathname;
  };

  const generateQr = useCallback(async (text: string) => {
    if (!text) return;
    try {
      const url = await QRCode.toDataURL(text, {
        margin: 1,
        width: 320,
        color: {
          dark: '#ffffff',
          light: '#09090b',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR:', err);
    }
  }, []);

  // Fetch local IPs if backend is available
  useEffect(() => {
    if (!isOpen) return;

    // Default web URL
    const webUrl = `${getCleanBaseUrl()}?room=${roomCode}&role=player`;
    setFinalUrl(webUrl);
    setCustomUrl(webUrl);
    generateQr(webUrl);

    fetch('/api/network-info')
      .then((res) => res.json())
      .then((data) => {
        if (data.addresses && data.addresses.length > 0) {
          setLanIps(data.addresses);
          setSelectedLanIp(data.addresses[0].address);
        }
      })
      .catch(() => {
        // Client-only environment
      });
  }, [isOpen, roomCode, generateQr]);

  // Update target URL when tab or IP changes
  useEffect(() => {
    let target = '';
    const cleanBase = getCleanBaseUrl();

    if (activeTab === 'web') {
      target = `${cleanBase}?room=${roomCode}&role=player`;
    } else if (activeTab === 'lan') {
      const ip = selectedLanIp || '192.168.1.100';
      target = `http://${ip}:3000/?room=${roomCode}&role=player`;
    } else if (activeTab === 'custom') {
      target = customUrl;
    }

    setFinalUrl(target);
    generateQr(target);
  }, [activeTab, selectedLanIp, customUrl, roomCode, generateQr]);

  const handleCopy = () => {
    if (!finalUrl) return;
    navigator.clipboard.writeText(finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1 rounded-xl bg-neutral-800 transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center justify-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-rose-500" />
          <h3 className="text-base font-black text-white">QR Code اتصال بازیکنان</h3>
        </div>

        <p className="text-xs text-neutral-400 mb-4">
          کد اتاق: <span className="font-mono font-bold text-rose-400 px-2 py-0.5 bg-neutral-950 rounded-lg border border-neutral-800">{roomCode}</span>
        </p>

        {/* Network Mode Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-950 rounded-2xl border border-neutral-800 mb-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('web')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'web'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>آنلاین / وب</span>
          </button>
          <button
            onClick={() => setActiveTab('lan')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'lan'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>وای‌فای محلی</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'custom'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>آدرس دلخواه</span>
          </button>
        </div>

        {/* Tab content options */}
        {activeTab === 'lan' && (
          <div className="mb-3 text-right bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 space-y-2">
            <span className="text-[11px] text-neutral-400 block font-bold">انتخاب IP کارت شبکه لپ‌تاپ:</span>
            {lanIps.length > 0 ? (
              <select
                value={selectedLanIp}
                onChange={(e) => setSelectedLanIp(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
              >
                {lanIps.map((ip) => (
                  <option key={ip.address} value={ip.address}>
                    {ip.address} ({ip.name})
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="مثال: 192.168.1.10"
                  value={selectedLanIp}
                  onChange={(e) => setSelectedLanIp(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-white text-center font-mono"
                />
              </div>
            )}
            <p className="text-[10px] text-neutral-400">
              * بازیکنان و لپ‌تاپ باید به یک مودم یا هات‌اسپات متصل باشند.
            </p>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="mb-3 text-right bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 space-y-1.5">
            <span className="text-[11px] text-neutral-400 block font-bold">آدرس لینک ورودی:</span>
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-xs text-purple-400 font-mono text-left dir-ltr"
            />
          </div>
        )}

        {/* QR Code Canvas */}
        <div className="bg-neutral-950 p-4 rounded-3xl border border-neutral-800 inline-block shadow-inner mb-4">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 mx-auto rounded-xl" />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-xs text-neutral-500">
              در حال تولید بارکد...
            </div>
          )}
        </div>

        {/* URL Link and Copy */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 mb-4">
          <span className="text-xs font-mono text-rose-400 truncate dir-ltr select-all">
            {finalUrl}
          </span>
          <button
            onClick={handleCopy}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 transition-colors shrink-0"
            title="کپی لینک"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs transition-colors"
        >
          بستن پنجره
        </button>
      </div>
    </div>
  );
};
