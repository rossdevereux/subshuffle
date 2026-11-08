import { Router, Response } from 'express';
import { requireAuth, requireSuperAdmin, AuthenticatedRequest } from '../middleware/auth.js';
import {
  setCustomUserRole,
  setUserSubscriptionClaims,
  listAllUsersWithClaims,
} from '../auth/claims.js';
import { storage } from '../db/storage.js';
import {
  UserRole,
  ClubSettings,
  BackupData,
  SubscriptionStatus,
  SubscriptionTier,
  UserSubscription,
} from '../types.js';

const router = Router();

// Firewall all /api/admin routes: require valid Firebase Auth token AND single-owner Super-Admin identity
router.use(requireAuth, requireSuperAdmin);

// ================= 0. Platform Owner Identity & Overview KPIs =================

// GET /api/admin/me - Verify Super-Admin firewall access and return platform overview KPIs
router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [users, backup] = await Promise.all([
      listAllUsersWithClaims(),
      storage.exportBackup(),
    ]);

    const activePaidCount = users.filter((u) => u.subscription?.status === 'active').length;
    const lifetimeCount = users.filter(
      (u) => u.subscription?.status === 'lifetime' || u.subscription?.tier === 'free_for_life'
    ).length;
    const trialingCount = users.filter(
      (u) => !u.subscription || u.subscription.status === 'trialing'
    ).length;

    res.json({
      admin: {
        uid: req.user?.uid,
        email: req.user?.email,
        name: req.user?.name,
        superAdmin: true,
      },
      kpis: {
        totalUsers: users.length,
        activePaidSubscriptions: activePaidCount,
        lifetimeSubscriptions: lifetimeCount,
        trialingUsers: trialingCount,
        totalTeams: backup.teams.length,
        totalPlayers: backup.players.length,
        totalFixtures: backup.fixtures.length,
        completedFixtures: backup.fixtures.filter((f) => f.status === 'Completed').length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load platform overview', details: err.message });
  }
});

// ================= 1. Global User & Subscription Management =================

// GET /api/admin/users - List all platform users, subscriptions, and teams owned
router.get('/users', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [users, backup] = await Promise.all([
      listAllUsersWithClaims(),
      storage.exportBackup(),
    ]);

    const enrichedUsers = users.map((u) => {
      const ownedTeams = backup.teams
        .filter(
          (t) =>
            t.ownerId === u.uid ||
            (u.email && t.ownerEmail?.toLowerCase() === u.email.toLowerCase())
        )
        .map((t) => ({ id: t.id, name: t.name, ageGroup: t.ageGroup }));
      return {
        ...u,
        ownedTeamsCount: ownedTeams.length,
        ownedTeams,
      };
    });

    res.json({
      users: enrichedUsers,
      count: enrichedUsers.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to list users', details: err.message });
  }
});

// PUT /api/admin/users/:uid/role - Update user's role via Firebase Custom Claims
router.put('/users/:uid/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUid = String(req.params.uid);
    const { role } = req.body as { role: UserRole };

    if (!role || !['owner', 'coach', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be owner, coach, or viewer.' });
    }

    if (req.user?.uid === targetUid && role !== 'owner') {
      return res.status(400).json({
        error: 'Safety restriction: Cannot demote the active Platform Super-Administrator account.',
      });
    }

    await setCustomUserRole(targetUid, role);
    const updatedUser = await storage.getAdminUserByUid(targetUid);

    res.json({
      message: `User role successfully updated to ${role}`,
      uid: targetUid,
      role,
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user role', details: err.message });
  }
});

// PUT /api/admin/users/:uid/subscription - Update individual user subscription (Free for Life, Active, etc.)
router.put('/users/:uid/subscription', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUid = String(req.params.uid);
    const { status, tier } = req.body as {
      status: SubscriptionStatus;
      tier?: SubscriptionTier;
    };

    const validStatuses: SubscriptionStatus[] = [
      'trialing',
      'active',
      'past_due',
      'canceled',
      'expired',
      'lifetime',
    ];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid subscription status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const assignedTier: SubscriptionTier =
      tier || (status === 'lifetime' ? 'free_for_life' : 'coach_monthly');

    const existingSub = await storage.getUserSubscription(targetUid);
    const updatedSub: UserSubscription = {
      ...existingSub,
      status,
      tier: assignedTier,
    };

    // Synchronize Firebase Custom User Claims & persistent storage
    await setUserSubscriptionClaims(targetUid, updatedSub);

    const updatedUser = await storage.getAdminUserByUid(targetUid);

    res.json({
      message: `User subscription successfully updated to ${status} (${assignedTier})`,
      uid: targetUid,
      subscription: updatedSub,
      user: updatedUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update user subscription', details: err.message });
  }
});

// POST /api/admin/users and /api/admin/users/invite - Create/register user record
router.post(['/users', '/users/invite'], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, displayName, role } = req.body as {
      email: string;
      displayName?: string;
      role: UserRole;
    };

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const assignedRole: UserRole = role && ['owner', 'coach', 'viewer'].includes(role) ? role : 'coach';
    const newUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await setCustomUserRole(newUid, assignedRole);
    const createdUser = await storage.upsertAdminUser({
      uid: newUid,
      email: email.trim().toLowerCase(),
      displayName: displayName?.trim() || 'Coach',
      role: assignedRole,
      creationTime: new Date().toISOString(),
      lastSignInTime: new Date().toISOString(),
    });

    res.status(201).json({
      message: `User ${email} registered with role ${assignedRole}`,
      user: createdUser,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

// DELETE /api/admin/users/:uid - Remove user from platform registry
router.delete('/users/:uid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUid = String(req.params.uid);

    if (req.user?.uid === targetUid) {
      return res.status(400).json({ error: 'Cannot delete your own active administrator account.' });
    }

    const deleted = await storage.deleteAdminUser(targetUid);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found in registry.' });
    }

    res.json({ message: 'User deleted successfully', uid: targetUid });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

// ================= 2. Club / Platform Settings =================

router.get('/club-settings', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await storage.getClubSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
});

router.put('/club-settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updates = req.body as Partial<ClubSettings>;
    const updated = await storage.updateClubSettings(updates);
    res.json({
      message: 'Settings updated successfully',
      settings: updated,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});

// ================= 3. System Backups & Disaster Recovery =================

// GET /api/admin/backup/export - Download full JSON database backup snapshot
router.get('/backup/export', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backupData = await storage.exportBackup();
    const filename = `subshuffle-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(backupData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export backup', details: err.message });
  }
});

// POST /api/admin/backup/restore - Restore database from JSON backup snapshot
router.post('/backup/restore', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const backupPayload = req.body as BackupData;
    const counts = await storage.restoreBackup(backupPayload);
    res.json({
      message: 'System state successfully restored from backup snapshot',
      restored: counts,
    });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to restore backup snapshot', details: err.message });
  }
});

// GET /api/admin/backup/stats - System health & entity statistics
router.get('/backup/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = await storage.exportBackup();
    const totalMinutes = backup.players.reduce((sum, p) => sum + (p.totalMinutesPlayed || 0), 0);
    res.json({
      exportedAt: backup.exportedAt,
      version: backup.version,
      stats: {
        totalTeams: backup.teams.length,
        totalPlayers: backup.players.length,
        totalFixtures: backup.fixtures.length,
        completedFixtures: backup.fixtures.filter((f) => f.status === 'Completed').length,
        registeredUsers: backup.users?.length || 0,
        totalTrackedMinutes: totalMinutes,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate system stats', details: err.message });
  }
});

export default router;
