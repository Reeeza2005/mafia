import { RoleContract } from "../types/roles";

export interface DoctorLecterRole extends RoleContract {
  canSaveCitizen: boolean;
  getDynamicMaxSelfSaves: (mafiaCount: number) => number;
}

export function getDrLecterMaxSelfSaves(mafiaCount: number): number {
  if (mafiaCount >= 3) return 2;
  return 1;
}

export const dr_lecter: DoctorLecterRole = {
  id: "dr_lecter",
  name: "دکتر لکتر",
  team: "mafia",
  nightPriority: 2,
  actionCategory: "save",
  maxSelfUses: 1, // مقدار پایه
  canSaveCitizen: false,
  getDynamicMaxSelfSaves: getDrLecterMaxSelfSaves,
};
