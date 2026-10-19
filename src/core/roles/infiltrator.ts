import { RoleContract } from "../types/roles";

export interface InfiltratorRole extends RoleContract {
  appearsAsCitizenToInquiry: boolean; // استعلام کارآگاه برای او منفی (شهروندی) است
  isPassive: boolean;                 // نقش پسیو شبانه
}

export const infiltrator: InfiltratorRole = {
  id: "infiltrator",
  name: "مافیای نفوذی",
  team: "mafia",
  hasDefaultArmor: false,
  isInquiryImmune: true,              // مصونیت در برابر استعلام کارآگاه (سبز/منفی)
  appearsAsCitizenToInquiry: true,
  isPassive: true,
};
