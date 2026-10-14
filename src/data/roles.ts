import { Role } from '../types/mafia';
import { MAFIA_ROLES } from './roles_mafia';
import { CITIZEN_ROLES } from './roles_citizens';

export const INDEPENDENT_ROLES: Role[] = [
  {
    id: 'independent_jester',
    name: 'دلقک (مستقل)',
    englishName: 'Jester',
    team: 'independent',
    isSimple: false,
    summary: 'هدف پیروزی شخصی: فریب دادن شهر برای اعدام خودش با رأی دادگاه',
    description: 'دلقک هیچ سلاحی ندارد؛ هدف او فریب دادن شهر برای اعدام خودش با رأی دادگاه است تا تنهایی برنده بازی شود.',
    abilities: ['فریب شهر برای صدور رأی اعدام'],
    winningCondition: 'خروج از بازی به وسیله رأی اعدام دادگاه.',
    tips: ['طوری بازی کنید که همه فکر کنند مافیا هستید.'],
    nightOrder: 30,
    wakeUpText: 'دلقک به دنبال فریب دادن شهر است.'
  }
];

export const ALL_ROLES: Role[] = [
  ...MAFIA_ROLES,
  ...CITIZEN_ROLES,
  ...INDEPENDENT_ROLES,
];

export const ROLE_MAP: Record<string, Role> = ALL_ROLES.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {} as Record<string, Role>);

export interface Preset {
  name: string;
  description: string;
  roles: Record<string, number>;
}

export const PRESETS: Preset[] = [
  {
    name: 'کلاسیک ۶ نفره (مبتدی)',
    description: '۲ مافیا، ۴ شهروند',
    roles: { simple_mafia: 1, godfather: 1, simple_citizen: 2, detective: 1, doctor: 1 }
  }
];
