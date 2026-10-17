import { Player } from "../types/mafia";
import { ALL_ROLES, ROLE_MAP } from "./roles";

export type RoleActionPhase = "night" | "day" | "passive";
export type TargetFilterType = 
  | "all_alive"
  | "all_alive_except_self"
  | "mafia_only"
  | "citizens_only"
  | "citizens_only_except_self"
  | "two_alive_players"
  | "none";

export interface RoleRuleDefinition {
  id: string;
  name: string;
  team: "mafia" | "citizen" | "independent";
  phase: RoleActionPhase;
  nightOrder?: number;
  wakeUpText?: string;
  hasNightAction: boolean;
  hasDayAction: boolean;
  defaultQuota: {
    maxTotalUses?: number;
    maxSelfUses?: number;
    bullets?: { war: number; blank: number } | number;
    inquiries?: number;
  };
  targetFilter: TargetFilterType;
  description: string;
  resolutionEffect: string;
  passiveFeatures?: string[];
}

export interface QuotaTracker {
  [playerId: string]: {
    totalUses: number;
    selfUses: number;
    bulletsLeft?: number;
    warBulletsLeft?: number;
    blankBulletsLeft?: number;
    inquiriesLeft?: number;
    armorActive?: boolean;
  };
}

export const ROLES_RULES_MATRIX: Record<string, RoleRuleDefinition> = {
  // ---------------- تیم مافیا ----------------
  godfather: {
    id: "godfather",
    name: "پدرخوانده (گادفادر)",
    team: "mafia",
    phase: "night",
    nightOrder: 1,
    wakeUpText: "پدرخوانده و اعضای مافیا برای هماهنگی و شلیک بیدار شوند.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "citizens_only",
    description: "فرمانده شات شب مافیا؛ مصون در برابر استعلام کارآگاه؛ دارای یک جلیقه شب.",
    resolutionEffect: "تیر شب مافیا به هدف اعمال می‌شود. اگر توسط اسنایپر زده شود جلیقه می‌افتد ولی نمی‌میرد.",
    passiveFeatures: ["استعلام منفی (سبز) برای کارآگاه", "یک بار جلیقه شب در برابر تیر اسنایپر"]
  },
  dr_lecter: {
    id: "dr_lecter",
    name: "دکتر لکتور",
    team: "mafia",
    phase: "night",
    nightOrder: 2,
    wakeUpText: "دکتر لکتور برای محافظت از مافیا بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { maxSelfUses: 1 },
    targetFilter: "mafia_only",
    description: "نجات‌دهنده مافیا از تیر اسنایپر؛ وارث اول تیر شب در صورت مرگ گادفادر.",
    resolutionEffect: "شلیک اسنایپر روی هدف مافیایی را خنثی می‌کند.",
    passiveFeatures: ["حق سیو ۱ بار خود در طول بازی"]
  },
  natasha: {
    id: "natasha",
    name: "ناتاشا (سایلنسر)",
    team: "mafia",
    phase: "night",
    nightOrder: 3,
    wakeUpText: "ناتاشا برای سکوت دادن یک بازیکن بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "سکوت دادن یک بازیکن برای کل روز بعد (سلب حق صحبت، رأی و چالش).",
    resolutionEffect: "هدف در روز سایلنت می‌شود مگر آنکه کشیش همان شب او را تطهیر کند."
  },
  thief: {
    id: "thief",
    name: "سارق (جیب‌بر)",
    team: "mafia",
    phase: "night",
    nightOrder: 4,
    wakeUpText: "سارق برای سرقت توانایی یک بازیکن بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "سرقت قابلیت شبانه هدف برای آن شب.",
    resolutionEffect: "اکشن شبانه هدف برای آن شب بلاک می‌شود."
  },
  hostage_taker: {
    id: "hostage_taker",
    name: "گروگان‌گیر",
    team: "mafia",
    phase: "night",
    nightOrder: 5,
    wakeUpText: "گروگان‌گیر برای گروگان‌گیری بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "خلع سلاح و بلاک کردن توانایی شبانه یک بازیکن.",
    resolutionEffect: "نقش هدف در تقدم اول شب خلع سلاح می‌شود و اکشن آن اجرا نمی‌شود."
  },
  bomber: {
    id: "bomber",
    name: "بمب‌گذار",
    team: "mafia",
    phase: "night",
    nightOrder: 6,
    wakeUpText: "بمب‌گذار برای کار گذاشتن بمب بیدار شود.",
    hasNightAction: true,
    hasDayAction: true,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "all_alive_except_self",
    description: "کار گذاشتن بمب ساعتی روی یک بازیکن.",
    resolutionEffect: "بمب روی هدف فعال شده و در صورت عدم خنثی‌سازی روز بعد منفجر می‌شود."
  },
  joker: {
    id: "joker",
    name: "جوکر",
    team: "mafia",
    phase: "night",
    nightOrder: 7,
    wakeUpText: "جوکر برای فریب استعلام کارآگاه بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { maxTotalUses: 2 },
    targetFilter: "all_alive",
    description: "معکوس کردن نتیجه استعلام کارآگاه روی هدف برای همان شب.",
    resolutionEffect: "اگر کارآگاه از این فرد استعلام بگیرد پاسخ برعکس می‌شود."
  },
  informant_mafia: {
    id: "informant_mafia",
    name: "خبرچین مافیا",
    team: "mafia",
    phase: "night",
    nightOrder: 8,
    wakeUpText: "خبرچین مافیا برای کسب اطلاعات بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { inquiries: 2 },
    targetFilter: "citizens_only",
    description: "شناسایی وجود نقش‌های کلیدی شهروندی.",
    resolutionEffect: "سیستم به خبرچین اطلاع می‌دهد که هدف نقش کلیدی دارد یا خیر."
  },
  infiltrator: {
    id: "infiltrator",
    name: "مافیای نفوذی",
    team: "mafia",
    phase: "passive",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "مافیای ناشناخته در شب؛ استعلامش منفی است تا زمان بیداری رسمی.",
    resolutionEffect: "استعلام کارآگاه برای او منفی نمایش داده می‌شود.",
    passiveFeatures: ["استعلام منفی قبل از بیداری رسمی"]
  },
  negotiator: {
    id: "negotiator",
    name: "مذاکره‌کننده",
    team: "mafia",
    phase: "night",
    nightOrder: 9,
    wakeUpText: "مذاکره‌کننده برای یارگیری بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "citizens_only",
    description: "مذاکره با یک شهروند ساده برای تغییر ساید به مافیا در صورت مرگ یک یار مافیایی.",
    resolutionEffect: "در صورت توافق، نقش شهروند به مافیای ساده تبدیل می‌شود."
  },
  shadow_mafia: {
    id: "shadow_mafia",
    name: "شبح مافیا",
    team: "mafia",
    phase: "night",
    nightOrder: 10,
    wakeUpText: "شبح مافیا برای استتار بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "mafia_only",
    description: "استتار کامل ردپای مافیا در برابر دیده‌بان و استعلام‌ها.",
    resolutionEffect: "دیده‌بان هیچ ردپایی از شب پیرامون این فرد ثبت نخواهد کرد."
  },
  terrorist: {
    id: "terrorist",
    name: "تروریست",
    team: "mafia",
    phase: "day",
    hasNightAction: false,
    hasDayAction: true,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "all_alive_except_self",
    description: "انفجار انتحاری همراه با یک بازیکن در صورت اعدام در دادگاه روز.",
    resolutionEffect: "هنگام اعدام، یک بازیکن را انتخاب کرده و هر دو از بازی خارج می‌شوند."
  },
  mistress: {
    id: "mistress",
    name: "معشوقه",
    team: "mafia",
    phase: "passive",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "رکن روحی مافیا؛ با حذف او مافیا در شب بعد ۲ تیر به دست می‌آورد.",
    resolutionEffect: "با مرگ او فلگ ۲ شات مافیا برای شب بعد فعال می‌شود.",
    passiveFeatures: ["اعطای ۲ تیر به مافیا در شب پس از مرگ"]
  },
  simple_mafia: {
    id: "simple_mafia",
    name: "مافیا ساده",
    team: "mafia",
    phase: "night",
    nightOrder: 1,
    wakeUpText: "مافیای ساده همراه با تیم بیدار می‌شود.",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "عضو تیم مافیا؛ شرکت در چت شب؛ وارث تیر پس از حذف گادفادر و لکتور.",
    resolutionEffect: "در صورت فوت لکتور و گادفادر، شلیک شب به او واگذار می‌شود."
  },

  // ---------------- تیم شهروند ----------------
  doctor: {
    id: "doctor",
    name: "پزشک (دکتر)",
    team: "citizen",
    phase: "night",
    nightOrder: 11,
    wakeUpText: "پزشک برای مداوا بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { maxSelfUses: 1 },
    targetFilter: "all_alive",
    description: "نجات هدف از تیر شب مافیا؛ حداکثر ۱ بار نجات خود در بازی.",
    resolutionEffect: "اگر هدف مورد اصابت شلیک مافیا قرار گرفته باشد از مرگ نجات می‌یابد."
  },
  detective: {
    id: "detective",
    name: "کارآگاه",
    team: "citizen",
    phase: "night",
    nightOrder: 12,
    wakeUpText: "کارآگاه برای استعلام هویت بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "استعلام مافیا مثبت 🔴 و شهروند منفی 🟢؛ گادفادر همیشه منفی است.",
    resolutionEffect: "نتیجه استعلام هویت روی صفحه گوشی کارآگاه و پنل گاد نمایش می‌یابد."
  },
  sniper: {
    id: "sniper",
    name: "اسنایپر (حرفه‌ای)",
    team: "citizen",
    phase: "night",
    nightOrder: 13,
    wakeUpText: "اسنایپر برای شلیک شب بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { bullets: 2 },
    targetFilter: "all_alive_except_self",
    description: "شلیک به مافیا باعث مرگ مافیا می‌شود؛ شلیک به شهروند منجر به مرگ خود اسنایپر می‌گردد.",
    resolutionEffect: "اصابت به مافیا حذف مافیا و اصابت به شهروند مرگ اسنایپر را ثبت می‌کند."
  },
  bodyguard: {
    id: "bodyguard",
    name: "بادیگارد (محافظ)",
    team: "citizen",
    phase: "night",
    nightOrder: 14,
    wakeUpText: "بادیگارد برای محافظت جانی بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "فداکاری به جای هدف؛ در صورت شلیک به هدف بادیگارد به جای او کشته می‌شود.",
    resolutionEffect: "اگر هدف تیر بخورد، بادیگارد فدا شده و هدف زنده می‌ماند."
  },
  priest: {
    id: "priest",
    name: "کشیش",
    team: "citizen",
    phase: "night",
    nightOrder: 15,
    wakeUpText: "کشیش برای تطهیر و ابطال سایلنت بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive",
    description: "تطهیر هدف و پاک کردن اثر سایلنت ناتاشا.",
    resolutionEffect: "اثر سکوت ناتاشا از روی هدف در همان شب خنثی می‌شود."
  },
  watcher: {
    id: "watcher",
    name: "دیده‌بان (نگهبان شب)",
    team: "citizen",
    phase: "night",
    nightOrder: 16,
    wakeUpText: "دیده‌بان برای رصد رفت‌وآمدها بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "all_alive_except_self",
    description: "مشاهده تعداد افرادی که شبانه به سراغ هدف رفتند بدون اعلام نام نقش.",
    resolutionEffect: "فهرست ملاقات‌کنندگان هدف برای دیده‌بان ارسال می‌شود."
  },
  hacker: {
    id: "hacker",
    name: "هکر (نخبه)",
    team: "citizen",
    phase: "night",
    nightOrder: 17,
    wakeUpText: "هکر برای تطبیق سایدها بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { inquiries: 2 },
    targetFilter: "two_alive_players",
    description: "مقایسه ساید دو بازیکن؛ اعلام هم‌ساید یا ناهم‌ساید بودن بدون فاش کردن نقش.",
    resolutionEffect: "پاسخ هم‌ساید یا ناهم‌ساید به هکر ارسال می‌گردد."
  },
  gunsmith: {
    id: "gunsmith",
    name: "تفنگدار",
    team: "citizen",
    phase: "night",
    nightOrder: 18,
    wakeUpText: "تفنگدار برای توزیع اسلحه بیدار شود.",
    hasNightAction: true,
    hasDayAction: true,
    defaultQuota: { bullets: { war: 1, blank: 2 } },
    targetFilter: "all_alive_except_self",
    description: "اهدای سلاح جنگی یا مشقی در شب برای شلیک دریافت‌کننده در روز.",
    resolutionEffect: "در روز پنل شلیک برای دارنده اسلحه باز می‌شود؛ جنگی کشنده و مشقی بی‌اثر است."
  },
  journalist: {
    id: "journalist",
    name: "خبرنگار",
    team: "citizen",
    phase: "night",
    nightOrder: 19,
    wakeUpText: "خبرنگار برای استعلام تغییر ساید بیدار شود.",
    hasNightAction: true,
    hasDayAction: false,
    defaultQuota: { inquiries: 2 },
    targetFilter: "all_alive_except_self",
    description: "استعلام از وضعیت تغییر ساید یا آلودگی فرد در طول بازی.",
    resolutionEffect: "مشخص می‌شود آیا فرد دستخوش تغییر ساید شده است یا خیر."
  },
  armored: {
    id: "armored",
    name: "زره‌پوش",
    team: "citizen",
    phase: "passive",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "دارای ۱ جلیقه شب؛ با اولین تیر شب مافیا کشته نمی‌شود؛ در دادگاه زره ندارد.",
    resolutionEffect: "اولین شلیک شب جلیقه او را می‌شکند ولی مرگ ثبت نمی‌شود.",
    passiveFeatures: ["۱ بار جلیقه در برابر شلیک شب مافیا"]
  },
  bulletproof: {
    id: "bulletproof",
    name: "روئین‌تن",
    team: "citizen",
    phase: "passive",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "مصون در برابر شلیک شب مافیا؛ فقط با رأی دادگاه روز یا تیر جنگی خارج می‌شود.",
    resolutionEffect: "تیر شب مافیا هیچ اثری روی او ندارد.",
    passiveFeatures: ["مصونیت دائم در برابر شلیک شب"]
  },
  mayor: {
    id: "mayor",
    name: "شهردار",
    team: "citizen",
    phase: "day",
    hasNightAction: false,
    hasDayAction: true,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "all_alive",
    description: "حق وتوی رأی‌گیری دادگاه و لغو حکم خروج؛ ارزش رأی مضاعف در دفاعیه.",
    resolutionEffect: "حکم اعدام دادگاه لغو شده و روز بدون خروج به پایان می‌رسد."
  },
  judge: {
    id: "judge",
    name: "قاضی",
    team: "citizen",
    phase: "day",
    hasNightAction: false,
    hasDayAction: true,
    defaultQuota: { maxTotalUses: 2 },
    targetFilter: "all_alive",
    description: "صدور حکم قطعی خروج برای متهم در فاز روز بدون نیاز به شمارش آرا.",
    resolutionEffect: "متهم انتخابی مستقیماً با حکم قاضی از بازی خارج می‌شود."
  },
  sheriff: {
    id: "sheriff",
    name: "کلانتر (مارشال)",
    team: "citizen",
    phase: "day",
    hasNightAction: false,
    hasDayAction: true,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "all_alive_except_self",
    description: "شلیک مستقیم در فاز روز؛ اصابت به مافیا حذف مافیا و به شهروند حذف خود کلانتر.",
    resolutionEffect: "در روز شلیک می‌کند و نتیجه بلافاصله در شهر اعمال می‌گردد."
  },
  simple_citizen: {
    id: "simple_citizen",
    name: "شهروند ساده",
    team: "citizen",
    phase: "day",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: {},
    targetFilter: "none",
    description: "ستون اصلی رأی‌گیری و استدلال‌های روز؛ بدون قابلیت شبانه.",
    resolutionEffect: "شرکت در چالش‌ها و رأی‌گیری روز."
  },

  // ---------------- مستقل ----------------
  independent_jester: {
    id: "independent_jester",
    name: "دلقک (مستقل)",
    team: "independent",
    phase: "day",
    hasNightAction: false,
    hasDayAction: false,
    defaultQuota: { maxTotalUses: 1 },
    targetFilter: "none",
    description: "هدف بازی: فریب شهروندان و اعدام شدن در فاز روز برای پیروزی فردی.",
    resolutionEffect: "در صورت اعدام در دادگاه روز برنده بازی می‌شود.",
    passiveFeatures: ["پیروزی انفرادی با اعدام در روز"]
  }
};

