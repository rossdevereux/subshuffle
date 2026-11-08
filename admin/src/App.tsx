import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from './firebase';
import {
  verifySuperAdminAccess,
  fetchPlatformUsers,
  updatePlatformUserSubscription,
  deletePlatformUser,
  exportPlatformBackup,
  restorePlatformBackup,
  PlatformAdminUser,
  PlatformOverviewResponse,
  SubscriptionStatus,
} from './adminApi';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Sparkles,
  Database,
  RefreshCw,
  LogOut,
  Search,
  Trash2,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export const App: React.FC = () => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [devSignedIn, setDevSignedIn] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('subshuffle_superadmin_dev_email'));
  });
  const [overview, setOverview] = useState<PlatformOverviewResponse | null>(null);
  const [users, setUsers] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [firewallError, setFirewallError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'users' | 'backup'>('users');
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadConsoleData = useCallback(async () => {
    setLoading(true);
    setFirewallError(null);
    try {
      const [meData, userList] = await Promise.all([
        verifySuperAdminAccess(),
        fetchPlatformUsers(),
      ]);
      setOverview(meData);
      setUsers(userList);
    } catch (err: any) {
      setFirewallError(err.message || 'Access denied by Platform Super-Admin Firewall');
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user || devSignedIn) {
        loadConsoleData();
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [devSignedIn, loadConsoleData]);

  const handleGoogleSignIn = async () => {
    setFirewallError(null);
    if (!isFirebaseConfigured) {
      localStorage.setItem('subshuffle_superadmin_dev_email', 'admin@therovers.local');
      setDevSignedIn(true);
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setFirewallError(err.message || 'Authentication failed');
    }
  };

  const handleSignOut = async () => {
    localStorage.removeItem('subshuffle_superadmin_dev_email');
    setDevSignedIn(false);
    setOverview(null);
    setUsers([]);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  const handleUpdateSubscription = async (uid: string, status: SubscriptionStatus) => {
    setBusyUid(uid);
    try {
      const tier = status === 'lifetime' ? 'free_for_life' : 'coach_monthly';
      await updatePlatformUserSubscription(uid, status, tier);
      showNotice(
        'success',
        status === 'lifetime'
          ? 'Granted Free for Life (Lifetime Pro) entitlement.'
          : `Updated subscription status to ${status}.`
      );
      await loadConsoleData();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to update subscription');
    } finally {
      setBusyUid(null);
    }
  };

  const handleDeleteUser = async (user: PlatformAdminUser) => {
    if (!window.confirm(`Permanently remove user ${user.email} (${user.uid}) from the platform registry?`)) {
      return;
    }
    setBusyUid(user.uid);
    try {
      await deletePlatformUser(user.uid);
      showNotice('success', `Removed ${user.email} from platform registry.`);
      await loadConsoleData();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to delete user');
    } finally {
      setBusyUid(null);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportPlatformBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subshuffle-platform-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('success', 'Downloaded full platform JSON snapshot.');
    } catch (err: any) {
      showNotice('error', err.message || 'Export failed');
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await restorePlatformBackup(parsed);
      showNotice('success', 'Platform database restored from backup snapshot.');
      await loadConsoleData();
    } catch (err: any) {
      showNotice('error', err.message || 'Failed to restore backup');
    } finally {
      e.target.value = '';
    }
  };

  const isAuthenticated = Boolean(firebaseUser || devSignedIn);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 p-8 shadow-2xl text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/20">
              Single-Owner Firewalled Console
            </span>
            <h1 className="text-2xl font-black text-white">SubShuffle Platform Admin</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This console is strictly isolated from the coach application and firewalled to the verified Platform Super-Administrator account (`SUPER_ADMIN_UID` / `SUPER_ADMIN_EMAIL`).
            </p>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer shadow-lg shadow-amber-500/20"
          >
            {isFirebaseConfigured ? 'Sign in with Platform Owner Google Account' : 'Sign in (Local Super-Admin Session)'}
          </button>
        </div>
      </main>
    );
  }

  if (firewallError) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-rose-500/40 p-8 shadow-2xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white">403 — Platform Firewall Restricted</h1>
          <p className="text-xs text-slate-300 leading-relaxed">{firewallError}</p>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      u.email?.toLowerCase().includes(q) ||
      u.displayName?.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight text-white">SubShuffle Platform Admin</span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Super-Admin Verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {overview?.admin.email || firebaseUser?.email || 'admin@therovers.local'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadConsoleData}
              disabled={loading}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/25 flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {toast && (
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        )}

        {/* KPI Cards */}
        {overview && (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Registered Users</div>
              <div className="text-2xl font-black text-white mt-1 tabular-nums">{overview.kpis.totalUsers}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Active Paid Subs</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 tabular-nums">
                {overview.kpis.activePaidSubscriptions}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Free for Life</div>
              <div className="text-2xl font-black text-amber-400 mt-1 tabular-nums">
                {overview.kpis.lifetimeSubscriptions}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">30-Day Trial</div>
              <div className="text-2xl font-black text-sky-400 mt-1 tabular-nums">{overview.kpis.trialingUsers}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Total Teams</div>
              <div className="text-2xl font-black text-indigo-400 mt-1 tabular-nums">{overview.kpis.totalTeams}</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="text-[11px] text-slate-400 font-medium">Players / Fixtures</div>
              <div className="text-2xl font-black text-slate-200 mt-1 tabular-nums">
                {overview.kpis.totalPlayers} / {overview.kpis.totalFixtures}
              </div>
            </div>
          </section>
        )}

        {/* Section Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
          <button
            type="button"
            onClick={() => setActiveSection('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeSection === 'users'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Global Users & Subscriptions ({users.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('backup')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              activeSection === 'backup'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>System Backup & Recovery</span>
          </button>
        </div>

        {activeSection === 'users' ? (
          <section className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Platform Accounts & Entitlements</h2>
                <p className="text-xs text-slate-400">
                  Grant Free for Life (`lifetime`), manage coach subscriptions, or inspect team ownership across the entire site.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search email, name, or UID…"
                  aria-label="Search platform users"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/50">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Teams Owned</th>
                    <th className="py-3 px-4">Subscription</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {filteredUsers.map((u) => {
                    const subStatus = u.subscription?.status || 'trialing';
                    const isLifetime = subStatus === 'lifetime' || u.subscription?.tier === 'free_for_life';
                    return (
                      <tr key={u.uid} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{u.displayName || 'Coach'}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          <div className="text-slate-500 font-mono text-[10px]">UID: {u.uid}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.ownedTeams && u.ownedTeams.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {u.ownedTeams.map((t) => (
                                <span
                                  key={t.id}
                                  className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px]"
                                >
                                  {t.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-500">0 teams</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isLifetime
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : subStatus === 'active'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : subStatus === 'trialing'
                                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isLifetime && <Sparkles className="w-3 h-3" />}
                            <span>{isLifetime ? 'FREE FOR LIFE' : subStatus.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                            {!isLifetime ? (
                              <button
                                type="button"
                                disabled={busyUid === u.uid}
                                onClick={() => handleUpdateSubscription(u.uid, 'lifetime')}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold text-[11px] transition cursor-pointer"
                              >
                                Grant Free for Life
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busyUid === u.uid}
                                onClick={() => handleUpdateSubscription(u.uid, 'trialing')}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-[11px] transition cursor-pointer"
                              >
                                Reset to Trial
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={busyUid === u.uid}
                              onClick={() => handleDeleteUser(u)}
                              aria-label={`Delete user ${u.email}`}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-xl">
            <h2 className="text-base font-bold text-white">Platform Database Snapshots</h2>
            <p className="text-xs text-slate-400">
              Export a complete JSON snapshot of all platform users, teams, players, and fixtures, or restore from an existing backup file.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Full JSON Backup</span>
              </button>
              <label className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Restore from JSON Backup…</span>
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

