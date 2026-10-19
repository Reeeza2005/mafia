import { RoleContract } from "../types/roles";

export interface GodfatherRole extends RoleContract {
  isInquiryImmune: boolean;
  isMafiaShooter: boolean;
}

export const godfather: GodfatherRole = {
  id: "godfather",
  name: "رئیس مافیا (گادفادر)",
  team: "mafia",
  nightPriority: 3,
  actionCategory: "kill",
  hasDefaultArmor: true,
  isInquiryImmune: true,
  hasNightShot: true,
  nightShootOrder: 1,
  isMafiaShooter: true,
};
