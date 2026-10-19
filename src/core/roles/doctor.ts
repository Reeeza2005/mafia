import { RoleContract } from "../types/roles";

export interface DoctorRole extends RoleContract {
  canSaveAnyone: boolean;
  getDynamicMaxSelfSaves: (totalPlayersCount: number) => number;
}

export function getDoctorMaxSelfSaves(totalPlayersCount: number): number {
  if (totalPlayersCount >= 16) return 3;
  if (totalPlayersCount >= 11) return 2;
  return 1;
}

export const doctor: DoctorRole = {
  id: "doctor",
  name: "پزشک",
  team: "citizen",
  nightPriority: 2,
  actionCategory: "save",
  maxSelfUses: 1, // مقدار پایه برای بازی‌های کوچک (زیر ۱۱ نفر)
  canSaveAnyone: true,
  hasDefaultArmor: false,
  getDynamicMaxSelfSaves: getDoctorMaxSelfSaves,
};
