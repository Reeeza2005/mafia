import { RoleContract } from "../types/roles";

export interface IndependentJesterRole extends RoleContract {
  winsOnDayExecution: boolean;   // شرط پیروزی فردی در صورت اعدام در دادگاه روز
  isPassive: boolean;            // نقش پسیو شبانه و روزانه
}

export const independent_jester: IndependentJesterRole = {
  id: "independent_jester",
  name: "دلقک (مستقل)",
  team: "independent",
  actionCategory: "status",
  hasDefaultArmor: false,
  winsOnDayExecution: true,
  isPassive: true,
};
