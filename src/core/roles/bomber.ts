import { RoleContract } from "../types/roles";

export interface BomberRole extends RoleContract {
  plantsBomb: boolean;           // کار گذاشتن بمب ساعتی روی بازیکن هدف
  canTargetSelf: boolean;        // انتخاب خود (غیرمجاز)
  maxTotalUses: number;          // سقف مجاز ۱ بار در طول کل بازی
  hasDayAction: boolean;         // امکان انفجار یا اکشن تکمیلی در فاز روز
}

export const bomber: BomberRole = {
  id: "bomber",
  name: "بمب‌گذار",
  team: "mafia",
  nightPriority: 6,              // اولویت ۶: پس از فازهای شلیک و استعلام
  actionCategory: "status",
  hasDefaultArmor: false,
  plantsBomb: true,
  canTargetSelf: false,
  maxTotalUses: 1,
  hasDayAction: true,
};
