import { Role } from '../types/mafia';

export const MAFIA_ROLES: Role[] = [
  {
    id: 'simple_mafia',
    name: 'مافیا ساده',
    englishName: 'Simple Mafia',
    team: 'mafia',
    isSimple: true,
    summary: 'عضو وفادار مافیا؛ همفکری در شب و گمراه کردن شهروندان در روز',
    description: 'مافیا ساده یکی از ارکان اصلی ساید مافیاست. قابلیت فعال شبانه انفرادی ندارد اما در شلیک شبانه مشارکت می‌کند. (قابلیت: دائمی در هر شب - نقش مقابل: کارآگاه).',
    abilities: ['همفکری در شلیک شبانه', 'ایجاد انحراف در روز'],
    winningCondition: 'برابری تعداد مافیا با شهروندان.',
    tips: ['با آب‌وتاب صحبت کنید.'],
    nightOrder: 1,
    wakeUpText: 'مافیا ساده بیدار شود.'
  },
  {
    id: 'godfather',
    name: 'پدرخوانده (گادفادر)',
    englishName: 'Godfather',
    team: 'mafia',
    isSimple: false,
    summary: 'رئیس کل مافیا؛ فرمانده شلیک شبانه و استعلام سفید در برابر کارآگاه',
    description: 'رهبر تیم مافیا. استعلام کارآگاه برای او همیشه سفید است. دارای جلیقه محافظ پنهان. (قابلیت: دائمی - نقش مقابل: کارآگاه).',
    abilities: ['تعیین شلیک نهایی', 'استعلام منفی کارآگاه'],
    winningCondition: 'پیروزی تیم مافیا.',
    tips: ['آرام صحبت کنید.'],
    nightOrder: 2,
    wakeUpText: 'پدرخوانده بیدار شود.'
  },
  {
    id: 'dr_lecter',
    name: 'دکتر لکتور',
    englishName: 'Dr. Lecter',
    team: 'mafia',
    isSimple: false,
    summary: 'پزشک مافیا؛ محافظت از یاران خود در برابر تیر اسنایپر',
    description: 'پزشک تیم مافیا. هر شب یکی از یاران خود را نجات می‌دهد. خودنجاتی حداکثر ۲ بار. (قابلیت: دائمی - نقش مقابل: اسنایپر).',
    abilities: ['نجات مافیا در شب'],
    winningCondition: 'پیروزی مافیا.',
    tips: ['از افراد زیر ذره‌بین محافظت کنید.'],
    nightOrder: 3,
    wakeUpText: 'دکتر لکتور بیدار شود.'
  }
];
