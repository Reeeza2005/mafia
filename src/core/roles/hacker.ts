import { RoleContract } from "../types/roles";

export interface HackerRole extends RoleContract {
  hacksTargetTeam: boolean;      // استعلام مستقیم هویت تیمی هدف
  maxTotalUses: number;          // سقف مجاز ۲ بار در طول کل بازی
  canTargetSelf: boolean;        // انتخاب خود (غیرمجاز)
}

export const hacker: HackerRole = {
  id: "hacker",
  name: "هکر",
  team: "citizen",
  nightPriority: 4,              // اولویت ۴: فاز استعلام و پردازش اطلاعات
  actionCategory: "inquire",
  hasDefaultArmor: false,
  hacksTargetTeam: true,
  maxTotalUses: 2,
  canTargetSelf: false,
};
