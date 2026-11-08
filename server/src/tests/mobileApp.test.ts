import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BUILT_IN_FORMATIONS,
  formatWhatsAppMatchSummary,
  getFixturePotmIds,
} from '../../../packages/shared/src/index.js';
import {
  normalizeTeam,
  normalizePlayer,
  normalizeFixture,
  normalizeMatchSquad,
  normalizeDashboardSummary,
  parseQueryParams,
} from '../../../mobile/src/services/mobileDataNormalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');
const mobileDir = path.join(repoRoot, 'mobile');

describe('Android Mobile App Stability, Auth, Data Normalizer & Parity Suite', () => {
  describe('1. Android Native Crash Prevention Invariants', () => {
    it('configures mobile/app.json with newArchEnabled: false and updates.checkAutomatically: NEVER', () => {
      const appJsonPath = path.join(mobileDir, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

      assert.equal(
        appJson.expo.newArchEnabled,
        false,
        'newArchEnabled must be false on Android SDK 52 to prevent RNSScreenStack Fabric crashes'
      );
      assert.equal(
        appJson.expo.updates?.checkAutomatically,
        'NEVER',
        'updates.checkAutomatically must be NEVER so background OTA reloads do not kill the app during login'
      );
    });

    it('keeps <Stack> permanently mounted in mobile/app/_layout.tsx and wraps root in MobileErrorBoundary', () => {
      const layoutSource = fs.readFileSync(
        path.join(mobileDir, 'app', '_layout.tsx'),
        'utf8'
      );

      assert.ok(
        layoutSource.includes('MobileErrorBoundary'),
        'RootLayout must include MobileErrorBoundary so unexpected JS errors never terminate the Android process'
      );
      assert.ok(
        layoutSource.includes('<Stack'),
        'RootLayout must render <Stack>'
      );
      // Verify AppRootNavigator does not early-return before <Stack>
      const navFnMatch = layoutSource.match(
        /function AppRootNavigator\(\)\s*\{([\s\S]*?)^}/m
      );
      assert.ok(navFnMatch, 'AppRootNavigator function must exist');
      const navBody = navFnMatch[1];
      const stackIdx = navBody.indexOf('<Stack');
      const earlyReturnBeforeStack = navBody
        .slice(0, stackIdx)
        .includes('return <MobileAuthScreen');
      assert.equal(
        earlyReturnBeforeStack,
        false,
        'AppRootNavigator must never return <MobileAuthScreen /> before <Stack>; it must render auth as an overlay'
      );
    });

    it('does not use expo-notifications category storage or Hermes-unsafe URLSearchParams in mobile/', () => {
      const authServiceSource = fs.readFileSync(
        path.join(mobileDir, 'src', 'services', 'mobileAuthService.ts'),
        'utf8'
      );
      assert.equal(
        authServiceSource.includes('expo-notifications'),
        false,
        'mobileAuthService must not import expo-notifications'
      );
      assert.equal(
        authServiceSource.includes('setNotificationCategoryAsync'),
        false,
        'mobileAuthService must not store JWTs in Android notification categories'
      );
      assert.equal(
        authServiceSource.includes('new URLSearchParams'),
        false,
        'mobileAuthService must not rely on Hermes URLSearchParams stub'
      );

      const contextSource = fs.readFileSync(
        path.join(mobileDir, 'src', 'context', 'MobileMatchdayContext.tsx'),
        'utf8'
      );
      assert.equal(
        contextSource.includes('new URLSearchParams'),
        false,
        'MobileMatchdayContext must not rely on Hermes URLSearchParams stub'
      );
    });

    it('initializes Notifications.setNotificationHandler lazily inside try/catch, not at module import time', () => {
      const notifSource = fs.readFileSync(
        path.join(mobileDir, 'src', 'services', 'matchNotificationService.ts'),
        'utf8'
      );
      const topLevelCall = /^Notifications\.setNotificationHandler/m.test(notifSource);
      assert.equal(
        topLevelCall,
        false,
        'Notifications.setNotificationHandler must not execute synchronously at module load time'
      );
      assert.ok(
        notifSource.includes('ensureNotificationHandlerInitialized'),
        'Notifications handler must be initialized lazily via ensureNotificationHandlerInitialized()'
      );
    });

    it('parses deep-link OAuth handoff query strings safely via parseQueryParams without URLSearchParams', () => {
      const deepLink =
        'subshuffle://auth?idToken=eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.test&refreshToken=AMf-vBz123&uid=user_99&email=ross%40club.co.uk&displayName=Coach+Ross';
      const queryPart = deepLink.slice(deepLink.indexOf('?'));
      const parsed = parseQueryParams(queryPart);
      assert.equal(parsed.idToken, 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.test');
      assert.equal(parsed.refreshToken, 'AMf-vBz123');
      assert.equal(parsed.uid, 'user_99');
      assert.equal(parsed.email, 'ross@club.co.uk');
      assert.equal(parsed.displayName, 'Coach Ross');
    });
  });

  describe('2. Real Server / Firestore Data Normalizer (Post-Login Crash Protection)', () => {
    const fallbackTeam = {
      id: 'demo-team-1',
      name: 'Fallback FC',
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
      },
      createdAt: '2026-10-01T00:00:00.000Z',
    };

    it('normalizes legacy or partial Team documents missing settings or seasons', () => {
      const rawTeam = {
        id: 'team_real_123',
        name: 'Rovers U11',
        // ageGroup and settings missing
      };
      const normalized = normalizeTeam(rawTeam, fallbackTeam);
      assert.equal(normalized.id, 'team_real_123');
      assert.equal(normalized.name, 'Rovers U11');
      assert.equal(normalized.ageGroup, 'U10');
      assert.equal(normalized.settings.pitchPlayerCount, 7);
      assert.deepEqual(normalized.settings.seasons, ['2026/2027']);
      assert.deepEqual(normalized.sharedWith, []);
    });

    it('normalizes Player documents with missing preferredPositions or unavailableDates', () => {
      const rawPlayer = {
        id: 'player_1',
        name: 'Sammy Striker',
        preferredPositions: null,
        unavailableDates: undefined,
      };
      const normalized = normalizePlayer(rawPlayer, 'team_real_123');
      assert.equal(normalized.id, 'player_1');
      assert.equal(normalized.teamId, 'team_real_123');
      assert.deepEqual(normalized.preferredPositions, ['Midfield']);
      assert.deepEqual(normalized.unavailableDates, []);
      assert.equal(normalized.matchesPlayed, 0);
      assert.equal(normalized.totalMinutesPlayed, 0);
    });

    it('normalizes Fixture documents where matchSquad exists but lineupsByPeriod/onPitch/bench are undefined', () => {
      const rawFixture = {
        id: 'fix_real_99',
        teamId: 'team_real_123',
        opponent: 'City Juniors',
        date: '2026-11-15',
        matchSquad: {
          selectedPlayerIds: ['p1', 'p2'],
          // lineupsByPeriod is missing!
        },
      };
      const normalized = normalizeFixture(rawFixture, 'team_real_123');
      assert.ok(normalized.matchSquad);
      assert.deepEqual(normalized.matchSquad?.selectedPlayerIds, ['p1', 'p2']);
      assert.deepEqual(normalized.matchSquad?.lineupsByPeriod, []);
      assert.deepEqual(normalized.matchSquad?.plannedInGameSubs, []);

      // Also test partial lineup objects missing onPitch / bench arrays
      const partialSquad = normalizeMatchSquad({
        selectedPlayerIds: ['p1'],
        lineupsByPeriod: [{ period: 1 }],
      });
      assert.equal(partialSquad?.lineupsByPeriod.length, 1);
      assert.deepEqual(partialSquad?.lineupsByPeriod[0].onPitch, []);
      assert.deepEqual(partialSquad?.lineupsByPeriod[0].bench, []);
    });

    it('normalizes Server TeamDashboardSummary (overview.record + scorersLeaderboard + potmLeaderboard)', () => {
      const serverDashboardPayload = {
        teamId: 'team_real_123',
        season: '2026/2027',
        overview: {
          matchesPlayed: 5,
          record: { wins: 3, draws: 1, losses: 1 },
          goalsFor: 14,
          goalsAgainst: 7,
          goalDifference: 7,
        },
        scorersLeaderboard: [
          { playerId: 'p7', playerName: 'Harry Roberts', squadNumber: 9, goals: 6 },
        ],
        potmLeaderboard: [
          { playerId: 'p1', playerName: 'Leo Davies', squadNumber: 1, awards: 2 },
        ],
      };

      const summary = normalizeDashboardSummary(serverDashboardPayload, [], []);
      assert.equal(summary.matchesPlayed, 5);
      assert.equal(summary.wins, 3);
      assert.equal(summary.draws, 1);
      assert.equal(summary.losses, 1);
      assert.equal(summary.winRatePercent, 60);
      assert.equal(summary.goalsFor, 14);
      assert.equal(summary.goalsAgainst, 7);
      assert.equal(summary.goalDifference, 7);
      assert.equal(summary.topScorers.length, 1);
      assert.equal(summary.topScorers[0].playerName, 'Harry Roberts');
      assert.equal(summary.topScorers[0].goals, 6);
      assert.equal(summary.potmLeaders.length, 1);
      assert.equal(summary.potmLeaders[0].playerName, 'Leo Davies');
      assert.equal(summary.potmLeaders[0].awards, 2);
    });

    it('computes fallback DashboardSummary from fixtures & players when server payload is null', () => {
      const players = [
        normalizePlayer({ id: 'p1', name: 'Leo Davies', squadNumber: 1 }, 't1'),
        normalizePlayer({ id: 'p7', name: 'Harry Roberts', squadNumber: 9 }, 't1'),
      ];
      const fixtures = [
        normalizeFixture(
          {
            id: 'f1',
            opponent: 'Wanderers',
            venue: 'Home',
            status: 'Completed',
            homeScore: 3,
            awayScore: 1,
            playerOfTheMatchIds: ['p1', 'p7'],
            scorers: [
              { id: 's1', playerId: 'p7', playerName: 'Harry Roberts', team: 'home' },
              { id: 's2', playerId: 'p7', playerName: 'Harry Roberts', team: 'home' },
            ],
          },
          't1'
        ),
      ];

      const summary = normalizeDashboardSummary(null, fixtures, players);
      assert.equal(summary.matchesPlayed, 1);
      assert.equal(summary.wins, 1);
      assert.equal(summary.goalsFor, 3);
      assert.equal(summary.goalsAgainst, 1);
      assert.equal(summary.topScorers[0].playerId, 'p7');
      assert.equal(summary.topScorers[0].goals, 2);
      assert.equal(summary.potmLeaders.length, 2);
    });
  });

  describe('3. Shared Package & Screen Completeness Verification', () => {
    it('verifies all 8 native screen routes exist and export default components', () => {
      const requiredScreens = [
        'app/_layout.tsx',
        'app/(tabs)/_layout.tsx',
        'app/(tabs)/index.tsx',
        'app/(tabs)/matrix.tsx',
        'app/(tabs)/squad.tsx',
        'app/(tabs)/fixtures.tsx',
        'app/(tabs)/dashboard.tsx',
        'app/(tabs)/teams.tsx',
        'app/live-match.tsx',
      ];

      for (const relPath of requiredScreens) {
        const fullPath = path.join(mobileDir, relPath);
        assert.ok(fs.existsSync(fullPath), `Missing mobile screen: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        assert.ok(
          content.includes('export default function'),
          `${relPath} must export a default React component function`
        );
      }
    });

    it('formats WhatsApp match summaries with joint POTM winners and built-in formations', () => {
      assert.ok(BUILT_IN_FORMATIONS.length >= 4);
      const team = normalizeTeam({ id: 't1', name: 'Rovers U10' }, {
        id: 't1',
        name: 'Rovers U10',
        ageGroup: 'U10',
        settings: {
          pitchPlayerCount: 7,
          matchdaySquadCap: 10,
          subCount: 3,
          matchPeriodCount: 2,
          periodDurationMinutes: 25,
          targetGameTimePercent: 50,
          defaultFormation: '2-3-1',
        },
        createdAt: new Date().toISOString(),
      });
      const players = [
        normalizePlayer({ id: 'p1', name: 'Leo', squadNumber: 1 }, 't1'),
        normalizePlayer({ id: 'p2', name: 'Max', squadNumber: 7 }, 't1'),
      ];
      const fixture = normalizeFixture(
        {
          id: 'f1',
          opponent: 'Albion',
          date: '2026-11-20',
          playerOfTheMatchIds: ['p1', 'p2'],
        },
        't1'
      );
      assert.deepEqual(getFixturePotmIds(fixture), ['p1', 'p2']);
      const text = formatWhatsAppMatchSummary(team, fixture, players);
      assert.ok(text.includes('Rovers U10 vs Albion'));
      assert.ok(text.includes('Leo, Max'));
    });
  });
});
