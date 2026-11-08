import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as Linking from 'expo-linking';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Team,
  Player,
  Fixture,
  Formation,
  PlannedInGameSub,
  BUILT_IN_FORMATIONS,
  formatWhatsAppMatchSummary,
  getFixturePotmIds,
} from '@subshuffle/shared';
import {
  triggerTouchlineHaptic,
  scheduleLiveMatchAlarms,
  cancelScheduledMatchAlarms,
} from '../services/matchNotificationService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://subshuffle.com';

const FALLBACK_TEAM: Team = {
  id: 'team-1',
  name: 'The Rovers FC (U10s)',
  ageGroup: 'U10',
  settings: {
    pitchPlayerCount: 7,
    matchdaySquadCap: 10,
    subCount: 3,
    matchPeriodCount: 2,
    periodDurationMinutes: 25,
    targetGameTimePercent: 50,
    defaultFormation: '2-3-1',
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
  { id: 'p1', teamId: 'team-1', name: 'Leo Davies', squadNumber: 1, preferredPositions: ['Goalkeeper'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 320 },
  { id: 'p2', teamId: 'team-1', name: 'Archie Smith', squadNumber: 2, preferredPositions: ['Defence'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 300 },
  { id: 'p3', teamId: 'team-1', name: 'Noah Taylor', squadNumber: 3, preferredPositions: ['Defence', 'Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 265 },
  { id: 'p4', teamId: 'team-1', name: 'Oliver Wilson', squadNumber: 4, preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 290 },
  { id: 'p5', teamId: 'team-1', name: 'Charlie Evans', squadNumber: 6, preferredPositions: ['Midfield', 'Attack'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 310 },
  { id: 'p6', teamId: 'team-1', name: 'Jack Thomas', squadNumber: 8, preferredPositions: ['Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 275 },
  { id: 'p7', teamId: 'team-1', name: 'Harry Roberts', squadNumber: 9, preferredPositions: ['Attack'], unavailableDates: [], matchesPlayed: 8, totalMinutesPlayed: 305 },
  { id: 'p8', teamId: 'team-1', name: 'George Walker', squadNumber: 10, preferredPositions: ['Attack', 'Midfield'], unavailableDates: [], matchesPlayed: 7, totalMinutesPlayed: 260 },
  { id: 'p9', teamId: 'team-1', name: 'Alfie Wright', squadNumber: 11, preferredPositions: ['Defence', 'Midfield'], unavailableDates: [], matchesPlayed: 6, totalMinutesPlayed: 230 },
];

const FALLBACK_FIXTURE: Fixture = {
  id: 'fix-mobile-1',
  teamId: 'team-1',
  season: '2026/2027',
  date: '2026-11-14',
  kickOffTime: '10:00',
  meetTime: '09:30',
  opponent: 'Westgate Wanderers U10',
  venue: 'Home',
  status: 'Upcoming',
  formation: '2-3-1',
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
          { position: 'LD', playerId: 'p2' },
          { position: 'RD', playerId: 'p3' },
          { position: 'LM', playerId: 'p4' },
          { position: 'CM', playerId: 'p5' },
          { position: 'RM', playerId: 'p6' },
          { position: 'FWD', playerId: 'p7' },
        ],
        bench: ['p8', 'p9'],
      },
      {
        period: 2,
        onPitch: [
          { position: 'GK', playerId: 'p1' },
          { position: 'LD', playerId: 'p9' },
          { position: 'RD', playerId: 'p2' },
          { position: 'LM', playerId: 'p8' },
          { position: 'CM', playerId: 'p4' },
          { position: 'RM', playerId: 'p5' },
          { position: 'FWD', playerId: 'p6' },
        ],
        bench: ['p3', 'p7'],
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
        position: 'LM',
        executed: false,
      },
      {
        id: 'sub-2',
        period: 1,
        targetMinute: 10,
        matchMinute: 10,
        offPlayerId: 'p3',
        onPlayerId: 'p9',
        position: 'RD',
        executed: false,
      },
    ],
  },
};

export interface SwapSource {
  type: 'pitch' | 'bench';
  playerId: string;
  position?: string;
}

interface MobileMatchdayContextType {
  teams: Team[];
  activeTeam: Team;
  players: Player[];
  fixtures: Fixture[];
  activeFixture: Fixture;
  activePeriod: number;
  setActivePeriod: (period: number) => void;
  activeFormation: Formation;
  selectedSwapSource: SwapSource | null;
  handleTapPlayerNode: (target: SwapSource) => Promise<void>;
  autoRotateLineup: () => Promise<void>;
  isTimerRunning: boolean;
  elapsedSeconds: number;
  periodDurationSeconds: number;
  scheduledAlarmsCount: number;
  togglePeriodTimer: () => Promise<void>;
  resetPeriodTimer: () => Promise<void>;
  executePlannedSub: (sub: PlannedInGameSub) => Promise<void>;
  shareFixtureToWhatsApp: () => Promise<void>;
  exportFixturePdf: () => Promise<void>;
  sunlightMode: boolean;
  setSunlightMode: (enabled: boolean) => void;
}

const MobileMatchdayContext = createContext<MobileMatchdayContextType | null>(null);

export const MobileMatchdayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teams, setTeams] = useState<Team[]>([FALLBACK_TEAM]);
  const [players, setPlayers] = useState<Player[]>(FALLBACK_PLAYERS);
  const [fixtures, setFixtures] = useState<Fixture[]>([FALLBACK_FIXTURE]);
  const [activePeriod, setActivePeriod] = useState<number>(1);
  const [selectedSwapSource, setSelectedSwapSource] = useState<SwapSource | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [scheduledAlarmsCount, setScheduledAlarmsCount] = useState<number>(0);
  const [sunlightMode, setSunlightMode] = useState<boolean>(false);

  const activeTeam = teams[0] || FALLBACK_TEAM;
  const activeFixture = fixtures[0] || FALLBACK_FIXTURE;
  const periodDurationSeconds =
    (activeFixture.periodDurationMinutes || activeTeam.settings.periodDurationMinutes || 25) * 60;

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const activeFormation = useMemo(() => {
    const pitchCount = activeFixture.pitchPlayerCount || activeTeam.settings.pitchPlayerCount || 7;
    return (
      BUILT_IN_FORMATIONS.find(
        (f) => f.name === activeFixture.formation && f.pitchPlayerCount === pitchCount
      ) ||
      BUILT_IN_FORMATIONS.find((f) => f.pitchPlayerCount === pitchCount) ||
      BUILT_IN_FORMATIONS[1]
    );
  }, [activeFixture.formation, activeFixture.pitchPlayerCount, activeTeam.settings.pitchPlayerCount]);

  // Fetch live data from Cloud Run API when online (falls back to offline data automatically)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/teams`, {
          headers: { Authorization: 'Bearer mock-dev-token' },
        });
        if (!res.ok || !mounted) return;
        const fetchedTeams: Team[] = await res.json();
        if (fetchedTeams.length > 0 && mounted) {
          setTeams(fetchedTeams);
        }
      } catch {
        // Offline mode: use embedded fallback squad
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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

      setFixtures((prev) =>
        prev.map((fix) => {
          if (fix.id !== activeFixture.id || !fix.matchSquad) return fix;
          const updatedLineups = fix.matchSquad.lineupsByPeriod.map((lp) => {
            if (lp.period !== activePeriod) return lp;
            const onPitch = lp.onPitch.map((op) => ({ ...op }));
            const bench = [...lp.bench];

            const srcPitchIdx = onPitch.findIndex((op) => op.playerId === selectedSwapSource.playerId);
            const tgtPitchIdx = onPitch.findIndex((op) => op.playerId === target.playerId);
            const srcBenchIdx = bench.indexOf(selectedSwapSource.playerId);
            const tgtBenchIdx = bench.indexOf(target.playerId);

            if (srcPitchIdx !== -1 && tgtPitchIdx !== -1) {
              const tmp = onPitch[srcPitchIdx].playerId;
              onPitch[srcPitchIdx].playerId = onPitch[tgtPitchIdx].playerId;
              onPitch[tgtPitchIdx].playerId = tmp;
            } else if (srcPitchIdx !== -1 && tgtBenchIdx !== -1) {
              onPitch[srcPitchIdx].playerId = target.playerId;
              bench[tgtBenchIdx] = selectedSwapSource.playerId;
            } else if (srcBenchIdx !== -1 && tgtPitchIdx !== -1) {
              onPitch[tgtPitchIdx].playerId = selectedSwapSource.playerId;
              bench[srcBenchIdx] = target.playerId;
            }

            return { ...lp, onPitch, bench };
          });

          return {
            ...fix,
            matchSquad: {
              ...fix.matchSquad,
              lineupsByPeriod: updatedLineups,
            },
          };
        })
      );
      setSelectedSwapSource(null);
    },
    [selectedSwapSource, activeFixture.id, activePeriod]
  );

  const autoRotateLineup = useCallback(async () => {
    await triggerTouchlineHaptic('whistle');
    setFixtures((prev) =>
      prev.map((fix) => {
        if (fix.id !== activeFixture.id || !fix.matchSquad) return fix;
        const rotatedLineups = fix.matchSquad.lineupsByPeriod.map((lp, idx) => {
          if (idx === 0) return lp;
          // Rotate outfield players with bench for balanced game time
          const onPitch = lp.onPitch.map((op) => ({ ...op }));
          const bench = [...lp.bench];
          let bIdx = 0;
          for (let i = onPitch.length - 1; i >= 0 && bIdx < bench.length; i--) {
            if (onPitch[i].position !== 'GK') {
              const outgoing = onPitch[i].playerId;
              onPitch[i].playerId = bench[bIdx];
              bench[bIdx] = outgoing;
              bIdx++;
            }
          }
          return { ...lp, onPitch, bench };
        });
        return {
          ...fix,
          matchSquad: {
            ...fix.matchSquad,
            lineupsByPeriod: rotatedLineups,
          },
        };
      })
    );
  }, [activeFixture.id]);

  const togglePeriodTimer = useCallback(async () => {
    await triggerTouchlineHaptic('whistle');
    if (isTimerRunning) {
      setIsTimerRunning(false);
      await cancelScheduledMatchAlarms();
      setScheduledAlarmsCount(0);
    } else {
      setIsTimerRunning(true);
      const count = await scheduleLiveMatchAlarms({
        fixture: activeFixture,
        activePeriod,
        currentElapsedSeconds: elapsedSeconds,
        periodDurationSeconds,
        plannedSubs: activeFixture.matchSquad?.plannedInGameSubs || [],
        playerMap,
      });
      setScheduledAlarmsCount(count);
    }
  }, [isTimerRunning, activeFixture, activePeriod, elapsedSeconds, periodDurationSeconds, playerMap]);

  const resetPeriodTimer = useCallback(async () => {
    setIsTimerRunning(false);
    setElapsedSeconds(0);
    await cancelScheduledMatchAlarms();
    setScheduledAlarmsCount(0);
  }, []);

  const executePlannedSub = useCallback(
    async (sub: PlannedInGameSub) => {
      await triggerTouchlineHaptic('swap');
      setFixtures((prev) =>
        prev.map((fix) => {
          if (fix.id !== activeFixture.id || !fix.matchSquad) return fix;
          const updatedLineups = fix.matchSquad.lineupsByPeriod.map((lp) => {
            if (lp.period !== sub.period) return lp;
            const onPitch = lp.onPitch.map((op) =>
              op.playerId === sub.offPlayerId ? { ...op, playerId: sub.onPlayerId } : op
            );
            const bench = lp.bench.map((id) => (id === sub.onPlayerId ? sub.offPlayerId : id));
            return { ...lp, onPitch, bench };
          });
          const updatedPlanned = (fix.matchSquad.plannedInGameSubs || []).map((s) =>
            s.id === sub.id ? { ...s, executed: true } : s
          );
          return {
            ...fix,
            matchSquad: {
              ...fix.matchSquad,
              lineupsByPeriod: updatedLineups,
              plannedInGameSubs: updatedPlanned,
            },
          };
        })
      );
    },
    [activeFixture.id]
  );

  const shareFixtureToWhatsApp = useCallback(async () => {
    const text = formatWhatsAppMatchSummary(activeTeam, activeFixture, players);
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  }, [activeTeam, activeFixture, players]);

  const exportFixturePdf = useCallback(async () => {
    const potmNames = getFixturePotmIds(activeFixture)
      .map((id) => playerMap.get(id)?.name)
      .filter(Boolean)
      .join(', ');

    const html = `
      <html>
        <body style="font-family: sans-serif; padding: 24px; color: #0f172a;">
          <h1 style="margin-bottom: 4px;">${activeTeam.name} vs ${activeFixture.opponent}</h1>
          <p style="margin-top: 0; color: #475569;">${activeFixture.date} • Kick-off ${activeFixture.kickOffTime || '10:00'} (${activeFixture.venue})</p>
          ${potmNames ? `<p><strong>★ Player(s) of the Match:</strong> ${potmNames}</p>` : ''}
          <hr />
          ${(activeFixture.matchSquad?.lineupsByPeriod || [])
            .map(
              (lp) => `
              <h3>Period ${lp.period}</h3>
              <ul>
                ${lp.onPitch
                  .map((op) => `<li><strong>${op.position}:</strong> ${playerMap.get(op.playerId)?.name || op.playerId}</li>`)
                  .join('')}
              </ul>
              <p><em>Substitutes:</em> ${lp.bench.map((id) => playerMap.get(id)?.name || id).join(', ')}</p>
            `
            )
            .join('')}
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    }
  }, [activeTeam, activeFixture, playerMap]);

  return (
    <MobileMatchdayContext.Provider
      value={{
        teams,
        activeTeam,
        players,
        fixtures,
        activeFixture,
        activePeriod,
        setActivePeriod,
        activeFormation,
        selectedSwapSource,
        handleTapPlayerNode,
        autoRotateLineup,
        isTimerRunning,
        elapsedSeconds,
        periodDurationSeconds,
        scheduledAlarmsCount,
        togglePeriodTimer,
        resetPeriodTimer,
        executePlannedSub,
        shareFixtureToWhatsApp,
        exportFixturePdf,
        sunlightMode,
        setSunlightMode,
      }}
    >
      {children}
    </MobileMatchdayContext.Provider>
  );
};

export const useMobileMatchday = () => {
  const ctx = useContext(MobileMatchdayContext);
  if (!ctx) throw new Error('useMobileMatchday must be used inside MobileMatchdayProvider');
  return ctx;
};

