import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  subtext?: string;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'danger';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  subtext,
}) => {
  return (
    <div
      className="p-5 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 shadow-sm hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
          {label}
        </span>
        <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 text-slate-700 dark:text-zinc-300 group-hover:scale-105 transition-transform">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black dark:text-white font-display">
          {value}
        </span>
      </div>
      {subtext && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3b00]" />
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
};
