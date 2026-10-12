import React, { useState, useMemo } from 'react';
import { ALL_ROLES, PRESETS } from '../data/roles';
import { Role, Team } from '../types/mafia';
import { RoleIcon } from './RoleIcons';
import { Plus, Minus, Check, Sparkles, Shield, Skull, Eye, Info, Users, AlertCircle } from 'lucide-react';
import { audio } from '../utils/audio';

interface RoleSelectionPanelProps {
  selectedRoleCounts: Record<string, number>;
  onUpdateRoleCount: (roleId: string, count: number) => void;
  onSetPreset: (counts: Record<string, number>) => void;
  connectedPlayersCount: number;
  onDistribute: () => void;
  disabled?: boolean;
}

export const RoleSelectionPanel: React.FC<RoleSelectionPanelProps> = ({
  selectedRoleCounts,
  onUpdateRoleCount,
  onSetPreset,
  connectedPlayersCount,
  onDistribute,
  disabled = false,
}) => {
  const [filterTeam, setFilterTeam] = useState<Team | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingRole, setInspectingRole] = useState<Role | null>(null);

  // Total selected roles
  const totalSelectedCount = useMemo(() => {
    return Object.values(selectedRoleCounts).reduce((acc, c) => acc + (c || 0), 0);
  }, [selectedRoleCounts]);

  // Breakdown by teams
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

  // Filtered roles
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

  // Auto balance simple citizens
  const handleAutoFillWithCitizens = () => {
    const diff = connectedPlayersCount - totalSelectedCount;
    if (diff > 0) {
      const current = selectedRoleCounts['simple_citizen'] || 0;
      onUpdateRoleCount('simple_citizen', current + diff);
      audio.playFlip();
    }
  };

  const isCountMatching = totalSelectedCount === connectedPlayersCount && connectedPlayersCount > 0;

  return (
    <div className="space-y-4">
      {/* Top Banner & Scenario Presets */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-rose-500" />
              سیستم انتخاب نقش‌ها
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              نقش‌های خاص به‌صورت تک‌انتخاب (۰ یا ۱) و نقش‌های ساده دارای شمارنده عددی هستند.
            </p>
          </div>

          {/* Quick Presets */}
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
                className="text-xs px-2.5 py-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-750 text-neutral-200 hover:text-white border border-neutral-700/60 transition-all active:scale-95 disabled:opacity-50"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Live Status & Distribution Bar */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Team balance chips */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
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

          {/* Comparison counter & Action Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <div className="text-right">
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-400" />
                <span>کارت‌ها: </span>
                <span className={`font-mono font-bold ${
                  totalSelectedCount === connectedPlayersCount && connectedPlayersCount > 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}>
                  {totalSelectedCount}
                </span>
                <span className="text-neutral-500">از</span>
                <span className="font-mono font-bold text-white">
                  {connectedPlayersCount} بازیکن
                </span>
              </div>
              {totalSelectedCount < connectedPlayersCount && connectedPlayersCount > 0 && (
                <button
                  onClick={handleAutoFillWithCitizens}
                  className="text-[10px] text-sky-400 hover:text-sky-300 underline mt-0.5 block"
                >
                  تکمیل خودکار با شهروند ساده (+{connectedPlayersCount - totalSelectedCount})
                </button>
              )}
            </div>

            {/* Distribute Button */}
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
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white shadow-rose-900/50 hover:brightness-110 active:scale-95 cursor-pointer animate-pulse'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              توزیع تصادفی کارت‌ها
            </button>
          </div>
        </div>

        {/* Warning if mismatch */}
        {connectedPlayersCount > 0 && !isCountMatching && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-400/90 bg-amber-950/20 border border-amber-900/40 px-3 py-1.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {totalSelectedCount < connectedPlayersCount
                ? `تعداد کارت‌ها (${totalSelectedCount}) کمتر از بازیکنان متصل (${connectedPlayersCount}) است. لطفاً ${connectedPlayersCount - totalSelectedCount} نقش دیگر انتخاب کنید.`
                : `تعداد کارت‌ها (${totalSelectedCount}) بیشتر از بازیکنان متصل (${connectedPlayersCount}) است. لطفاً ${totalSelectedCount - connectedPlayersCount} نقش را غیرفعال کنید.`}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => setFilterTeam('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTeam === 'all'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            همه نقش‌ها ({ALL_ROLES.length})
          </button>
          <button
            onClick={() => setFilterTeam('mafia')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filterTeam === 'mafia'
                ? 'bg-rose-950 text-rose-200 border border-rose-800/80'
                : 'text-neutral-400 hover:text-rose-400'
            }`}
          >
            <Skull className="w-3 h-3" />
            مافیا (۷)
          </button>
          <button
            onClick={() => setFilterTeam('citizen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filterTeam === 'citizen'
                ? 'bg-sky-950 text-sky-200 border border-sky-800/80'
                : 'text-neutral-400 hover:text-sky-400'
            }`}
          >
            <Shield className="w-3 h-3" />
            شهروندان (۱۲)
          </button>
          <button
            onClick={() => setFilterTeam('independent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filterTeam === 'independent'
                ? 'bg-purple-950 text-purple-200 border border-purple-800/80'
                : 'text-neutral-400 hover:text-purple-400'
            }`}
          >
            <Eye className="w-3 h-3" />
            مستقل (۲)
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجوی نام یا قابلیت نقش..."
            className="w-full sm:w-64 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Grid of 21 Roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRoles.map((role) => {
          const count = selectedRoleCounts[role.id] || 0;
          const isSelected = count > 0;

          // Team-specific theme colors
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
              {/* Top part: Icon, Name, and Badges */}
              <div className="flex items-start gap-3">
                {/* SVG Icon */}
                <div
                  className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-neutral-950 p-1 border border-neutral-800 cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setInspectingRole(role)}
                  title="مشاهده جزئیات و توضیحات نقش"
                >
                  <RoleIcon roleId={role.id} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white truncate">{role.name}</h3>
                    <button
                      onClick={() => setInspectingRole(role)}
                      className="text-neutral-500 hover:text-neutral-300 p-0.5"
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

              {/* Bottom part: Selection Control (Toggle Switch vs Numeric Counter) */}
              <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded-md border ${theme.badge}`}>
                  {role.team === 'mafia' ? 'مافیا' : role.team === 'citizen' ? 'شهروند' : 'مستقل'}
                  {role.nightOrder ? ` • شب #${role.nightOrder}` : ''}
                </span>

                {/* RULE ENFORCEMENT: ONLY simple_citizen and simple_mafia have numeric counter (+ / -) */}
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
                      className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 text-neutral-300 flex items-center justify-center transition-colors"
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
                      className="w-6 h-6 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 flex items-center justify-center transition-colors"
                      title="افزایش تعداد"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  /* Special roles: Single Toggle Switch (0 or 1) */
                  <button
                    onClick={() => {
                      const next = count > 0 ? 0 : 1;
                      onUpdateRoleCount(role.id, next);
                      audio.playFlip();
                    }}
                    disabled={disabled}
                    className={`relative w-12 h-6 rounded-full transition-colors flex items-center px-1 ${
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
        })}
      </div>

      {/* Role Detailed Inspection Modal */}
      {inspectingRole && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setInspectingRole(null)}
              className="absolute top-4 left-4 text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800"
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
                <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-md font-semibold ${
                  inspectingRole.team === 'mafia'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : inspectingRole.team === 'citizen'
                    ? 'bg-sky-950 text-sky-300 border border-sky-800'
                    : 'bg-purple-950 text-purple-300 border border-purple-800'
                }`}>
                  {inspectingRole.team === 'mafia' ? 'ساید مافیا' : inspectingRole.team === 'citizen' ? 'ساید شهروند' : 'ساید مستقل'}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-bold text-neutral-300 block mb-1">خلاصه وظیفه:</span>
                <p className="text-neutral-400">{inspectingRole.summary}</p>
              </div>

              <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80">
                <span className="font-bold text-neutral-300 block mb-1">قوانین و عملکرد کامل:</span>
                <p className="text-neutral-300">{inspectingRole.description}</p>
              </div>

              {inspectingRole.wakeUpText && (
                <div className="bg-amber-950/20 p-3 rounded-xl border border-amber-900/40 text-amber-300">
                  <span className="font-bold block mb-1">کلام گرداننده در فاز شب:</span>
                  <p>«{inspectingRole.wakeUpText}»</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setInspectingRole(null)}
              className="mt-5 w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-white font-bold text-xs transition-colors"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
