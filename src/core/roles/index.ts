import { armored } from "./armored";
import { bodyguard } from "./bodyguard";
import { bomber } from "./bomber";
import { detective } from "./detective";
import { doctor } from "./doctor";
import { dr_lecter } from "./dr_lecter";
import { godfather } from "./godfather";
import { gunsmith } from "./gunsmith";
import { hacker } from "./hacker";
import { hostage_taker } from "./hostage_taker";
import { independent_jester } from "./independent_jester";
import { infiltrator } from "./infiltrator";
import { informant_mafia } from "./informant_mafia";
import { journalist } from "./journalist";
import { judge } from "./judge";
import { mistress } from "./mistress";
import { natasha } from "./natasha";
import { negotiator } from "./negotiator";
import { priest } from "./priest";
import { shadow_mafia } from "./shadow_mafia";
import { simple_citizen } from "./simple_citizen";
import { simple_mafia } from "./simple_mafia";
import { sniper } from "./sniper";
import { terrorist } from "./terrorist";
import { thief } from "./thief";
import { watcher } from "./watcher";

import { RoleContract } from "../types/roles";

export const ROLES_REGISTRY: Record<string, RoleContract> = {
  armored,
  bodyguard,
  bomber,
    detective,
  doctor,
  dr_lecter,
  godfather,
  gunsmith,
  hacker,
  hostage_taker,
  independent_jester,
  infiltrator,
  informant_mafia,
    journalist,
  judge,
    mistress,
  natasha,
  negotiator,
  priest,
  shadow_mafia,
    simple_citizen,
  simple_mafia,
  sniper,
  terrorist,
  thief,
  watcher,
};

export const getRoleDefinition = (roleId: string): RoleContract | undefined => ROLES_REGISTRY[roleId.toLowerCase()];

export * from "./armored";
export * from "./bodyguard";
export * from "./bomber";
export * from "./detective";
export * from "./doctor";
export * from "./dr_lecter";
export * from "./godfather";
export * from "./gunsmith";
export * from "./hacker";
export * from "./hostage_taker";
export * from "./independent_jester";
export * from "./infiltrator";
export * from "./informant_mafia";
export * from "./journalist";
export * from "./judge";
export * from "./mistress";
export * from "./natasha";
export * from "./negotiator";
export * from "./priest";
export * from "./shadow_mafia";
export * from "./simple_citizen";
export * from "./simple_mafia";
export * from "./sniper";
export * from "./terrorist";
export * from "./thief";
export * from "./watcher";
