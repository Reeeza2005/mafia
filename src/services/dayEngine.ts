import { Player } from '../types/mafia';
import { ROLES_REGISTRY, getRoleDefinition } from '../core/roles/index';
import { getFinalTrialConfig } from '../core/rules/trialEngine';

export interface TrialVoteResult {
  candidateId: string;
  votes: number;
}

export interface DayActionOutcome {
  updatedPlayers: Player[];
  eliminatedPlayerId?: string;
  eliminationReason?: string;
  isJesterWin?: boolean;
  log: string;
}

/**
 * پردازش شلیک مستقیم کلانتر در فاز روز:
 * - اگر هدف مافیا باشد: هدف حذف می‌شود.
 * - اگر هدف شهروند باشد: خود کلانتر به عنوان مجازات حذف می‌شود.
 */
export function resolveSheriffShot(
  players: Player[],
  sheriffId: string,
  targetId: string
): DayActionOutcome {
  const playerMap = new Map(players.map((p) => [p.id, { ...p }]));
  const sheriff = playerMap.get(sheriffId);
  const target = playerMap.get(targetId);

  if (!sheriff || !target || !sheriff.isAlive || !target.isAlive) {
    return { updatedPlayers: players, log: "عملیات شلیک کلانتر به دلیل وضعیت نامعتبر بازیکنان لغو شد." };
  }

  const targetRoleDef = target.roleId ? getRoleDefinition(target.roleId) : undefined;
  const isTargetMafia = targetRoleDef?.team === "mafia";

  if (isTargetMafia) {
    target.isAlive = false;
    return {
      updatedPlayers: Array.from(playerMap.values()),
      eliminatedPlayerId: target.id,
      eliminationReason: "شلیک مستقیم کلانتر",
      log: `🚨 کلانتر (${sheriff.name}) در روز شلیک کرد و مافیا (${target.name}) از پای درآمد.`,
    };
  } else {
    sheriff.isAlive = false;
    return {
      updatedPlayers: Array.from(playerMap.values()),
      eliminatedPlayerId: sheriff.id,
      eliminationReason: "مجازات شلیک اشتباه کلانتر به شهروند",
      log: `⚠️ شلیک کلانتر (${sheriff.name}) به شهروند بی‌گناه (${target.name}) اصابت کرد و خود کلانتر حذف گردید.`,
    };
  }
}

/**
 * پردازش حکم مستقیم قاضی (بدون نیاز به شمارش آرای دادگاه)
 */
export function resolveJudgeExecution(
  players: Player[],
  judgeId: string,
  targetId: string
): DayActionOutcome {
  const playerMap = new Map(players.map((p) => [p.id, { ...p }]));
  const judge = playerMap.get(judgeId);
  const target = playerMap.get(targetId);

  if (!judge || !target || !judge.isAlive || !target.isAlive) {
    return { updatedPlayers: players, log: "صدور حکم قاضی ناموفق بود." };
  }

  target.isAlive = false;
  const isJester = target.roleId === "independent_jester";

  return {
    updatedPlayers: Array.from(playerMap.values()),
    eliminatedPlayerId: target.id,
    eliminationReason: "حکم مستقیم قاضی دادگاه",
    isJesterWin: isJester,
    log: `⚖️ قاضی (${judge.name}) با استفاده از حق قضاوت مستقیم، حکم خروج فوری «${target.name}» را صادر کرد.${isJester ? " 🎭 دلقک با اعدام در دادگاه برنده بازی شد!" : ""}`,
  };
}

/**
 * پردازش وتوی شهردار برای لغو نتیجه دادگاه
 */
export function resolveMayorVeto(
  players: Player[],
  mayorId: string,
  condemnedTargetId: string
): DayActionOutcome {
  const mayor = players.find((p) => p.id === mayorId);
  const target = players.find((p) => p.id === condemnedTargetId);

  return {
    updatedPlayers: players,
    log: `🏛️ شهردار (${mayor ? mayor.name : "شهردار"}) با استفاده از حق وتوی خود، حکم اعدام دادگاه علیه «${target ? target.name : "متهم"}» را لغو کرد.`,
  };
}

/**
 * پردازش نهایی نتیجه دادگاه بر اساس آرای ثبت‌شده و بررسی شرط پیروزی دلقک
 */
export function resolveFinalTrialOutcome(
  players: Player[],
  defendants: string[],
  voteResults: Record<string, number>,
  quorum: number
): {
  condemnedPlayer?: Player;
  isTied: boolean;
  tiedNames?: string[];
  maxVotes: number;
  isJesterWin: boolean;
  updatedPlayers: Player[];
  log: string;
} {
  const config = getFinalTrialConfig(defendants.length);
  const playerMap = new Map(players.map((p) => [p.id, { ...p }]));

  let maxVotes = 0;
  const voteEntries = defendants.map((id) => {
    const votes = voteResults[id] || 0;
    if (votes > maxVotes) maxVotes = votes;
    return { id, votes };
  });

  if (maxVotes < quorum) {
    return {
      isTied: false,
      maxVotes,
      isJesterWin: false,
      updatedPlayers: players,
      log: `⚖️ نتیجه دادگاه (${config.phase === "day" ? "روز علنی" : "شب مخفی"}): بیشترین رأی (${maxVotes}) به حد نصاب (${quorum}) نرسید و کسی حذف نشد.`,
    };
  }

  const topCandidates = voteEntries.filter((v) => v.votes === maxVotes);
  if (topCandidates.length > 1) {
    const tiedNames = topCandidates
      .map((c) => playerMap.get(c.id)?.name || c.id)
      .join(" و ");
    return {
      isTied: true,
      tiedNames: topCandidates.map((c) => playerMap.get(c.id)?.name || c.id),
      maxVotes,
      isJesterWin: false,
      updatedPlayers: players,
      log: `⚖️ نتیجه دادگاه: تساوی آرا بین [${tiedNames}] با ${maxVotes} رأی؛ خروج منتفی شد.`,
    };
  }

  const condemned = playerMap.get(topCandidates[0].id);
  if (condemned) {
    condemned.isAlive = false;
    const isJesterWin = condemned.roleId === "independent_jester";

    return {
      condemnedPlayer: condemned,
      isTied: false,
      maxVotes,
      isJesterWin,
      updatedPlayers: Array.from(playerMap.values()),
      log: `⚖️ «${condemned.name}» با ${maxVotes} رأی از بازی حذف شد.${isJesterWin ? " 🎭 دلقک مستقل با اعدام در دادگاه به تنهایی برنده بازی شد!" : ""}`,
    };
  }

  return {
    isTied: false,
    maxVotes: 0,
    isJesterWin: false,
    updatedPlayers: players,
    log: "هیچ بازیکنی برای خروج مشخص نشد.",
  };
}
