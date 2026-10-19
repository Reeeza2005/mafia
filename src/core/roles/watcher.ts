import { RoleContract } from "../types/roles";

export interface WatcherRole extends RoleContract {
  canWatchSelf: boolean;         // آیا امکان رصد خود را دارد؟ (خیر، فقط دیگران)
  tracksVisitors: boolean;       // گزارش لیست افرادی که هدف را انتخاب کرده‌اند
}

export const watcher: WatcherRole = {
  id: "watcher",
  name: "دیده‌بان (رصدکننده)",
  team: "citizen",
  nightPriority: 4,              // اولویت ۴: فاز استعلام و گزارش‌های شبانه
  actionCategory: "inquire",
  hasDefaultArmor: false,
  canWatchSelf: false,           // فقط مجاز به نظارت بر روی سایر بازیکنان زنده
  tracksVisitors: true,          // ثبت تردد کلیه نقش‌های اثرگذار روی هدف
};
