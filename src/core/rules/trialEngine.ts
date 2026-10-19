export type TrialPhase = "day" | "night";
export type VotingType = "public" | "secret";
export type VotingStage = "entry_nomination" | "final_execution";

export interface TrialConfig {
  stage: VotingStage;
  phase: TrialPhase;
  votingType: VotingType;
  isSecret: boolean;
  maxVotesPerPlayer: number;
  canDefendantsVoteEachOther: boolean;
}

export interface FinalVoteContext {
  defendants: string[];
  voterId: string;
  targetId: string;
  alreadyVotedPlayerIds: string[];
}

export function getNominationConfig(): TrialConfig {
  return {
    stage: "entry_nomination",
    phase: "day",
    votingType: "public",
    isSecret: false,
    maxVotesPerPlayer: Infinity,
    canDefendantsVoteEachOther: true,
  };
}

export function getFinalTrialConfig(defendantCount: number): TrialConfig {
  if (defendantCount <= 1) {
    return {
      stage: "final_execution",
      phase: "day",
      votingType: "public",
      isSecret: false,
      maxVotesPerPlayer: 1,
      canDefendantsVoteEachOther: false,
    };
  }

  return {
    stage: "final_execution",
    phase: "night",
    votingType: "secret",
    isSecret: true,
    maxVotesPerPlayer: 1,
    canDefendantsVoteEachOther: defendantCount >= 4,
  };
}

export function validateFinalVote(context: FinalVoteContext): { allowed: boolean; reason?: string } {
  const { defendants, voterId, targetId, alreadyVotedPlayerIds } = context;

  if (alreadyVotedPlayerIds.includes(voterId)) {
    return { allowed: false, reason: "سقف ۱ رأی شما در این دادگاه مصرف شده است." };
  }

  if (voterId === targetId) {
    return { allowed: false, reason: "رأی به خود غیرمجاز است." };
  }

  if (!defendants.includes(targetId)) {
    return { allowed: false, reason: "هدف در لیست متهمان دادگاه نیست." };
  }

  const isVoterDefendant = defendants.includes(voterId);
  if (isVoterDefendant) {
    if (defendants.length < 4) {
      return {
        allowed: false,
        reason: "در دادگاه ۲ یا ۳ نفره، متهمان اجازه رأی دادن به سایر متهمان را ندارند.",
      };
    }
    return { allowed: true };
  }

  return { allowed: true };
}
