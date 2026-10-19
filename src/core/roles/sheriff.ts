import { RoleContract } from "../types/roles";

export interface SheriffRole extends RoleContract {
  hasDayAction: boolean;        // شلیک مستقیم در فاز روز
  maxTotalUses: number;         // سقف ۱ شلیک در طول بازی
  canTargetSelf: boolean;       // انتخاب خود (غیرمجاز)
  backfiresOnCitizen: boolean;  // حذف خود کلانتر در صورت اصابت به شهروند
}

export const sheriff: SheriffRole = {
  id: "sheriff",
  name: "کلانتر (مارشال)",
  team: "citizen",
  actionCategory: "kill",
  hasDefaultArmor: false,
  hasDayAction: true,
  maxTotalUses: 1,
  canTargetSelf: false,
  backfiresOnCitizen: true,
};
