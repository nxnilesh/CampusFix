import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white transition-colors">
      {/* =========================================================================
          HERO SECTION (Matching user reference layout precisely)
          ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 sm:pt-14 pb-20 sm:pb-32">
        {/* Top Split: Left Headline & Action + Right Floating Glass Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-20">
          {/* Left Column: Asymmetric Big Display Headline */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-1">
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-black dark:text-white leading-[0.9] font-display">
                Redefine
              </h1>
              <h2 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold tracking-tighter text-slate-400 dark:text-zinc-600 leading-[0.9] font-display">
                campus living
              </h2>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-md leading-relaxed font-normal">
              Our kinetic campus infrastructure platform shapes institutional facilities with rapid triage,
              photo verification, and high-velocity resolution.
            </p>

            {/* Pill Action Button with 3D Glowing Magma Capsule (Matches Reference) */}
            <div className="pt-2 flex items-center gap-4">
              <Link
                to="/student/report"
                className="group inline-flex items-center gap-3.5 px-3 py-2 rounded-full bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 shadow-lg hover:shadow-xl transition-all"
              >
                {/* Embedded Glowing Magma 3D Capsule */}
                <div className="glowing-pill w-12 h-6 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>
                <span className="text-xs sm:text-sm font-bold tracking-tight text-black dark:text-white pr-4">
                  Begin now
                </span>
              </Link>

              <Link
                to="/student/track"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <span>Track issue ID</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column: Floating Glassmorphism Preview Card (Matches Reference Top-Right Card) */}
          <div className="lg:col-span-5 flex justify-end">
            <div className="w-full max-w-xs p-4 rounded-3xl bg-black/85 text-white border border-white/15 backdrop-blur-xl shadow-2xl space-y-3 transform hover:-translate-y-1 transition-transform">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="px-2.5 py-0.5 rounded-full border border-white/20 bg-white/5">
                  Case 74
                </span>
                <span className="text-[#ff3b00] font-bold">LIVE DISPATCH</span>
              </div>

              {/* Speed Light-Streak Visual Thumbnail */}
              <div className="relative h-24 w-full rounded-2xl overflow-hidden bg-zinc-950 border border-white/10">
                <div className="absolute inset-0 bg-gradient-to-r from-[#d61800]/80 via-[#ff5500]/60 to-transparent blur-md transform -skew-x-12" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#ff8800] to-white opacity-80 blur-[1px]" />
                </div>
                <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-white">
                    Lab CSE-204
                  </span>
                </div>
              </div>

              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00]" />
                  <span>Rapid triage service</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  Modern, automated & verified facilities response.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Hero Motion Aura & Speed Trail (Center of Hero) */}
        <div className="relative -mt-16 sm:-mt-24 pointer-events-none z-10 flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-64 sm:h-80 flex items-center justify-center overflow-hidden">
            {/* Long exposure fiery speed streak gradient */}
            <div className="absolute w-3/4 h-28 bg-gradient-to-r from-transparent via-[#ff3b00] to-transparent opacity-40 blur-3xl transform -rotate-3" />
            <div className="absolute w-2/3 h-12 bg-gradient-to-r from-[#ff0000] via-[#ff6600] to-[#ffaa00] opacity-60 blur-xl transform rotate-1" />
            <div className="absolute w-1/2 h-1.5 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 blur-[0.5px]" />
            
            {/* Central kinetic silhouette representation */}
            <div className="relative z-10 flex flex-col items-center opacity-85 mix-blend-multiply dark:mix-blend-screen">
              <div className="w-24 sm:w-32 h-36 sm:h-44 bg-gradient-to-b from-zinc-800 to-black dark:from-zinc-300 dark:to-white rounded-full blur-[1px] transform scale-y-110 opacity-70" />
            </div>
          </div>
        </div>

        {/* GIANT KINETIC WATERMARK (Matches "kinetic" typography across bottom of hero in reference) */}
        <div className="relative -mt-24 sm:-mt-36 text-center select-none pointer-events-none z-0">
          <span className="kinetic-watermark">
            campusfix
          </span>
        </div>
      </section>

      {/* =========================================================================
          EDITORIAL STATEMENT SECTION (Matches "About studio" block with inline pills)
          ========================================================================= */}
      <section className="relative w-full max-w-5xl mx-auto px-6 sm:px-12 py-12 sm:py-20 text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span className="text-[#ff3b00] font-bold text-base">✦</span>
          <span className="text-xs uppercase font-bold tracking-widest text-[#ff3b00] font-mono">
            About platform
          </span>
        </div>

        {/* Statement with INLINE GLOWING 3D CAPSULES (Directly matching reference) */}
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-black dark:text-white leading-snug sm:leading-tight max-w-4xl mx-auto font-display">
          CampusFix — is an institutional platform of bold{' '}
          <span className="glowing-pill w-14 sm:w-18 h-6 sm:h-7 mx-1 inline-flex align-middle">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>{' '}
          resolvers that delivers the power of instant response with{' '}
          <span className="glowing-pill w-14 sm:w-18 h-6 sm:h-7 mx-1 inline-flex align-middle">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          </span>{' '}
          cutting-edge velocity
        </h2>

        <p className="mt-6 text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
          The unified campus operations pipeline connecting student reports through speed-verified triage,
          transparent status logs, and verified facilities resolution.
        </p>
      </section>

      {/* =========================================================================
          STAGGERED ASYMMETRIC BENTO CARDS (Matches 4 cards in user reference)
          ========================================================================= */}
      <section className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 py-12 sm:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {/* Card 1: Pitch Black, Strategy */}
          <Link
            to="/student/report"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-black text-white border border-white/10 shadow-xl hover:shadow-2xl transition-all h-[360px] sm:h-[400px]"
          >
            <div>
              <div className="inline-block px-3 py-1 rounded-full border border-white/20 text-[11px] font-mono text-zinc-300">
                Strategy
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Direct Intake
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight font-display group-hover:text-[#ff3b00] transition-colors">
                Bold strategies that shape safety
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                We craft rapid intake concepts that define campus trust and eliminate friction for students.
              </p>
            </div>
          </Link>

          {/* Card 2: Fiery Orange Speed-Streak Blur (Staggered Downward) */}
          <Link
            to="/resolver/dashboard"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-zinc-950 text-white border border-[#ff3b00]/30 shadow-xl hover:shadow-2xl transition-all h-[360px] sm:h-[400px] lg:mt-8 overflow-hidden"
          >
            {/* Fiery Light Streaks Background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#990000] via-[#ff3b00]/70 to-transparent opacity-85 blur-sm group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ff8800] rounded-full blur-2xl opacity-40" />

            <div className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full border border-white/30 text-[11px] font-mono text-white bg-black/30 backdrop-blur-md">
                Growth
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-orange-200">
                  Facilities Velocity
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight font-display">
                Driving measurable growth through impact
              </h3>
              <p className="text-xs text-orange-100/80 leading-relaxed">
                Focused on reach, turnaround speed, and real campus resolutions — not empty noise.
              </p>
            </div>
          </Link>

          {/* Card 3: Dark Metallic Chrome Motion Blur (Slight offset) */}
          <Link
            to="/student/track"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border border-white/10 shadow-xl hover:shadow-2xl transition-all h-[360px] sm:h-[400px] lg:mt-4 overflow-hidden"
          >
            {/* Speed streak blur effect */}
            <div className="absolute -bottom-10 inset-x-0 h-48 bg-gradient-to-t from-[#ff2200]/40 via-transparent to-transparent blur-xl" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-white/5 to-transparent" />

            <div className="relative z-10">
              <div className="inline-block px-3 py-1 rounded-full border border-white/20 text-[11px] font-mono text-zinc-300 bg-black/40">
                Creative
              </div>
            </div>

            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Timeline Tracking
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-tight font-display group-hover:text-[#ff3b00] transition-colors">
                Creative processes with rapid delivery
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Tickets turn into verified solutions fast, without compromising institutional safety or oversight.
              </p>
            </div>
          </Link>

          {/* Card 4: Light Silver / Off-White (Offset downward) */}
          <Link
            to="/resolver/analytics"
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-3xl bg-[#dedee2] dark:bg-zinc-900 text-black dark:text-white border border-black/10 dark:border-white/10 shadow-xl hover:shadow-2xl transition-all h-[360px] sm:h-[400px] lg:mt-12"
          >
            <div>
              <div className="inline-block px-3 py-1 rounded-full border border-black/20 dark:border-white/20 text-[11px] font-mono text-slate-700 dark:text-zinc-300">
                Powerful
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Resolver Network
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white leading-tight font-display group-hover:text-[#ff3b00] transition-colors">
                A dedicated team behind success
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Our facilities staff guide every report step, from initial triage to verified completion.
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* =========================================================================
          SECOND BIG DISPLAY STATEMENT (Matches bottom text in user reference)
          ========================================================================= */}
      <section className="relative w-full max-w-5xl mx-auto px-6 sm:px-12 py-16 sm:py-24 text-center">
        {/* Modernist orange geometric icon */}
        <div className="flex justify-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-[#ff3b00] flex items-center justify-center text-white shadow-[0_0_16px_#ff3b00]">
            <span className="font-mono text-xs font-black">CF</span>
          </div>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-black dark:text-white leading-tight max-w-4xl mx-auto font-display">
          We create striking concepts and branding that help your campus thrive
        </h2>

        <p className="mt-6 text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-400 dark:text-zinc-600 font-display">
          delivering rapid solutions every single day.
        </p>

        {/* Interactive Portals Navigation Pill Deck */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/student/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-bold text-xs hover:opacity-90 transition-all shadow-md"
          >
            <span>Enter Student Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <Link
            to="/resolver/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white text-black dark:text-white font-bold text-xs transition-all"
          >
            <span>Resolver Administration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>


    </div>
  );
};
