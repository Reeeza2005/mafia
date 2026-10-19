import { RoleContract } from "../types/roles";

export interface SimpleMafiaRole extends RoleContract {
  canParticipateInChat: boolean; // حق تبادل نظر تیمی مافیا
}

export const simple_mafia: SimpleMafiaRole = {
  id: "simple_mafia",
  name: "مافیای ساده",
  team: "mafia",
  hasDefaultArmor: false,
  canParticipateInChat: true,
};
