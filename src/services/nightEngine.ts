import { Player, NightActions, NightResolutionReport } from '../types/mafia';
import { ROLES_REGISTRY, getRoleDefinition } from '../core/roles/index';
import { getDoctorMaxSelfSaves } from '../core/roles/doctor';
import { QuotaTracker } from '../core/types/quota';

/**
 * تعیین نقش‌های فعال در شب سناریو بر اساس حضور بازیکنان زنده و اولویت شبانه
 */
export function getActiveNightRoles(players: Player[]) {
  const aliveRoleIds = new Set<string>();

  players.forEach((p) => {
    if (p.isAlive && p.roleId) {
      aliveRoleIds.add(p.roleId.toLowerCase());
    }
  });

  return Object.values(ROLES_REGISTRY)
    .filter((role) => {
      const isAlive = aliveRoleIds.has(role.id.toLowerCase());
      const hasAction = (role as any).hasNightAction !== false && role.nightPriority !== undefined;
      return isAlive && hasAction;
    })
    .sort((a, b) => (a.nightPriority || 99) - (b.nightPriority || 99));
}

/**
 * حل و پردازش وقایع شب بر اساس اولویت ۵ گانه قوانین کانونیکال ۳۰ نقش
 */
export function resolveNight(
  players: Player[],
  actions: NightActions,
  armorStates: Record<string, boolean> = {},
  quotas: QuotaTracker = {}
): {
  updatedPlayers: Player[];
  report: NightResolutionReport;
  updatedArmors: Record<string, boolean>;
  updatedQuotas: QuotaTracker;
} {
  const logs: string[] = [];
  const deaths = new Set<string>();
  const healed = new Set<string>();
  const doctorSaved = new Set<string>();
  const lecterSaved = new Set<string>();
  const updatedArmors = { ...armorStates };
  const updatedQuotas: QuotaTracker = JSON.parse(JSON.stringify(quotas));

  const playerMap = new Map<string, Player>(players.map((p) => [p.id, { ...p }]));

  // ----------------------------------------------------
  // ۱. اولویت اول (تطهیر و مسدودسازی): کشیش، ناتاشا و گروگان‌گیر
  // ----------------------------------------------------
  const blockedIds = new Set<string>();
  let silencedId: string | undefined;
  let hostageId: string | undefined;

  // تطهیر کشیش
  if (actions.priestTargetId) {
    const priestTarget = playerMap.get(actions.priestTargetId);
    if (priestTarget) {
      priestTarget.isSilenced = false;
      logs.push(`کشیش با حضور بر بالین ${priestTarget.name}، هرگونه اثر سکوت و مسدودی را باطل کرد.`);
    }
  }

  // سایلنت ناتاشا
  if (actions.silencerTargetId) {
    blockedIds.add(actions.silencerTargetId);
    silencedId = actions.silencerTargetId;
    const target = playerMap.get(actions.silencerTargetId);
    logs.push(`ناتاشا بازیکن ${target ? target.name : actions.silencerTargetId} را سایلنت کرد.`);
  }

  // گروگان‌گیری
  if (actions.hostageTargetId) {
    blockedIds.add(actions.hostageTargetId);
    hostageId = actions.hostageTargetId;
    const target = playerMap.get(actions.hostageTargetId);
    logs.push(`گروگان‌گیر توانایی شبانه ${target ? target.name : actions.hostageTargetId} را خلع سلاح کرد.`);
  }

  // ----------------------------------------------------
  // ۲. اولویت دوم (نجات‌ها): پزشک و دکتر لکتور
  // ----------------------------------------------------
  const doctorPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'doctor');
  if (actions.doctorSaveId && (!doctorPlayer || !blockedIds.has(doctorPlayer.id))) {
    const target = playerMap.get(actions.doctorSaveId);
    const docId = doctorPlayer?.id || 'doctor_player';
    const isSelfSave = doctorPlayer && actions.doctorSaveId === doctorPlayer.id;

    if (!updatedQuotas[docId]) {
      updatedQuotas[docId] = { totalUses: 0, selfUses: 0 };
    }

    if (isSelfSave) {
      const maxSelfSaves = getDoctorMaxSelfSaves(players.length);
      const usedSelf = updatedQuotas[docId].selfUses || 0;
      if (usedSelf >= maxSelfSaves) {
        logs.push(`⚠️ تلاش پزشک برای نجات خود ناکام ماند (سقف سهمیه نجات خود پر شده است: ${usedSelf}/${maxSelfSaves}).`);
      } else {
        healed.add(actions.doctorSaveId);
        doctorSaved.add(actions.doctorSaveId);
        updatedQuotas[docId].selfUses = usedSelf + 1;
        updatedQuotas[docId].totalUses = (updatedQuotas[docId].totalUses || 0) + 1;
        logs.push(`پزشک از خودش محافظت کرد 💉 (سهمیه مصرف‌شده: ${usedSelf + 1}/${maxSelfSaves}).`);
      }
    } else {
      healed.add(actions.doctorSaveId);
      doctorSaved.add(actions.doctorSaveId);
      updatedQuotas[docId].totalUses = (updatedQuotas[docId].totalUses || 0) + 1;
      logs.push(`پزشک از ${target ? target.name : actions.doctorSaveId} محافظت کرد.`);
    }
  }

  const lecterPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'dr_lecter');
  if (actions.doctorLecterSaveId && (!lecterPlayer || !blockedIds.has(lecterPlayer.id))) {
    const target = playerMap.get(actions.doctorLecterSaveId);
    const lecterId = lecterPlayer?.id || 'dr_lecter_player';
    const isSelfSave = lecterPlayer && actions.doctorLecterSaveId === lecterPlayer.id;

    if (!updatedQuotas[lecterId]) {
      updatedQuotas[lecterId] = { totalUses: 0, selfUses: 0 };
    }

    if (isSelfSave) {
      const maxLecterSelfSaves = 1;
      const usedSelf = updatedQuotas[lecterId].selfUses || 0;
      if (usedSelf >= maxLecterSelfSaves) {
        logs.push(`⚠️ تلاش دکتر لکتر برای نجات خود ناکام ماند (سقف ۱ بار نجات خود قبلاً مصرف شده است).`);
      } else {
        lecterSaved.add(actions.doctorLecterSaveId);
        healed.add(actions.doctorLecterSaveId);
        updatedQuotas[lecterId].selfUses = usedSelf + 1;
        updatedQuotas[lecterId].totalUses = (updatedQuotas[lecterId].totalUses || 0) + 1;
        logs.push(`دکتر لکتر از خودش محافظت کرد 🩺 (سهمیه مصرفی نجات خود: ۱/۱).`);
      }
    } else {
      lecterSaved.add(actions.doctorLecterSaveId);
      healed.add(actions.doctorLecterSaveId);
      updatedQuotas[lecterId].totalUses = (updatedQuotas[lecterId].totalUses || 0) + 1;
      logs.push(`دکتر لکتر از ${target ? target.name : actions.doctorLecterSaveId} محافظت کرد.`);
    }
  }

  // ----------------------------------------------------
  // ۳. اولویت سوم (شلیک‌ها و زره): شلیک شب مافیا و اسنایپر
  // ----------------------------------------------------
    // --- پردازش شلیک‌های مافیا (تک‌شات و شات دوم در صورت مرگ معشوقه) ---
    const mafiaShots = [actions.mafiaShotId, actions.mafiaShotId2].filter((id): id is string => Boolean(id));
    const uniqueMafiaShots = Array.from(new Set(mafiaShots));

    for (const shotTargetId of uniqueMafiaShots) {
      const target = playerMap.get(shotTargetId);
      if (!target) continue;

      const targetRoleDef = target.roleId ? getRoleDefinition(target.roleId) : undefined;
      const isBulletproof = target.roleId === "bulletproof" || (targetRoleDef as any)?.isPermanentNightImmune;

      if (doctorSaved.has(target.id) || lecterSaved.has(target.id)) {
        logs.push(`شلیک مافیا به ${target.name} با مراقبت و مداوا بی‌اثر شد.`);
      } else if (isBulletproof) {
        logs.push(`شلیک مافیا به روئین‌تن (${target.name}) اصابت کرد اما او مصونیت دائم شبانه دارد.`);
      } else if (target.roleId === "armored" && updatedArmors[target.id] !== false) {
        updatedArmors[target.id] = false;
        logs.push(`شلیک مافیا به زره‌پوش (${target.name}) اصابت کرد و جلیقه محافظتی او از بین رفت.`);
      } else {
        target.isAlive = false;
        target.eliminationReason = "mafia_shot";
        eliminatedPlayers.push(target);
        logs.push(`مافیا با شلیک شبانه ${target.name} را از پای درآورد.`);
      }
    }

  // ----------------------------------------------------
  // ۴. اولویت چهارم (استعلام‌ها و فریب): کارآگاه و جوکر
  // ----------------------------------------------------
  let detectiveReport: { targetId: string; isPositive: boolean } | undefined;
  if (actions.detectiveInquiryId) {
    const detectivePlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'detective');
    if (!detectivePlayer || !blockedIds.has(detectivePlayer.id)) {
      const target = playerMap.get(actions.detectiveInquiryId);
      if (target && target.roleId) {
        const targetRoleDef = getRoleDefinition(target.roleId);
        const givesNegative = (targetRoleDef as any)?.givesNegativeInvestigation || target.roleId === 'godfather' || target.roleId === 'infiltrator';
        let isPositive = targetRoleDef?.team === 'mafia' && !givesNegative;

        if (actions.jokerTargetId === target.id) {
          isPositive = !isPositive;
          logs.push(`جوکر نتیجه استعلام کارآگاه روی ${target.name} را دستکاری و معکوس کرد.`);
        }

        detectiveReport = { targetId: target.id, isPositive };
        logs.push(`استعلام کارآگاه برای ${target.name}: ${isPositive ? 'مثبت (مافیا)' : 'منفی (شهروند)'}`);
      }
    }
  }

  // ----------------------------------------------------
  // ۵. اولویت پنجم (ردیابی و تحلیل شبکه): دیده‌بان و هکر
  // ----------------------------------------------------
  const watcherVisitors: string[] = [];
  if (actions.watcherTargetId) {
    const targetId = actions.watcherTargetId;
    if (actions.mafiaShotId === targetId || actions.mafiaShotId2 === targetId) watcherVisitors.push('تیم شلیک مافیا');
    if (actions.doctorSaveId === targetId) watcherVisitors.push('پزشک');
    if (actions.detectiveInquiryId === targetId) watcherVisitors.push('کارآگاه');
    if (actions.sniperShotId === targetId) watcherVisitors.push('اسنایپر');
    if (actions.silencerTargetId === targetId) watcherVisitors.push('ناتاشا');
    logs.push(`دیده‌بان ${watcherVisitors.length} ردپا در اطراف خانه هدف ثبت کرد.`);
  }

  let hackerReport: { sameTeam: boolean } | undefined;
  if (actions.hackerTargetIds && actions.hackerTargetIds.length === 2) {
    const p1 = playerMap.get(actions.hackerTargetIds[0]);
    const p2 = playerMap.get(actions.hackerTargetIds[1]);
    if (p1?.roleId && p2?.roleId) {
      const t1 = getRoleDefinition(p1.roleId)?.team;
      const t2 = getRoleDefinition(p2.roleId)?.team;
      hackerReport = { sameTeam: t1 === t2 };
      logs.push(`هکر شبکه هویت را ارزیابی کرد: دو مظنون ${t1 === t2 ? 'هم‌پیمان' : 'غیر هم‌پیمان'} هستند.`);
    }
  }

  // اعمال وضعیت‌های مرگ و سکوت
  deaths.forEach((id) => {
    const p = playerMap.get(id);
    if (p) p.isAlive = false;
  });

  if (silencedId) {
    const p = playerMap.get(silencedId);
    if (p) p.isSilenced = true;
  }

  return {
    updatedPlayers: Array.from(playerMap.values()),
    updatedArmors,
    report: {
      deaths: Array.from(deaths),
      healed: Array.from(healed),
      silencedId,
      hostageId,
      detectiveReport,
      watcherVisitors,
      hackerReport,
      bombedPlayerId: actions.bomberTargetId,
      logs,
    },
    updatedQuotas,
  };
}
