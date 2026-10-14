import { Role } from '../types/mafia';

export const CITIZEN_ROLES: Role[] = [
  {
    id: 'simple_citizen',
    name: 'شهروند ساده',
    englishName: 'Simple Citizen',
    team: 'citizen',
    isSimple: true,
    summary: 'ارتش اصلی شهر؛ استدلال منطقی و رأی‌گیری',
    description: 'بدون قابلیت شبانه. قدرت اصلی در تحلیل روز.',
    abilities: ['رأی‌گیری در دادگاه'],
    winningCondition: 'پاکسازی شهر.',
    tips: ['جسورانه صحبت کنید.'],
    nightOrder: 29,
    wakeUpText: 'استراحت شهروندان.'
  },
  {
    id: 'detective',
    name: 'کارآگاه',
    englishName: 'Detective',
    team: 'citizen',
    isSimple: false,
    summary: 'چشم بینای شهر؛ استعلام هویت مافیاها',
    description: 'هر شب استعلام می‌گیرد. (قابلیت: دائمی - نقش مقابل: پدرخوانده، نفوذی، جوکر).',
    abilities: ['استعلام هویت شبانه'],
    winningCondition: 'حذف مافیا.',
    tips: ['زود لو ندهید.'],
    nightOrder: 15,
    wakeUpText: 'کارآگاه بیدار شود.'
  },
  {
    id: 'doctor',
    name: 'پزشک (دکتر)',
    englishName: 'Doctor',
    team: 'citizen',
    isSimple: false,
    summary: 'فرشته نجات؛ درمان فرد هدف شلیک',
    description: 'درمان شبانه. خودنجاتی ۱ بار. (قابلیت: دائمی - نقش مقابل: شلیک مافیا).',
    abilities: ['نجات از شلیک', 'یک بار حق خودنجاتی'],
    winningCondition: 'حفظ شهروندان.',
    tips: ['هدف مافیا را حدس بزنید.'],
    nightOrder: 16,
    wakeUpText: 'پزشک بیدار شود.'
  }
];
