import { RoleContract } from "../types/roles";

export interface HostageTakerRole extends RoleContract {
  blocksTargetAction: boolean;        // خلع سلاح و ابطال اکشن شب هدف
  canTargetSelf: boolean;             // انتخاب خود (غیرمجاز)
  mafiaShotSuccessionOrder: number;   // رتبه توارث شات مافیا پس از گادفادر و دکتر لکتر
}

export const hostage_taker: HostageTakerRole = {
  id: "hostage_taker",
  name: "گروگان‌گیر (ماتادور)",
  team: "mafia",
  nightPriority: 1,                   // اولویت ۱: فاز بلاک پیش از کلیه نجات‌ها و شلیک‌ها
  actionCategory: "block",
  hasDefaultArmor: false,
  blocksTargetAction: true,
  canTargetSelf: false,
  mafiaShotSuccessionOrder: 2,
};
