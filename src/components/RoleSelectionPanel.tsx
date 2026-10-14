import React, { useState, useMemo } from 'react';
import { ALL_ROLES, PRESETS } from '../data/roles';
import { Role, Team, Player } from '../types/mafia';
import { RoleIcon } from './RoleIcons';
import {
  Plus,
  Minus,
  Check,
  Sparkles,
  Shield,
  Skull,
  Eye,
  Info,
  Users,
  AlertCircle,
  RefreshCw,
  Share2,
  Smartphone,
  Crown,
} from 'lucide-react';
import { audio } from '../utils/audio';

interface RoleSelectionPanelProps {
  selectedRoleCounts: Record<string, number>;
  onUpdateRoleCount: (roleId: string, count: number) => void;
  onSetPreset: (counts: Record<string, number>) => void;
  connectedPlayersCount: number;
  onDistribute: () => void;
  disabled?: boolean;
  roomCode?: string;
  players?: Player[];
  onOpenQr?: () => void;
  onGenerateNewCode?: () => void;
  onKickPlayer?: (playerId: string) => void;
}

export const RoleSelectionPanel: React.FC<RoleSelectionPanelProps> = ({
  selectedRoleCounts,
  onUpdateRoleCount,
  onSetPreset,
  connectedPlayersCount,
  onDistribute,
  disabled = false,
  roomCode = '1234',
  players = [],
  onOpenQr,
  onGenerateNewCode,
  onKickPlayer,
}) => {
  const [filterTeam, setFilterTeam] = useState<Team | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingRole, setInspectingRole] = useState<Role | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?room=${roomCode}&role=player`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedRoleCounts).reduce((acc, c) => acc + (c || 0), 0);
  }, [selectedRoleCounts]);

  const teamCounts = useMemo(() => {
    let mafia = 0;
    let citizen = 0;
    let independent = 0;

    ALL_ROLES.forEach((r) => {
      const count = selectedRoleCounts[r.id] || 0;
      if (r.team === 'mafia') mafia += count;
      if (r.team === 'citizen') citizen += count;
      if (r.team === 'independent') independent += count;
    });

    return { mafia, citizen, independent };
  }, [selectedRoleCounts]);

  const filteredRoles = useMemo(() => {
    return ALL_ROLES.filter((r) => {
      if (filterTeam !== 'all' && r.team !== filterTeam) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          r.englishName.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterTeam, searchQuery]);

  // Mafia team on Right, Citizens & Independent on Left
  const mafiaRoles = useMemo(() => filteredRoles.filter((r) => r.team === 'mafia'), [filteredRoles]);
  const citizenAndIndRoles = useMemo(() => filteredRoles.filter((r) => r.team !== 'mafia'), [filteredRoles]);

  const handleAutoFillWithCitizens = () => {
    const diff = connectedPlayersCount - totalSelectedCount;
    if (diff > 0) {
      const current = selectedRoleCounts['simple_citizen'] || 0;
      onUpdateRoleCount('simple_citizen', current + diff);
      audio.playFlip();
    }
  };

  const isCountMatching = totalSelectedCount === connectedPlayersCount && connectedPlayersCount > 0;

  const renderRoleCard = (role: Role) => {
    const count = selectedRoleCounts[role.id] || 0;
    const isSelected = count > 0;

    const theme =
      role.team === 'mafia'
        ? {
            border: isSelected ? 'border-rose-600/80 shadow-rose-950/40' : 'border-neutral-800/80',
            bg: isSelected ? 'bg-gradient-to-b from-neutral-900 to-rose-950/20' : 'bg-neutral-900/60',
            badge: 'bg-rose-950/60 text-rose-300 border-rose-800/50',
            accent: 'text-rose-400',
            glow: 'glow-mafia',
          }
        : role.team === 'citizen'
        ? {
            border: isSelected ? 'border-sky-500/80 shadow-sky-950/40' : 'border-neutral-800/80',
            bg: isSelected ? 'bg-gradient-to-b from-neutral-900 to-sky-950/20' : 'bg-neutral-900/60',
            badge: 'bg-sky-950/60 text-sky-300 border-sky-800/50',
            accent: 'text-sky-400',
            glow: 'glow-citizen',
          }
        : {
            border: isSelected ? 'border-purple-500/80 shadow-purple-950/40' : 'border-neutral-800/80',
            bg: isSelected ? 'bg-gradient-to-b from-neutral-900 to-purple-950/20' : 'bg-neutral-900/60',
            badge: 'bg-purple-950/60 text-purple-300 border-purple-800/50',
            accent: 'text-purple-400',
            glow: 'glow-neutral',
          };

    return (
      <div
        key={role.id}
        className={`relative rounded-2xl border p-3.5 flex flex-col justify-between transition-all duration-200 ${theme.bg} ${theme.border} ${
          isSelected ? 'shadow-lg ' + theme.glow : 'hover:border-neutral-700'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-neutral-950 p-1 border border-neutral-800 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setInspectingRole(role)}
            title="مشاهده جزئیات و توضیحات کامل"
          >
            <RoleIcon roleId={role.id} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-sm font-bold text-white truncate">{role.name}</h3>
              <button
                onClick={() => setInspectingRole(role)}
                className="text-neutral-500 hover:text-neutral-300 p-0.5 cursor-pointer"
                title="اطلاعات نقش"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-snug">
              {role.summary}
            </p>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between">
          <span className={`text-[10px] px-2 py-0.5 rounded-md border ${theme.badge}`}>
            {role.team === 'mafia' ? 'مافیا' : role.team === 'citizen' ? 'شهروند' : 'مستقل'}
            {role.nightOrder ? ` • شب #${role.nightOrder}` : ''}
          </span>

          {role.isSimple ? (
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-xl p-0.5">
              <button
                onClick={() => {
                  if (count > 0) {
                    onUpdateRoleCount(role.id, count - 1);
                    audio.playTick();
                  }
                }}
                disabled={count === 0 || disabled}
                className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                title="کاهش تعداد"
              >
                <Minus className="w-3 h-3" />
              </button>

              <span className="w-6 text-center font-mono font-bold text-xs text-white">
                {count}
              </span>

              <button
                onClick={() => {
                  onUpdateRoleCount(role.id, count + 1);
                  audio.playTick();
                }}
                disabled={disabled}
                className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center transition-colors cursor-pointer"
                title="افزایش تعداد"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const next = count > 0 ? 0 : 1;
                onUpdateRoleCount(role.id, next);
                audio.playFlip();
              }}
              disabled={disabled}
              className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 cursor-pointer ${
                isSelected
                  ? role.team === 'mafia'
                    ? 'bg-rose-600'
                    : role.team === 'citizen'
                    ? 'bg-sky-500'
                    : 'bg-purple-600'
                  : 'bg-neutral-800'
              }`}
              title={isSelected ? 'غیرفعال کردن نقش' : 'فعال کردن نقش'}
            >
              <span
                className={`w-4 h-4 rounded-full bg-white transition-transform flex items-center justify-center shadow-md ${
                  isSelected ? 'translate-x-0' : '-translate-x-6'
                }`}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-neutral-900 stroke-[3]" />}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ROOM INVITE CODE & PLAYER ROSTER */}
      <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-amber-600/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>پنل گرداننده (God)</span>
              </span>
              <span className="text-xs text-neutral-400">
                ظرفیت اتاق: <strong className="text-amber-400 font-mono font-bold">{players.length}/50</strong> نفر
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="text-sm font-bold text-neutral-300">کد دعوت اتاق:</span>
              <span className="font-mono text-3xl font-black text-amber-400 tracking-widest bg-neutral-950 px-4 py-1 rounded-2xl border border-amber-500/50 shadow-inner">
                {roomCode}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onGenerateNewCode && (
              <button
                type="button"
                onClick={onGenerateNewCode}
                className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>تولید کد جدید</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-amber-950/40 active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'کپی شد!' : 'کپی لینک و کد'}</span>
            </button>
            {onOpenQr && (
              <button
                type="button"
                onClick={onOpenQr}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                <span>نمایش QR کد</span>
              </button>
            )}
          </div>
        </div>

        {/* Players List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              <span>بازیکنان متصل به این اتاق ({players.length} از ۵۰ نفر):</span>
            </span>
          </div>

          {players.length === 0 ? (
            <div className="p-4 rounded-2xl bg-neutral-950/70 border border-neutral-800 text-center text-xs text-neutral-500">
              ⏳ هیچ بازیکنی هنوز وارد اتاق نشده است.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map((p, idx) => (
                <div
                  key={p.id}
                  className="bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs transition-all shadow-sm"
                >
                  <span className="w-5 h-5 rounded-full bg-neutral-800 text-neutral-300 font-mono text-[10px] flex items-center justify-center font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-white">{p.name}</span>
                  {p.connected ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-neutral-600" />
                  )}
                  {onKickPlayer && (
                    <button
                      type="button"
                      onClick={() => onKickPlayer(p.id)}
                      className="text-neutral-500 hover:text-rose-400 text-xs mr-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scenario Presets & Distribution Bar */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              سیستم انتخاب نقش‌ها
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              شهروند ساده و مافیای ساده در بالا؛ گروه مافیا در سمت راست و شهروندان در سمت چپ.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <span className="text-[11px] text-neutral-500 ml-1">سناریوها:</span>
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => {
                  onSetPreset(preset.roles);
                  audio.playFlip();
                }}
                disabled={disabled}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-750 text-neutral-200 border border-neutral-700/60 cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-rose-950/40 border border-rose-900/60 px-3 py-1 rounded-xl text-xs text-rose-300">
              <Skull className="w-3.5 h-3.5 text-rose-400" />
              <span>مافیا:</span>
              <span className="font-bold font-mono">{teamCounts.mafia}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-sky-950/40 border border-sky-900/60 px-3 py-1 rounded-xl text-xs text-sky-300">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span>شهروند:</span>
              <span className="font-bold font-mono">{teamCounts.citizen}</span>
            </div>
            {teamCounts.independent > 0 && (
              <div className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-900/60 px-3 py-1 rounded-xl text-xs text-purple-300">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                <span>مستقل:</span>
                <span className="font-bold font-mono">{teamCounts.independent}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-400" />
                <span>کارت‌ها: </span>
                <span className={`font-mono font-bold ${isCountMatching ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {totalSelectedCount}
                </span>
                <span className="text-neutral-500">از</span>
                <span className="font-mono font-bold text-white">{connectedPlayersCount} بازیکن</span>
              </div>
              {totalSelectedCount < connectedPlayersCount && connectedPlayersCount > 0 && (
                <button
                  onClick={handleAutoFillWithCitizens}
                  className="text-[10px] text-sky-400 hover:text-sky-300 underline mt-0.5 block cursor-pointer"
                >
                  تکمیل خودکار با شهروند ساده (+{connectedPlayersCount - totalSelectedCount})
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (isCountMatching) {
                  audio.playGavel();
                  onDistribute();
                }
              }}
              disabled={!isCountMatching || disabled}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-lg ${
                isCountMatching && !disabled
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white cursor-pointer animate-pulse'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              توزیع تصادفی کارت‌ها
            </button>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex justify-end">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجوی نام یا قابلیت نقش..."
          className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
        />
      </div>

      {/* 2-COLUMN LAYOUT: MAFIA ON RIGHT, CITIZENS ON LEFT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RIGHT COLUMN: MAFIA TEAM */}
        <div className="bg-neutral-950/40 border border-rose-950/40 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-950/60 pb-2">
            <h3 className="text-sm font-black text-rose-400 flex items-center gap-2">
              <Skull className="w-4 h-4" />
              <span>گروه مافیا (سمت راست)</span>
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 font-mono font-bold">
              {mafiaRoles.length} کارت
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {mafiaRoles.map(renderRoleCard)}
          </div>
        </div>

        {/* LEFT COLUMN: CITIZEN & INDEPENDENT TEAMS */}
        <div className="bg-neutral-950/40 border border-sky-950/40 rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-sky-950/60 pb-2">
            <h3 className="text-sm font-black text-sky-400 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>گروه شهروندان و مستقل (سمت چپ)</span>
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-300 font-mono font-bold">
              {citizenAndIndRoles.length} کارت
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {citizenAndIndRoles.map(renderRoleCard)}
          </div>
        </div>
      </div>

      {/* Role Detailed Inspection Modal */}
      {inspectingRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setInspectingRole(null)}
              className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800 cursor-pointer"
            >
              ✕
            </button>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-neutral-950 p-2 border border-neutral-800 shrink-0">
                <RoleIcon roleId={inspectingRole.id} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{inspectingRole.name}</h3>
                <p className="text-xs text-neutral-400 font-mono">{inspectingRole.englishName}</p>
                <span className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-md font-semibold bg-neutral-800 text-neutral-300">
                  {inspectingRole.team === 'mafia' ? 'ساید مافیا' : inspectingRole.team === 'citizen' ? 'ساید شهروند' : 'ساید مستقل'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-neutral-300 block mb-1">خلاصه وظیفه:</span>
                <p className="text-neutral-400">{inspectingRole.summary}</p>
              </div>

              <div className="bg-neutral-950/70 p-3.5 rounded-xl border border-neutral-800">
                <span className="font-bold text-neutral-300 block mb-1">قوانین و راهنمای جامع (توضیحات کامل):</span>
                <p className="text-neutral-300 leading-relaxed text-justify">{inspectingRole.description}</p>
              </div>

              {inspectingRole.wakeUpText && (
                <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-900/40 text-amber-300">
                  <span className="font-bold block mb-1">کلام گرداننده در فاز شب:</span>
                  <p>«{inspectingRole.wakeUpText}»</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectingRole(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
