import { RoleContract } from "../types/roles";

export interface ArmoredRole extends RoleContract {
  initialArmorCount: number;     // تعداد جلیقه اولیه (۱ جلیقه)
  isDayArmorImmune: boolean;     // زره در دادگاه روز (خیر)
  isPassive: boolean;            // نقش پسیو شبانه
}

export const armored: ArmoredRole = {
  id: "armored",
  name: "زره‌پوش",
  team: "citizen",
  hasDefaultArmor: true,         // ۱ جلیقه فعال در شب
  initialArmorCount: 1,
  isDayArmorImmune: false,       // در دادگاه روز بدون زره است
  isPassive: true,
};
