import { RoleContract } from "../types/roles";

export interface ThiefRole extends RoleContract {
  blocksTargetAction: boolean;  // ابطال یا مسدود کردن اکشن شبانه هدف
  canTargetSelf: boolean;       // امکان انتخاب خود (غیرمجاز)
}

export const thief: ThiefRole = {
  id: "thief",
  name: "دزد",
  team: "mafia",
  nightPriority: 1,             // اولویت ۱: فاز بلاک پیش از تمام اکشن‌ها
  actionCategory: "block",
  hasDefaultArmor: false,
  blocksTargetAction: true,     // لغو اثر اکشن بازیکن هدف در آن شب
  canTargetSelf: false,         // فقط انتخاب سایر بازیکنان
};
