import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Team,
  TeamSettings,
  Player,
  Fixture,
  Formation,
  MatchSquad,
  PlannedInGameSub,
  GoalScorer,
  PostMatchRecording,
  SuggestedSubPlan,
  SubsPerWindowOption,
  MatchPlayerStats,
  SeasonDashboardSummary,
  BUILT_IN_FORMATIONS,
  formatWhatsAppMatchSummary,
  getFixturePotmIds,
} from '@subshuffle/shared';
import {
  triggerTouchlineHaptic,
  scheduleLiveMatchAlarms,
  cancelScheduledMatchAlarms,
} from '../services/matchNotificationService';
import {
  MobileAuthUser,
  loadPersistedPrefs,
  savePersistedPrefs,
  mobileSignInWithEmail,
  mobileRegisterWithEmail,
  mobileSendPasswordReset,
  ensureFreshIdToken,
  openGoogleBrowserSignIn,
  parseAndSaveAuthDeepLink,
  mobileSignInWithGoogleIdToken,
} from '../services/mobileAuthService';
import {
  signInWithNativeGoogle,
  signOutNativeGoogle,
  isNativeGoogleSignInAvailable,
} from '../services/nativeGoogleSignIn';
import {
  normalizeTeam,
  normalizePlayer,
  normalizeFixture,
  normalizeMatchSquad,
  normalizeDashboardSummary,
  normalizeSuggestedSubPlans,
  normalizeMatchPlayerStats,
} from '../services/mobileDataNormalizer';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://subshuffle-beta.web.app';

const FALLBACK_TEAM: Team = {
  id: 'demo-team-1',
  name: 'The Rovers FC (Demo U10s)',
  ageGroup: 'U10',
  settings: {
    pitchPlayerCount: 7,
    matchdaySquadCap: 10,
    subCount: 3,
    matchPeriodCount: 2,
    periodDurationMinutes: 25,
    targetGameTimePercent: 50,
    defaultFormation: '2-3-1 (Standard)',
    customFormations: [],
    currentSeason: '2026/2027',
    seasons: ['2026/2027'],
    defaultSubIntervalMinutes: 10,
    subTimingMode: 'in_game',
    preserveLineupAcrossBreaks: true,
    midPeriodSubIntervalMinutes: 10,
  },
  createdAt: '2026-10-12T20:21:42.735Z',
};

