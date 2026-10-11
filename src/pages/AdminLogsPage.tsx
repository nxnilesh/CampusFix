import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ActivityLog, LoginActivityItem } from '../types';
import {
  Activity,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileText,
  BarChart3,
  Loader2,
} from 'lucide-react';

const actionColors: Record<string, string> = {
  LOGIN: 'bg-blue-500',
  LOGOUT: 'bg-slate-400',
  LOGIN_FAILED: 'bg-rose-500',
  STUDENT_REGISTERED: 'bg-emerald-500',
  RESOLVER_APPLICATION_SUBMITTED: 'bg-amber-500',
  RESOLVER_APPLICATION_RESUBMITTED: 'bg-amber-400',
  USER_STATUS_CHANGED_SUSPENDED: 'bg-amber-600',
  USER_STATUS_CHANGED_BLOCKED: 'bg-rose-600',
  USER_STATUS_CHANGED_ACTIVE: 'bg-emerald-600',
  USER_DELETED: 'bg-rose-700',
  USER_PASSWORD_RESET: 'bg-purple-500',
  ADMIN_ISSUE_DELETED: 'bg-rose-500',
  ADMIN_ISSUE_UPDATED: 'bg-blue-400',
  ISSUE_VOTED: 'bg-sky-400',
};

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export const AdminLogsPage: React.FC = () => {
  const { error } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loginActivity, setLoginActivity] = useState<LoginActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const [res, recentLogins] = await Promise.all([
        api.admin.getActivityLogs({ page: String(page), limit: '50' }),
        api.admin.getLoginActivity({ limit: '10' }),
      ]);
      setLogs(res.data || []);
      setTotal(res.pagination?.total || 0);
      setLoginActivity(recentLogins || []);
    } catch {
      error('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  return (
    <div className="min-h-screen bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 sm:px-10 backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_10px_#ff3b00]" />
          <Link to="/admin-panel" className="text-sm font-extrabold tracking-tight font-display text-black dark:text-white hover:text-[#ff3b00] transition-colors">
            CampusFix Admin
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Activity Logs</span>
        </div>
      </header>

      <div className="flex">
        <nav className="hidden lg:flex flex-col w-56 border-r border-black/10 dark:border-white/10 min-h-[calc(100vh-4rem)] p-4 gap-1 bg-white/40 dark:bg-black/40">
          {[
            { label: 'Dashboard', to: '/admin-panel', icon: <BarChart3 className="w-4 h-4" /> },
            { label: 'Students', to: '/admin-panel/students', icon: <Users className="w-4 h-4" /> },
            { label: 'Resolvers', to: '/admin-panel/resolvers', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Applications', to: '/admin-panel/applications', icon: <FileText className="w-4 h-4" /> },
            { label: 'Issues', to: '/admin-panel/issues', icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Activity Logs', to: '/admin-panel/logs', icon: <Activity className="w-4 h-4" /> },
          ].map((item) => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-all"
            >
              {item.icon}{item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight font-display">Activity Logs</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{total} total events</p>
          </div>

          <section className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 bg-white/60 dark:bg-black/30 border-b border-black/5 dark:border-white/5">
              <h2 className="text-xs font-bold">Recent Login Activity</h2>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {loginActivity.map((entry) => {
                let deviceType = 'Unknown device';
                let userAgent = '';
                try {
                  const details = entry.details ? JSON.parse(entry.details) : {};
                  deviceType = details.device?.type || deviceType;
                  userAgent = details.device?.userAgent || '';
                } catch {
                  // Older login records may not have structured device data.
                }
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 bg-white/60 dark:bg-black/30">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-black dark:text-white">
                        {entry.user?.name || 'Unknown user'} ({entry.user?.userId || '—'}) · {entry.user?.role || '—'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {deviceType}{userAgent ? ` · ${userAgent}` : ''}
                      </p>
                      {entry.ipAddress && (
                        <p className="text-[10px] text-slate-400 font-mono">IP: {entry.ipAddress}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                );
              })}
              {loginActivity.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-slate-400">No recent logins.</div>
              )}
            </div>
          </section>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
            </div>
          ) : (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
              <div className="divide-y divide-black/5 dark:divide-white/5">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 bg-white/60 dark:bg-black/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${actionColors[log.action] || 'bg-slate-400'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-black dark:text-white">
                        {formatAction(log.action)}
                      </p>
                      {log.user && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {log.user.name} ({log.user.userId}) · {log.user.role}
                        </p>
                      )}
                      {log.entityId && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          Entity: {log.entityType} {log.entityId}
                        </p>
                      )}
                      {log.ipAddress && (
                        <p className="text-[10px] text-slate-400 font-mono">IP: {log.ipAddress}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.createdAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="py-16 text-center text-slate-400 text-sm">No activity logs yet.</div>
                )}
              </div>
            </div>
          )}

          {total > 50 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Page {page} of {Math.ceil(total / 50)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5"
                >Previous</button>
                <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 50)}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5"
                >Next</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
