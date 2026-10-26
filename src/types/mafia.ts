export type Team = 'mafia' | 'citizen' | 'independent';

export type EliminationReason =
  | 'vote'
  | 'mafia_shot'
  | 'sniper_shot'
  
  | 'bomber'
  
  | 'jester_revenge'
  | 'suicide'
  | 'leave'
  | 'god'
  | string;

export interface Role {
  nightPriority?: number;
  hasNightAction?: boolean;
  image?: string;
  side?: string;
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
  team?: string;
  hasPlantedBomb?: boolean;
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
  gunGiven?: 'war' | 'blank' | null;
  usedDailyChallenge?: boolean;
  wasNegotiated?: boolean;
}

export interface GameLog {
  id: string;
  timestamp: number;
  message: string;
  type?: 'info' | 'action' | 'elimination' | 'system';
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
  // مافیا
  mafiaShotId?: string;
  mafiaShotId2?: string; // شلیک دوم مافیا (فعال در صورت مرگ معشوقه)
  doctorLecterSaveId?: string;
  silencerTargetId?: string;
  thiefTargetId?: string;
  hostageTargetId?: string;
  bomberTargetId?: string;
  bomberWireConfig?: { deathWire: string; defuseWire: string; bombSelfWire: string };
  jokerTargetId?: string;
  informantGuess?: { targetId: string; guessedRoleId: string };
  infiltratorTargetId?: string;
  negotiatorTargetId?: string;
  journalistTargetId?: string;

  // شهروند
  doctorSaveId?: string;
  detectiveInquiryId?: string;
  detectiveResult?: 'positive' | 'negative' | null;
  sniperShotId?: string;
  bodyguardTargetId?: string;
  priestTargetId?: string;
  watcherTargetId?: string;
  hackerTargetIds?: [string, string];
  gunsmithTargetId?: string;
  gunsmithGunType?: 'war' | 'blank';
  gunsmithTarget1Id?: string;
  gunsmithGunType1?: 'war' | 'blank';
  gunsmithTarget2Id?: string;
  gunsmithGunType2?: 'war' | 'blank';
  journalistInquiry?: boolean;
}

export interface NightResolutionReport {
  deaths: string[];
  healed: string[];
  silencedId?: string;
  hostageId?: string;
  detectiveReport?: { targetId: string; isPositive: boolean };
  watcherVisitors?: string[];
  hackerReport?: { sameTeam: boolean };
  bombedPlayerId?: string;
  negotiationSuccessful?: boolean;
  convertedPlayerId?: string;
  negotiatorFailedReason?: string;
  journalistReport?: { targetId: string; targetName: string; isNegotiated: boolean };
  logs: string[];
}

export type NetworkMode = 'socket' | 'peer';
