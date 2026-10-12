import React, { useState } from 'react';
import { Download, Copy, Check, Terminal, FileCode, CheckCircle2, Monitor, Cpu, HelpCircle, X, Shield, Wifi } from 'lucide-react';

interface OfflineExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineExportModal: React.FC<OfflineExportModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'linux' | 'files'>('windows');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string, type: string = 'text/plain') => {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Windows Run Batch File
  const windowsBatContent = `@echo off
chcp 65001 >nul
title سرور بازی مافیا نوار - شبکه محلی Wi-Fi
color 0C
echo ========================================================
echo       🎭 سرور محلی بازی مافیا (کاملاً آفلاین)
echo ========================================================
echo.

node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [خطا] برنامه Node.js روی سیستم شما نصب نیست!
    echo لطفاً برنامه Node.js را از سایت زیر دانلود و نصب نمایید:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo [1/3] بررسی و نصب بسته‌ها...
if not exist node_modules (
    call npm install
)

echo.
echo [2/3] اجرای سرور بازی روی پورت 3000...
echo.
echo ========================================================
echo  گوشی‌های بازیکنان را به همین Wi-Fi وصل کنید و بارکد را اسکن کنید.
echo ========================================================
echo.

start http://localhost:3000/?role=god^&key=secret123
call npm run dev
pause
`;

  // 2. Linux Bash Script
  const linuxShContent = `#!/bin/bash
# ========================================================
#       🎭 سرور محلی بازی مافیا (لینوکس - کاملاً آفلاین)
# ========================================================

echo "========================================================"
echo "      🎭 سرور محلی بازی مافیا (Mafia Noir Server)      "
echo "========================================================"

if ! command -v node &> /dev/null; then
    echo "[خطا] Node.js روی لینوکس شما نصب نیست!"
    echo "برای نصب در اوبونتو یا دبیان دستور زیر را بزنید:"
    echo "  sudo apt update && sudo apt install -y nodejs npm"
    exit 1
fi

echo "[1/3] نصب پیش‌نیازها در صورت لزوم..."
if [ ! -d "node_modules" ]; then
    npm install
fi

echo "[2/3] اجرای سرور محلی..."
echo "پنل گرداننده: http://localhost:3000/?role=god&key=secret123"
npm run dev
`;

