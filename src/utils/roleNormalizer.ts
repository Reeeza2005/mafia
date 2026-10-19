// src/utils/roleNormalizer.ts
const ROLE_ALIASES: Record<string, string> = {
  // ۱. دکتر لکتر
  'doctor_lecter': 'dr_lecter',
  'lecter': 'dr_lecter',

  // ۲. مافیای ساده
  'mafia': 'simple_mafia',

  // ۳. شهروند ساده
  'citizen': 'simple_citizen',

  // ۴. گروگان‌گیر
  'hostage': 'hostage_taker',

  // ۵. زره‌پوش / ضدگلوله
  'bulletproof': 'armored',
};

export function normalizeRoleId(roleId?: string | null): string {
  if (!roleId) return '';
  const clean = roleId.trim();
  return ROLE_ALIASES[clean] || clean;
}

export function isSameRole(roleA?: string | null, roleB?: string | null): boolean {
  return normalizeRoleId(roleA) === normalizeRoleId(roleB);
}
