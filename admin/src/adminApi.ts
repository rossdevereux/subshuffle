import { getAdminAuthToken } from './firebase';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'lifetime';

export type SubscriptionTier = 'free_trial' | 'coach_monthly' | 'coach_annual' | 'free_for_life';
export type UserRole = 'owner' | 'coach' | 'viewer';

export interface PlatformAdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  creationTime?: string;
  lastSignInTime?: string;
  ownedTeamsCount?: number;
  ownedTeams?: { id: string; name: string; ageGroup?: string }[];
  subscription?: {
    status: SubscriptionStatus;
    tier: SubscriptionTier;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
  };
}

export interface PlatformOverviewResponse {
  admin: {
    uid: string;
    email: string;
    name?: string;
    superAdmin: boolean;
  };
  kpis: {
    totalUsers: number;
    activePaidSubscriptions: number;
    lifetimeSubscriptions: number;
    trialingUsers: number;
    totalTeams: number;
    totalPlayers: number;
    totalFixtures: number;
    completedFixtures: number;
  };
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function buildHeaders(devOverrideEmail?: string): Promise<Record<string, string>> {
  const token = await getAdminAuthToken();
  if (token) {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  const savedDevEmail =
    devOverrideEmail || localStorage.getItem('subshuffle_superadmin_dev_email') || '';

  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer mock-owner-token',
    'x-user-id': 'super-admin-uid',
    'x-user-email': savedDevEmail || 'admin@therovers.local',
    'x-user-role': 'owner',
  };
}

export async function verifySuperAdminAccess(
  devOverrideEmail?: string
): Promise<PlatformOverviewResponse> {
  const headers = await buildHeaders(devOverrideEmail);
  const res = await fetch(`${API_BASE}/api/admin/me`, { headers });
  if (res.status === 401 || res.status === 403) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Forbidden: Restricted to Platform Super-Administrator');
  }
  if (!res.ok) {
    throw new Error('Failed to verify platform admin status');
  }
  return res.json();
}

export async function fetchPlatformUsers(): Promise<PlatformAdminUser[]> {
  const headers = await buildHeaders();
  const res = await fetch(`${API_BASE}/api/admin/users`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch platform users');
  }
  const data = await res.json();
  return data.users || [];
}

export async function updatePlatformUserSubscription(
  uid: string,
  status: SubscriptionStatus,
  tier?: SubscriptionTier
): Promise<void> {
  const headers = await buildHeaders();
  const res = await fetch(`${API_BASE}/api/admin/users/${uid}/subscription`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status, tier }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update subscription');
  }
}

export async function deletePlatformUser(uid: string): Promise<void> {
  const headers = await buildHeaders();
  const res = await fetch(`${API_BASE}/api/admin/users/${uid}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete user');
  }
}

export async function exportPlatformBackup(): Promise<any> {
  const headers = await buildHeaders();
  const res = await fetch(`${API_BASE}/api/admin/backup/export`, { headers });
  if (!res.ok) throw new Error('Failed to export backup');
  return res.json();
}

export async function restorePlatformBackup(backupData: any): Promise<any> {
  const headers = await buildHeaders();
  const res = await fetch(`${API_BASE}/api/admin/backup/restore`, {
    method: 'POST',
    headers,
    body: JSON.stringify(backupData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Restore failed');
  }
  return res.json();
}

