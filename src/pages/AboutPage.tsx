import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Shield,
  Layers,
  FileCode,
  Users,
  Database,
  ArrowRight,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-12 py-16 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
          <span className="text-xs uppercase font-mono font-bold tracking-widest text-[#ff3b00]">
            System Specifications
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black dark:text-white font-display">
          About CampusFix
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
          A high-velocity full-stack campus issue reporting and resolution platform engineered for institutional transparency.
        </p>
      </div>

      {/* Purpose & Motivation */}
      <section className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-xl mb-10 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff3b00]" />
          <h2 className="text-xl sm:text-2xl font-bold text-black dark:text-white font-display">
            The Problem & Core Motivation
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
          On modern university and college campuses, physical infrastructure breakdowns—such as exposed electrical wiring, malfunctioning laboratory projectors, air conditioning failures, or damaged benches—frequently go unresolved for days or weeks. Traditional complaint mechanisms rely on fragmented verbal requests or informal messaging groups where reports lack tracking IDs, photographic evidence, or accountability.
        </p>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
          <strong className="text-black dark:text-white">CampusFix</strong> replaces this broken process with a unified, transparent two-tier system: students quickly report problems with photo uploads and track their status in real-time; campus resolvers triage, assign staff, document repairs with mandatory resolution notes, and generate campus-wide infrastructure analytics.
        </p>
      </section>

      {/* Architecture Breakdown (Viva-Friendly) */}
      <section className="p-8 sm:p-10 rounded-3xl bg-white border border-black/10 shadow-xl mb-10 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff3b00]">
              Evaluation Guide
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900">
            Technical Architecture (Viva Talking Points)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-mono">
              <Database className="w-4 h-4 text-[#ff3b00]" />
              <span>Database Layer (Prisma & PostgreSQL / Neon)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Relational schema hosted on PostgreSQL via Neon, managed through Prisma ORM with connection pooling and direct migration URLs. Enforces referential integrity across Users, Issues, IssueStatusHistory, Notifications, and UserSettings.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-mono">
              <Shield className="w-4 h-4 text-[#ff3b00]" />
              <span>Role-Based Authentication (RBAC)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Role-based authentication uses signed JWT tokens and salted bcrypt password hashing. Student sessions are limited to the current browser tab, while Resolver and Admin sessions use secure httpOnly cookies. Access is enforced across server endpoints.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-mono">
              <Layers className="w-4 h-4 text-[#ff3b00]" />
              <span>Frontend Architecture (React + Tailwind)</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              React with Vite, Tailwind CSS, responsive layouts, and dedicated React Context providers (Auth, Theme, and Toast notifications). Modular component architecture with clean client-side routing.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#ff3b00]" />
              <span>Issue Lifecycle & Audit Engine</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Comprehensive issue lifecycle (Reported → Acknowledged → Under Review → In Progress → Resolved, plus Closed/Rejected) backed by chronological IssueStatusHistory audit logs and student notification alerts.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <Link
          to="/security"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-[#ff3b00] transition-colors"
        >
          <span>View Security & RBAC Specifications</span>
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