  // 3. Readme Offline Guide in Persian
  const readmeContent = `# 🎭 راهنمای اجرای آفلاین بازی مافیا در شبکه محلی (Wi-Fi)

این بازی **۱۰۰٪ آفلاین** است و نیازی به اینترنت، وی‌پی‌ان یا هاست آنلاین ندارد. تمام ارتباطات از طریق مودم وای‌فای یا هات‌اسپات گوشی روی شبکه محلی انجام می‌شود.

---

## 💻 راهنمای اجرا در ویندوز (Windows):
1. برنامه **Node.js** را از سایت [nodejs.org](https://nodejs.org) دانلود و با تنظیمات پیش‌فرض نصب کنید.
2. پوشه بازی را استخراج کنید.
3. روی فایل \`run-windows.bat\` دوبار کلیک کنید.
4. سرور اجرا می‌شود و صفحه مدیریت گاد باز خواهد شد.
5. گوشی‌های بازیکنان را به همان Wi-Fi وصل کنید، دکمه بارکد را بزنید و گوشی‌ها با دوربین بارکد را اسکن کنند!

---

## 🐧 راهنمای اجرا در لینوکس (Linux - Ubuntu / Debian):
1. ترمینال را باز کنید و Node.js را نصب کنید:
\`\`\`bash
sudo apt update && sudo apt install -y nodejs npm
\`\`\`
2. وارد پوشه بازی شوید و اسکریپت را اجرا کنید:
\`\`\`bash
chmod +x run-linux.sh
./run-linux.sh
\`\`\`

---

## 📱 نحوه اتصال بازیکنان:
- بازیکنان نیازی به نصب هیچ برنامه‌ای ندارند.
- فقط کافیست دوربین گوشی را باز کنند و QR Code نمایش داده شده در پنل گاد را اسکن کنند یا آدرس IP نمایش داده شده (مثلاً http://192.168.1.5:3000) را در مرورگر (Chrome یا Safari) وارد کنند.
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 dir-rtl text-right select-none animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 transition-colors cursor-pointer"
          title="بستن"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-neutral-800 pb-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-600 to-rose-950 border border-rose-500/40 flex items-center justify-center text-white shrink-0 shadow-lg shadow-rose-950/50">
            <Download className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">دانلود و اجرای آفلاین بازی در ویندوز و لینوکس</h3>
            <p className="text-xs text-neutral-400">
              اجرای آسان روی لپ‌تاپ گاد در شبکه Wi-Fi محلی بدون نیاز به اینترنت
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1.5 rounded-2xl border border-neutral-800 mb-4 text-xs">
          <button
            onClick={() => setActiveTab('windows')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'windows'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>آموزش ویندوز (Windows)</span>
          </button>

          <button
            onClick={() => setActiveTab('linux')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'linux'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>آموزش لینوکس (Linux)</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'files'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>دانلود فایل‌های اجرایی</span>
          </button>
        </div>

        {/* Tab 1: Windows Tutorial */}
        {activeTab === 'windows' && (
          <div className="space-y-4 text-xs leading-relaxed flex-1">
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <span>⚡ اجرای ۳ مرحله‌ای در ویندوز (بسیار ساده):</span>
              </div>

              <div className="space-y-3 pr-2">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    ۱
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">نصب برنامه رایگان Node.js:</strong>
                    <p className="text-neutral-400 text-[11px]">
                      اگر روی لپ‌تاپ‌تان نصب نیست، از سایت رسمی{' '}
                      <a
                        href="https://nodejs.org"
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 underline"
                      >
                        nodejs.org
                      </a>{' '}
                      نسخه LTS را دانلود و با چند Next نصب کنید.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    ۲
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">دانلود فایل اجرایی run-windows.bat:</strong>
                    <p className="text-neutral-400 text-[11px]">
                      فایل <code className="text-amber-400">run-windows.bat</code> را دانلود کرده و در کنار فایل‌های پروژه بگذارید و روی آن دوبار کلیک کنید.
                    </p>
                    <button
                      onClick={() => downloadFile('run-windows.bat', windowsBatContent)}
                      className="mt-2 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>دانلود فایل run-windows.bat</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 font-bold flex items-center justify-center shrink-0 text-xs">
                    ۳
                  </span>
                  <div>
                    <strong className="text-white block mb-0.5">اتصال موبایل بازیکنان با Wi-Fi:</strong>
                    <p className="text-neutral-400 text-[11px]">
                      لپ‌تاپ و گوشی‌ها به یک مودم یا هات‌اسپات مشترک وصل باشند. بازیکنان با دوربین گوشی QR کد را اسکن می‌کنند و وارد بازی می‌شوند. اینترنت اصلاً مصرف نمی‌شود!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick CMD Commands for Pro Users */}
            <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-2xl">
              <span className="text-[11px] text-neutral-400 block mb-1 font-bold">دستورات دستی در ترمینال یا CMD ویندوز:</span>
              <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2 rounded-xl font-mono text-[11px] text-emerald-400 direction-ltr text-left">
                <code>npm install && npm run dev</code>
                <button
                  onClick={() => handleCopy('npm install && npm run dev', 'cmd-win')}
                  className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] cursor-pointer"
                >
                  {copiedKey === 'cmd-win' ? 'کپی شد!' : 'کپی'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Linux Tutorial */}
        {activeTab === 'linux' && (
          <div className="space-y-4 text-xs leading-relaxed flex-1">
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <span>🐧 آموزش اجرا در لینوکس (Ubuntu, Debian, Fedora, Arch):</span>
              </div>

              <div className="space-y-3 pr-2">
                <div>
                  <strong className="text-white block mb-1">مرحله ۱: نصب Node.js و npm</strong>
                  <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 direction-ltr text-left">
                    <code>sudo apt update && sudo apt install -y nodejs npm</code>
                    <button
                      onClick={() => handleCopy('sudo apt update && sudo apt install -y nodejs npm', 'apt')}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] cursor-pointer"
                    >
                      {copiedKey === 'apt' ? 'کپی شد!' : 'کپی'}
                    </button>
                  </div>
                </div>

                <div>
                  <strong className="text-white block mb-1">مرحله ۲: اجرای اسکریپت آماده لینوکس</strong>
                  <div className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl font-mono text-[11px] text-emerald-400 direction-ltr text-left">
                    <code>chmod +x run-linux.sh && ./run-linux.sh</code>
                    <button
                      onClick={() => handleCopy('chmod +x run-linux.sh && ./run-linux.sh', 'sh')}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] cursor-pointer"
                    >
                      {copiedKey === 'sh' ? 'کپی شد!' : 'کپی'}
                    </button>
                  </div>

                  <button
                    onClick={() => downloadFile('run-linux.sh', linuxShContent)}
                    className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل run-linux.sh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Downloadable Files Bundle */}
        {activeTab === 'files' && (
          <div className="space-y-3 text-xs flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Windows BAT */}
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="font-bold text-white block mb-1">run-windows.bat</span>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    فایل اجرایی ویندوز؛ با دو بار کلیک سرور را بالا می‌آورد و مرورگر را باز می‌کند.
                  </p>
                </div>
                <button
                  onClick={() => downloadFile('run-windows.bat', windowsBatContent)}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود run-windows.bat</span>
                </button>
              </div>

              {/* Linux SH */}
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="font-bold text-white block mb-1">run-linux.sh</span>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    اسکریپت بش لینوکس برای توزیع‌های اوبونتو، دبیان، آرچ و فدورا.
                  </p>
                </div>
                <button
                  onClick={() => downloadFile('run-linux.sh', linuxShContent)}
                  className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود run-linux.sh</span>
                </button>
              </div>

              {/* Readme Guide */}
              <div className="bg-neutral-950 border border-neutral-800 p-3.5 rounded-2xl flex flex-col justify-between">
                <div>
                  <span className="font-bold text-white block mb-1">README_OFFLINE.md</span>
                  <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                    دفترچه راهنمای فارسی با توضیحات کامل شبکه محلی، پورت‌ها و حل خطاهای احتمالی.
                  </p>
                </div>
                <button
                  onClick={() => downloadFile('README_OFFLINE.md', readmeContent)}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود راهنمای کامل فارسی</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
            <span>نکته: بدون اینترنت، روی شبکه محلی Wi-Fi کار می‌کند.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
