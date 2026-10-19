import { RoleContract } from "../types/roles";

export interface ShadowMafiaRole extends RoleContract {
  camouflagesMafiaFromWatcher: boolean; // مخفی‌سازی کامل ردپای هدف از دیده‌بان و استعلام‌ها
  maxTotalUses: number;                 // سقف استفاده ۱ بار در کل بازی
  targetTeamFilter: "mafia_only";       // فیلتر هدف‌گیری فقط روی اعضای مافیا
}

export const shadow_mafia: ShadowMafiaRole = {
  id: "shadow_mafia",
  name: "شبح مافیا",
  team: "mafia",
  nightPriority: 3,                     // اولویت ۳: پیش از فاز استعلام و رصد دیده‌بان (اولویت ۴)
  actionCategory: "status",
  hasDefaultArmor: false,
  camouflagesMafiaFromWatcher: true,
  maxTotalUses: 1,
  targetTeamFilter: "mafia_only",
};
