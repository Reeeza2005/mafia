import { RoleContract } from "../types/roles";

export interface PriestRole extends RoleContract {
  cleansesSilence: boolean;      // ابطال سکوت ناتاشا و برگرداندن حق صحبت هدف
  canCleanseSelf: boolean;       // مجاز به انتخاب خود برای پاک‌سازی
}

export const priest: PriestRole = {
  id: "priest",
  name: "کشیش",
  team: "citizen",
  nightPriority: 2,              // اولویت ۲: همزمان با نجات‌ها و پیش از شلیک
  actionCategory: "save",
  hasDefaultArmor: false,
  cleansesSilence: true,         // پاک‌سازی اثر سکوت ناتاشا
  canCleanseSelf: true,          // حق انتخاب خود در شب
};
