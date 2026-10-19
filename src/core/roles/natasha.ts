import { RoleContract } from "../types/roles";

export interface NatashaRole extends RoleContract {
  silencesTargetDayChat: boolean;  // سلب حق صحبت در فاز روز بعد
  cannotSilenceConsecutively: boolean; // عدم امکان سایلنس متوالی یک بازیکن در دو شب پشت سر هم
  canTargetSelf: boolean;         // امکان انتخاب خود (غیرمجاز)
}

export const natasha: NatashaRole = {
  id: "natasha",
  name: "ناتاشا (سایلنسر)",
  team: "mafia",
  nightPriority: 5,               // اولویت ۵: فاز ثبت وضعیت‌های نهایی شب
  actionCategory: "status",
  hasDefaultArmor: false,
  silencesTargetDayChat: true,    // اعمال وضعیت لال/سایلنس در روز
  cannotSilenceConsecutively: true, // ممنوعیت سکوت یک هدف در شب‌های متوالی
  canTargetSelf: false,           // فقط انتخاب سایر بازیکنان
};
