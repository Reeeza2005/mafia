export const CANONICAL_ROLES = [
  // مافیا (۱۴ نقش)
  "godfather", "dr_lecter", "simple_mafia", "natasha", "thief",
  "hostage_taker", "bomber", "informant_mafia", "infiltrator",
  "negotiator", "shadow_mafia", "terrorist", "mistress", "joker",

  // شهروند (۱۵ نقش)
  "simple_citizen", "doctor", "detective", "sniper", "bodyguard",
  "priest", "watcher", "hacker", "gunsmith", "journalist",
  "armored", "bulletproof", "mayor", "judge", "sheriff",

  // مستقل (۱ نقش)
  "independent_jester"
] as const;

export type CanonicalRoleId = typeof CANONICAL_ROLES[number];
export type Team = "mafia" | "citizen" | "independent";
export type ActionCategory = "block" | "save" | "kill" | "inquire" | "status";

export interface RoleContract {
  id: CanonicalRoleId;
  name: string;
  team: Team;
  nightPriority?: number;
  actionCategory?: ActionCategory;
  hasDefaultArmor?: boolean;
  hasNightShot?: boolean;
  nightShootOrder?: number;
  maxSelfUses?: number;
  maxTotalUses?: number;
}
