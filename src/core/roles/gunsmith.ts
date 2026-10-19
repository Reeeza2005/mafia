import { RoleContract } from "../types/roles";

export interface GunsmithBullets {
  war: number;    // تیر جنگی (کشنده)
  blank: number;  // تیر مشقی (بی‌اثر)
}

export interface GunsmithRole extends RoleContract {
  initialBullets: GunsmithBullets; // سهمیه تیرهای جنگی و مشقی
  canTargetSelf: boolean;          // اهدای سلاح به خود (غیرمجاز)
  hasDayAction: boolean;           // پنل شلیک روزانه برای دریافت‌کننده
}

export const gunsmith: GunsmithRole = {
  id: "gunsmith",
  name: "تفنگدار",
  team: "citizen",
  nightPriority: 3,                // اولویت ۳: فاز تجهیز و توزیع پیش از استعلام‌ها
  actionCategory: "status",
  hasDefaultArmor: false,
  initialBullets: {
    war: 1,
    blank: 2,
  },
  canTargetSelf: false,
  hasDayAction: true,
};
