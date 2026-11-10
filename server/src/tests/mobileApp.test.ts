import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
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
  normalizeSuggestedSubPlans,
  normalizeMatchPlayerStats,
  parseQueryParams,
} from '../../../mobile/src/services/mobileDataNormalizer.js';
import { DEFAULT_FORMATIONS as SERVER_FORMATIONS } from '../db/formations.js';

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

    it('normalizes Server PeriodLineup.subs -> bench and PlannedInGameSub playerOutId/playerInId -> offPlayerId/onPlayerId', () => {
      const serverMatchSquad = normalizeMatchSquad({
        selectedPlayerIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
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
            subs: ['p8', 'p9', 'p10'],
          },
        ],
        plannedInGameSubs: [
          {
            id: 'sub_server_1',
            period: 1,
            targetMinute: 12,
            matchMinute: 12,
            playerOutId: 'p4',
            playerOutName: 'Oliver',
            playerInId: 'p8',
            playerInName: 'George',
            position: 'MID_L',
            executed: false,
          },
        ],
      });

      assert.ok(serverMatchSquad);
      assert.deepEqual(serverMatchSquad?.lineupsByPeriod[0].bench, ['p8', 'p9', 'p10']);
      assert.deepEqual(serverMatchSquad?.lineupsByPeriod[0].subs, ['p8', 'p9', 'p10']);
      assert.equal(serverMatchSquad?.plannedInGameSubs?.length, 1);
      const sub = serverMatchSquad!.plannedInGameSubs![0];
      assert.equal(sub.offPlayerId, 'p4');
      assert.equal(sub.onPlayerId, 'p8');
      assert.equal(sub.playerOutId, 'p4');
      assert.equal(sub.playerInId, 'p8');
      assert.equal(sub.targetMinute, 12);
    });

    it('normalizes Server GET /api/fixtures/:id/suggested-subs multi-strategy windows into SuggestedSubPlan[] with swaps array', () => {
      const serverSuggestedPlansPayload = [
        {
          intervalMinutes: 10,
          strategyName: 'Balanced 10-Min Rolling Subs',
          description: 'Swaps 2 players every 10 minutes',
          windows: [
            {
              minute: 10,
              period: 1,
              subChanges: [
                {
                  playerOutId: 'p4',
                  playerOutName: 'Oliver Wilson',
                  playerInId: 'p8',
                  playerInName: 'George Walker',
                  position: 'MID_L',
                  reason: 'Fairness rotation',
                },
                {
                  playerOutId: 'p3',
                  playerOutName: 'Noah Taylor',
                  playerInId: 'p9',
                  playerInName: 'Alfie Wright',
                  position: 'DEF_R',
                  reason: 'Fairness rotation',
                },
              ],
            },
            {
              minute: 35,
              period: 2,
              subChanges: [
                {
                  playerOutId: 'p5',
                  playerOutName: 'Charlie Evans',
                  playerInId: 'p4',
                  playerInName: 'Oliver Wilson',
                  position: 'MID_C',
                },
              ],
            },
          ],
        },
      ];

      const normalizedPlans = normalizeSuggestedSubPlans(serverSuggestedPlansPayload, 25);
      assert.equal(normalizedPlans.length, 2);
      assert.equal(normalizedPlans[0].period, 1);
      assert.equal(normalizedPlans[0].minuteMark, 10);
      assert.equal(normalizedPlans[0].periodMinute, 10);
      assert.equal(normalizedPlans[0].swaps.length, 2);
      assert.equal(normalizedPlans[0].swaps[0].offPlayerId, 'p4');
      assert.equal(normalizedPlans[0].swaps[0].offPlayerName, 'Oliver Wilson');
      assert.equal(normalizedPlans[0].swaps[0].onPlayerId, 'p8');
      assert.equal(normalizedPlans[0].swaps[0].onPlayerName, 'George Walker');
      assert.equal(normalizedPlans[0].swaps[0].position, 'MID_L');

      assert.equal(normalizedPlans[1].period, 2);
      assert.equal(normalizedPlans[1].minuteMark, 35);
      assert.equal(normalizedPlans[1].periodMinute, 10);
      assert.equal(normalizedPlans[1].swaps.length, 1);
    });

    it('normalizes Server GET /api/fixtures/:id/stats payload into MatchPlayerStats[]', () => {
      const serverStats = [
        {
          playerId: 'p1',
          playerName: 'Albert',
          periodsPlayed: [1, 2],
          minutesPlayed: 50,
          gameTimePercent: 100,
          positionsPlayed: ['GK'],
        },
        {
          playerId: 'p8',
          playerName: 'George',
          periodsPlayed: [2],
          minutesPlayed: 25,
          gameTimePercent: 50,
          positionsPlayed: ['MID_L'],
        },
      ];
      const normalized = normalizeMatchPlayerStats(serverStats, [], 2, 50);
      assert.equal(normalized.length, 2);
      assert.equal(normalized[0].totalMinutes, 50);
      assert.equal(normalized[0].percentOfMatch, 100);
      assert.equal(normalized[0].periodsOnPitch, 2);
      assert.equal(normalized[0].periodsOnBench, 0);
      assert.equal(normalized[0].meetsTarget, true);
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
    it('verifies all 10 native screen routes (including /auth OAuth callback and +not-found fallback) exist and export default components', () => {
      const requiredScreens = [
        'app/_layout.tsx',
        'app/auth.tsx',
        'app/+not-found.tsx',
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

    it('matches all 12 server formation definitions and position slot codes (GK, DEF_L, DEF_R, MID_L, MID_C, MID_R, ATT) between shared and server', () => {
      assert.equal(
        BUILT_IN_FORMATIONS.length,
        SERVER_FORMATIONS.length,
        'Shared BUILT_IN_FORMATIONS count must match server BUILT_IN_FORMATIONS count'
      );

      for (const serverForm of SERVER_FORMATIONS) {
        const sharedForm = BUILT_IN_FORMATIONS.find((f) => f.id === serverForm.id);
        assert.ok(sharedForm, `Missing formation ${serverForm.id} (${serverForm.name}) in @subshuffle/shared`);
        assert.equal(sharedForm.name, serverForm.name);
        assert.deepEqual(
          sharedForm.positions.map((p) => p.code),
          serverForm.slots.map((p) => p.code),
          `Position slot codes for ${serverForm.name} must match server exactly so pitch nodes never show Empty`
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

  describe('4. Android Release Signing & Native Google Sign-In Invariants', () => {
    it('configures withReleaseSigning plugin in mobile/app.json and injects release signing config into build.gradle', () => {
      const appJsonPath = path.join(mobileDir, 'app.json');
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      assert.ok(
        appJson.expo.plugins.some(
          (p: any) => p === './plugins/withReleaseSigning' || (Array.isArray(p) && p[0] === './plugins/withReleaseSigning')
        ),
        'mobile/app.json must include ./plugins/withReleaseSigning plugin'
      );

      const requireNode = createRequire(import.meta.url);
      const { applyReleaseSigning } = requireNode(path.join(mobileDir, 'plugins', 'withReleaseSigning.js'));

      const mockGradle = `
android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.debug
            minifyEnabled false
        }
    }
}
      `;

      const patched = applyReleaseSigning(mockGradle);
      assert.ok(patched.includes('// @subshuffle/release-signing'), 'Must inject marker');
      assert.ok(patched.includes("storeFile file(System.getenv('ANDROID_KEYSTORE_PATH'))"), 'Must read keystore from env');
      assert.ok(
        patched.includes("signingConfig System.getenv('ANDROID_KEYSTORE_PATH') ? signingConfigs.release : signingConfigs.debug"),
        'Must conditionally use release signingConfig when ANDROID_KEYSTORE_PATH is present'
      );
    });

    it('exports public GOOGLE_WEB_CLIENT_ID and provides native Google Sign-In wrappers', () => {
      const nativeServicePath = path.join(mobileDir, 'src', 'services', 'nativeGoogleSignIn.ts');
      assert.ok(fs.existsSync(nativeServicePath), 'nativeGoogleSignIn.ts must exist');
      const src = fs.readFileSync(nativeServicePath, 'utf8');

      assert.ok(src.includes('GOOGLE_WEB_CLIENT_ID'), 'Must export GOOGLE_WEB_CLIENT_ID');
      assert.ok(
        src.includes('942396117037-av6m9vth2g070m4fa29nhli0eflgnfrl.apps.googleusercontent.com'),
        'Must contain the project web client id'
      );
      assert.ok(src.includes('signInWithNativeGoogle'), 'Must export signInWithNativeGoogle');
      assert.ok(src.includes('isNativeGoogleSignInAvailable'), 'Must export isNativeGoogleSignInAvailable');
      assert.ok(src.includes('signOutNativeGoogle'), 'Must export signOutNativeGoogle');
    });

    it('implements mobileSignInWithGoogleIdToken in mobileAuthService for Firebase IDP token exchange', () => {
      const authServicePath = path.join(mobileDir, 'src', 'services', 'mobileAuthService.ts');
      const src = fs.readFileSync(authServicePath, 'utf8');

      assert.ok(src.includes('mobileSignInWithGoogleIdToken'), 'Must export mobileSignInWithGoogleIdToken');
      assert.ok(src.includes('accounts:signInWithIdp'), 'Must call Firebase signInWithIdp endpoint');
      assert.ok(src.includes('providerId=google.com'), 'Must pass google.com providerId');
    });

    it('wires native Google Sign-In into MobileMatchdayContext and MobileAuthScreen', () => {
      const contextSrc = fs.readFileSync(
        path.join(mobileDir, 'src', 'context', 'MobileMatchdayContext.tsx'),
        'utf8'
      );
      assert.ok(contextSrc.includes('signInWithGoogleNative'), 'Context must expose signInWithGoogleNative');
      assert.ok(contextSrc.includes('nativeGoogleSignInAvailable'), 'Context must expose nativeGoogleSignInAvailable');
      assert.ok(contextSrc.includes('signOutNativeGoogle'), 'Context must invoke signOutNativeGoogle on sign-out');

      const screenSrc = fs.readFileSync(
        path.join(mobileDir, 'src', 'components', 'MobileAuthScreen.tsx'),
        'utf8'
      );
      assert.ok(screenSrc.includes('Continue with Google'), 'MobileAuthScreen must render Continue with Google');
      assert.ok(screenSrc.includes('nativeGoogleSignInAvailable'), 'MobileAuthScreen must check nativeGoogleSignInAvailable');
    });

    it('passes release signing secrets in .github/workflows/mobile-eas.yml and decodes keystore', () => {
      const workflowSrc = fs.readFileSync(
        path.join(repoRoot, '.github', 'workflows', 'mobile-eas.yml'),
        'utf8'
      );
      assert.ok(workflowSrc.includes('ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}'), 'Must pass ANDROID_KEYSTORE_BASE64');
      assert.ok(workflowSrc.includes('ANDROID_KEYSTORE_PATH'), 'Must set ANDROID_KEYSTORE_PATH env');
      assert.ok(workflowSrc.includes('apksigner'), 'Must verify APK cert via apksigner');
    });
  });
});
