import { ROLE_MAP } from "../data/roles";

export function getSniperBulletQuota(players: any[]): number {
  if (!Array.isArray(players) || players.length === 0) return 2;

  const mafiaCount = players.filter(p => {
    const roleId = p.roleId || "";
    const role = ROLE_MAP[roleId];
    return role?.team === "mafia" || roleId === "godfather" || roleId === "dr_lecter" || roleId === "doctor_lecter" || roleId === "infiltrator";
  }).length;

  if (mafiaCount <= 3) return 1;
  if (mafiaCount <= 5) return 2;
  return 3;
}
