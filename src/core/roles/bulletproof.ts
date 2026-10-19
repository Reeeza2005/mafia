import { RoleContract } from "../types/roles";

export interface BulletproofRole extends RoleContract {
  isPermanentNightImmune: boolean; // مصونیت دائمی در برابر شلیک شبانه مافیا
  isPassive: boolean;              // نقش پسیو شبانه
}

export const bulletproof: BulletproofRole = {
  id: "bulletproof",
  name: "روئین‌تن",
  team: "citizen",
  hasDefaultArmor: true,           // زره شبانه دائمی
  isPermanentNightImmune: true,
  isPassive: true,
};
