import {
  Team,
  TeamSettings,
  Player,
  PositionCategory,
  Fixture,
  MatchSquad,
  PeriodLineup,
  PlannedInGameSub,
  SuggestedSubPlan,
  SuggestedSubSwap,
  MatchPlayerStats,
  SeasonDashboardSummary,
  getFixturePotmIds,
} from '@subshuffle/shared';

const VALID_POSITIONS: PositionCategory[] = ['Goalkeeper', 'Defence', 'Midfield', 'Attack'];

/**
 * Pure JavaScript query string parser safe for React Native Hermes
 * (where URLSearchParams.prototype.get may not be implemented).
 */
export function parseQueryParams(queryString: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!queryString) return result;
  const clean = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  for (const part of clean.split('&')) {
    if (!part) continue;
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) {
      result[decodeURIComponent(part)] = '';
    } else {
      const key = decodeURIComponent(part.slice(0, eqIdx));
      const val = decodeURIComponent(part.slice(eqIdx + 1).replace(/\+/g, ' '));
      result[key] = val;
    }
  }
  return result;
}

export function normalizeTeamSettings(
  raw: any,
  fallback: TeamSettings
): TeamSettings {
  const s = raw && typeof raw === 'object' ? raw : {};
  const pitchPlayerCount =
    typeof s.pitchPlayerCount === 'number' && s.pitchPlayerCount > 0
      ? s.pitchPlayerCount
      : fallback.pitchPlayerCount;
  const currentSeason =
    typeof s.currentSeason === 'string' && s.currentSeason.trim()
      ? s.currentSeason.trim()
      : fallback.currentSeason || '2026/2027';
  const rawSeasons = Array.isArray(s.seasons)
    ? s.seasons.filter((x: any) => typeof x === 'string' && x.trim())
    : [];
  const seasons =
    rawSeasons.length > 0
      ? Array.from(new Set([currentSeason, ...rawSeasons]))
      : [currentSeason];

  const customFormations = Array.isArray(s.customFormations)
    ? s.customFormations
        .filter((cf: any) => cf && (Array.isArray(cf.positions) || Array.isArray(cf.slots)))
        .map((cf: any) => {
          const slots = Array.isArray(cf.positions) ? cf.positions : cf.slots;
          const size = cf.pitchPlayerCount || cf.teamSize || pitchPlayerCount;
          return {
            ...cf,
            id: cf.id || cf.name || `custom_${size}`,
            name: cf.name || 'Custom',
            pitchPlayerCount: size,
            teamSize: size,
            positions: slots,
            slots,
          };
        })
    : [];

  return {
    pitchPlayerCount,
    matchdaySquadCap:
      typeof s.matchdaySquadCap === 'number' ? s.matchdaySquadCap : pitchPlayerCount + 4,
    subCount: typeof s.subCount === 'number' ? s.subCount : 3,
    matchPeriodCount:
      typeof s.matchPeriodCount === 'number' && s.matchPeriodCount > 0
        ? s.matchPeriodCount
        : fallback.matchPeriodCount || 2,
    periodDurationMinutes:
      typeof s.periodDurationMinutes === 'number' && s.periodDurationMinutes > 0
        ? s.periodDurationMinutes
        : fallback.periodDurationMinutes || 25,
    targetGameTimePercent:
      typeof s.targetGameTimePercent === 'number'
        ? s.targetGameTimePercent
        : fallback.targetGameTimePercent || 50,
    defaultFormation:
      typeof s.defaultFormation === 'string' && s.defaultFormation.trim()
        ? s.defaultFormation
        : fallback.defaultFormation || '2-3-1 (Standard)',
    customFormations,
    currentSeason,
    seasons,
    defaultSubIntervalMinutes:
      typeof s.defaultSubIntervalMinutes === 'number'
        ? s.defaultSubIntervalMinutes
        : typeof s.midPeriodSubIntervalMinutes === 'number'
        ? s.midPeriodSubIntervalMinutes
        : 10,
    subTimingMode: s.subTimingMode || 'in_game',
    preserveLineupAcrossBreaks:
      typeof s.preserveLineupAcrossBreaks === 'boolean' ? s.preserveLineupAcrossBreaks : true,
    midPeriodSubIntervalMinutes:
      typeof s.midPeriodSubIntervalMinutes === 'number' ? s.midPeriodSubIntervalMinutes : 10,
  };
}

