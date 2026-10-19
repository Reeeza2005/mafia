import { RoleContract } from "../types/roles";

export interface InformantMafiaRole extends RoleContract {
  canInquireRole: boolean;       // امکان استعلام هویت/نقش بازیکن هدف برای تیم مافیا
  canTargetSelf: boolean;        // انتخاب خود (غیرمجاز)
}

export const informant_mafia: InformantMafiaRole = {
  id: "informant_mafia",
  name: "مخبر مافیا",
  team: "mafia",
  nightPriority: 4,              // اولویت ۴: فاز استعلام‌های شبانه
  actionCategory: "inquire",
  hasDefaultArmor: false,
  canInquireRole: true,
  canTargetSelf: false,
};
