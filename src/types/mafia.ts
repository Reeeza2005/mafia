export type Team = 'mafia' | 'citizen' | 'independent';

export type EliminationReason =
  | 'mafia_shot'
  | 'court_vote'
  | 'sniper_shot'
  | 'gunsmith_shot'
  | 'misfire_death'
  | 'terrorist_kill'
  | 'disciplinary'
  | 'other';

export interface Role {
  id: string;
  name: string;
  englishName: string;
  team: Team;
  isSimple: boolean;
  summary: string;
  description: string;
  nightOrder?: number;
  wakeUpText?: string;
  abilities?: string[];
  winningCondition?: string;
  tips?: string[];
}

export interface Player {
  id: string;
  name: string;
  socketId?: string;
  roleId?: string;
  isAlive: boolean;
  isSilenced: boolean;
  hasArmor: boolean;
  eliminationReason?: EliminationReason;
  notes?: string;
  connected: boolean;
  joinedAt?: number;
  gunGiven?: 'war' | 'blank';
  usedDailyChallenge?: boolean;
}

export interface GameLog {
  id: string;
  time: string;
  text: string;
  type: 'info' | 'danger' | 'action' | 'challenge';
}

export interface GameTimer {
  seconds: number;
  isRunning: boolean;
  speakerName?: string;
  speakerId?: string;
  timerType?: 'speech' | 'challenge' | 'defense' | 'voting';
}

export interface SecretVoteState {
  voterDetails?: Record<string, { candidateId: string; voterName: string }>;

  id: string;
  isActive: boolean;
  title: string;
  eligibleTeam?: 'all' | 'mafia' | 'citizen';
  candidates: { id: string; name: string }[];
  votes: Record<string, string>;
  ended: boolean;
  isLocked?: boolean;
  targetDefendantId?: string;
  startsLocked?: boolean;
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
