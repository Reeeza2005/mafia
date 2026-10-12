export type Team = 'mafia' | 'citizen' | 'independent';

export type EliminationReason =
  | 'mafia_shot'       // شات شب مافیا
  | 'court_vote'        // رأی دادگاه
  | 'sniper_shot'      // تیر اسنایپر / حرفه‌ای
  | 'gunsmith_shot'    // شلیک با تفنگ جنگی
  | 'misfire_death'    // شلیک اشتباه اسنایپر به شهروند
  | 'terrorist_kill'   // ترور انتحاری
  | 'disciplinary'     // خروج انضباطی گرداننده
  | 'other';           // سایر

export interface Role {
  id: string;
  name: string;
  englishName: string;
  team: Team;
  isSimple: boolean; // only true for simple_citizen and simple_mafia
  summary: string;
  description: string;
  nightOrder?: number; // order of waking up at night (1, 2, 3...)
  wakeUpText?: string;
}

export interface Player {
  id: string;
  name: string;
  roleId?: string;
  isAlive: boolean;
  isSilenced: boolean;
  hasArmor: boolean;
  eliminationReason?: EliminationReason;
  notes?: string;
  connected: boolean;
  joinedAt?: number;
  gunGiven?: 'war' | 'blank'; // تفنگدار: جنگی یا مشقی
}

export interface GameLog {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'danger' | 'action';
}

export interface GameTimer {
  seconds: number;
  isRunning: boolean;
  speakerName?: string;
  speakerId?: string;
  timerType?: 'speech' | 'challenge' | 'defense' | 'voting';
}

export interface SecretVoteState {
  id: string;
  isActive: boolean;
  title: string;
  eligibleTeam?: 'all' | 'mafia' | 'citizen';
  candidates: { id: string; name: string }[];
  votes: Record<string, string>; // voterId -> candidateId
  ended: boolean;
}

export interface NightActions {
  mafiaShotId?: string;
  doctorSaveId?: string;
  detectiveInquiryId?: string;
  detectiveResult?: 'positive' | 'negative' | null;
  sniperShotId?: string;
  gunsmithTargetId?: string;
  gunsmithGunType?: 'war' | 'blank';
  silencerTargetId?: string;
}

export type NetworkMode = 'socket' | 'peer';

