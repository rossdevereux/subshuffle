import React, { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Trash2, ShieldCheck, Mail, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useMatchday } from '../context/MatchdayContext';
import { useToast } from '../context/ToastContext';

export function DeleteAccountPage() {
  const { currentUser, deleteAccount, enterDemoMode } = useMatchday();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [confirmText, setConfirmText] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const canDelete = acknowledged && confirmText.trim().toUpperCase() === 'DELETE' && !isDeleting;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canDelete || !currentUser) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();
      setIsSuccess(true);
      showToast('Your account and all associated squad data have been permanently deleted.', 'info');
    } catch (err: any) {
      console.error('Account deletion error:', err);
      setDeleteError(err?.message || 'Failed to delete account. Please try again or contact privacy@subshuffle.com');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-slate-100">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to SubShuffle</span>
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-rose-500 shrink-0" />
          <span>Delete Account &amp; Personal Data</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Self-service account deletion and GDPR Right to Erasure for coaches and teams.
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed text-slate-300">
        {/* Success View */}
        {isSuccess ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Account Successfully Deleted</h2>
            <p className="text-slate-300 max-w-lg mx-auto">
              Your coach account, login credentials, teams, players, and match records have been permanently erased from SubShuffle servers.
            </p>
            <div className="pt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Overview Section */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Our Commitment to Your Privacy &amp; Data Control</span>
              </h2>
              <p>
                Under the UK / EU General Data Protection Regulation (GDPR) and Google Play Store policies, you have the absolute right to have your personal data permanently erased. We believe coaches should always remain in complete control of their and their squad&apos;s data.
              </p>
            </section>

            {/* What is erased vs retained */}
            <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-base font-bold text-white">What data will be permanently erased?</h2>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                <li><strong className="text-white">Coach Account:</strong> Your email address, profile name, and authentication tokens.</li>
                <li><strong className="text-white">Teams &amp; Settings:</strong> All teams you created, match duration rules, and custom formations.</li>
                <li><strong className="text-white">Squad &amp; Players:</strong> All player names, squad numbers, preferred positions, goalkeeper flags, and attendance.</li>
                <li><strong className="text-white">Match History:</strong> All fixtures, period lineups, minute-by-minute substitutions, and live match records.</li>
                <li><strong className="text-white">Team Sharing:</strong> Assistant coaches will lose access to your squads, and your shared invites are revoked.</li>
                <li><strong className="text-white">Subscriptions:</strong> Any recurring Pro subscriptions are terminated immediately.</li>
              </ul>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-start gap-2.5 mt-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>
                  <strong>Warning:</strong> Account deletion is immediate, permanent, and completely irreversible. Once deleted, your squads and match archives cannot be recovered.
                </span>
              </div>
            </section>

            {/* Interactive Deletion Console */}
            {currentUser ? (
              <section className="bg-slate-900/80 border border-rose-900/50 rounded-2xl p-6 space-y-5">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-400" />
                    <span>Confirm Account Deletion</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    You are currently signed in as <strong className="text-white font-mono">{currentUser.email || currentUser.displayName || currentUser.uid}</strong>.
                  </p>
                </div>

                {deleteError && (
                  <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-200">
                    {deleteError}
                  </div>
                )}

                <form onSubmit={handleDelete} className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-300 leading-normal">
                      I understand that this action is irreversible and will permanently delete my coach account, all teams, players, and match records.
                    </span>
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      To confirm, type <span className="font-mono text-rose-400 font-bold">DELETE</span> below:
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="w-full max-w-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={!canDelete}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-semibold text-xs shadow-lg shadow-rose-900/30 transition cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Permanently Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Permanently Delete My Account &amp; All Data</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate({ to: '/' })}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </section>
            ) : (
              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-white">How to Delete Your Account</h2>
                <p>
                  To delete your account via self-service, please sign in first so we can verify your ownership of the coach profile and squad data.
                </p>
                <div className="pt-1 flex flex-wrap gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition"
                  >
                    Sign In to Delete Account
                  </Link>
                </div>

                <div className="pt-4 border-t border-slate-800 mt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-sky-400" />
                    <span>Unable to sign in or lost access?</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    If you have lost access to your login credentials or prefer manual processing, you can submit an account erasure request by emailing our Data Protection team directly at{' '}
                    <a href="mailto:privacy@subshuffle.com?subject=Account%20Deletion%20Request" className="text-emerald-400 hover:underline font-medium">
                      privacy@subshuffle.com
                    </a>{' '}
                    from the email address associated with your account. We will verify and process your erasure request within 48 hours.
                  </p>
                </div>
              </section>
            )}

            {/* Retention Policy Note */}
            <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-1.5">
              <h3 className="font-semibold text-slate-300">Data Retention &amp; Financial Compliance</h3>
              <p>
                Upon executing account deletion, all operational squad, match, and child player data is purged immediately. Where required by law (e.g. VAT / HMRC statutory bookkeeping for processed payment receipts), anonymized financial ledger transaction identifiers may be retained in accordance with statutory accounting retention periods before automatic expiration.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
