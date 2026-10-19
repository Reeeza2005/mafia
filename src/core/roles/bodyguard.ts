import { RoleContract } from "../types/roles";

export interface BodyguardRole extends RoleContract {
  canProtectSelf: boolean;       // امکان محافظت از خود (غیرمجاز - فقط دیگران)
  takesDamageForTarget: boolean; // جذب شلیک به جای هدف
}

export const bodyguard: BodyguardRole = {
  id: "bodyguard",
  name: "بادیگارد (نگهبان)",
  team: "citizen",
  nightPriority: 2,              // اولویت ۲: همزمان با نجات‌ها و پیش از شلیک
  actionCategory: "save",
  hasDefaultArmor: true,         // ۱ جلیقه شب در برابر شلیک
  canProtectSelf: false,         // فقط مجاز به نگهبانی از سایرین
  takesDamageForTarget: true,    // سپر انسانی در برابر تیر مستقیم
};
