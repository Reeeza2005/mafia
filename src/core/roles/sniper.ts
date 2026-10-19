import { RoleContract } from "../types/roles";

export interface SniperRole extends RoleContract {
  diesOnFriendlyFire: boolean;
  getDynamicBulletQuota: (mafiaCount: number) => number;
}

export function getSniperBulletQuota(mafiaCount: number): number {
  if (mafiaCount <= 3) return 1;
  if (mafiaCount <= 5) return 2;
  return 3;
}

export const sniper: SniperRole = {
  id: "sniper",
  name: "تک‌تیرانداز (اسنایپر)",
  team: "citizen",
  nightPriority: 3,
  actionCategory: "kill",
  hasNightShot: true,
  nightShootOrder: 2,          // شلیک پس از تیر مافیا
  maxTotalUses: 2,             // سهمیه پیش‌فرض
  diesOnFriendlyFire: true,    // کشته شدن در صورت شلیک به شهروند
  hasDefaultArmor: false,
  getDynamicBulletQuota: getSniperBulletQuota,
};
