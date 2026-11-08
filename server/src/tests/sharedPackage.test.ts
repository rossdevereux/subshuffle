import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BUILT_IN_FORMATIONS,
  getFixturePotmIds,
  formatWhatsAppMatchSummary,
  Fixture,
  Player,
  Team,
} from '../../../packages/shared/src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../../');

describe('Shared Domain Package (@subshuffle/shared) & Expo Mobile App Suite (Issue #41)', () => {
  it('provides built-in 5v5, 7v7, 9v9, and 11v11 tactical formations in @subshuffle/shared', () => {
    assert.equal(BUILT_IN_FORMATIONS.length, 12);
    assert.deepEqual(
      Array.from(new Set(BUILT_IN_FORMATIONS.map((f) => f.pitchPlayerCount))).sort((a, b) => a - b),
      [5, 7, 9, 11]
    );
    for (const f of BUILT_IN_FORMATIONS) {
      assert.equal(f.positions.length, f.pitchPlayerCount);
      assert.ok(f.positions.some((p) => p.code === 'GK'));
    }
  });

  it('normalizes single and multiple Player of the Match IDs via getFixturePotmIds and formats WhatsApp summaries', () => {
    const team: Team = {
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
        customFormations: [],
        currentSeason: '2026/2027',
        seasons: ['2026/2027'],
      },
      createdAt: '2026-10-01T00:00:00Z',
    };

    const players: Player[] = [
      { id: 'p1', teamId: 't1', name: 'Leo Davies', squadNumber: 1, preferredPositions: ['Goalkeeper'], unavailableDates: [], matchesPlayed: 1, totalMinutesPlayed: 50 },
      { id: 'p2', teamId: 't1', name: 'Harry Roberts', squadNumber: 9, preferredPositions: ['Attack'], unavailableDates: [], matchesPlayed: 1, totalMinutesPlayed: 50 },
    ];

    const fixture: Fixture = {
      id: 'f1',
      teamId: 't1',
      date: '2026-11-14',
      opponent: 'Wanderers',
      venue: 'Home',
      status: 'Completed',
      homeScore: 3,
      awayScore: 1,
      playerOfTheMatchIds: ['p1', 'p2'],
      playerOfTheMatchId: 'p1',
    };

    assert.deepEqual(getFixturePotmIds(fixture), ['p1', 'p2']);
    const text = formatWhatsAppMatchSummary(team, fixture, players);
    assert.ok(text.includes('Rovers U10 vs Wanderers'));
    assert.ok(text.includes('Players of the Match:* Leo Davies, Harry Roberts'));
  });

  it('configures Expo mobile app with direct native dependencies and EAS build profiles', () => {
    const mobilePkg = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'mobile/package.json'), 'utf-8')
    );
    const appJson = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'mobile/app.json'), 'utf-8')
    );
    const easJson = JSON.parse(
      fs.readFileSync(path.join(ROOT_DIR, 'mobile/eas.json'), 'utf-8')
    );

    assert.equal(mobilePkg.name, 'subshuffle-mobile');
    assert.ok(mobilePkg.dependencies['expo-router'], 'Expected expo-router in mobile/package.json');
    assert.ok(mobilePkg.dependencies['expo-notifications'], 'Expected expo-notifications in mobile/package.json');
    assert.ok(mobilePkg.dependencies['react-native-svg'], 'Expected react-native-svg in mobile/package.json');
    assert.equal(appJson.expo?.ios?.bundleIdentifier, 'com.subshuffle.app');
    assert.equal(appJson.expo?.android?.package, 'com.subshuffle.app');
    assert.ok(easJson.build?.beta, 'Expected beta profile in eas.json');
    assert.equal(easJson.build?.beta?.android?.buildType, 'apk');
    assert.ok(easJson.build?.production, 'Expected production profile in eas.json');
    assert.equal(easJson.build?.production?.android?.buildType, 'app-bundle');

    const mobileWorkflow = fs.readFileSync(
      path.join(ROOT_DIR, '.github/workflows/mobile-eas.yml'),
      'utf-8'
    );
    assert.ok(mobileWorkflow.includes('expo/expo-github-action@v8'));
    assert.ok(mobileWorkflow.includes('eas build --platform'));
    assert.ok(mobileWorkflow.includes('--auto-submit'));
  });
});

