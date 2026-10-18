import { Player, NightActions, NightResolutionReport } from '../types/mafia';
import { ALL_ROLES, ROLE_MAP } from '../data/roles';
import { QuotaTracker, getDoctorMaxSelfSaves } from '../data/rolesRulesMatrix';

/**
 * تعیین کارت‌های مجاز برای میز شب:
 * منحصراً نقش‌هایی که در سناریوی جاری حضور دارند، صاحب آن‌ها زنده است و اکشن شبانه دارند.
 */
export function getActiveNightRoles(players: Player[]): typeof ALL_ROLES {
  const aliveRoleIds = new Set<string>();

  players.forEach((p) => {
    if (p.isAlive && p.roleId) {
      aliveRoleIds.add(p.roleId);
    }
  });

  return ALL_ROLES
    .filter((role) => aliveRoleIds.has(role.id) && role.nightOrder && role.nightOrder < 27)
    .sort((a, b) => (a.nightOrder || 0) - (b.nightOrder || 0));
}

/**
 * حل و پردازش وقایع شب بر اساس تقدم منطقی اکشن‌ها
 */
export function resolveNight(
  players: Player[],
  actions: NightActions,
  armorStates: Record<string, boolean> = {},
  quotas: QuotaTracker = {}
): { updatedPlayers: Player[]; report: NightResolutionReport; updatedArmors: Record<string, boolean>; updatedQuotas: QuotaTracker } {
  const logs: string[] = [];
  const deaths = new Set<string>();
  const healed = new Set<string>();
  const updatedArmors = { ...armorStates };

  const playerMap = new Map<string, Player>(players.map((p) => [p.id, { ...p }]));

  // ----------------------------------------------------
  // ۱. اولویت نخست: تطهیر کشیش و مسدودسازی‌ها (ناتاشا و گروگان‌گیر)
  // ----------------------------------------------------
  const blockedIds = new Set<string>();
  let silencedId: string | undefined;
  let hostageId: string | undefined;

  if (actions.priestTargetId) {
    const priestTarget = playerMap.get(actions.priestTargetId);
    if (priestTarget) {
      priestTarget.isSilenced = false;
      logs.push(`کشیش بازیکن ${priestTarget.name} را تطهیر و اثرات مسدودی او را پاک کرد.`);
    }
  }

  if (actions.silencerTargetId) {
    blockedIds.add(actions.silencerTargetId);
    silencedId = actions.silencerTargetId;
    const target = playerMap.get(actions.silencerTargetId);
    logs.push(`ناتاشا بازیکن ${target ? target.name : actions.silencerTargetId} را سایلنت کرد.`);
  }

  if (actions.hostageTargetId) {
    blockedIds.add(actions.hostageTargetId);
    hostageId = actions.hostageTargetId;
    const target = playerMap.get(actions.hostageTargetId);
    logs.push(`گروگان‌گیر بازیکن ${target ? target.name : actions.hostageTargetId} را خلع سلاح کرد.`);
  }

  // ----------------------------------------------------
  // ۲. اولویت دوم: نجات‌ها (پزشک و دکتر لکتور)
  // ----------------------------------------------------
  const doctorPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'doctor');
  if (actions.doctorSaveId && (!doctorPlayer || !blockedIds.has(doctorPlayer.id))) {
    const target = playerMap.get(actions.doctorSaveId);
    const docId = doctorPlayer?.id || 'doctor_unknown';
    const isSelfSave = doctorPlayer && actions.doctorSaveId === doctorPlayer.id;

    if (!updatedQuotas[docId]) {
      updatedQuotas[docId] = { totalUses: 0, selfUses: 0 };
    }

    if (isSelfSave) {
      const maxSelfSaves = getDoctorMaxSelfSaves(players.length);
      const usedSelf = updatedQuotas[docId].selfUses || 0;
      if (usedSelf >= maxSelfSaves) {
        logs.push(`⚠️ تلاش پزشک برای نجات خود ناموفق بود (سهمیه نجات خود به پایان رسیده است: ${usedSelf}/${maxSelfSaves}).`);
      } else {
        healed.add(actions.doctorSaveId);
        updatedQuotas[docId].selfUses = usedSelf + 1;
        updatedQuotas[docId].totalUses = (updatedQuotas[docId].totalUses || 0) + 1;
        logs.push(`پزشک از خودش محافظت کرد 💉 (سهمیه مصرفی نجات خود: ${usedSelf + 1}/${maxSelfSaves}).`);
      }
    } else {
      healed.add(actions.doctorSaveId);
      updatedQuotas[docId].totalUses = (updatedQuotas[docId].totalUses || 0) + 1;
      logs.push(`پزشک از ${target ? target.name : actions.doctorSaveId} محافظت کرد.`);
    }
  }

  const lecterPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'dr_lecter');
  if (actions.doctorLecterSaveId && (!lecterPlayer || !blockedIds.has(lecterPlayer.id))) {
    healed.add(actions.doctorLecterSaveId);
    const target = playerMap.get(actions.doctorLecterSaveId);
    logs.push(`دکتر لکتور از ${target ? target.name : actions.doctorLecterSaveId} محافظت کرد.`);
  }

  // ----------------------------------------------------
  // ۳. اولویت سوم: شلیک مافیا و اسنایپر
  // ----------------------------------------------------
  if (actions.mafiaShotId) {
    const target = playerMap.get(actions.mafiaShotId);
    if (target) {
      if (healed.has(target.id)) {
        logs.push(`شلیک مافیا به ${target.name} با مداوای پزشک بی‌اثر شد.`);
      } else if (target.roleId === 'armored' && updatedArmors[target.id] !== false) {
        updatedArmors[target.id] = false;
        logs.push(`شلیک مافیا به زره‌پوش (${target.name}) اصابت کرد اما زره او مانع مرگ شد.`);
      } else {
        deaths.add(target.id);
        logs.push(`شلیک مافیا منجر به مرگ ${target.name} شد.`);
      }
    }
  }

  if (actions.sniperShotId && actions.sniperShotId !== 'PASS_ACTION') {
    const sniperPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'sniper');
    const target = playerMap.get(actions.sniperShotId);

    if (sniperPlayer && !blockedIds.has(sniperPlayer.id) && target) {
      const targetRole = target.roleId ? ROLE_MAP[target.roleId] : null;

      if (targetRole && targetRole.team === 'mafia') {
        if (healed.has(target.id)) {
          logs.push(`شلیک اسنایپر به مافیا (${target.name}) توسط دکتر لکتور نجات یافت.`);
        } else if (target.roleId === 'godfather' && updatedArmors[target.id] !== false) {
          updatedArmors[target.id] = false;
          logs.push(`شلیک اسنایپر به جلیقه گادفادر (${target.name}) اصابت کرد و او زنده ماند.`);
        } else {
          deaths.add(target.id);
          logs.push(`اسنایپر موفق شد مافیا (${target.name}) را حذف کند.`);
        }
      } else {
        deaths.add(sniperPlayer.id);
        logs.push(`اسنایپر به اشتباه به شهروند شلیک کرد و خودش کشته شد.`);
      }
    }
  }

  // ----------------------------------------------------
  // ۴. اولویت چهارم: استعلام کارآگاه با اعمال فریب جوکر
  // ----------------------------------------------------
  let detectiveReport: { targetId: string; isPositive: boolean } | undefined;
  if (actions.detectiveInquiryId) {
    const detectivePlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'detective');
    if (!detectivePlayer || !blockedIds.has(detectivePlayer.id)) {
      const target = playerMap.get(actions.detectiveInquiryId);
      if (target && target.roleId) {
        const targetRole = ROLE_MAP[target.roleId];
        let isPositive = targetRole.team === 'mafia' && target.roleId !== 'godfather' && target.roleId !== 'infiltrator';

        if (actions.jokerTargetId === target.id) {
          isPositive = !isPositive;
          logs.push(`جوکر استعلام کارآگاه روی ${target.name} را معکوس کرد.`);
        }

        detectiveReport = { targetId: target.id, isPositive };
        logs.push(`استعلام کارآگاه برای ${target.name}: ${isPositive ? 'مثبت (مافیا)' : 'منفی (شهروند)'}`);
      }
    }
  }

  // ----------------------------------------------------
  // ۵. اولویت پنجم: دیده‌بان و هکر
  // ----------------------------------------------------
  const watcherVisitors: string[] = [];
  if (actions.watcherTargetId) {
    const targetId = actions.watcherTargetId;
    if (actions.mafiaShotId === targetId) watcherVisitors.push('شلیک‌کننده مافیا');
    if (actions.doctorSaveId === targetId) watcherVisitors.push('پزشک');
    if (actions.detectiveInquiryId === targetId) watcherVisitors.push('کارآگاه');
    if (actions.sniperShotId === targetId) watcherVisitors.push('اسنایپر');
    if (actions.silencerTargetId === targetId) watcherVisitors.push('ناتاشا');
    logs.push(`دیده‌بان ${watcherVisitors.length} ردپا در اطراف هدف مشاهده کرد.`);
  }

  let hackerReport: { sameTeam: boolean } | undefined;
  if (actions.hackerTargetIds && actions.hackerTargetIds.length === 2) {
    const p1 = playerMap.get(actions.hackerTargetIds[0]);
    const p2 = playerMap.get(actions.hackerTargetIds[1]);
    if (p1?.roleId && p2?.roleId) {
      const t1 = ROLE_MAP[p1.roleId]?.team;
      const t2 = ROLE_MAP[p2.roleId]?.team;
      hackerReport = { sameTeam: t1 === t2 };
      logs.push(`هکر اتحاد دو بازیکن را بررسی کرد: ${t1 === t2 ? 'هم‌ساید' : 'ناهم‌ساید'}`);
    }
  }

  // اعمال وضعیت‌های مرگ و سکوت روی ساختار بازیکنان
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
  };
}
