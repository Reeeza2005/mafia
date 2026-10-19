import { RoleContract } from "../types/roles";

export interface JokerRole extends RoleContract {
  maxTotalUses: number;          // حداکثر دفعات مجاز استفاده در کل بازی (۲ بار)
  invertsInquiry: boolean;       // وارونه‌سازی پاسخ استعلام کارآگاه روی هدف
  canTargetAnyone: boolean;      // مجاز به انتخاب هر بازیکن زنده (مافیا یا شهروند)
}

export function getJokerInvertedInquiry(originalPositive: boolean): boolean {
  return !originalPositive;
}

export const joker: JokerRole = {
  id: "joker",
  name: "جوکر",
  team: "mafia",
  nightPriority: 3,              // اولویت ۳: پیش از اجرای فاز استعلام کارآگاه (اولویت ۴)
  actionCategory: "status",
  hasDefaultArmor: false,
  maxTotalUses: 2,               // سقف استفاده ۲ بار در کل بازی
  invertsInquiry: true,
  canTargetAnyone: true,
};
