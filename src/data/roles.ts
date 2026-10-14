import { Role } from '../types/mafia';

export const ALL_ROLES: Role[] = [
  {
    id: 'simple_mafia',
    name: 'مافیا ساده',
    englishName: 'Simple Mafia',
    team: 'mafia',
    isSimple: true,
    summary: 'عضو وفادار مافیا؛ همفکری در شب و گمراه کردن شهروندان در روز',
    description: 'مافیا ساده یکی از ارکان اصلی ساید مافیاست. قابلیت فعال انفرادی ندارد و در شلیک شبانه مشارکت می‌کند. (قابلیت: دائمی در هر شب - نقش مقابل: کارآگاه).' ,
    abilities: ['همفکری در شلیک شبانه', 'ایجاد انحراف فکری در روز'],
    winningCondition: 'برابری تعداد مافیا با شهروندان.',
    tips: ['با آب‌وتاب صحبت کنید.' ],
    nightOrder: 1,
    wakeUpText: 'مافیا ساده همراه با تیم مافیا بیدار شود.'
  },
  {
    id: 'simple_citizen',
    name: 'شهروند ساده',
    englishName: 'Simple Citizen',
    team: 'citizen',
    isSimple: true,
    summary: 'ارتش اصلی شهر؛ استدلال منطقی و رأی‌گیری',
    description: 'بزرگ‌ترین گروه بازی بدون قابلیت شبانه. قدرت اصلی در تحلیل روز.',
    abilities: ['رأی‌گیری در دادگاه' ],
    winningCondition: 'پاکسازی کامل شهر از مافیا.',
    tips: ['جسورانه صحبت کنید.' ],
    nightOrder: 29,
    wakeUpText: 'شهروندان ساده در آرامش کامل استراحت می‌کنند.'
  },
  {
    id: 'godfather',
    name: 'پدرخوانده (گادفادر)',
    englishName: 'Godfather',
    team: 'mafia',
    isSimple: false,
    summary: 'رئیس کل مافیا؛ فرمانده شلیک شبانه و استعلام سفید در برابر کارآگاه',
    description: 'رهبر تیم مافیا. استعلام کارآگاه برای او همیشه سفید است. دارای جلیقه ضدگلوله پنهان.',
    abilities: ['تعیین شلیک نهایی', 'استعلام منفی کارآگاه'],
    winningCondition: 'پیروزی تیم مافیا.',
    tips: ['آرام صحبت کنید.' ],
    nightOrder: 2,
    wakeUpText: 'پدرخوانده بیدار شود و هدف شلیک را تعیین کند.'
  },
  {
    id: 'detective',
    name: 'کارآگاه',
    englishName: 'Detective',
    team: 'citizen',
    isSimple: false,
    summary: 'چشم بینای شهر؛ استعلام هویت مافیاها',
    description: 'هر شب استعلام هویت یک بازیکن را می‌گیرد. (قابلیت: دائمی - نقش مقابل: پدرخوانده).',
    abilities: ['استعلام هویت شبانه' ],
    winningCondition: 'شناخت و حذف تمام مافیاها.',
    tips: ['زود نقشتان را لو ندهید.' ],
    nightOrder: 15,
    wakeUpText: 'کارآگاه بیدار شود و استعلام بگیرد.'
  },
  {
    id: 'doctor',
    name: 'پزشک (دکتر)',
    englishName: 'Doctor',
    team: 'citizen',
    isSimple: false,
    summary: 'فرشته نجات؛ درمان فرد هدف شلیک',
    description: 'درمان شبانه. خودنجاتی ۱ بار در بازی. (قابلیت: دائمی - نقش مقابل: شلیک مافیا).',
    abilities: ['نجات از شلیک', 'حق خودنجاتی ۱ بار' ],
    winningCondition: 'حفظ شهروندان مفید.',
    tips: ['هدف مافیا را حدس بزنید.' ],
    nightOrder: 16,
    wakeUpText: 'پزشک بیدار شود و یک نفر را نجات دهد.'
  }
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
