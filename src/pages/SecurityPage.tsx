import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  FileCheck2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
          <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#ff3b00]">
            System Hardening
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white font-display">
          Security & RBAC
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
          Technical protections implemented to ensure role isolation, data privacy, and safe campus issue management.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {/* Server-Side Auth */}
        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <KeyRound className="w-4 h-4 text-[#ff3b00]" />
            </div>
            <h2 className="font-bold text-base text-black dark:text-white font-display">
              Server-Side Authentication
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Sessions are validated server-side using signed JWTs. Student tokens are scoped to the current browser tab; Resolver and Admin sessions use <code className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[11px] text-[#ff3b00]">httpOnly</code> and <code className="px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 font-mono text-[11px] text-[#ff3b00]">SameSite=Lax</code> cookies.
          </p>
        </div>

        {/* Role Authorization */}
        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <ShieldCheck className="w-4 h-4 text-[#ff3b00]" />
            </div>
            <h2 className="font-bold text-base text-black dark:text-white font-display">
              Role Authorization (RBAC)
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Strict separation between <strong>student</strong> and <strong>resolver</strong> accounts. Students are cryptographically restricted from viewing campus-wide administrative queues or modifying issues submitted by others.
          </p>
        </div>

        {/* Hashed Passwords */}
        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <Lock className="w-4 h-4 text-[#ff3b00]" />
            </div>
            <h2 className="font-bold text-base text-black dark:text-white font-display">
              Bcrypt Password Hashing
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            All user credentials are encrypted with salted <strong>bcrypt</strong> rounds prior to database insertion. Raw plain-text passwords are never logged, transmitted, or stored in system state.
          </p>
        </div>

        {/* Zod Validation */}
        <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black">
              <FileCheck2 className="w-4 h-4 text-[#ff3b00]" />
            </div>
            <h2 className="font-bold text-base text-black dark:text-white font-display">
              Input Validation & Schemas
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Every submission is validated using strict server-side <strong>Zod</strong> schemas. Malformed payloads, unauthorized roles, and invalid statuses are rejected with informative HTTP error codes.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-black/10 dark:border-white/10">
        <Link
          to="/about"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#ff3b00] transition-colors"
        >
          <span>Review System Architecture</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-opacity shadow-md"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
};