export function normalizeTeam(raw: any, fallback: Team): Team {
  if (!raw || typeof raw !== 'object') return fallback;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallback.id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : fallback.name,
    ageGroup:
      typeof raw.ageGroup === 'string' && raw.ageGroup.trim()
        ? raw.ageGroup.trim()
        : fallback.ageGroup || 'U10',
    ownerId: typeof raw.ownerId === 'string' ? raw.ownerId : undefined,
    ownerEmail: typeof raw.ownerEmail === 'string' ? raw.ownerEmail : undefined,
    sharedWith: Array.isArray(raw.sharedWith) ? raw.sharedWith : [],
    settings: normalizeTeamSettings(raw.settings, fallback.settings),
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : fallback.createdAt,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  };
}

export function normalizePlayer(raw: any, defaultTeamId: string): Player {
  const p = raw && typeof raw === 'object' ? raw : {};
  const rawPositions = Array.isArray(p.preferredPositions)
    ? p.preferredPositions.filter((pos: any) => VALID_POSITIONS.includes(pos))
    : [];
  return {
    id:
      typeof p.id === 'string' && p.id
        ? p.id
        : `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    teamId: typeof p.teamId === 'string' && p.teamId ? p.teamId : defaultTeamId,
    name: typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Player',
    squadNumber:
      typeof p.squadNumber === 'number' && !isNaN(p.squadNumber) ? p.squadNumber : undefined,
    preferredPositions: rawPositions.length > 0 ? rawPositions : ['Midfield'],
    unavailableDates: Array.isArray(p.unavailableDates)
      ? p.unavailableDates.filter((d: any) => typeof d === 'string')
      : [],
    matchesPlayed: typeof p.matchesPlayed === 'number' ? p.matchesPlayed : 0,
    totalMinutesPlayed: typeof p.totalMinutesPlayed === 'number' ? p.totalMinutesPlayed : 0,
  };
}

/**
 * Normalizes `MatchSquad` payloads between server (`subs`, `playerOutId`, `playerInId`)
 * and mobile (`bench`, `offPlayerId`, `onPlayerId`) so both sets of keys are always populated.
 */
export function normalizeMatchSquad(raw: any): MatchSquad | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const selectedPlayerIds = Array.isArray(raw.selectedPlayerIds)
    ? raw.selectedPlayerIds.filter((id: any) => typeof id === 'string')
    : [];
  const restedPlayerIds = Array.isArray(raw.restedPlayerIds)
    ? raw.restedPlayerIds.filter((id: any) => typeof id === 'string')
    : [];
  const fixedPlayerPositions =
    raw.fixedPlayerPositions && typeof raw.fixedPlayerPositions === 'object'
      ? { ...raw.fixedPlayerPositions }
      : {};
  const lineupsByPeriod: PeriodLineup[] = Array.isArray(raw.lineupsByPeriod)
    ? raw.lineupsByPeriod
        .filter((lp: any) => lp && typeof lp === 'object')
        .map((lp: any, idx: number) => {
          const rawBench = Array.isArray(lp.bench)
            ? lp.bench
            : Array.isArray(lp.subs)
            ? lp.subs
            : [];
          const bench = rawBench.filter((bid: any) => typeof bid === 'string');
          return {
            period: typeof lp.period === 'number' ? lp.period : idx + 1,
            onPitch: Array.isArray(lp.onPitch)
              ? lp.onPitch
                  .filter((op: any) => op && typeof op === 'object')
                  .map((op: any) => ({
                    position: typeof op.position === 'string' ? op.position : 'MID_C',
                    playerId: typeof op.playerId === 'string' ? op.playerId : '',
                  }))
              : [],
            bench,
            subs: bench,
          };
        })
    : [];

  const plannedInGameSubs: PlannedInGameSub[] = Array.isArray(raw.plannedInGameSubs)
    ? raw.plannedInGameSubs
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any, idx: number) => {
          const offId =
            typeof s.offPlayerId === 'string' && s.offPlayerId
              ? s.offPlayerId
              : typeof s.playerOutId === 'string'
              ? s.playerOutId
              : '';
          const onId =
            typeof s.onPlayerId === 'string' && s.onPlayerId
              ? s.onPlayerId
              : typeof s.playerInId === 'string'
              ? s.playerInId
              : '';
          const period = typeof s.period === 'number' ? s.period : 1;
          const targetMinute = typeof s.targetMinute === 'number' ? s.targetMinute : 10;
          const matchMinute =
            typeof s.matchMinute === 'number' ? s.matchMinute : targetMinute;
          return {
            id: typeof s.id === 'string' && s.id ? s.id : `sub_${period}_${targetMinute}_${idx}`,
            period,
            targetMinute,
            matchMinute,
            offPlayerId: offId,
            onPlayerId: onId,
            playerOutId: offId,
            playerOutName: typeof s.playerOutName === 'string' ? s.playerOutName : undefined,
            playerInId: onId,
            playerInName: typeof s.playerInName === 'string' ? s.playerInName : undefined,
            position: typeof s.position === 'string' ? s.position : 'MID_C',
            reason: typeof s.reason === 'string' ? s.reason : undefined,
            executed: Boolean(s.executed),
          };
        })
    : [];

  return {
    fixtureId: typeof raw.fixtureId === 'string' ? raw.fixtureId : undefined,
    selectedPlayerIds,
    restedPlayerIds,
    manualOverrides: Boolean(raw.manualOverrides),
    fixedPlayerPositions,
    lineupsByPeriod,
    plannedInGameSubs,
  };
}

export function normalizeFixture(raw: any, defaultTeamId: string): Fixture {
  const f = raw && typeof raw !== 'boolean' && typeof raw === 'object' ? raw : {};
  const fixedPlayerPositions =
    f.fixedPlayerPositions && typeof f.fixedPlayerPositions === 'object'
      ? { ...f.fixedPlayerPositions }
      : undefined;
  const scorers = Array.isArray(f.scorers)
    ? f.scorers
        .filter((s: any) => s && typeof s === 'object')
        .map((s: any, idx: number) => ({
          id: typeof s.id === 'string' && s.id ? s.id : `sc_${idx}`,
          playerId: typeof s.playerId === 'string' ? s.playerId : undefined,
          playerName: typeof s.playerName === 'string' ? s.playerName : undefined,
          minute:
            typeof s.minute === 'number' || typeof s.minute === 'string'
              ? s.minute
              : undefined,
          isOwnGoal: Boolean(s.isOwnGoal),
          team: (s.team === 'away' ? 'away' : 'home') as 'home' | 'away',
        }))
    : undefined;

  return {
    id: typeof f.id === 'string' && f.id ? f.id : `fix_${Date.now()}`,
    teamId: typeof f.teamId === 'string' && f.teamId ? f.teamId : defaultTeamId,
    season: typeof f.season === 'string' ? f.season : undefined,
    date:
      typeof f.date === 'string' && f.date.trim()
        ? f.date.trim()
        : new Date().toISOString().slice(0, 10),
    kickOffTime: typeof f.kickOffTime === 'string' ? f.kickOffTime : undefined,
    meetTime: typeof f.meetTime === 'string' ? f.meetTime : undefined,
    opponent:
      typeof f.opponent === 'string' && f.opponent.trim() ? f.opponent.trim() : 'Opponent',
    venue: f.venue === 'Away' ? 'Away' : 'Home',
    groundAddress: typeof f.groundAddress === 'string' ? f.groundAddress : undefined,
    status:
      f.status === 'Completed' ||
      f.status === 'Played' ||
      f.status === 'In Progress' ||
      f.status === 'Cancelled' ||
      f.status === 'Draft'
        ? f.status
        : 'Upcoming',
    isLive: Boolean(f.isLive),
    formation: typeof f.formation === 'string' ? f.formation : undefined,
    pitchPlayerCount: typeof f.pitchPlayerCount === 'number' ? f.pitchPlayerCount : undefined,
    matchPeriodCount: typeof f.matchPeriodCount === 'number' ? f.matchPeriodCount : undefined,
    periodDurationMinutes:
      typeof f.periodDurationMinutes === 'number' ? f.periodDurationMinutes : undefined,
    midPeriodSubIntervalMinutes:
      typeof f.midPeriodSubIntervalMinutes === 'number'
        ? f.midPeriodSubIntervalMinutes
        : undefined,
    captainId: typeof f.captainId === 'string' ? f.captainId : undefined,
    playerOfTheMatchId:
      typeof f.playerOfTheMatchId === 'string' ? f.playerOfTheMatchId : undefined,
    playerOfTheMatchIds: Array.isArray(f.playerOfTheMatchIds)
      ? f.playerOfTheMatchIds.filter((id: any) => typeof id === 'string')
      : undefined,
    homeScore: typeof f.homeScore === 'number' ? f.homeScore : undefined,
    awayScore: typeof f.awayScore === 'number' ? f.awayScore : undefined,
    scorers,
    fixedPlayerPositions,
    matchSquad: normalizeMatchSquad(f.matchSquad),
    postMatchRecording:
      f.postMatchRecording && typeof f.postMatchRecording === 'object'
        ? {
            ...f.postMatchRecording,
            actualMinutesByPlayer:
              f.postMatchRecording.actualMinutesByPlayer ||
              f.postMatchRecording.playerMinutes ||
              {},
            playerMinutes:
              f.postMatchRecording.playerMinutes ||
              f.postMatchRecording.actualMinutesByPlayer ||
              {},
          }
        : undefined,
  };
}

/**
 * Normalizes the response from `GET /api/fixtures/:id/suggested-subs`.
 * The server returns `plans: [{ intervalMinutes, strategyName, windows: [{ minute, period, subChanges: [...] }] }]`.
 * Mobile UI consumes `SuggestedSubPlan[]` (`[{ period, minuteMark, periodMinute, swaps: [...] }]`).
 */
export function normalizeSuggestedSubPlans(
  rawPlans: any,
  periodDurationMinutes: number = 25
): SuggestedSubPlan[] {
  if (!Array.isArray(rawPlans) || rawPlans.length === 0) return [];
  const safeDur = periodDurationMinutes > 0 ? periodDurationMinutes : 25;

  // Case 1: Server strategy array format `[{ strategyName, windows: [...] }, ...]`
  const firstItem = rawPlans[0];
  const windowsSource =
    firstItem && typeof firstItem === 'object' && Array.isArray(firstItem.windows)
      ? firstItem.windows
      : rawPlans;

  const result: SuggestedSubPlan[] = [];
  for (const w of windowsSource) {
    if (!w || typeof w !== 'object') continue;
    const period = typeof w.period === 'number' && w.period > 0 ? w.period : 1;
    const minuteMark =
      typeof w.minuteMark === 'number'
        ? w.minuteMark
        : typeof w.minute === 'number'
        ? w.minute
        : (period - 1) * safeDur + 10;
    const periodMinute =
      typeof w.periodMinute === 'number'
        ? w.periodMinute
        : Math.max(1, minuteMark - (period - 1) * safeDur);

    const rawSwaps = Array.isArray(w.swaps)
      ? w.swaps
      : Array.isArray(w.subChanges)
      ? w.subChanges
      : [];

    const swaps: SuggestedSubSwap[] = rawSwaps
      .filter((sw: any) => sw && typeof sw === 'object')
      .map((sw: any) => ({
        offPlayerId: String(sw.offPlayerId || sw.playerOutId || ''),
        offPlayerName: String(sw.offPlayerName || sw.playerOutName || 'Player'),
        onPlayerId: String(sw.onPlayerId || sw.playerInId || ''),
        onPlayerName: String(sw.onPlayerName || sw.playerInName || 'Player'),
        position: String(sw.position || 'MID_C'),
        reason: typeof sw.reason === 'string' ? sw.reason : undefined,
      }));

    if (swaps.length > 0) {
      result.push({
        period,
        minuteMark,
        periodMinute,
        swaps,
      });
    }
  }
  return result;
}

/**
 * Normalizes `GET /api/fixtures/:id/stats` responses where the server returns
 * `{ playerId, player, periodsPlayed: number[], minutesPlayed, gameTimePercent, positionsPlayed }`.
 */
export function normalizeMatchPlayerStats(
  rawStats: any,
  players: Player[],
  periodCount: number = 2,
  targetGameTimePercent: number = 50
): MatchPlayerStats[] {
  if (!Array.isArray(rawStats)) return [];
  const playerMap = new Map((players || []).map((p) => [p.id, p]));

  return rawStats
    .filter((st: any) => st && typeof st === 'object')
    .map((st: any) => {
      const pid = String(st.playerId || st.player?.id || '');
      const playerObj = st.player || playerMap.get(pid);
      const periodsOnPitch =
        typeof st.periodsOnPitch === 'number'
          ? st.periodsOnPitch
          : Array.isArray(st.periodsPlayed)
          ? st.periodsPlayed.length
          : typeof st.periodsPlayed === 'number'
          ? st.periodsPlayed
          : 0;
      const periodsOnBench =
        typeof st.periodsOnBench === 'number'
          ? st.periodsOnBench
          : Math.max(0, periodCount - periodsOnPitch);
      const totalMinutes =
        typeof st.totalMinutes === 'number'
          ? st.totalMinutes
          : typeof st.minutesPlayed === 'number'
          ? st.minutesPlayed
          : 0;
      const percentOfMatch =
        typeof st.percentOfMatch === 'number'
          ? st.percentOfMatch
          : typeof st.gameTimePercent === 'number'
          ? st.gameTimePercent
          : 0;
      const positionsPlayed = Array.isArray(st.positionsPlayed)
        ? st.positionsPlayed.filter((x: any) => typeof x === 'string')
        : [];
      const meetsTarget =
        typeof st.meetsTarget === 'boolean'
          ? st.meetsTarget
          : percentOfMatch >= targetGameTimePercent;

      return {
        playerId: pid,
        playerName: String(st.playerName || playerObj?.name || 'Player'),
        squadNumber:
          typeof st.squadNumber === 'number'
            ? st.squadNumber
            : typeof playerObj?.squadNumber === 'number'
            ? playerObj.squadNumber
            : undefined,
        periodsOnPitch,
        periodsOnBench,
        totalMinutes,
        percentOfMatch,
        positionsPlayed,
        meetsTarget,
      };
    });
}

/**
 * Normalizes either a server `TeamDashboardSummary` (`overview.record` + `scorersLeaderboard` + `potmLeaderboard`)
 * or a client `SeasonDashboardSummary` or computes a live fallback from `fixtures` and `players`.
 */
export function normalizeDashboardSummary(
  raw: any,
  fixtures: Fixture[],
  players: Player[]
): SeasonDashboardSummary {
  const playerMap = new Map((players || []).map((p) => [p.id, p]));
  const safeFixtures = Array.isArray(fixtures) ? fixtures : [];
  const defaultTeamId =
    (raw && typeof raw.teamId === 'string' && raw.teamId) ||
    safeFixtures[0]?.teamId ||
    players[0]?.teamId ||
    'demo-team-1';
  const defaultSeason =
    (raw && typeof raw.season === 'string' && raw.season) ||
    safeFixtures[0]?.season ||
    '2026/2027';

  const recentFixturesSummary = safeFixtures
    .filter((f) => typeof f.homeScore === 'number' && typeof f.awayScore === 'number')
    .slice(-5)
    .map((f) => {
      const us = f.venue === 'Home' ? f.homeScore! : f.awayScore!;
      const them = f.venue === 'Home' ? f.awayScore! : f.homeScore!;
      const result: 'W' | 'D' | 'L' = us > them ? 'W' : us === them ? 'D' : 'L';
      return {
        fixtureId: f.id,
        date: f.date,
        opponent: f.opponent,
        venue: f.venue,
        homeScore: f.homeScore!,
        awayScore: f.awayScore!,
        result,
      };
    });

  if (raw && typeof raw === 'object') {
    if (raw.overview && typeof raw.overview === 'object') {
      const ov = raw.overview;
      const matchesPlayed = typeof ov.matchesPlayed === 'number' ? ov.matchesPlayed : 0;
      const wins = typeof ov.record?.wins === 'number' ? ov.record.wins : 0;
      const draws = typeof ov.record?.draws === 'number' ? ov.record.draws : 0;
      const losses = typeof ov.record?.losses === 'number' ? ov.record.losses : 0;
      const goalsFor = typeof ov.goalsFor === 'number' ? ov.goalsFor : 0;
      const goalsAgainst = typeof ov.goalsAgainst === 'number' ? ov.goalsAgainst : 0;
      const topScorers = Array.isArray(raw.scorersLeaderboard)
        ? raw.scorersLeaderboard.map((s: any) => ({
            playerId: String(s.playerId || ''),
            playerName: String(s.playerName || playerMap.get(s.playerId)?.name || 'Player'),
            squadNumber:
              typeof s.squadNumber === 'number'
                ? s.squadNumber
                : playerMap.get(s.playerId)?.squadNumber,
            goals: typeof s.goals === 'number' ? s.goals : 0,
          }))
        : [];
      const potmLeaders = Array.isArray(raw.potmLeaderboard)
        ? raw.potmLeaderboard.map((p: any) => ({
            playerId: String(p.playerId || ''),
            playerName: String(p.playerName || playerMap.get(p.playerId)?.name || 'Player'),
            squadNumber:
              typeof p.squadNumber === 'number'
                ? p.squadNumber
                : playerMap.get(p.playerId)?.squadNumber,
            awards: typeof p.awards === 'number' ? p.awards : 0,
          }))
        : [];

      return {
        teamId: defaultTeamId,
        season: defaultSeason,
        matchesPlayed,
        wins,
        draws,
        losses,
        winRatePercent: matchesPlayed > 0 ? Math.round((wins / matchesPlayed) * 100) : 0,
        goalsFor,
        goalsAgainst,
        goalDifference:
          typeof ov.goalDifference === 'number' ? ov.goalDifference : goalsFor - goalsAgainst,
        topScorers,
        potmLeaders,
        recentFixtures: recentFixturesSummary,
      };
    }

    if (typeof raw.matchesPlayed === 'number' && Array.isArray(raw.topScorers)) {
      return {
        teamId: defaultTeamId,
        season: defaultSeason,
        matchesPlayed: raw.matchesPlayed,
        wins: Number(raw.wins) || 0,
        draws: Number(raw.draws) || 0,
        losses: Number(raw.losses) || 0,
        winRatePercent: Number(raw.winRatePercent) || 0,
        goalsFor: Number(raw.goalsFor) || 0,
        goalsAgainst: Number(raw.goalsAgainst) || 0,
        goalDifference: Number(raw.goalDifference) || 0,
        topScorers: Array.isArray(raw.topScorers) ? raw.topScorers : [],
        potmLeaders: Array.isArray(raw.potmLeaders) ? raw.potmLeaders : [],
        recentFixtures: Array.isArray(raw.recentFixtures)
          ? raw.recentFixtures
          : recentFixturesSummary,
      };
    }
  }

  // Fallback computation from fixtures & players
  const completed = safeFixtures.filter(
    (f) =>
      (f.status === 'Completed' || f.status === 'Played') &&
      typeof f.homeScore === 'number' &&
      typeof f.awayScore === 'number'
  );
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  const goalCounts = new Map<string, number>();
  const potmCounts = new Map<string, number>();

  for (const f of safeFixtures) {
    for (const pid of getFixturePotmIds(f)) {
      potmCounts.set(pid, (potmCounts.get(pid) || 0) + 1);
    }
    const ourSide = f.venue === 'Home' ? 'home' : 'away';
    for (const sc of f.scorers || []) {
      if (sc.team === ourSide && sc.playerId && !sc.isOwnGoal) {
        goalCounts.set(sc.playerId, (goalCounts.get(sc.playerId) || 0) + 1);
      }
    }
  }

  for (const f of completed) {
    const us = f.venue === 'Home' ? f.homeScore! : f.awayScore!;
    const them = f.venue === 'Home' ? f.awayScore! : f.homeScore!;
    goalsFor += us;
    goalsAgainst += them;
    if (us > them) wins++;
    else if (us === them) draws++;
    else losses++;
  }

  const topScorers = Array.from(goalCounts.entries())
    .map(([playerId, goals]) => ({
      playerId,
      playerName: playerMap.get(playerId)?.name || 'Player',
      squadNumber: playerMap.get(playerId)?.squadNumber,
      goals,
    }))
    .sort((a, b) => b.goals - a.goals);

  const potmLeaders = Array.from(potmCounts.entries())
    .map(([playerId, awards]) => ({
      playerId,
      playerName: playerMap.get(playerId)?.name || 'Player',
      squadNumber: playerMap.get(playerId)?.squadNumber,
      awards,
    }))
    .sort((a, b) => b.awards - a.awards);

  return {
    teamId: defaultTeamId,
    season: defaultSeason,
    matchesPlayed: completed.length,
    wins,
    draws,
    losses,
    winRatePercent: completed.length > 0 ? Math.round((wins / completed.length) * 100) : 0,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    topScorers,
    potmLeaders,
    recentFixtures: recentFixturesSummary,
  };
}
