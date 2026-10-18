import { Player } from "../types";
import { ROLE_MAP, isMafiaRoleId } from "../data/roles";

export function getSniperBulletQuota(players: Player[]): number {
  const mafiaCount = players.filter(p => {
    const role = ROLE_MAP[p.roleId || ""];
    return role?.team === "mafia" || isMafiaRoleId(p.roleId || "");
  }).length;

  if (mafiaCount <= 3) return 1;
  if (mafiaCount <= 5) return 2;
  return 3;
}
