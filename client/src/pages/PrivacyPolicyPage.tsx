import React from 'react';
import { Link } from '@tanstack/react-router';

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-slate-100">
      <div className="mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mb-4"
        >
          ← Back to SubShuffle
        </Link>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          SubShuffle Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Last updated: 10 November 2026 • Effective date: 10 November 2026
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-slate-300">
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">1. Overview & Commitment to Youth Safeguarding</h2>
          <p>
            SubShuffle (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) provides matchday squad management, equal playing time rotation
            tools, and live touchline consoles for grassroots youth sports coaches.
          </p>
          <p className="mt-2">
            We are deeply committed to child safeguarding and digital privacy. SubShuffle complies strictly with the UK General Data
            Protection Regulation (UK GDPR), the Data Protection Act 2018, and Google Play Families & Child Safety Policies. We minimize
            data collection to only what is strictly necessary to calculate fair playing time.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Coach & Account Data:</strong> When you register or sign in via Google or email/password,
              we collect your display name and email address to authenticate your session and sync your team data.
            </li>
            <li>
              <strong className="text-white">Squad & Matchday Data:</strong> Squad player first names (or nicknames), squad numbers,
              preferred positions, attendance availability, and match playing minutes. We <strong className="text-emerald-400">do not</strong> require
              or collect dates of birth, home addresses, phone numbers, or photos of child players.
            </li>
            <li>
              <strong className="text-white">Diagnostics & Telemetry:</strong> Aggregated, anonymous technical diagnostics (e.g., app
              version, crash recovery triggers, network latency) to ensure reliable touchline performance.
            </li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">3. How We Use Information</h2>
          <p>Collected information is used exclusively to:</p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Compute equal playing time rotations and rolling substitutions.</li>
            <li>Sync match schedules and line-ups securely between your devices and assistant coaches you explicitly invite.</li>
            <li>Generate matchday summaries and touchline substitution alerts.</li>
            <li>Prevent abuse, protect account security, and provide technical customer support.</li>
          </ul>
          <p className="mt-3 font-semibold text-white">
            We do NOT sell, rent, or monetize personal data or player rosters. We do NOT serve third-party behavioural advertisements.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">4. Security & Data Storage</h2>
          <p>
            All network communication is encrypted in transit using industry-standard Transport Layer Security (TLS/HTTPS). Data at rest
            is stored on secure Google Cloud and Firebase infrastructure located in compliant UK/EU data centers with strict role-based access
            controls.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">5. Data Retention & Your Rights (Right to Erasure)</h2>
          <p>
            Coaches maintain full control over their data at all times:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>You can edit or delete individual players, fixtures, or teams at any time directly in the app.</li>
            <li>
              To permanently delete your coach account and all associated squad history, you can submit an in-app request via the
              <strong> Help &amp; Feedback</strong> menu or email us directly at <a href="mailto:privacy@subshuffle.com" className="text-emerald-400 underline">privacy@subshuffle.com</a>.
              Your data will be permanently purged within 30 days.
            </li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or SubShuffle&apos;s data practices, please contact our Data Protection lead at:
          </p>
          <div className="mt-3 text-slate-400">
            <p className="font-semibold text-white">SubShuffle Support &amp; Privacy</p>
            <p>Email: <a href="mailto:privacy@subshuffle.com" className="text-emerald-400">privacy@subshuffle.com</a></p>
            <p>Website: <a href="https://subshuffle.com" className="text-emerald-400">https://subshuffle.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}

