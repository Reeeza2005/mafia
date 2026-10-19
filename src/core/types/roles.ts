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

// ==========================================
// قرارداد داده: بمب‌گذار ۳ سیمه (3-Wire Bomber)
// ==========================================
export type BombWireColor = "red" | "blue" | "yellow";
export type BombOutcomeType = "defuse" | "target_death" | "bomber_death";

export interface ActiveBombState {
  bomberId: string;
  bomberName: string;
  victimId: string;
  victimName: string;
  wires: Record<BombWireColor, BombOutcomeType>;
  status: "planted" | "triggered" | "defused" | "exploded_target" | "exploded_bomber" | "timeout_exploded";
  selectedWire?: BombWireColor;
  plantedAtNight: number;
  timerSecondsLeft?: number;
}

// ==========================================
// قرارداد داده: تفنگ‌دار (Gunsmith)
// ==========================================
export type GunBulletType = "live" | "blank";

export interface PlayerGunState {
  recipientId: string;
  recipientName: string;
  bulletType: GunBulletType;
  isUsed: boolean;
  assignedNight: number;
  shotDay?: number;
  shotTargetId?: string;
  shotTargetName?: string;
}
