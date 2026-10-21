export interface PlayerQuotaState {
  totalUses: number;
  selfUses: number;
  bulletsLeft?: number;
  warBulletsLeft?: number;
  blankBulletsLeft?: number;
  inquiriesLeft?: number;
  armorActive?: boolean;
  lastTargetId?: string;
}

export type QuotaTracker = Record<string, PlayerQuotaState>;
