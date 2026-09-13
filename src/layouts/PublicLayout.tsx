import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white transition-colors selection:bg-[#ff3b00] selection:text-white">
      {/* Editorial Kinetic Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Editorial Minimalist Kinetic Footer */}
      <footer className="border-t border-black/10 dark:border-white/10 bg-[#ececee] dark:bg-[#0a0a0c] py-14 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight font-display text-black dark:text-white">
                CampusFix
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00]" />
              <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">
                Kinetic Infrastructure Platform
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              Instant campus issue reporting, live resolver triage, and verifiable facilities accountability.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Link to="/about" className="hover:text-[#ff3b00] transition-colors">
              About Platform
            </Link>
            <Link to="/security" className="hover:text-[#ff3b00] transition-colors">
              Security & RBAC
            </Link>
            <Link to="/student/login" className="hover:text-[#ff3b00] transition-colors">
              Student Sign-in
            </Link>
            <Link to="/resolver/login" className="hover:text-[#ff3b00] transition-colors">
              Resolver Administration
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <span>© 2026 CampusFix Technologies. Built for Academic Institution Excellence.</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono uppercase tracking-wider">Campus Grid Live</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
