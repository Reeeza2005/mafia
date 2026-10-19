import { RoleContract } from "../types/roles";

export interface SimpleCitizenRole extends RoleContract {
  hasDayVote: boolean;   // حق رأی در دادگاه روز
}

export const simple_citizen: SimpleCitizenRole = {
  id: "simple_citizen",
  name: "شهروند ساده",
  team: "citizen",
  hasDefaultArmor: false,
  hasDayVote: true,
};
