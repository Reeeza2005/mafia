import { RoleContract } from "../types/roles";

export interface DetectiveRole extends RoleContract {
  canInquireEveryNight: boolean;
  isInquiryPositive: (targetRole: RoleContract) => boolean;
}

export function evaluateInquiry(targetRole: { team: string; isInquiryImmune?: boolean }): boolean {
  if (targetRole.isInquiryImmune) return false;
  return targetRole.team === "mafia";
}

export const detective: DetectiveRole = {
  id: "detective",
  name: "کارآگاه",
  team: "citizen",
  nightPriority: 4,
  actionCategory: "inquire",
  canInquireEveryNight: true,
  hasDefaultArmor: false,
  isInquiryPositive: evaluateInquiry,
};
