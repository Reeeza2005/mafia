import { RoleContract } from "../types/roles";

export interface NegotiatorRole extends RoleContract {
  canRecruitCitizen: boolean;   // امکان یارگیری و الحاق شهروند به تیم مافیا
  maxTotalUses: number;         // سقف مجاز ۱ بار در کل بازی
  canTargetSelf: boolean;       // انتخاب خود (غیرمجاز)
}

export const negotiator: NegotiatorRole = {
  id: "negotiator",
  name: "مذاکره‌کننده",
  team: "mafia",
  nightPriority: 5,             // اولویت ۵: فاز تغییر وضعیت‌ها و جذب نیرو
  actionCategory: "status",
  hasDefaultArmor: false,
  canRecruitCitizen: true,
  maxTotalUses: 1,
  canTargetSelf: false,
};
