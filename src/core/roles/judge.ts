import { RoleContract } from "../types/roles";

export interface JudgeRole extends RoleContract {
  issuesDirectVerdict: boolean; // صدور حکم قطعی خروج بدون نیاز به شمارش آرا
  maxTotalUses: number;        // سقف ۲ بار در طول کل بازی
  hasDayAction: boolean;       // اکشن روزانه در دادگاه
}

export const judge: JudgeRole = {
  id: "judge",
  name: "قاضی",
  team: "citizen",
  actionCategory: "status",
  hasDefaultArmor: false,
  issuesDirectVerdict: true,
  maxTotalUses: 2,
  hasDayAction: true,
};
