import { RoleContract } from "../types/roles";

export interface TerroristRole extends RoleContract {
  suicideKillsTarget: boolean;   // با حذف انتحاری تروریست، هدف انتخاب‌شده نیز کشته می‌شود
  canTargetSelf: boolean;        // انتخاب خود (غیرمجاز)
  hasDayAction: boolean;         // فعال بودن قابلیت انتحار در فاز روز/دادگاه
}

export const terrorist: TerroristRole = {
  id: "terrorist",
  name: "تروریست",
  team: "mafia",
  actionCategory: "kill",
  hasDefaultArmor: false,
  suicideKillsTarget: true,
  canTargetSelf: false,
  hasDayAction: true,
};
