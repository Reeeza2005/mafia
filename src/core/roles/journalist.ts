import { RoleContract } from "../types/roles";

export interface JournalistRole extends RoleContract {
  checksSideShift: boolean;      // استعلام وضعیت تغییر ساید یا آلودگی هدف
  maxTotalUses: number;          // سقف مجاز ۲ استعلام در طول کل بازی
  canTargetSelf: boolean;        // انتخاب خود (غیرمجاز)
}

export const journalist: JournalistRole = {
  id: "journalist",
  name: "خبرنگار",
  team: "citizen",
  nightPriority: 4,              // اولویت ۴: فاز استعلام‌های شبانه
  actionCategory: "inquire",
  hasDefaultArmor: false,
  checksSideShift: true,
  maxTotalUses: 2,
  canTargetSelf: false,
};