const FALLBACK_PLAYERS: Player[] = [
  { id: 'p1', teamId: 'demo-team-1', name: 'Leo Davies', squadNumber: 1, preferredPositions: ['Goalkeeper'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 320 },
  { id: 'p2', teamId: 'demo-team-1', name: 'Archie Smith', squadNumber: 2, preferredPositions: ['Defence'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 300 },
  { id: 'p3', teamId: 'demo-team-1', name: 'Noah Taylor', squadNumber: 3, preferredPositions: ['Defence', 'Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 265 },
  { id: 'p4', teamId: 'demo-team-1', name: 'Oliver Wilson', squadNumber: 4, preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 290 },
  { id: 'p5', teamId: 'demo-team-1', name: 'Charlie Evans', squadNumber: 6, preferredPositions: ['Midfield', 'Attack'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 310 },
  { id: 'p6', teamId: 'demo-team-1', name: 'Jack Thomas', squadNumber: 8, preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 275 },
  { id: 'p7', teamId: 'demo-team-1', name: 'Harry Roberts', squadNumber: 9, preferredPositions: ['Attack'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 305 },
  { id: 'p8', teamId: 'demo-team-1', name: 'George Walker', squadNumber: 10, preferredPositions: ['Attack', 'Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 260 },
  { id: 'p9', teamId: 'demo-team-1', name: 'Alfie Wright', squadNumber: 11, preferredPositions: ['Defence', 'Midfield'], unavailableDates: [], matchesPlayed: 6, totalMinutesPlayed: 230 },
];

const FALLBACK_FIXTURE: Fixture = {
  id: 'demo-fix-1',
  teamId: 'demo-team-1',
  season: '2026/2027',
  date: '2026-11-14',
  kickOffTime: '10:00',
  meetTime: '09:30',
  opponent: 'Westgate Wanderers U10',
  venue: 'Home',
  status: 'Upcoming',
  formation: '2-3-1 (Standard)',
  homeScore: 2,
  awayScore: 1,
  playerOfTheMatchIds: ['p7', 'p1'],
  playerOfTheMatchId: 'p7',
  matchSquad: {
    selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'],
    fixedPlayerPositions: { p1: 'GK' },
    lineupsByPeriod: [
      {
        period: 1,
        onPitch: [
          { position: 'GK', playerId: 'p1' },
          { position: 'DEF_L', playerId: 'p2' },
          { position: 'DEF_R', playerId: 'p3' },
          { position: 'MID_L', playerId: 'p4' },
          { position: 'MID_C', playerId: 'p5' },
          { position: 'MID_R', playerId: 'p6' },
          { position: 'ATT', playerId: 'p7' },
        ],
        bench: ['p8', 'p9'],
        subs: ['p8', 'p9'],
      },
      {
        period: 2,
        onPitch: [
          { position: 'GK', playerId: 'p1' },
          { position: 'DEF_L', playerId: 'p9' },
          { position: 'DEF_R', playerId: 'p2' },
          { position: 'MID_L', playerId: 'p8' },
          { position: 'MID_C', playerId: 'p4' },
          { position: 'MID_R', playerId: 'p5' },
          { position: 'ATT', playerId: 'p6' },
        ],
        bench: ['p3', 'p7'],
        subs: ['p3', 'p7'],
      },
    ],
    plannedInGameSubs: [
      {
        id: 'sub-1',
        period: 1,
        targetMinute: 10,
        matchMinute: 10,
        offPlayerId: 'p4',
        onPlayerId: 'p8',
        playerOutId: 'p4',
        playerInId: 'p8',
        position: 'MID_L',
        executed: false,
      },
      {
        id: 'sub-2',
        period: 1,
        targetMinute: 10,
        matchMinute: 10,
        offPlayerId: 'p3',
        onPlayerId: 'p9',
        playerOutId: 'p3',
        playerInId: 'p9',
        position: 'DEF_R',
        executed: false,
      },
    ],
  },
};

export interface SwapSource {
  type: 'pitch' | 'bench' | 'rested';
  playerId: string;
  position?: string;
}

interface MobileMatchdayContextType {
  // Auth & Workspace State
  apiBaseUrl: string;
  currentUser: MobileAuthUser | null;
  authReady: boolean;
  isDemoMode: boolean;
  loading: boolean;
  syncMessage: string | null;
  errorMessage: string | null;
  clearMessages: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  signInWithGoogleBrowser: () => Promise<void>;
  /** Native Android Google account picker (Credential Manager). */
  nativeGoogleSignInAvailable: boolean;
  signInWithGoogleNative: () => Promise<void>;
  completeDeepLinkSignIn: (params: {
    idToken: string;
    refreshToken?: string;
    uid?: string;
    email?: string;
    displayName?: string;
  }) => Promise<void>;
  enterDemoMode: () => void;
  signOut: () => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Teams & Settings
  teams: Team[];
  activeTeam: Team;
  activeTeamId: string;
  setActiveTeamId: (teamId: string) => void;
  createTeam: (data: { name: string; ageGroup: string; pitchPlayerCount?: number }) => Promise<Team | null>;
  updateTeam: (team: Team) => Promise<void>;
  updateTeamSettings: (settings: TeamSettings) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  shareTeam: (email: string) => Promise<void>;
  unshareTeam: (emailOrId: string) => Promise<void>;
  addSeason: (seasonName: string) => Promise<void>;

  // Players & Squad
  players: Player[];
  createPlayer: (data: Partial<Player>) => Promise<Player | null>;
  bulkCreatePlayers: (playersData: Partial<Player>[]) => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  deletePlayer: (playerId: string) => Promise<void>;
  togglePlayerAvailability: (playerId: string, dateStr: string) => Promise<void>;

  // Fixtures & Match Preparation
  fixtures: Fixture[];
  activeFixture: Fixture;
  activeFixtureId: string;
  setActiveFixtureId: (fixtureId: string) => void;
  createFixture: (data: Partial<Fixture>) => Promise<Fixture | null>;
  updateFixture: (fixture: Fixture) => Promise<void>;
  deleteFixture: (fixtureId: string) => Promise<void>;
  setMatchCaptain: (captainId?: string) => Promise<void>;
  setPlayerOfTheMatch: (playerIds: string[], fixtureId?: string) => Promise<void>;
  toggleFixedPlayerPosition: (playerId: string, positionCode?: string) => Promise<void>;
  togglePlayerInMatchSquad: (playerId: string) => Promise<void>;
  updateMatchSquad: (matchSquad: MatchSquad) => Promise<void>;

  // Pitch, Formations & Substitutions Engine
  activePeriod: number;
  setActivePeriod: (period: number) => void;
  availableFormations: Formation[];
  activeFormation: Formation;
  changeFormation: (formationName: string) => Promise<void>;
  selectedSwapSource: SwapSource | null;
  handleTapPlayerNode: (target: SwapSource) => Promise<void>;
  autoRotateLineup: (selectedPlayerIds?: string[]) => Promise<void>;
  resetMatchSheet: () => Promise<void>;
  fetchSuggestedSubs: (
    intervalMinutes: number,
    subsPerWindow: SubsPerWindowOption,
    ensureEveryoneSubbedOnce: boolean
  ) => Promise<SuggestedSubPlan[]>;
  applySuggestedPlansToSchedule: (plans: SuggestedSubPlan[]) => Promise<void>;
  addCustomScheduledSub: (sub: Omit<PlannedInGameSub, 'id'>) => Promise<void>;
  removeScheduledSub: (subId: string) => Promise<void>;
  triggerEarlyDeparture: (
    departedPlayerId: string,
    departurePeriod: number,
    reason: 'injured' | 'left_early' | 'unwell',
    replacementPlayerId?: string,
    minute?: number
  ) => Promise<void>;

  // Live Match & Post-Match Recording
  isTimerRunning: boolean;
  elapsedSeconds: number;
  periodDurationSeconds: number;
  scheduledAlarmsCount: number;
  togglePeriodTimer: () => Promise<void>;
  resetPeriodTimer: () => Promise<void>;
  executePlannedSub: (sub: PlannedInGameSub) => Promise<void>;
  updateFixtureScore: (
    homeScore: number,
    awayScore: number,
    scorers?: GoalScorer[],
    status?: Fixture['status'],
    isLive?: boolean,
    targetFixtureId?: string
  ) => Promise<void>;
  savePostMatchRecording: (recording: PostMatchRecording, targetFixtureId?: string) => Promise<void>;

  // Dashboard, Stats, Exports & Support
  dashboardSummary: SeasonDashboardSummary | null;
  matchStats: MatchPlayerStats[];
  shareFixtureToWhatsApp: () => Promise<void>;
  exportFixturePdf: () => Promise<void>;
  submitSupportTicket: (category: string, summary: string, description: string) => Promise<string>;
  sunlightMode: boolean;
  setSunlightMode: (enabled: boolean) => void;
}

const MobileMatchdayContext = createContext<MobileMatchdayContextType | null>(null);

export const MobileMatchdayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<MobileAuthUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [teams, setTeams] = useState<Team[]>([FALLBACK_TEAM]);
  const [activeTeamId, setActiveTeamIdState] = useState<string>(FALLBACK_TEAM.id);
  const [players, setPlayers] = useState<Player[]>(FALLBACK_PLAYERS);
  const [fixtures, setFixtures] = useState<Fixture[]>([FALLBACK_FIXTURE]);
  const [activeFixtureId, setActiveFixtureIdState] = useState<string>(FALLBACK_FIXTURE.id);

  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [selectedSwapSource, setSelectedSwapSource] = useState<SwapSource | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [scheduledAlarmsCount, setScheduledAlarmsCount] = useState<number>(0);
  const [sunlightMode, setSunlightModeState] = useState<boolean>(false);

  const [dashboardSummary, setDashboardSummary] = useState<SeasonDashboardSummary | null>(null);
  const [matchStats, setMatchStats] = useState<MatchPlayerStats[]>([]);

  const clearMessages = useCallback(() => {
    setSyncMessage(null);
    setErrorMessage(null);
  }, []);

  const flashSync = useCallback((msg: string) => {
    setSyncMessage(msg);
    setTimeout(() => {
      setSyncMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const activeTeam = useMemo(
    () => normalizeTeam(teams.find((t) => t.id === activeTeamId) || teams[0], FALLBACK_TEAM),
    [teams, activeTeamId]
  );

  const activeFixture = useMemo(
    () =>
      normalizeFixture(
        fixtures.find((f) => f.id === activeFixtureId) || fixtures[0] || FALLBACK_FIXTURE,
        activeTeam.id
      ),
    [fixtures, activeFixtureId, activeTeam.id]
  );

  const periodDurationSeconds =
    (activeFixture.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25) * 60;

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const availableFormations = useMemo(() => {
    const inferredPitchCount =
      activeFixture.pitchPlayerCount ||
      activeFixture.matchSquad?.lineupsByPeriod?.[0]?.onPitch?.length ||
      activeTeam.settings.pitchPlayerCount ||
      7;
    const builtIn = BUILT_IN_FORMATIONS.filter(
      (f) => (f.pitchPlayerCount || f.teamSize) === inferredPitchCount
    );
    const custom = (activeTeam.settings.customFormations || []).filter(
      (f) => (f.pitchPlayerCount || f.teamSize) === inferredPitchCount
    );
    return [...builtIn, ...custom];
  }, [
    activeFixture.pitchPlayerCount,
    activeFixture.matchSquad?.lineupsByPeriod,
    activeTeam.settings.pitchPlayerCount,
    activeTeam.settings.customFormations,
  ]);

  const activeFormation = useMemo(() => {
    const inferredPitchCount =
      activeFixture.pitchPlayerCount ||
      activeFixture.matchSquad?.lineupsByPeriod?.[0]?.onPitch?.length ||
      activeTeam.settings.pitchPlayerCount ||
      7;
    const formationName = activeFixture.formation || activeTeam.settings.defaultFormation;
    return (
      availableFormations.find(
        (f) =>
          f.id === formationName ||
          f.name === formationName ||
          (formationName && f.name.toLowerCase().startsWith(formationName.toLowerCase()))
      ) ||
      BUILT_IN_FORMATIONS.find((f) => (f.pitchPlayerCount || f.teamSize) === inferredPitchCount) ||
      BUILT_IN_FORMATIONS[2]
    );
  }, [
    availableFormations,
    activeFixture.formation,
    activeFixture.pitchPlayerCount,
    activeFixture.matchSquad?.lineupsByPeriod,
    activeTeam.settings,
  ]);

  // Authenticated API helper with automatic token refresh
  const authFetch = useCallback(
    async (path: string, options: RequestInit = {}, overrideUser?: MobileAuthUser | null) => {
      const targetUser = overrideUser !== undefined ? overrideUser : currentUser;
      const freshUser = await ensureFreshIdToken(API_BASE_URL, targetUser);
      if (freshUser && freshUser.idToken !== currentUser?.idToken) {
        setCurrentUser(freshUser);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (freshUser?.idToken) {
        headers.Authorization = `Bearer ${freshUser.idToken}`;
      }

      return fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
      });
    },
    [currentUser]
  );

  // Fetch team-scoped players, fixtures, dashboard summary & stats
  const fetchTeamWorkspace = useCallback(
    async (team: Team, userObj?: MobileAuthUser | null, preferredFixtureId?: string) => {
      try {
        const [playersRes, fixturesRes, dashRes] = await Promise.all([
          authFetch(`/api/players?teamId=${encodeURIComponent(team.id)}`, {}, userObj),
          authFetch(`/api/fixtures?teamId=${encodeURIComponent(team.id)}`, {}, userObj),
          authFetch(
            `/api/teams/${encodeURIComponent(team.id)}/dashboard-summary?season=${encodeURIComponent(
              team.settings.currentSeason || '2026/2027'
            )}`,
            {},
            userObj
          ),
        ]);

        let normalizedPlayers: Player[] = [];
        let normalizedFixtures: Fixture[] = [];

        if (playersRes.ok) {
          const rawPlayers = await playersRes.json();
          normalizedPlayers = Array.isArray(rawPlayers)
            ? rawPlayers.map((p) => normalizePlayer(p, team.id))
            : [];
          setPlayers(normalizedPlayers);
        }

        if (fixturesRes.ok) {
          const rawFixtures = await fixturesRes.json();
          const loadedFixtures: Fixture[] = Array.isArray(rawFixtures)
            ? rawFixtures.map((f) => normalizeFixture(f, team.id))
            : [];
          const sortedFixtures = [...loadedFixtures].sort((a, b) =>
            (a.date || '').localeCompare(b.date || '')
          );
          normalizedFixtures = sortedFixtures;
          setFixtures(sortedFixtures);

          const chosenFixture =
            sortedFixtures.find((f) => f.id === preferredFixtureId) ||
            sortedFixtures.find((f) => f.status === 'In Progress' || f.isLive) ||
            sortedFixtures.find((f) => f.status === 'Upcoming') ||
            sortedFixtures[sortedFixtures.length - 1];

          if (chosenFixture) {
            setActiveFixtureIdState(chosenFixture.id);
            await savePersistedPrefs({ activeTeamId: team.id, activeFixtureId: chosenFixture.id });
          }
        }

        if (dashRes.ok) {
          const rawDash = await dashRes.json();
          setDashboardSummary(
            normalizeDashboardSummary(rawDash, normalizedFixtures, normalizedPlayers)
          );
        } else {
          setDashboardSummary(
            normalizeDashboardSummary(null, normalizedFixtures, normalizedPlayers)
          );
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to load team workspace');
      }
    },
    [authFetch]
  );

  // Refresh all teams + active workspace
  const refreshAllData = useCallback(
    async (overrideUser?: MobileAuthUser | null) => {
      const targetUser = overrideUser !== undefined ? overrideUser : currentUser;
      if (!targetUser) return;

      setLoading(true);
      setErrorMessage(null);
      try {
        const prefs = await loadPersistedPrefs();
        const res = await authFetch('/api/teams', {}, targetUser);
        if (!res.ok) {
          throw new Error(`Unable to load teams (HTTP ${res.status})`);
        }
        const rawTeams = await res.json();
        const fetchedTeams: Team[] = Array.isArray(rawTeams)
          ? rawTeams.map((t) => normalizeTeam(t, FALLBACK_TEAM))
          : [];
        if (fetchedTeams.length > 0) {
          setTeams(fetchedTeams);
          const chosenTeam =
            fetchedTeams.find((t) => t.id === prefs.activeTeamId) ||
            fetchedTeams.find((t) => t.id === activeTeamId) ||
            fetchedTeams[0];
          setActiveTeamIdState(chosenTeam.id);
          await fetchTeamWorkspace(chosenTeam, targetUser, prefs.activeFixtureId || activeFixtureId);
        } else {
          setTeams([]);
          setPlayers([]);
          setFixtures([]);
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error syncing with SubShuffle server');
      } finally {
        setLoading(false);
      }
    },
    [authFetch, currentUser, activeTeamId, activeFixtureId, fetchTeamWorkspace]
  );

  // Load persisted session and deep-link listeners on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      const prefs = await loadPersistedPrefs();
      if (!mounted) return;
      if (prefs.sunlightMode !== undefined) {
        setSunlightModeState(prefs.sunlightMode);
      }

      // Check initial deep link URL (from Google Browser OAuth handoff)
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          const deepLinkUser = await parseAndSaveAuthDeepLink(initialUrl);
          if (deepLinkUser && mounted) {
            setCurrentUser(deepLinkUser);
            setIsDemoMode(false);
            setAuthReady(true);
            await refreshAllData(deepLinkUser);
            return;
          }
        }
      } catch {
        // Ignore initial URL error
      }

      if (prefs.user) {
        setCurrentUser(prefs.user);
        setIsDemoMode(false);
        setAuthReady(true);
        await refreshAllData(prefs.user);
      } else {
        setAuthReady(true);
      }
    })();

    const sub = Linking.addEventListener('url', async (event) => {
      const deepLinkUser = await parseAndSaveAuthDeepLink(event.url);
      if (deepLinkUser && mounted) {
        setCurrentUser(deepLinkUser);
        setIsDemoMode(false);
        flashSync(`Signed in as ${deepLinkUser.email}`);
        await refreshAllData(deepLinkUser);
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  // Load match fairness stats whenever activeFixture changes
  useEffect(() => {
    let cancelled = false;
    if (!activeFixture?.id || !activeFixture.matchSquad) {
      setMatchStats([]);
      return;
    }

    // Calculate local stats immediately, then refine from server if authenticated
    const periodDur = activeFixture.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25;
    const totalMatchMins =
      (activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2) * periodDur;
    const targetPct = activeTeam.settings.targetGameTimePercent || 50;

    const selectedIds = activeFixture.matchSquad.selectedPlayerIds || [];
    const localStats: MatchPlayerStats[] = selectedIds.map((pid) => {
      const p = playerMap.get(pid);
      let periodsOnPitch = 0;
      let periodsOnBench = 0;
      const posSet = new Set<string>();

      for (const lp of activeFixture.matchSquad?.lineupsByPeriod || []) {
        const pitchSlot = lp.onPitch.find((op) => op.playerId === pid);
        if (pitchSlot) {
          periodsOnPitch++;
          posSet.add(pitchSlot.position);
        } else if (lp.bench.includes(pid)) {
          periodsOnBench++;
        }
      }

      const customMin = activeFixture.postMatchRecording?.actualMinutesByPlayer?.[pid];
      const totalMinutes = customMin !== undefined ? customMin : periodsOnPitch * periodDur;
      const percentOfMatch = totalMatchMins > 0 ? Math.round((totalMinutes / totalMatchMins) * 100) : 0;

      return {
        playerId: pid,
        playerName: p?.name || 'Player',
        squadNumber: p?.squadNumber,
        periodsOnPitch,
        periodsOnBench,
        totalMinutes,
        percentOfMatch,
        positionsPlayed: Array.from(posSet),
        meetsTarget: percentOfMatch >= targetPct,
      };
    });
    setMatchStats(localStats);

    if (currentUser && !activeFixture.id.startsWith('demo-')) {
      (async () => {
        try {
          const res = await authFetch(`/api/fixtures/${encodeURIComponent(activeFixture.id)}/stats`);
          if (res.ok && !cancelled) {
            const data = await res.json();
            if (Array.isArray(data.stats)) {
              const periodCount =
                activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2;
              setMatchStats(
                normalizeMatchPlayerStats(data.stats, players, periodCount, targetPct)
              );
            }
          }
        } catch {
          // Keep local stats
        }
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [activeFixture, activeTeam, playerMap, players, currentUser, authFetch]);

  // Tick live stopwatch and clamp at periodDurationSeconds
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev + 1 >= periodDurationSeconds) {
          setIsTimerRunning(false);
          triggerTouchlineHaptic('whistle');
          return periodDurationSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, periodDurationSeconds]);

  // ================= Auth Actions =================
  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const user = await mobileSignInWithEmail(API_BASE_URL, email, password);
        setCurrentUser(user);
        setIsDemoMode(false);
        flashSync(`Welcome back, ${user.displayName || user.email}!`);
        await refreshAllData(user);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Sign in failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshAllData, flashSync]
  );

  const registerWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const user = await mobileRegisterWithEmail(API_BASE_URL, email, password, displayName);
        setCurrentUser(user);
        setIsDemoMode(false);
        flashSync(`Account created for ${user.email}!`);
        await refreshAllData(user);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Registration failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshAllData, flashSync]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      setLoading(true);
      setErrorMessage(null);
      try {
        await mobileSendPasswordReset(API_BASE_URL, email);
        flashSync(`Password reset email sent to ${email.trim()}`);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Could not send reset email');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [flashSync]
  );

  const signInWithGoogleBrowser = useCallback(async () => {
    await openGoogleBrowserSignIn(API_BASE_URL);
  }, []);

  const nativeGoogleSignInAvailable = useMemo(() => isNativeGoogleSignInAvailable(), []);

  const signInWithGoogleNative = useCallback(async () => {
    setErrorMessage(null);
    const result = await signInWithNativeGoogle();
    if (result.status === 'cancelled') return;
    if (result.status === 'unavailable') {
      setErrorMessage(result.reason);
      throw new Error(result.reason);
    }
    setLoading(true);
    try {
      const user = await mobileSignInWithGoogleIdToken(API_BASE_URL, result.idToken);
      setCurrentUser(user);
      setIsDemoMode(false);
      flashSync(`Welcome, ${user.displayName || user.email}!`);
      await refreshAllData(user);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google sign-in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshAllData, flashSync]);

  const completeDeepLinkSignIn = useCallback(
    async (params: {
      idToken: string;
      refreshToken?: string;
      uid?: string;
      email?: string;
      displayName?: string;
    }) => {
      if (!params.idToken) return;
      const user: MobileAuthUser = {
        uid: params.uid || 'user',
        email: params.email || '',
        displayName: params.displayName || undefined,
        idToken: params.idToken,
        refreshToken: params.refreshToken || '',
        expiresAt: Date.now() + 50 * 60 * 1000,
      };
      await savePersistedPrefs({ user });
      setCurrentUser(user);
      setIsDemoMode(false);
      setAuthReady(true);
      flashSync(`Signed in as ${user.displayName || user.email || 'Coach'}`);
      await refreshAllData(user);
    },
    [refreshAllData, flashSync]
  );

  const enterDemoMode = useCallback(() => {
    setTeams([FALLBACK_TEAM]);
    setActiveTeamIdState(FALLBACK_TEAM.id);
    setPlayers(FALLBACK_PLAYERS);
    setFixtures([FALLBACK_FIXTURE]);
    setActiveFixtureIdState(FALLBACK_FIXTURE.id);
    setIsDemoMode(true);
  }, []);

  const signOut = useCallback(async () => {
    await savePersistedPrefs({ user: null, activeTeamId: undefined, activeFixtureId: undefined });
    await signOutNativeGoogle();
    setCurrentUser(null);
    setIsDemoMode(false);
    setTeams([FALLBACK_TEAM]);
    setPlayers(FALLBACK_PLAYERS);
    setFixtures([FALLBACK_FIXTURE]);
  }, []);

  // ================= Team Actions =================
  const setActiveTeamId = useCallback(
    async (teamId: string) => {
      setActiveTeamIdState(teamId);
      const found = teams.find((t) => t.id === teamId);
      if (found && currentUser) {
        await savePersistedPrefs({ activeTeamId: teamId });
        await fetchTeamWorkspace(found, currentUser);
      }
    },
    [teams, currentUser, fetchTeamWorkspace]
  );

  const createTeam = useCallback(
    async (data: { name: string; ageGroup: string; pitchPlayerCount?: number }) => {
      const pitchCount = data.pitchPlayerCount || 7;
      const defaultForm =
        BUILT_IN_FORMATIONS.find((f) => f.pitchPlayerCount === pitchCount)?.name || '2-3-1';
      const payload: Partial<Team> = {
        name: data.name.trim(),
        ageGroup: data.ageGroup.trim() || 'U10',
        settings: {
          pitchPlayerCount: pitchCount,
          matchdaySquadCap: pitchCount + 3,
          subCount: 3,
          matchPeriodCount: 2,
          periodDurationMinutes: 25,
          targetGameTimePercent: 50,
          defaultFormation: defaultForm,
          customFormations: [],
          currentSeason: '2026/2027',
          seasons: ['2026/2027'],
          defaultSubIntervalMinutes: 10,
          subTimingMode: 'in_game',
          preserveLineupAcrossBreaks: true,
          midPeriodSubIntervalMinutes: 10,
        },
      };

      if (!currentUser) {
        const localTeam: Team = {
          ...(payload as Team),
          id: `team_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        setTeams((prev) => [...prev, localTeam]);
        setActiveTeamIdState(localTeam.id);
        return localTeam;
      }

      const res = await authFetch('/api/teams', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create team');
      }
      const created: Team = await res.json();
      setTeams((prev) => [...prev, created]);
      setActiveTeamIdState(created.id);
      setPlayers([]);
      setFixtures([]);
      flashSync(`Created team "${created.name}"`);
      return created;
    },
    [currentUser, authFetch, flashSync]
  );

  const updateTeam = useCallback(
    async (team: Team) => {
      setTeams((prev) => prev.map((t) => (t.id === team.id ? team : t)));
      if (!currentUser || team.id.startsWith('demo-')) return;
      const res = await authFetch(`/api/teams/${encodeURIComponent(team.id)}`, {
        method: 'PUT',
        body: JSON.stringify(team),
      });
      if (res.ok) {
        const saved: Team = await res.json();
        setTeams((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
        flashSync('Team settings saved');
      }
    },
    [currentUser, authFetch, flashSync]
  );

  const updateTeamSettings = useCallback(
    async (settings: TeamSettings) => {
      const updatedTeam: Team = {
        ...activeTeam,
        settings,
      };
      await updateTeam(updatedTeam);
    },
    [activeTeam, updateTeam]
  );

  const deleteTeam = useCallback(
    async (teamId: string) => {
      if (currentUser && !teamId.startsWith('demo-')) {
        const res = await authFetch(`/api/teams/${encodeURIComponent(teamId)}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to delete team');
        }
      }
      const remaining = teams.filter((t) => t.id !== teamId);
      setTeams(remaining);
      if (remaining.length > 0) {
        await setActiveTeamId(remaining[0].id);
      }
      flashSync('Team deleted');
    },
    [currentUser, authFetch, teams, setActiveTeamId, flashSync]
  );

  const shareTeam = useCallback(
    async (email: string) => {
      if (!currentUser) throw new Error('Sign in to share teams with assistant coaches');
      const res = await authFetch(`/api/teams/${encodeURIComponent(activeTeam.id)}/share`, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), role: 'coach' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share team');
      }
      if (data.team) {
        setTeams((prev) => prev.map((t) => (t.id === data.team.id ? data.team : t)));
      }
      flashSync(`Shared team with ${email.trim()}`);
    },
    [currentUser, authFetch, activeTeam.id, flashSync]
  );

  const unshareTeam = useCallback(
    async (emailOrId: string) => {
      if (!currentUser) return;
      const res = await authFetch(
        `/api/teams/${encodeURIComponent(activeTeam.id)}/share/${encodeURIComponent(emailOrId)}`,
        { method: 'DELETE' }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.team) {
        setTeams((prev) => prev.map((t) => (t.id === data.team.id ? data.team : t)));
        flashSync(`Removed ${emailOrId}`);
      }
    },
    [currentUser, authFetch, activeTeam.id, flashSync]
  );

  const addSeason = useCallback(
    async (seasonName: string) => {
      if (!seasonName.trim()) return;
      if (currentUser && !activeTeam.id.startsWith('demo-')) {
        const res = await authFetch(`/api/teams/${encodeURIComponent(activeTeam.id)}/seasons`, {
          method: 'POST',
          body: JSON.stringify({ season: seasonName.trim() }),
        });
        if (res.ok) {
          const updated: Team = await res.json();
          setTeams((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          flashSync(`Added season ${seasonName.trim()}`);
          return;
        }
      }
      const seasons = Array.from(new Set([...(activeTeam.settings.seasons || []), seasonName.trim()]));
      await updateTeamSettings({
        ...activeTeam.settings,
        seasons,
        currentSeason: seasonName.trim(),
      });
    },
    [currentUser, activeTeam, authFetch, updateTeamSettings, flashSync]
  );

  // ================= Player Actions =================
  const createPlayer = useCallback(
    async (data: Partial<Player>) => {
      const payload: Partial<Player> = {
        ...data,
        teamId: activeTeam.id,
        preferredPositions:
          data.preferredPositions && data.preferredPositions.length > 0
            ? data.preferredPositions
            : ['Midfield'],
        unavailableDates: data.unavailableDates || [],
      };

      if (!currentUser || activeTeam.id.startsWith('demo-')) {
        const localPlayer: Player = {
          id: `p_${Date.now()}`,
          teamId: activeTeam.id,
          name: (data.name || 'New Player').trim(),
          squadNumber: data.squadNumber,
          preferredPositions: payload.preferredPositions!,
          unavailableDates: [],
          matchesPlayed: 0,
          totalMinutesPlayed: 0,
        };
        setPlayers((prev) => [...prev, localPlayer]);
        return localPlayer;
      }

      const res = await authFetch('/api/players', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add player');
      }
      const saved: Player = await res.json();
      setPlayers((prev) => [...prev, saved]);
      flashSync(`Added ${saved.name}`);
      return saved;
    },
    [activeTeam.id, currentUser, authFetch, flashSync]
  );

  const bulkCreatePlayers = useCallback(
    async (playersData: Partial<Player>[]) => {
      if (playersData.length === 0) return;
      if (!currentUser || activeTeam.id.startsWith('demo-')) {
        const created = playersData.map((p, idx) => ({
          id: `p_${Date.now()}_${idx}`,
          teamId: activeTeam.id,
          name: (p.name || 'Player').trim(),
          squadNumber: p.squadNumber,
          preferredPositions: p.preferredPositions || ['Midfield'],
          unavailableDates: [],
          matchesPlayed: 0,
          totalMinutesPlayed: 0,
        }));
        setPlayers((prev) => [...prev, ...created]);
        return;
      }

      const res = await authFetch('/api/players/bulk', {
        method: 'POST',
        body: JSON.stringify({ teamId: activeTeam.id, players: playersData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Bulk import failed');
      }
      const saved: Player[] = await res.json();
      setPlayers((prev) => [...prev, ...saved]);
      flashSync(`Imported ${saved.length} players`);
    },
    [activeTeam.id, currentUser, authFetch, flashSync]
  );

  const updatePlayer = useCallback(
    async (player: Player) => {
      setPlayers((prev) => prev.map((p) => (p.id === player.id ? player : p)));
      if (!currentUser || player.id.startsWith('p') && activeTeam.id.startsWith('demo-')) return;
      const res = await authFetch(`/api/players/${encodeURIComponent(player.id)}`, {
        method: 'PUT',
        body: JSON.stringify(player),
      });
      if (res.ok) {
        const saved: Player = await res.json();
        setPlayers((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
        flashSync(`Updated ${saved.name}`);
      }
    },
    [currentUser, activeTeam.id, authFetch, flashSync]
  );

  const deletePlayer = useCallback(
    async (playerId: string) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      if (!currentUser || activeTeam.id.startsWith('demo-')) return;
      await authFetch(`/api/players/${encodeURIComponent(playerId)}`, { method: 'DELETE' });
      flashSync('Player removed');
    },
    [currentUser, activeTeam.id, authFetch, flashSync]
  );

  const togglePlayerAvailability = useCallback(
    async (playerId: string, dateStr: string) => {
      const target = players.find((p) => p.id === playerId);
      if (!target || !dateStr) return;
      const unavailable = target.unavailableDates || [];
      const nextDates = unavailable.includes(dateStr)
        ? unavailable.filter((d) => d !== dateStr)
        : [...unavailable, dateStr];
      await updatePlayer({
        ...target,
        unavailableDates: nextDates,
      });
    },
    [players, updatePlayer]
  );

  // ================= Fixture & Match Squad Actions =================
  const setActiveFixtureId = useCallback(
    async (fixtureId: string) => {
      setActiveFixtureIdState(fixtureId);
      setActivePeriod(1);
      setSelectedSwapSource(null);
      await savePersistedPrefs({ activeFixtureId: fixtureId });
    },
    []
  );

  const createFixture = useCallback(
    async (data: Partial<Fixture>) => {
      const payload: Partial<Fixture> = {
        ...data,
        teamId: activeTeam.id,
        season: data.season || activeTeam.settings.currentSeason || '2026/2027',
        venue: data.venue || 'Home',
        status: data.status || 'Upcoming',
        formation: data.formation || activeTeam.settings.defaultFormation || '2-3-1',
      };

      if (!currentUser || activeTeam.id.startsWith('demo-')) {
        const localFix: Fixture = {
          id: `fix_${Date.now()}`,
          teamId: activeTeam.id,
          opponent: (data.opponent || 'Opponent').trim(),
          date: data.date || new Date().toISOString().slice(0, 10),
          venue: payload.venue!,
          status: payload.status!,
          kickOffTime: data.kickOffTime || '10:00',
          meetTime: data.meetTime,
          formation: payload.formation,
        };
        setFixtures((prev) => [...prev, localFix]);
        setActiveFixtureIdState(localFix.id);
        return localFix;
      }

      const res = await authFetch('/api/fixtures', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create fixture');
      }
      const saved: Fixture = await res.json();
      setFixtures((prev) => [...prev, saved]);
      setActiveFixtureIdState(saved.id);
      flashSync(`Created fixture vs ${saved.opponent}`);
      return saved;
    },
    [activeTeam, currentUser, authFetch, flashSync]
  );

  const updateFixture = useCallback(
    async (fixture: Fixture) => {
      const normalizedLocal = normalizeFixture(fixture, activeTeam.id);
      setFixtures((prev) => prev.map((f) => (f.id === fixture.id ? normalizedLocal : f)));
      if (!currentUser || fixture.id.startsWith('demo-')) return;
      const res = await authFetch(`/api/fixtures/${encodeURIComponent(fixture.id)}`, {
        method: 'PUT',
        body: JSON.stringify(normalizedLocal),
      });
      if (res.ok) {
        const saved: Fixture = await res.json();
        const normalizedSaved = normalizeFixture(saved, activeTeam.id);
        setFixtures((prev) => prev.map((f) => (f.id === normalizedSaved.id ? normalizedSaved : f)));
        flashSync('Fixture updated');
      }
    },
    [currentUser, activeTeam.id, authFetch, flashSync]
  );

  const deleteFixture = useCallback(
    async (fixtureId: string) => {
      const remaining = fixtures.filter((f) => f.id !== fixtureId);
      setFixtures(remaining);
      if (activeFixtureId === fixtureId && remaining[0]) {
        setActiveFixtureIdState(remaining[0].id);
      }
      if (!currentUser || fixtureId.startsWith('demo-')) return;
      await authFetch(`/api/fixtures/${encodeURIComponent(fixtureId)}`, { method: 'DELETE' });
      flashSync('Fixture deleted');
    },
    [fixtures, activeFixtureId, currentUser, authFetch, flashSync]
  );

  const updateMatchSquad = useCallback(
    async (matchSquad: MatchSquad) => {
      const normalizedSquad = normalizeMatchSquad(matchSquad) || matchSquad;
      setFixtures((prev) =>
        prev.map((f) => (f.id === activeFixture.id ? { ...f, matchSquad: normalizedSquad } : f))
      );
      if (!currentUser || activeFixture.id.startsWith('demo-')) return;
      const res = await authFetch(
        `/api/fixtures/${encodeURIComponent(activeFixture.id)}/squad`,
        {
          method: 'PUT',
          body: JSON.stringify(normalizedSquad),
        }
      );
      if (res.ok) {
        const saved: Fixture = await res.json();
        const normalizedSaved = normalizeFixture(saved, activeTeam.id);
        setFixtures((prev) => prev.map((f) => (f.id === normalizedSaved.id ? normalizedSaved : f)));
      }
    },
    [activeFixture.id, activeTeam.id, currentUser, authFetch]
  );

  const setMatchCaptain = useCallback(
    async (captainId?: string) => {
      const nextCaptain = activeFixture.captainId === captainId ? undefined : captainId;
      setFixtures((prev) =>
        prev.map((f) => (f.id === activeFixture.id ? { ...f, captainId: nextCaptain } : f))
      );
      if (!currentUser || activeFixture.id.startsWith('demo-')) return;
      await authFetch(`/api/fixtures/${encodeURIComponent(activeFixture.id)}/captain`, {
        method: 'PUT',
        body: JSON.stringify({ captainId: nextCaptain }),
      });
      flashSync(nextCaptain ? 'Match captain assigned' : 'Match captain cleared');
    },
    [activeFixture, currentUser, authFetch, flashSync]
  );

  const setPlayerOfTheMatch = useCallback(
    async (playerIds: string[], targetFixtureId?: string) => {
      const fixId = targetFixtureId || activeFixture.id;
      const uniqueIds = Array.from(new Set(playerIds.filter(Boolean)));
      setFixtures((prev) =>
        prev.map((f) =>
          f.id === fixId
            ? {
                ...f,
                playerOfTheMatchIds: uniqueIds,
                playerOfTheMatchId: uniqueIds[0] || undefined,
              }
            : f
        )
      );
      if (!currentUser || fixId.startsWith('demo-')) return;
      const res = await authFetch(`/api/fixtures/${encodeURIComponent(fixId)}/player-of-the-match`, {
        method: 'PUT',
        body: JSON.stringify({
          playerOfTheMatchIds: uniqueIds,
          playerOfTheMatchId: uniqueIds[0] || undefined,
        }),
      });
      if (res.ok) {
        const saved: Fixture = await res.json();
        setFixtures((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
        flashSync('Player(s) of the Match saved');
      }
    },
    [activeFixture.id, currentUser, authFetch, flashSync]
  );

  const toggleFixedPlayerPosition = useCallback(
    async (playerId: string, positionCode?: string) => {
      const existingFixed = {
        ...(activeFixture.fixedPlayerPositions || {}),
        ...(activeFixture.matchSquad?.fixedPlayerPositions || {}),
      };
      if (existingFixed[playerId]) {
        delete existingFixed[playerId];
      } else {
        const currentPeriodLineup = activeFixture.matchSquad?.lineupsByPeriod.find(
          (l) => l.period === activePeriod
        );
        const onPitchSlot = currentPeriodLineup?.onPitch.find((op) => op.playerId === playerId);
        existingFixed[playerId] = positionCode || onPitchSlot?.position || 'GK';
      }

      setFixtures((prev) =>
        prev.map((f) =>
          f.id === activeFixture.id
            ? {
                ...f,
                fixedPlayerPositions: existingFixed,
                matchSquad: f.matchSquad
                  ? { ...f.matchSquad, fixedPlayerPositions: existingFixed }
                  : f.matchSquad,
              }
            : f
        )
      );

      if (!currentUser || activeFixture.id.startsWith('demo-')) return;
      await authFetch(`/api/fixtures/${encodeURIComponent(activeFixture.id)}/fixed-positions`, {
        method: 'PUT',
        body: JSON.stringify({ fixedPlayerPositions: existingFixed }),
      });
      flashSync(
        existingFixed[playerId]
          ? `Locked in ${existingFixed[playerId]} all match`
          : 'Position lock removed'
      );
    },
    [activeFixture, activePeriod, currentUser, authFetch, flashSync]
  );

  const togglePlayerInMatchSquad = useCallback(
    async (playerId: string) => {
      const currentSquad: MatchSquad = activeFixture.matchSquad || {
        selectedPlayerIds: players.map((p) => p.id),
        lineupsByPeriod: [],
      };
      const isSelected = currentSquad.selectedPlayerIds.includes(playerId);
      let nextSelected: string[];
      let nextLineups = currentSquad.lineupsByPeriod.map((lp) => ({
        ...lp,
        onPitch: [...lp.onPitch],
        bench: [...lp.bench],
      }));

      if (isSelected) {
        nextSelected = currentSquad.selectedPlayerIds.filter((id) => id !== playerId);
        nextLineups = nextLineups.map((lp) => ({
          ...lp,
          onPitch: lp.onPitch.filter((op) => op.playerId !== playerId),
          bench: lp.bench.filter((id) => id !== playerId),
        }));
      } else {
        nextSelected = [...currentSquad.selectedPlayerIds, playerId];
        nextLineups = nextLineups.map((lp) => ({
          ...lp,
          bench: lp.bench.includes(playerId) || lp.onPitch.some((op) => op.playerId === playerId)
            ? lp.bench
            : [...lp.bench, playerId],
        }));
      }

      await updateMatchSquad({
        ...currentSquad,
        selectedPlayerIds: nextSelected,
        lineupsByPeriod: nextLineups,
      });
    },
    [activeFixture.matchSquad, players, updateMatchSquad]
  );

  const changeFormation = useCallback(
    async (formationName: string) => {
      await updateFixture({
        ...activeFixture,
        formation: formationName,
      });
    },
    [activeFixture, updateFixture]
  );

  // Tap-to-swap pitch <-> pitch, pitch <-> bench, bench <-> rested
  const handleTapPlayerNode = useCallback(
    async (target: SwapSource) => {
      await triggerTouchlineHaptic('swap');
      if (!selectedSwapSource) {
        setSelectedSwapSource(target);
        return;
      }
      if (selectedSwapSource.playerId === target.playerId) {
        setSelectedSwapSource(null);
        return;
      }

      if (!activeFixture.matchSquad) {
        setSelectedSwapSource(null);
        return;
      }

      const updatedLineups = activeFixture.matchSquad.lineupsByPeriod.map((lp) => {
        if (lp.period !== activePeriod) return lp;
        const onPitch = lp.onPitch.map((op) => ({ ...op }));
        const bench = [...lp.bench];

        const srcPitchIdx = onPitch.findIndex((op) => op.playerId === selectedSwapSource.playerId);
        const tgtPitchIdx = onPitch.findIndex((op) => op.playerId === target.playerId);
        const srcBenchIdx = bench.indexOf(selectedSwapSource.playerId);
        const tgtBenchIdx = bench.indexOf(target.playerId);

        if (srcPitchIdx !== -1 && tgtPitchIdx !== -1) {
          const tempId = onPitch[srcPitchIdx].playerId;
          onPitch[srcPitchIdx].playerId = onPitch[tgtPitchIdx].playerId;
          onPitch[tgtPitchIdx].playerId = tempId;
        } else if (srcPitchIdx !== -1 && tgtBenchIdx !== -1) {
          const pitchPlayerId = onPitch[srcPitchIdx].playerId;
          onPitch[srcPitchIdx].playerId = bench[tgtBenchIdx];
          bench[tgtBenchIdx] = pitchPlayerId;
        } else if (srcBenchIdx !== -1 && tgtPitchIdx !== -1) {
          const benchPlayerId = bench[srcBenchIdx];
          bench[srcBenchIdx] = onPitch[tgtPitchIdx].playerId;
          onPitch[tgtPitchIdx].playerId = benchPlayerId;
        }

        return { ...lp, onPitch, bench };
      });

      setSelectedSwapSource(null);
      await updateMatchSquad({
        ...activeFixture.matchSquad,
        lineupsByPeriod: updatedLineups,
      });
    },
    [selectedSwapSource, activeFixture.matchSquad, activePeriod, updateMatchSquad]
  );

  // Server-backed Fair Rotation Engine (`POST /api/fixtures/:id/auto-rotate`)
  const autoRotateLineup = useCallback(
    async (selectedPlayerIds?: string[]) => {
      await triggerTouchlineHaptic('whistle');
      const idsToUse =
        selectedPlayerIds ||
        activeFixture.matchSquad?.selectedPlayerIds ||
        players
          .filter((p) => !(p.unavailableDates || []).includes(activeFixture.date))
          .map((p) => p.id);

      if (currentUser && !activeFixture.id.startsWith('demo-')) {
        setLoading(true);
        try {
          const res = await authFetch(
            `/api/fixtures/${encodeURIComponent(activeFixture.id)}/auto-rotate`,
            {
              method: 'POST',
              body: JSON.stringify({ selectedPlayerIds: idsToUse }),
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.fixture) {
              const normalizedFix = normalizeFixture(data.fixture, activeTeam.id);
              setFixtures((prev) =>
                prev.map((f) => (f.id === normalizedFix.id ? normalizedFix : f))
              );
              flashSync('Fair rotation generated & saved');
              return;
            }
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Error generating fair rotation');
        } finally {
          setLoading(false);
        }
      }

      // Offline / Demo fallback fair rotation
      const periodCount = activeFixture.matchPeriodCount || activeTeam.settings.matchPeriodCount || 2;
      const positions = activeFormation.positions;
      const fixedMap = activeFixture.fixedPlayerPositions || activeFixture.matchSquad?.fixedPlayerPositions || {};

      const lineupsByPeriod = Array.from({ length: periodCount }, (_, idx) => {
        const period = idx + 1;
        const rotatedIds = [...idsToUse.slice((idx * 2) % Math.max(1, idsToUse.length)), ...idsToUse.slice(0, (idx * 2) % Math.max(1, idsToUse.length))];
        const used = new Set<string>();
        const onPitch = positions.map((pos) => {
          const lockedPlayerId = Object.keys(fixedMap).find((pid) => fixedMap[pid] === pos.code && idsToUse.includes(pid));
          if (lockedPlayerId && !used.has(lockedPlayerId)) {
            used.add(lockedPlayerId);
            return { position: pos.code, playerId: lockedPlayerId };
          }
          const candidate = rotatedIds.find((pid) => !used.has(pid) && !fixedMap[pid]) || rotatedIds.find((pid) => !used.has(pid)) || '';
          used.add(candidate);
          return { position: pos.code, playerId: candidate };
        });
        const bench = idsToUse.filter((pid) => !used.has(pid));
        return { period, onPitch, bench };
      });

      await updateMatchSquad({
        selectedPlayerIds: idsToUse,
        fixedPlayerPositions: fixedMap,
        lineupsByPeriod,
        plannedInGameSubs: activeFixture.matchSquad?.plannedInGameSubs || [],
      });
      flashSync('Fair rotation generated');
    },
    [activeFixture, activeTeam, activeFormation, players, currentUser, authFetch, updateMatchSquad, flashSync]
  );

  const resetMatchSheet = useCallback(async () => {
    const emptySquad: MatchSquad = {
      selectedPlayerIds: activeFixture.matchSquad?.selectedPlayerIds || players.map((p) => p.id),
      lineupsByPeriod: [],
      plannedInGameSubs: [],
    };
    await updateMatchSquad(emptySquad);
    flashSync('Match sheet cleared');
  }, [activeFixture.matchSquad, players, updateMatchSquad, flashSync]);

  // Suggested Rolling Substitutions Engine (`GET /api/fixtures/:id/suggested-subs`)
  const fetchSuggestedSubs = useCallback(
    async (
      intervalMinutes: number,
      subsPerWindow: SubsPerWindowOption,
      ensureEveryoneSubbedOnce: boolean
    ): Promise<SuggestedSubPlan[]> => {
      const periodDur =
        activeFixture.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25;
      if (currentUser && !activeFixture.id.startsWith('demo-')) {
        const qs = `interval=${encodeURIComponent(
          String(intervalMinutes)
        )}&subsPerWindow=${encodeURIComponent(
          String(subsPerWindow)
        )}&ensureEveryoneSubbedOnce=${encodeURIComponent(String(ensureEveryoneSubbedOnce))}`;
        const res = await authFetch(
          `/api/fixtures/${encodeURIComponent(activeFixture.id)}/suggested-subs?${qs}`
        );
        if (res.ok) {
          const data = await res.json();
          const normalized = normalizeSuggestedSubPlans(data?.plans, periodDur);
          if (normalized.length > 0) {
            return normalized;
          }
        }
      }

      // Local fallback suggested sub generator
      const plans: SuggestedSubPlan[] = [];
      for (const lp of activeFixture.matchSquad?.lineupsByPeriod || []) {
        if (lp.bench.length === 0) continue;
        const outfield = lp.onPitch.filter((op) => op.position !== 'GK');
        let benchQueue = [...lp.bench];
        let pitchOutfield = [...outfield];
        for (let min = intervalMinutes; min < periodDur; min += intervalMinutes) {
          const count =
            subsPerWindow === 'all_bench'
              ? benchQueue.length
              : subsPerWindow === 'auto'
              ? Math.min(2, benchQueue.length)
              : Math.min(Number(subsPerWindow) || 1, benchQueue.length);
          const swaps = [];
          for (let i = 0; i < count; i++) {
            const onId = benchQueue[i];
            const offSlot = pitchOutfield[pitchOutfield.length - 1 - i];
            if (!onId || !offSlot) continue;
            swaps.push({
              offPlayerId: offSlot.playerId,
              offPlayerName: playerMap.get(offSlot.playerId)?.name || 'Player',
              onPlayerId: onId,
              onPlayerName: playerMap.get(onId)?.name || 'Player',
              position: offSlot.position,
              reason: 'Fair rolling rotation',
            });
          }
          if (swaps.length > 0) {
            plans.push({
              period: lp.period,
              minuteMark: (lp.period - 1) * periodDur + min,
              periodMinute: min,
              swaps,
            });
          }
        }
      }
      return plans;
    },
    [currentUser, activeFixture, activeTeam, authFetch, playerMap]
  );

  const applySuggestedPlansToSchedule = useCallback(
    async (plans: SuggestedSubPlan[]) => {
      if (!activeFixture.matchSquad) return;
      const plannedInGameSubs: PlannedInGameSub[] = [];
      for (const plan of plans) {
        for (let i = 0; i < plan.swaps.length; i++) {
          const s = plan.swaps[i];
          plannedInGameSubs.push({
            id: `sub_${plan.period}_${plan.periodMinute}_${i}_${Date.now()}`,
            period: plan.period,
            targetMinute: plan.periodMinute,
            matchMinute: plan.minuteMark,
            offPlayerId: s.offPlayerId,
            onPlayerId: s.onPlayerId,
            position: s.position,
            executed: false,
          });
        }
      }
      await updateMatchSquad({
        ...activeFixture.matchSquad,
        plannedInGameSubs,
      });
      flashSync(`Synced ${plannedInGameSubs.length} scheduled subs to Live Match`);
    },
    [activeFixture.matchSquad, updateMatchSquad, flashSync]
  );

  const addCustomScheduledSub = useCallback(
    async (sub: Omit<PlannedInGameSub, 'id'>) => {
      if (!activeFixture.matchSquad) return;
      const newSub: PlannedInGameSub = {
        ...sub,
        id: `sub_custom_${Date.now()}`,
      };
      const nextSubs = [...(activeFixture.matchSquad.plannedInGameSubs || []), newSub].sort(
        (a, b) => a.period - b.period || a.targetMinute - b.targetMinute
      );
      await updateMatchSquad({
        ...activeFixture.matchSquad,
        plannedInGameSubs: nextSubs,
      });
      flashSync('Added scheduled substitution');
    },
    [activeFixture.matchSquad, updateMatchSquad, flashSync]
  );

  const removeScheduledSub = useCallback(
    async (subId: string) => {
      if (!activeFixture.matchSquad) return;
      const nextSubs = (activeFixture.matchSquad.plannedInGameSubs || []).filter(
        (s) => s.id !== subId
      );
      await updateMatchSquad({
        ...activeFixture.matchSquad,
        plannedInGameSubs: nextSubs,
      });
    },
    [activeFixture.matchSquad, updateMatchSquad]
  );

  const triggerEarlyDeparture = useCallback(
    async (
      departedPlayerId: string,
      departurePeriod: number,
      reason: 'injured' | 'left_early' | 'unwell',
      replacementPlayerId?: string,
      minute?: number
    ) => {
      if (currentUser && !activeFixture.id.startsWith('demo-')) {
        const res = await authFetch(
          `/api/fixtures/${encodeURIComponent(activeFixture.id)}/early-departure`,
          {
            method: 'POST',
            body: JSON.stringify({
              departedPlayerId,
              departurePeriod,
              reason,
              replacementPlayerId,
              minute: minute ?? Math.floor(elapsedSeconds / 60),
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.fixture) {
            const normalizedFix = normalizeFixture(data.fixture, activeTeam.id);
            setFixtures((prev) =>
              prev.map((f) => (f.id === normalizedFix.id ? normalizedFix : f))
            );
            flashSync('Remaining periods rebalanced for early departure');
            return;
          }
        }
      }
      await togglePlayerInMatchSquad(departedPlayerId);
      flashSync('Player removed from remaining periods');
    },
    [currentUser, activeFixture.id, elapsedSeconds, authFetch, togglePlayerInMatchSquad, flashSync]
  );

  // ================= Live Match & Post-Match Actions =================
  const togglePeriodTimer = useCallback(async () => {
    await triggerTouchlineHaptic('whistle');
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      const plannedSubs = activeFixture.matchSquad?.plannedInGameSubs || [];
      const scheduledCount = await scheduleLiveMatchAlarms({
        fixture: activeFixture,
        activePeriod,
        currentElapsedSeconds: elapsedSeconds,
        periodDurationSeconds,
        plannedSubs,
        playerMap,
      });
      setScheduledAlarmsCount(scheduledCount);
    } else {
      setIsTimerRunning(false);
      await cancelScheduledMatchAlarms();
      setScheduledAlarmsCount(0);
    }
  }, [isTimerRunning, activeFixture.matchSquad, activePeriod, periodDurationSeconds, elapsedSeconds, playerMap]);

  const resetPeriodTimer = useCallback(async () => {
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    await cancelScheduledMatchAlarms();
    setScheduledAlarmsCount(0);
  }, []);

  const executePlannedSub = useCallback(
    async (sub: PlannedInGameSub) => {
      await triggerTouchlineHaptic('swap');
      if (!activeFixture.matchSquad) return;
      const updatedLineups = activeFixture.matchSquad.lineupsByPeriod.map((lp) => {
        if (lp.period !== sub.period) return lp;
        const onPitch = lp.onPitch.map((op) =>
          op.playerId === sub.offPlayerId ? { ...op, playerId: sub.onPlayerId } : op
        );
        const bench = lp.bench.map((bid) => (bid === sub.onPlayerId ? sub.offPlayerId : bid));
        return { ...lp, onPitch, bench };
      });
      const updatedSubs = (activeFixture.matchSquad.plannedInGameSubs || []).map((s) =>
        s.id === sub.id ? { ...s, executed: true } : s
      );
      await updateMatchSquad({
        ...activeFixture.matchSquad,
        lineupsByPeriod: updatedLineups,
        plannedInGameSubs: updatedSubs,
      });
      flashSync(
        `Sub executed: ${playerMap.get(sub.onPlayerId)?.name || 'ON'} ⇄ ${
          playerMap.get(sub.offPlayerId)?.name || 'OFF'
        }`
      );
    },
    [activeFixture.matchSquad, updateMatchSquad, playerMap, flashSync]
  );

  const updateFixtureScore = useCallback(
    async (
      homeScore: number,
      awayScore: number,
      scorers?: GoalScorer[],
      status?: Fixture['status'],
      isLive?: boolean,
      targetFixtureId?: string
    ) => {
      const fixId = targetFixtureId || activeFixture.id;
      setFixtures((prev) =>
        prev.map((f) =>
          f.id === fixId
            ? {
                ...f,
                homeScore,
                awayScore,
                scorers: scorers ?? f.scorers,
                status: status ?? f.status,
                isLive: isLive ?? f.isLive,
              }
            : f
        )
      );

      if (!currentUser || fixId.startsWith('demo-')) return;
      const res = await authFetch(`/api/fixtures/${encodeURIComponent(fixId)}/score`, {
        method: 'PUT',
        body: JSON.stringify({ homeScore, awayScore, scorers, status, isLive }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fixture) {
          const normalizedFix = normalizeFixture(data.fixture, activeTeam.id);
          setFixtures((prev) => prev.map((f) => (f.id === normalizedFix.id ? normalizedFix : f)));
        }
        if (Array.isArray(data.updatedPlayers)) {
          setPlayers(data.updatedPlayers.map((p: any) => normalizePlayer(p, activeTeam.id)));
        }
        flashSync('Match score & scorers saved');
      }
    },
    [activeFixture.id, activeTeam.id, currentUser, authFetch, flashSync]
  );

  const savePostMatchRecording = useCallback(
    async (recording: PostMatchRecording, targetFixtureId?: string) => {
      const fixId = targetFixtureId || activeFixture.id;
      const serverPayload: PostMatchRecording = {
        ...recording,
        trackingMode:
          recording.trackingMode === 'custom_minutes' ? 'exact' : recording.trackingMode,
        playerMinutes: recording.actualMinutesByPlayer || recording.playerMinutes,
        actualMinutesByPlayer: recording.actualMinutesByPlayer || recording.playerMinutes,
      };
      setFixtures((prev) =>
        prev.map((f) =>
          f.id === fixId ? { ...f, status: 'Completed', postMatchRecording: serverPayload } : f
        )
      );

      if (!currentUser || fixId.startsWith('demo-')) return;
      const res = await authFetch(`/api/fixtures/${encodeURIComponent(fixId)}/post-match`, {
        method: 'PUT',
        body: JSON.stringify(serverPayload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.fixture) {
          const normalizedFix = normalizeFixture(data.fixture, activeTeam.id);
          setFixtures((prev) => prev.map((f) => (f.id === normalizedFix.id ? normalizedFix : f)));
        }
        if (Array.isArray(data.updatedPlayers)) {
          setPlayers(data.updatedPlayers.map((p: any) => normalizePlayer(p, activeTeam.id)));
        }
        flashSync('Match completed & player minutes recorded!');
      }
    },
    [activeFixture.id, activeTeam.id, currentUser, authFetch, flashSync]
  );

  // ================= Exports & Support =================
  const shareFixtureToWhatsApp = useCallback(async () => {
    const summaryText = formatWhatsAppMatchSummary(activeTeam, activeFixture, players);
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(summaryText)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(summaryText)}`);
    }
  }, [activeTeam, activeFixture, players]);

  const exportFixturePdf = useCallback(async () => {
    const potmNames = getFixturePotmIds(activeFixture)
      .map((id) => playerMap.get(id)?.name)
      .filter(Boolean)
      .join(', ');

    const periodsHtml = (activeFixture.matchSquad?.lineupsByPeriod || [])
      .map((lp) => {
        const rows = lp.onPitch
          .map(
            (op) =>
              `<tr><td style="padding:6px;border:1px solid #cbd5e1;font-weight:bold;">${
                op.position
              }</td><td style="padding:6px;border:1px solid #cbd5e1;">${
                playerMap.get(op.playerId)?.name || op.playerId
              }</td></tr>`
          )
          .join('');
        const benchNames = lp.bench
          .map((bid) => playerMap.get(bid)?.name || bid)
          .join(', ');
        return `
          <div style="margin-bottom:16px;">
            <h3 style="margin:0 0 8px 0;color:#0f172a;">Period ${lp.period}</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <thead><tr style="background:#f1f5f9;"><th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Pos</th><th style="padding:6px;border:1px solid #cbd5e1;text-align:left;">Player</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="font-size:12px;color:#475569;margin-top:6px;"><strong>Bench:</strong> ${
              benchNames || 'None'
            }</p>
          </div>
        `;
      })
      .join('');

    const html = `
      <html>
        <body style="font-family:sans-serif;padding:24px;color:#0f172a;">
          <h1 style="margin:0 0 4px 0;">⚽ ${activeTeam.name} vs ${activeFixture.opponent}</h1>
          <p style="margin:0 0 16px 0;color:#475569;">Date: ${activeFixture.date} • Venue: ${
      activeFixture.venue
    } • Formation: ${activeFixture.formation || activeFormation.name}</p>
          ${
            potmNames
              ? `<p style="margin:0 0 16px 0;color:#b45309;"><strong>🏆 Player(s) of the Match:</strong> ${potmNames}</p>`
              : ''
          }
          ${periodsHtml}
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share Match Sheet PDF' });
    }
  }, [activeTeam, activeFixture, activeFormation, playerMap]);

  const submitSupportTicket = useCallback(
    async (category: string, summary: string, description: string): Promise<string> => {
      const res = await authFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({
          category,
          summary: summary.trim(),
          description: description.trim(),
          userEmail: currentUser?.email,
          userId: currentUser?.uid,
          diagnostics: {
            activeTeamId: activeTeam.id,
            activeFixtureId: activeFixture.id,
            appVersion: '1.12.2-mobile',
            platform: 'react-native-expo',
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit support ticket');
      }
      const key = data.ticketKey || data.key || 'OPS-SUBMITTED';
      flashSync(`Support ticket ${key} submitted!`);
      return key;
    },
    [authFetch, currentUser, activeTeam.id, activeFixture.id, flashSync]
  );

  const setSunlightMode = useCallback(async (enabled: boolean) => {
    setSunlightModeState(enabled);
    await savePersistedPrefs({ sunlightMode: enabled });
  }, []);

  return (
    <MobileMatchdayContext.Provider
      value={{
        apiBaseUrl: API_BASE_URL,
        currentUser,
        authReady,
        isDemoMode,
        loading,
        syncMessage,
        errorMessage,
        clearMessages,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        signInWithGoogleBrowser,
        nativeGoogleSignInAvailable,
        signInWithGoogleNative,
        completeDeepLinkSignIn,
        enterDemoMode,
        signOut,
        refreshAllData: () => refreshAllData(),

        teams,
        activeTeam,
        activeTeamId,
        setActiveTeamId,
        createTeam,
        updateTeam,
        updateTeamSettings,
        deleteTeam,
        shareTeam,
        unshareTeam,
        addSeason,

        players,
        createPlayer,
        bulkCreatePlayers,
        updatePlayer,
        deletePlayer,
        togglePlayerAvailability,

        fixtures,
        activeFixture,
        activeFixtureId,
        setActiveFixtureId,
        createFixture,
        updateFixture,
        deleteFixture,
        setMatchCaptain,
        setPlayerOfTheMatch,
        toggleFixedPlayerPosition,
        togglePlayerInMatchSquad,
        updateMatchSquad,

        activePeriod,
        setActivePeriod,
        availableFormations,
        activeFormation,
        changeFormation,
        selectedSwapSource,
        handleTapPlayerNode,
        autoRotateLineup,
        resetMatchSheet,
        fetchSuggestedSubs,
        applySuggestedPlansToSchedule,
        addCustomScheduledSub,
        removeScheduledSub,
        triggerEarlyDeparture,

        isTimerRunning,
        elapsedSeconds,
        periodDurationSeconds,
        scheduledAlarmsCount,
        togglePeriodTimer,
        resetPeriodTimer,
        executePlannedSub,
        updateFixtureScore,
        savePostMatchRecording,

        dashboardSummary,
        matchStats,
        shareFixtureToWhatsApp,
        exportFixturePdf,
        submitSupportTicket,
        sunlightMode,
        setSunlightMode,
      }}
    >
      {children}
    </MobileMatchdayContext.Provider>
  );
};

export function useMobileMatchday(): MobileMatchdayContextType {
  const ctx = useContext(MobileMatchdayContext);
  if (!ctx) {
    throw new Error('useMobileMatchday must be used within a MobileMatchdayProvider');
  }
  return ctx;
}
