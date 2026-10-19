import { RoleContract } from "../types/roles";

export interface MayorRole extends RoleContract {
  canVetoExecution: boolean;    // حق وتوی دادگاه و لغو خروج
  maxTotalUses: number;         // سقف ۱ بار استفاده در کل بازی
  hasDayAction: boolean;        // اکشن روزانه در فاز دادگاه
}

export const mayor: MayorRole = {
  id: "mayor",
  name: "شهردار",
  team: "citizen",
  actionCategory: "status",
  hasDefaultArmor: false,
  canVetoExecution: true,
  maxTotalUses: 1,
  hasDayAction: true,
};