/**
 * آیا نقش متعلق به ساید مافیا است؟
 */
export function isMafiaRoleId(roleId?: string): boolean {
  if (!roleId) return false;
  const def = ROLES_RULES_MATRIX[roleId.toLowerCase()];
  return def ? def.team === "mafia" : false;
}

/**
 * تعیین رهبر زنده شلیک‌کننده مافیا طبق سلسله‌مراتب
 */
export function getMafiaShooter(players: Player[]): Player | null {
  const aliveMafias = players.filter((p) => p.isAlive && isMafiaRoleId(p.roleId));
  if (aliveMafias.length === 0) return null;

  const godfather = aliveMafias.find((p) => p.roleId === "godfather");
  if (godfather) return godfather;

  const lecter = aliveMafias.find((p) => p.roleId === "dr_lecter");
  if (lecter) return lecter;

  const natasha = aliveMafias.find((p) => p.roleId === "natasha");
  if (natasha) return natasha;

  return aliveMafias[0];
}

/**
 * استخراج اهداف مجاز برای هر نقش با اعمال شرایط سهمیه
 */
export function getValidTargets(
  roleId: string,
  actor: Player,
  players: Player[],
  quotas: QuotaTracker = {}
): Player[] {
  const alive = players.filter((p) => p.isAlive);
  const def = ROLES_RULES_MATRIX[roleId.toLowerCase()];
  if (!def) return alive.filter((p) => p.id !== actor.id);

  const actorQuota = quotas[actor.id] || { totalUses: 0, selfUses: 0 };

  switch (def.targetFilter) {
    case "citizens_only":
      return alive.filter((p) => !isMafiaRoleId(p.roleId));

    case "mafia_only": {
      const mafias = alive.filter((p) => isMafiaRoleId(p.roleId));
      if (def.defaultQuota.maxSelfUses && actorQuota.selfUses >= def.defaultQuota.maxSelfUses) {
        return mafias.filter((p) => p.id !== actor.id);
      }
      return mafias;
    }

    case "all_alive": {
      if (def.defaultQuota.maxSelfUses && actorQuota.selfUses >= def.defaultQuota.maxSelfUses) {
        return alive.filter((p) => p.id !== actor.id);
      }
      return alive;
    }

    case "all_alive_except_self":
    case "citizens_only_except_self":
      return alive.filter((p) => p.id !== actor.id);

    default:
      return alive;
  }
}

/**
 * استعلام تعداد مافیا و شهروندان خارج‌شده از بازی
 */
export function getOutPlayersStatus(players: Player[]): {
  deadCitizensCount: number;
  deadMafiaCount: number;
  aliveCitizensCount: number;
  aliveMafiaCount: number;
} {
  let deadCitizensCount = 0;
  let deadMafiaCount = 0;
  let aliveCitizensCount = 0;
  let aliveMafiaCount = 0;

  players.forEach((p) => {
    const isM = isMafiaRoleId(p.roleId);
    if (p.isAlive) {
      if (isM) aliveMafiaCount++;
      else aliveCitizensCount++;
    } else {
      if (isM) deadMafiaCount++;
      else deadCitizensCount++;
    }
  });

  return {
    deadCitizensCount,
    deadMafiaCount,
    aliveCitizensCount,
    aliveMafiaCount,
  };
}

export function getDoctorMaxSelfSaves(totalPlayersCount: number): number {
  if (totalPlayersCount >= 16) return 3;
  if (totalPlayersCount >= 11) return 2;
  return 1;
}
