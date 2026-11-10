import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { AddressInfo } from 'node:net';
import express from 'express';
import { storage } from '../db/storage.js';
import apiRouter from '../routes/api.js';
import { Team, Player, Fixture } from '../types.js';

describe('Account Deletion & Data Erasure Suite (GDPR & App Store Compliance)', () => {
  let server: http.Server;
  let baseUrl: string;

  const userA = 'test_delete_user_a';
  const userAEmail = 'coach_a@test.subshuffle.local';
  const userB = 'test_delete_user_b';
  const userBEmail = 'coach_b@test.subshuffle.local';

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    await storage.deleteUserAccount(userA, userAEmail);
    await storage.deleteUserAccount(userB, userBEmail);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(async () => {
    // Clean slate for test users
    await storage.deleteUserAccount(userA, userAEmail);
    await storage.deleteUserAccount(userB, userBEmail);
  });

  describe('StorageManager.deleteUserAccount cascade behavior', () => {
    it('cascades deletion across owned teams, players, fixtures, and admin records', async () => {
      // 1. Setup User A's team, players, and fixtures
      const teamA: Team = {
        id: 'team_del_a1',
        name: 'User A Raptors',
        ageGroup: 'U10',
        ownerId: userA,
        ownerEmail: userAEmail,
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
      };
      await storage.saveTeam(teamA);

      const playerA: Player = {
        id: 'player_del_a1',
        teamId: teamA.id,
        name: 'Player One A',
        preferredPositions: ['Midfield'],
        goalkeeperWillingness: 'yes',
        gender: 'boy',
        status: 'Active',
      };
      await storage.savePlayer(playerA);

      const fixtureA: Fixture = {
        id: 'fix_del_a1',
        teamId: teamA.id,
        date: '2026-11-20',
        time: '10:00',
        opponent: 'Opponent X',
        venue: 'Home',
        status: 'Upcoming',
      };
      await storage.saveFixture(fixtureA);

      // Save onboarding / user record
      await storage.saveUserOnboarding(userA, { hasCompletedWizard: true });

      // 2. Setup User B's team (to ensure data isolation and safety)
      const teamB: Team = {
        id: 'team_del_b1',
        name: 'User B Lions',
        ageGroup: 'U11',
        ownerId: userB,
        ownerEmail: userBEmail,
        sharedWith: [userA, userAEmail],
        sharedMembers: [{ userId: userA, email: userAEmail, role: 'coach' }],
        pendingInvites: [userAEmail],
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
      };
      await storage.saveTeam(teamB);

      const playerB: Player = {
        id: 'player_del_b1',
        teamId: teamB.id,
        name: 'Player One B',
        preferredPositions: ['Defender'],
        goalkeeperWillingness: 'no',
        gender: 'boy',
        status: 'Active',
      };
      await storage.savePlayer(playerB);

      // 3. Execute account deletion for User A
      const stats = await storage.deleteUserAccount(userA, userAEmail);
      assert.equal(stats.deletedTeams, 1);
      assert.equal(stats.deletedPlayers, 1);
      assert.equal(stats.deletedFixtures, 1);

      // 4. Verify User A's resources are completely removed
      const teamsA = await storage.getTeams(userA, userAEmail);
      assert.equal(teamsA.length, 0, 'User A should have no teams left');

      const playersA = await storage.getPlayers(teamA.id);
      assert.equal(playersA.length, 0, 'User A players should be wiped');

      const fixtureCheck = await storage.getFixtureById(fixtureA.id);
      assert.equal(fixtureCheck, null, 'User A fixture should be wiped');

      const userRecord = await storage.getAdminUserByUid(userA);
      assert.equal(userRecord, null, 'User A admin user record should be wiped');

      // 5. Verify User B's resources are untouched
      const teamBCheck = await storage.getTeamById(teamB.id);
      assert.ok(teamBCheck, 'User B team must still exist');
      assert.equal(teamBCheck?.ownerId, userB);

      const playersB = await storage.getPlayers(teamB.id);
      assert.equal(playersB.length, 1, 'User B players must remain intact');

      // 6. Verify User A was removed from User B team's sharing arrays
      assert.equal(teamBCheck?.sharedWith?.includes(userA), false);
      assert.equal(teamBCheck?.sharedWith?.includes(userAEmail), false);
      assert.equal(teamBCheck?.sharedMembers?.some((m) => m.userId === userA), false);
      assert.equal(teamBCheck?.pendingInvites?.includes(userAEmail), false);
    });
  });

  describe('API Endpoint DELETE /api/account/me', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await fetch(`${baseUrl}/account/me`, { method: 'DELETE' });
      assert.equal(res.status, 401);
    });

    it('successfully deletes account when called with authenticated credentials', async () => {
      const team: Team = {
        id: 'team_api_del_1',
        name: 'API Del Team',
        ageGroup: 'U9',
        ownerId: userA,
        ownerEmail: userAEmail,
        settings: {
          pitchPlayerCount: 7,
          matchdaySquadCap: 10,
          subCount: 3,
          matchPeriodCount: 2,
          periodDurationMinutes: 20,
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
      };
      await storage.saveTeam(team);

      // Authenticate as User A using mock token headers
      const res = await fetch(`${baseUrl}/account/me`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer mock-token-coach',
          'x-user-id': userA,
          'x-user-email': userAEmail,
          'x-user-role': 'owner',
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.message.includes('permanently deleted'));
      assert.equal(json.details.deletedTeams, 1);

      // Verify teams are wiped
      const teams = await storage.getTeams(userA, userAEmail);
      assert.equal(teams.length, 0);
    });

    it('works equally on alias route DELETE /api/users/me', async () => {
      const res = await fetch(`${baseUrl}/users/me`, {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer mock-token-coach',
          'x-user-id': userA,
          'x-user-email': userAEmail,
          'x-user-role': 'owner',
        },
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
    });
  });
});

