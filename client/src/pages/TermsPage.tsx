import React from 'react';
import { Link } from '@tanstack/react-router';

export function TermsPage() {
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
          SubShuffle Terms and Conditions
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Last updated: 10 November 2026 • Effective date: 10 November 2026
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-slate-300">
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">1. Agreement to Terms</h2>
          <p>
            These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;, &quot;Coach&quot;, or &quot;Club&quot;)
            and SubShuffle (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) concerning your access to and use of the SubShuffle website, web applications,
            and native mobile applications (collectively, the &quot;Services&quot;).
          </p>
          <p className="mt-2">
            By registering an account, accessing, or using our Services, you agree that you have read, understood, and agreed to be bound by these Terms.
            If you do not agree, you must immediately discontinue use of the Services.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">2. Coaching Guidance & Physical Safety Disclaimer</h2>
          <p>
            SubShuffle provides mathematical rotation calculation tools, fair-play equalization algorithms, and touchline match clocks designed solely to assist
            grassroots sports coaches in managing matchday substitutions.
          </p>
          <div className="mt-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200">
            <p className="font-semibold text-white">⚠️ Important Safety Responsibility:</p>
            <p className="mt-1 text-xs leading-relaxed">
              SubShuffle is an organizational assistant only. Coaches, club managers, and match officials remain exclusively responsible for all on-pitch
              safety decisions, medical emergency responses, player fitness assessments, pitch inspection, weather condition monitoring, and safeguarding
              compliance. SubShuffle assumes no liability for physical injuries, match decisions, or tournament disputes.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">3. Coach Accounts & Club Sharing</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-white">Account Security:</strong> You are responsible for safeguarding your login credentials (via Google Sign-In or email/password)
              and for all activities that occur under your account.
            </li>
            <li>
              <strong className="text-white">Co-Coaches & Assistants:</strong> When you share team management access with assistant coaches, you represent that they
              are authorized representatives of your club and have agreed to adhere to safe coaching and data confidentiality standards.
            </li>
            <li>
              <strong className="text-white">Child Data Minimization:</strong> You agree not to enter sensitive personal data of child players (such as home addresses,
              medical records, or telephone numbers) into team notes or nickname fields.
            </li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">4. Subscriptions, Billing & Cancellations</h2>
          <p>
            SubShuffle may offer free trial periods, free community tiers, and premium subscription tiers (&quot;Club Pass&quot; or &quot;Coach Pro&quot;).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong className="text-white">Billing:</strong> Paid plans are billed on a recurring monthly or annual basis as disclosed at the time of purchase.
            </li>
            <li>
              <strong className="text-white">VAT Receipts:</strong> Official VAT-compliant receipts are automatically retained for 24 months and accessible under
              Settings &gt; Billing to support reimbursement from your grassroots sports club or charter standard fund.
            </li>
            <li>
              <strong className="text-white">Cancellation:</strong> You may cancel recurring subscriptions at any time via Settings or your app store account. Your access
              will continue through the end of the current paid billing cycle.
            </li>
          </ul>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">5. Intellectual Property & Acceptable Use</h2>
          <p>
            All content, brand assets, user interfaces, algorithmic models, and software code are the exclusive property of SubShuffle. You are granted a limited,
            non-exclusive, revocable license to use the Services for personal, team, or non-commercial grassroots club management.
          </p>
          <p className="mt-2">
            You agree not to reverse-engineer, decompile, scrape, or resell SubShuffle or its algorithms without prior written consent.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">6. Limitation of Liability & Governing Law</h2>
          <p>
            To the maximum extent permitted by applicable law, SubShuffle and its developers shall not be liable for any indirect, incidental, special, or
            consequential damages arising out of your use of or inability to use the Services.
          </p>
          <p className="mt-2">
            These Terms shall be governed by and construed in accordance with the laws of England and Wales, and any disputes shall be subject to the exclusive
            jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-3">7. Contact & Support</h2>
          <p>
            If you have any questions or concerns regarding these Terms, please contact us at:
          </p>
          <div className="mt-3 text-slate-400">
            <p className="font-semibold text-white">SubShuffle Support</p>
            <p>Email: <a href="mailto:support@subshuffle.com" className="text-emerald-400">support@subshuffle.com</a></p>
            <p>Website: <a href="https://subshuffle.com" className="text-emerald-400">https://subshuffle.com</a></p>
          </div>
        </section>
      </div>
    </div>
  );
}

