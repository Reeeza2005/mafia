import { RoleContract } from "../types/roles";

export interface MistressRole extends RoleContract {
  grantsExtraMafiaShotOnDeath: boolean; // فعال‌سازی ۲ شلیک شب برای مافیا پس از مرگ معشوقه
}

export const mistress: MistressRole = {
  id: "mistress",
  name: "معشوقه",
  team: "mafia",
  hasDefaultArmor: false,
  grantsExtraMafiaShotOnDeath: true,
};
