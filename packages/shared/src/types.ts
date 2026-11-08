export type PositionCategory = 'Goalkeeper' | 'Defence' | 'Midfield' | 'Attack';

export type SpecificPosition =
  | 'Goalkeeper'
  | 'Right Back'
  | 'Left Back'
  | 'Centre Back'
  | 'Defensive Midfield'
  | 'Central Midfield'
  | 'Attacking Midfield'
  | 'Right Midfield'
  | 'Left Midfield'
  | 'Right Wing'
  | 'Left Wing'
  | 'Striker';

export type SubstitutionTimingMode = 'at_breaks' | 'in_game' | 'hybrid';
export type SubsPerWindowOption = 'auto' | 'all_bench' | number;

export interface FormationPosition {
  code: string;
  label: string;
  category: PositionCategory;
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  pitchPlayerCount: number;
  teamSize?: number;
  isCustom?: boolean;
  positions: FormationPosition[];
  slots?: any[];
}

export interface TeamShareMember {
  email: string;
  userId?: string;
  role?: 'coach' | 'viewer';
  sharedAt?: string;
}

export interface TeamSettings {
  pitchPlayerCount: number;
  matchdaySquadCap: number;
  subCount: number;
  matchPeriodCount: number;
  periodDurationMinutes: number;
  targetGameTimePercent: number;
  defaultFormation: string;
  customFormations: Formation[];
  currentSeason: string;
  seasons: string[];
  defaultSubIntervalMinutes?: number;
  subTimingMode?: SubstitutionTimingMode;
  preserveLineupAcrossBreaks?: boolean;
  midPeriodSubIntervalMinutes?: number;
  enforceEveryoneRestsOnce?: boolean;
  kitPrimaryColor?: string;
  kitSecondaryColor?: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  ownerId?: string;
  ownerEmail?: string;
  sharedWith?: Array<string | TeamShareMember>;
  settings: TeamSettings;
  createdAt: string;
  updatedAt?: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  squadNumber?: number;
  preferredPositions: PositionCategory[];
  specificPositions?: SpecificPosition[];
  isFixedPosition?: boolean;
  fixedPosition?: string;
  unavailableDates: string[];
  signOnDate?: string;
  leaveDate?: string;
  matchesPlayed: number;
  totalMinutesPlayed: number;
  captainCount?: number;
  playerOfTheMatchCount?: number;
}

export interface PitchAssignment {
  position: string;
  playerId: string;
}

export interface PeriodLineup {
  period: number;
  onPitch: PitchAssignment[];
  bench: string[];
}

export interface PlannedInGameSub {
  id: string;
  period: number;
  targetMinute: number;
  matchMinute: number;
  offPlayerId: string;
  onPlayerId: string;
  position: string;
  executed?: boolean;
}

export interface LiveMatchPeriodTimer {
  period: number;
  elapsedSeconds: number;
  isRunning: boolean;
  startedAt?: number;
  completed?: boolean;
  stoppageSeconds?: number;
}

export interface InGameSubLog {
  id: string;
  period: number;
  minute: number;
  matchMinute?: number;
  time?: string;
  offPlayerId: string;
  offPlayerName?: string;
  onPlayerId: string;
  onPlayerName?: string;
  position?: string;
  text?: string;
  timestamp: string;
}

export interface LiveMatchState {
  currentPeriod: number;
  isRunning?: boolean;
  elapsedSeconds?: number;
  startedAt?: string | number;
  periodTimers?: LiveMatchPeriodTimer[];
  subLogs?: InGameSubLog[];
  subLog?: InGameSubLog[];
  updatedAt?: string;
}

export interface MatchSquad {
  selectedPlayerIds: string[];
  lineupsByPeriod: PeriodLineup[];
  fixedPlayerPositions?: Record<string, string>;
  plannedInGameSubs?: PlannedInGameSub[];
  liveMatchState?: LiveMatchState;
}

export interface GoalScorer {
  id: string;
  playerId?: string;
  playerName?: string;
  minute?: number | string;
  isOwnGoal?: boolean;
  team: 'home' | 'away';
}

export interface EarlyDeparture {
  playerId: string;
  playerName: string;
  period: number;
  minute: number;
  matchMinute: number;
  reason: 'injured' | 'left_early' | 'unwell';
  replacedByPlayerId?: string;
  replacedByPlayerName?: string;
  departedAt: string;
  proRatedMinutes: number;
}

export interface PostMatchRecording {
  trackingMode: 'full_credit' | 'custom_minutes';
  actualMinutesByPlayer: Record<string, number>;
  recordedAt: string;
  notes?: string;
}

export interface SuggestedSubSwap {
  offPlayerId: string;
  offPlayerName: string;
  onPlayerId: string;
  onPlayerName: string;
  position: string;
  reason?: string;
}

export interface SuggestedSubPlan {
  period: number;
  minuteMark: number;
  periodMinute: number;
  swaps: SuggestedSubSwap[];
}

export interface MatchPlayerStats {
  playerId: string;
  playerName: string;
  squadNumber?: number;
  periodsOnPitch: number;
  periodsOnBench: number;
  totalMinutes: number;
  percentOfMatch: number;
  positionsPlayed: string[];
  meetsTarget: boolean;
}

export interface SeasonDashboardSummary {
  teamId: string;
  season: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRatePercent: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  topScorers: Array<{
    playerId: string;
    playerName: string;
    squadNumber?: number;
    goals: number;
  }>;
  potmLeaders: Array<{
    playerId: string;
    playerName: string;
    squadNumber?: number;
    awards: number;
  }>;
  recentFixtures: Array<{
    fixtureId: string;
    date: string;
    opponent: string;
    venue: 'Home' | 'Away';
    homeScore: number;
    awayScore: number;
    result: 'W' | 'D' | 'L';
  }>;
}

export interface Fixture {
  id: string;
  teamId: string;
  season?: string;
  date: string;
  kickOffTime?: string;
  meetTime?: string;
  groundAddress?: string;
  mapsUrl?: string;
  captainId?: string;
  playerOfTheMatchId?: string;
  playerOfTheMatchIds?: string[];
  opponent: string;
  venue: 'Home' | 'Away';
  status: 'Upcoming' | 'In Progress' | 'Completed' | 'Played' | 'Draft' | 'Cancelled' | 'Postponed';
  matchdaySquadCap?: number;
  pitchPlayerCount?: number;
  matchPeriodCount?: number;
  periodDurationMinutes?: number;
  formation?: string;
  fixedPlayerPositions?: Record<string, string>;
  subTimingMode?: SubstitutionTimingMode;
  preserveLineupAcrossBreaks?: boolean;
  midPeriodSubIntervalMinutes?: number;
  matchSquad?: MatchSquad;
  liveMatchState?: LiveMatchState;
  earlyDepartures?: EarlyDeparture[];
  postMatchRecording?: PostMatchRecording;
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  isLive?: boolean;
  version?: number;
  updatedAt?: string;
}

/**
 * Helper to return all Player of the Match IDs for a fixture (backward compatible with playerOfTheMatchId).
 */
export function getFixturePotmIds(fixture?: Partial<Fixture> | null): string[] {
  if (!fixture) return [];
  if (Array.isArray(fixture.playerOfTheMatchIds) && fixture.playerOfTheMatchIds.length > 0) {
    return Array.from(new Set(fixture.playerOfTheMatchIds.filter(Boolean)));
  }
  if (fixture.playerOfTheMatchId) {
    return [fixture.playerOfTheMatchId];
  }
  return [];
}
