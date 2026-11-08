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
  isCustom?: boolean;
  positions: FormationPosition[];
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
  kitPrimaryColor?: string;
  kitSecondaryColor?: string;
}

export interface Team {
  id: string;
  name: string;
  ageGroup: string;
  ownerId?: string;
  ownerEmail?: string;
  sharedWith?: string[];
  settings: TeamSettings;
  createdAt: string;
}

export interface Player {
  id: string;
  teamId: string;
  name: string;
  squadNumber?: number;
  preferredPositions: PositionCategory[];
  specificPositions?: SpecificPosition[];
  unavailableDates: string[];
  matchesPlayed: number;
  totalMinutesPlayed: number;
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
  offPlayerId: string;
  onPlayerId: string;
  position: string;
  timestamp: string;
}

export interface LiveMatchState {
  currentPeriod: number;
  periodTimers: LiveMatchPeriodTimer[];
  subLogs: InGameSubLog[];
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
  playerName: string;
  minute?: number | string;
  isOwnGoal?: boolean;
  team: 'home' | 'away';
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
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  isLive?: boolean;
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

