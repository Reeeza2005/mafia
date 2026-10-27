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
      const isAlive = Boolean(role.id && aliveRoleIds.has(role.id.toLowerCase()));
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

  const playerMap = new Map<string, Player>(players.map((p) => [p.id, { ...p, isSilenced: false }]));

  // ----------------------------------------------------
  // ----------------------------------------------------
  // ۱. اولویت اول (مسدودسازی و تطهیر): گروگان‌گیر، ناتاشا و کشیش
  // ----------------------------------------------------
  const blockedIds = new Set<string>();
  let silencedId: string | undefined;
  let hostageId: string | undefined;

  // ۱.۱ گروگان‌گیری (مسدودسازی پایه)
  if (actions.hostageTargetId) {
    blockedIds.add(actions.hostageTargetId);
    hostageId = actions.hostageTargetId;
    const target = playerMap.get(actions.hostageTargetId);
    logs.push(`گروگان‌گیر توانایی شبانه ${target ? target.name : actions.hostageTargetId} را خلع سلاح کرد.`);
  }

  // ۱.۲ سایلنت ناتاشا (مشروط به گروگان گرفته نشدن ناتاشا)
   const silencerPlayer = Array.from(playerMap.values()).find((p) => p.roleId === "silencer" || p.roleId === "natasha");
   if (actions.silencerTargetId) {
     const silencerId = silencerPlayer?.id || 'natasha_player';
     if (!updatedQuotas[silencerId]) {
       updatedQuotas[silencerId] = { totalUses: 0, selfUses: 0 };
     }

     if (silencerPlayer && blockedIds.has(silencerPlayer.id)) {
       logs.push(`ناتاشا خلع سلاح شده بود و موفق به بستن زبان کسی نشد.`);
     } else if (updatedQuotas[silencerId].lastTargetId === actions.silencerTargetId) {
       const target = playerMap.get(actions.silencerTargetId);
       logs.push(`⚠️ ناتاشا نمی‌تواند «${target ? target.name : actions.silencerTargetId}» را در دو شب متوالی سایلنت کند (اقدام باطل شد).`);
     } else {
       blockedIds.add(actions.silencerTargetId);
       silencedId = actions.silencerTargetId;
       updatedQuotas[silencerId].lastTargetId = actions.silencerTargetId;
       updatedQuotas[silencerId].totalUses = (updatedQuotas[silencerId].totalUses || 0) + 1;
       const target = playerMap.get(actions.silencerTargetId);
       logs.push(`ناتاشا بازیکن ${target ? target.name : actions.silencerTargetId} را سایلنت کرد.`);
     }
   }

  if (actions.priestTargetId) {
    const priestPlayer = Array.from(playerMap.values()).find((p) => p.roleId === "priest");
    if (!priestPlayer || !blockedIds.has(priestPlayer.id)) {
      const priestTarget = playerMap.get(actions.priestTargetId);
      if (priestTarget) {
        priestTarget.isSilenced = false;
        if (silencedId === priestTarget.id) {
          silencedId = undefined;
          logs.push(`کشیش با دعای خود مانع از سکوت شبانه ${priestTarget.name} شد.`);
        } else {
          logs.push(`کشیش با حضور بر بالین ${priestTarget.name}، هرگونه اثر سکوت را باطل کرد.`);
        }
      }
    } else {
      logs.push(`کشیش در بند گروگان‌گیر بود و دعای او اثری نداشت.`);
    }
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

  const lecterPlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'dr_lecter' || p.roleId === 'doctor_lecter');
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
  
    // --- ۲.۵ پردازش اثر محافظت بادیگارد (جان‌فدا) ---
    const guardTargetId = (actions as any).bodyguardTargetId || (actions as any).guardTargetId;
    const bodyguardPlayer = Array.from(playerMap.values()).find((p) => (p.roleId === "bodyguard" || p.roleId === "guard") && p.isAlive);
    const isBodyguardBlocked = bodyguardPlayer && blockedIds.has(bodyguardPlayer.id);

    // بررسی شلیک مافیا به فرد تحت محافظت
    let guardedSavedFromMafia = false;
    let bodyguardSacrificed = false;

    if (guardTargetId && bodyguardPlayer && !isBodyguardBlocked) {
      const bgId = bodyguardPlayer.id;
      if (!updatedQuotas[bgId]) {
        updatedQuotas[bgId] = { totalUses: 0, selfUses: 0, guardArmorUsed: 0 };
      }

      // اگر مافیا به فرد تحت محافظت شلیک کرده باشد
      if (actions.mafiaShotId === guardTargetId || (actions as any).mafiaShotId2 === guardTargetId) {
        const guardedTarget = playerMap.get(guardTargetId);
        const targetName = guardedTarget ? guardedTarget.name : "شهروند";

        if (!updatedQuotas[bgId].guardArmorUsed) {
          // بار اول: جلیقه حمایتی دفع می‌کند
          updatedQuotas[bgId].guardArmorUsed = 1;
          guardedSavedFromMafia = true;
          healed.add(guardTargetId);
          logs.push(`🛡️ جلیقه حمایتی محافظ فعال شد: تیر مافیا به سمت «${targetName}» دفع شد و خطری ایجاد نکرد.`);
        } else {
          // بار دوم: خود بادیگارد جان‌فدا می‌شود
          guardedSavedFromMafia = true;
          healed.add(guardTargetId);
          bodyguardSacrificed = true;
          deaths.add(bgId);
          logs.push(`⚰️ جان‌فشانی شجاعانه: «${bodyguardPlayer.name}» (بادیگارد) در راه محافظت از «${targetName}» جان خود را فدا کرد و کشته شد.`);
        }
      }
    }

    // ۳. اولویت سوم (شلیک‌ها و زره): شلیک شب مافیا و اسنایپر
  // ----------------------------------------------------
    // --- پردازش شلیک‌های مافیا (تک‌شات و شات دوم در صورت مرگ معشوقه) ---
    const mafiaShots = [actions.mafiaShotId, actions.mafiaShotId2].filter((id): id is string => Boolean(id));
    const uniqueMafiaShots = Array.from(new Set(mafiaShots));

    for (const shotTargetId of uniqueMafiaShots) {
      const target = playerMap.get(shotTargetId);
      if (!target) continue;

      const targetRoleDef = target.roleId ? getRoleDefinition(target.roleId) : undefined;
      const isBulletproof = (targetRoleDef as any)?.isPermanentNightImmune;

      if (doctorSaved.has(target.id) || lecterSaved.has(target.id) || (guardedSavedFromMafia && target.id === guardTargetId)) {
        logs.push(`شلیک مافیا به ${target.name} با مراقبت و مداوا بی‌اثر شد.`);
      } else if (isBulletproof) {
        logs.push(`شلیک مافیا به روئین‌تن (${target.name}) اصابت کرد اما او مصونیت دائم شبانه دارد.`);
      } else if (target.roleId === "armored" && updatedArmors[target.id] !== false) {
        updatedArmors[target.id] = false;
        logs.push(`[شبانه - محرمانه] شلیک مافیا به زره (${target.name}) اصابت کرد و جلیقه جذب شد.`);
      } else {
        target.isAlive = false;
        target.eliminationReason = "mafia_shot";
        deaths.add(target.id);
        deaths.add(target.id);
        logs.push(`مافیا با شلیک شبانه ${target.name} را از پای درآورد.`);
      }
    }

  // ----------------------------------------------------
  // ۴. اولویت چهارم (استعلام‌ها و فریب): کارآگاه و جوکر
  // ----------------------------------------------------
  let detectiveReport: { targetId: string; isPositive: boolean } | undefined;
  let journalistReport: { targetId: string; targetName: string; isNegotiated: boolean } | undefined;
    // --- پردازش شلیک اسنایپر و تعامل با سیو دکتر لکتر ---
    if (actions.sniperShotId) {
      const sniperPlayer = Array.from(playerMap.values()).find((p) => p.roleId === "sniper");
      const target = playerMap.get(actions.sniperShotId);
      if (target && (!sniperPlayer || !blockedIds.has(sniperPlayer.id))) {
          const targetRoleDef = target.roleId ? getRoleDefinition(target.roleId) : undefined;
          const mafiaRoleIds = [
            "godfather", "dr_lecter", "doctor_lecter", "simple_mafia", "natasha",
            "thief", "hostage_taker", "bomber", "informant_mafia", "infiltrator",
            "negotiator", "shadow_mafia", "terrorist", "mistress", "sweetheart"
          ];
          const isTargetMafia = Boolean(
            (targetRoleDef && (targetRoleDef.team === "mafia" || (targetRoleDef as any).side === "mafia")) ||
            ((target as any).side === "mafia") ||
            (target.roleId && mafiaRoleIds.includes(target.roleId.toLowerCase())) ||
            target.wasNegotiated
          );

        if (isTargetMafia) {
          if (lecterSaved.has(target.id)) {
            logs.push(`شلیک تک‌تیرانداز به ${target.name} اصابت کرد، اما با مداوای به‌موقع دکتر لکتر نجات یافت.`);
          } else if (target.roleId === "godfather" && updatedArmors[target.id] !== false) {
            updatedArmors[target.id] = false;
            logs.push(`شلیک تک‌تیرانداز به پدرخوانده (${target.name}) اصابت کرد و جلیقه ضدگلوله او شکسته شد.`);
          } else {
            target.isAlive = false;
            target.eliminationReason = "sniper_shot";
            deaths.add(target.id);
            logs.push(`تک‌تیرانداز با شلیکی دقیق، مافیا (${target.name}) را به هلاکت رساند.`);
          }
        } else {
          // شلیک اشتباه به شهروند -> اسنایپر حذف می‌شود
          logs.push(`تک‌تیرانداز به شهروند (${target.name}) شلیک اشتباه کرد!`);
          if (sniperPlayer) {
            sniperPlayer.isAlive = false;
            sniperPlayer.eliminationReason = "sniper_misfire";
            deaths.add(sniperPlayer.id);
            logs.push(`تک‌تیرانداز (${sniperPlayer.name}) به دلیل شلیک اشتباه به همشهری خود، از بازی حذف شد.`);
          }
        }
      }
    }

  if (actions.detectiveInquiryId) {
    const detectivePlayer = Array.from(playerMap.values()).find((p) => p.roleId === 'detective');
    if (!detectivePlayer || !blockedIds.has(detectivePlayer.id)) {
      const target = playerMap.get(actions.detectiveInquiryId);
      if (target && target.roleId) {
        const targetRoleDef = getRoleDefinition(target.roleId);
        const givesNegative = (targetRoleDef as any)?.givesNegativeInvestigation || target.roleId === 'godfather' || target.roleId === 'infiltrator';
        let isPositive = targetRoleDef?.team === 'mafia' && !givesNegative;


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
      const allPlayers = Array.from(playerMap.values());

      // ۱. شلیک‌کننده مافیا
      if (actions.mafiaShotId === targetId || actions.mafiaShotId2 === targetId) {
        const shooter = (actions.mafiaShooterId ? playerMap.get(actions.mafiaShooterId) : null)
          || allPlayers.find(p => p.roleId === 'godfather' && p.isAlive)
          || allPlayers.find(p => (p.roleId === 'dr_lecter' || p.roleId === 'doctor_lecter') && p.isAlive)
          || allPlayers.find(p => (p.team === 'mafia' || p.roleId?.includes('mafia')) && p.isAlive);
        if (shooter) watcherVisitors.push(shooter.name);
      }

      // ۲. پزشک
      if (actions.doctorSaveId === targetId) {
        const doc = allPlayers.find(p => p.roleId === 'doctor' && p.isAlive);
        if (doc) watcherVisitors.push(doc.name);
      }

      // ۳. کارآگاه
      if (actions.detectiveInquiryId === targetId) {
        const det = allPlayers.find(p => p.roleId === 'detective' && p.isAlive);
        if (det) watcherVisitors.push(det.name);
      }

      // ۴. تک‌تیرانداز
      if (actions.sniperShotId === targetId) {
        const snp = allPlayers.find(p => p.roleId === 'sniper' && p.isAlive);
        if (snp) watcherVisitors.push(snp.name);
      }

      // ۵. ناتاشا / سایلنسر
      if (actions.silencerTargetId === targetId) {
        const sil = allPlayers.find(p => (p.roleId === 'silencer' || p.roleId === 'natasha') && p.isAlive);
        if (sil) watcherVisitors.push(sil.name);
      }

      // ۶. محافظ / بادیگارد
      if ((actions as any).guardTargetId === targetId || (actions as any).bodyguardTargetId === targetId) {
        const grd = allPlayers.find(p => (p.roleId === 'bodyguard' || p.roleId === 'guard') && p.isAlive);
        if (grd) watcherVisitors.push(grd.name);
      }

      // ۷. تفنگدار
      if ((actions as any).gunsmithTarget1Id === targetId || (actions as any).gunsmithTarget2Id === targetId || (actions as any).gunsmithTargetId === targetId) {
        const gns = allPlayers.find(p => p.roleId === 'gunsmith' && p.isAlive);
        if (gns) watcherVisitors.push(gns.name);
      }

      // ۸. کشیش
      if ((actions as any).priestTargetId === targetId) {
        const prst = allPlayers.find(p => p.roleId === 'priest' && p.isAlive);
        if (prst) watcherVisitors.push(prst.name);
      }

      const uniqueVisitors = Array.from(new Set(watcherVisitors));
      watcherVisitors.length = 0;
      watcherVisitors.push(...uniqueVisitors);

      const visitorsStr = watcherVisitors.length > 0 ? ` (شامل: ${watcherVisitors.join('، ')})` : '';
      logs.push(`دیده‌بان ${watcherVisitors.length} ردپا در اطراف خانه هدف ثبت کرد${visitorsStr}.`);
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

  // ۶. اولویت ششم: پردازش مذاکره‌کننده مافیا (یارگیری)
  let negotiationSuccessful = false;
  let convertedPlayerId: string | undefined;
  let negotiatorFailedReason: string | undefined;

  if (actions.negotiatorTargetId) {
    const negotiatorPlayer = Array.from(playerMap.values()).find(
      (p) => p.isAlive && p.roleId?.toLowerCase() === "negotiator"
    );

    if (!negotiatorPlayer) {
      negotiatorFailedReason = "مذاکره‌کننده زنده نیست یا در بازی حضور ندارد.";
      logs.push(`⚠️ مذاکره انجام نشد: ${negotiatorFailedReason}`);
    } else {
      const negId = negotiatorPlayer.id;
      if (!updatedQuotas[negId]) {
        updatedQuotas[negId] = { totalUses: 0, selfUses: 0 };
      }

      if ((updatedQuotas[negId].totalUses || 0) >= 1) {
        negotiatorFailedReason = "سهمیه ۱ باره مذاکره در این بازی قبلاً استفاده شده است.";
        logs.push(`⚠️ تلاش برای مذاکره رد شد: ${negotiatorFailedReason}`);
      } else {
        const mafiaRoleIds = new Set([
            "godfather", "dr_lecter", "natasha", "bomber", "simple_mafia",
            "negotiator", "hostage_taker",  "mistress", "informant_mafia"
          ]);
          const deadMafiaCount = Array.from(playerMap.values()).filter((p) => {
            if (p.isAlive) return false;
            if (!p.roleId) return false;
            const roleDef = getRoleDefinition(p.roleId);
            return roleDef?.team === "mafia" || mafiaRoleIds.has(p.roleId.toLowerCase());
          }).length;

        if (deadMafiaCount < 1) {
          negotiatorFailedReason = "تا زمانی که حداقل یک عضو مافیا کشته نشده باشد، مذاکره مجاز نیست.";
          logs.push(`⚠️ تلاش برای مذاکره ناموفق بود: ${negotiatorFailedReason}`);
        } else {
          updatedQuotas[negId].totalUses = 1;
          updatedQuotas[negId].lastTargetId = actions.negotiatorTargetId;

          const target = playerMap.get(actions.negotiatorTargetId);
          if (!target || !target.isAlive) {
            negotiatorFailedReason = "هدف مذاکره زنده یا معتبر نیست.";
            logs.push(`⚠️ مذاکره با شکست مواجه شد: ${negotiatorFailedReason}`);
          } else if (deaths.has(target.id)) {
            negotiatorFailedReason = "هدف مذاکره در حوادث امشب به قتل رسید.";
            logs.push(`⚠️ مذاکره ناکام ماند: ${negotiatorFailedReason}`);
          } else if (target.roleId === "simple_citizen") {
            target.roleId = "simple_mafia";
            target.wasNegotiated = true;
            negotiationSuccessful = true;
            convertedPlayerId = target.id;
            logs.push(`🤝 مذاکره موفقیت‌آمیز بود: شهروند ساده (${target.name}) به تیم مافیا پیوست.`);
          } else {
            negotiatorFailedReason = "هدف انتخابی شهروند ساده نبود؛ مذاکره سوخت.";
            logs.push(`❌ مذاکره شکست خورد: هدف (${target.name}) دارای نقش توانایی‌دار بود و به مافیا نپیوست.`);
          }
        }
      }
    }
  }

  
  // ۷. اولویت هفتم: پردازش استعلام خبرنگار (تشخیص یارگیری مافیا)
  if (actions.journalistTargetId && actions.journalistTargetId !== "skip") {
    const journalistPlayer = Array.from(playerMap.values()).find(
      (p) => p.isAlive && p.roleId?.toLowerCase() === "journalist"
    );

    if (journalistPlayer && !blockedIds.has(journalistPlayer.id)) {
      const jourId = journalistPlayer.id;
      if (!updatedQuotas[jourId]) {
        updatedQuotas[jourId] = { totalUses: 0, selfUses: 0 };
      }

      const usedUses = updatedQuotas[jourId].totalUses || 0;
      if (usedUses >= 2) {
        logs.push(`⚠️ استعلام خبرنگار انجام نشد: سهمیه ۲ باره در این بازی به اتمام رسیده است.`);
      } else {
        const target = playerMap.get(actions.journalistTargetId);
        if (target && target.isAlive) {
          updatedQuotas[jourId].totalUses = usedUses + 1;
          updatedQuotas[jourId].lastTargetId = target.id;

          const isNegotiated = Boolean(target.wasNegotiated || (convertedPlayerId && target.id === convertedPlayerId));
          journalistReport = {
            targetId: target.id,
            targetName: target.name,
            isNegotiated,
          };

          logs.push(
            `📰 استعلام خبرنگار از «${target.name}»: ${
              isNegotiated ? "مذاکره‌شده (یارگیری مافیا 🔴)" : "مذاکره‌نشده (مافیای اصیل یا شهروند 🟢)"
            } (استعلام مصرف‌شده: ${usedUses + 1}/2)`
          );
        } else {
          logs.push(`⚠️ استعلام خبرنگار به دلیل نامعتبر بودن یا مرگ هدف انجام نشد.`);
        }
      }
    } else if (journalistPlayer && blockedIds.has(journalistPlayer.id)) {
      logs.push(`🔒 خبرنگار گروگان گرفته شده بود و نتوانست استعلام بگیرد.`);
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
      negotiationSuccessful,
      convertedPlayerId,
      negotiatorFailedReason,
      journalistReport,
      logs,
    },
    updatedQuotas,
  };
}
