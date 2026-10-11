import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AdminDashboardData, ActivityLog } from '../types';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent?: string;
  to?: string;
}

const AdminStatCard: React.FC<StatCardProps> = ({ label, value, icon, accent = '#ff3b00', to }) => {
  const content = (
    <div className="flex flex-col justify-between p-5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${accent}15`, color: accent }}>
          {icon}
        </div>
        {to && <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-black dark:text-white tracking-tight">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );

  if (to) return <Link to={to}>{content}</Link>;
  return content;
};

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    LOGIN: 'User signed in',
    LOGOUT: 'User signed out',
    LOGIN_FAILED: 'Failed login attempt',
    STUDENT_REGISTERED: 'Student registered',
    RESOLVER_APPLICATION_SUBMITTED: 'Resolver application submitted',
    RESOLVER_APPLICATION_RESUBMITTED: 'Resolver application re-submitted',
    RESOLVER_REQUEST_APPROVED: 'Resolver approved',
    RESOLVER_REQUEST_REJECTED: 'Resolver rejected',
    RESOLVER_REQUEST_SUSPENDED: 'Resolver suspended',
    USER_STATUS_CHANGED_ACTIVE: 'Account activated',
    USER_STATUS_CHANGED_SUSPENDED: 'Account suspended',
    USER_STATUS_CHANGED_BLOCKED: 'Account blocked',
    USER_STATUS_CHANGED_DELETED: 'Account deleted',
    USER_PASSWORD_RESET: 'Password reset by admin',
    USER_DELETED: 'User deleted',
    ISSUE_VOTED: 'Issue voted',
    ADMIN_ISSUE_UPDATED: 'Admin updated issue',
    ADMIN_ISSUE_DELETED: 'Admin deleted issue',
  };
  return map[action] || action.replace(/_/g, ' ').toLowerCase();
}

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { error } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getDashboard()
      .then(setData)
      .catch(() => error('Failed to load admin dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      {/* Admin top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 sm:px-10 backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_10px_#ff3b00]" />
          <span className="text-sm font-extrabold tracking-tight font-display text-black dark:text-white">
            CampusFix Admin
          </span>
          <span className="hidden sm:block text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            Control Panel
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 dark:text-zinc-400 hidden sm:block">
            {user?.name} <span className="text-zinc-600 dark:text-zinc-500">({user?.userId})</span>
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex">
        {/* Sidebar */}
        <nav className="hidden lg:flex flex-col w-56 border-r border-black/10 dark:border-white/10 min-h-[calc(100vh-4rem)] p-4 gap-1 bg-white/40 dark:bg-black/40">
          {[
            { label: 'Dashboard', to: '/admin-panel', icon: <BarChart3 className="w-4 h-4" /> },
            { label: 'Students', to: '/admin-panel/students', icon: <Users className="w-4 h-4" /> },
            { label: 'Resolvers', to: '/admin-panel/resolvers', icon: <ShieldCheck className="w-4 h-4" /> },
            { label: 'Applications', to: '/admin-panel/applications', icon: <FileText className="w-4 h-4" /> },
            { label: 'Issues', to: '/admin-panel/issues', icon: <AlertTriangle className="w-4 h-4" /> },
            { label: 'Activity Logs', to: '/admin-panel/logs', icon: <Activity className="w-4 h-4" /> },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-all"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Content area */}
        <main className="flex-1 p-6 sm:p-8 space-y-8">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold tracking-tight font-display">Admin Dashboard</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Platform overview — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <AdminStatCard
                  label="Total Students"
                  value={data.totalStudents}
                  icon={<Users className="w-5 h-5" />}
                  accent="#3b82d4"
                  to="/admin-panel/students"
                />
                <AdminStatCard
                  label="Active Resolvers"
                  value={data.totalResolvers}
                  icon={<ShieldCheck className="w-5 h-5" />}
                  accent="#10b981"
                  to="/admin-panel/resolvers"
                />
                <AdminStatCard
                  label="Pending Applications"
                  value={data.pendingRequests}
                  icon={<Clock className="w-5 h-5" />}
                  accent="#f59e0b"
                  to="/admin-panel/applications"
                />
                <AdminStatCard
                  label="Total Issues"
                  value={data.totalIssues}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accent="#ff3b00"
                  to="/admin-panel/issues"
                />
                <AdminStatCard
                  label="Resolved Issues"
                  value={data.resolvedIssues}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  accent="#10b981"
                />
                <AdminStatCard
                  label="Open Issues"
                  value={data.openIssues}
                  icon={<TrendingUp className="w-5 h-5" />}
                  accent="#8b5cf6"
                />
                <AdminStatCard
                  label="High Priority Open"
                  value={data.highPriorityIssues}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  accent="#ef4444"
                />
              </div>

              {/* Recent Activity */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-black dark:text-white">Recent Activity</h2>
                  <Link to="/admin-panel/logs" className="text-xs text-[#ff3b00] hover:underline">
                    View all logs →
                  </Link>
                </div>
                <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
                  <div className="divide-y divide-black/5 dark:divide-white/5">
                    {data.recentLogs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center gap-3 px-4 py-3 bg-white/60 dark:bg-black/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              log.action.includes('FAILED') || log.action.includes('DELETED') || log.action.includes('BLOCKED') ? '#ef4444'
                              : log.action.includes('APPROV') ? '#10b981'
                              : '#ff3b00',
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-black dark:text-white truncate">
                            {actionLabel(log.action)}
                          </p>
                          {log.user && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                              {log.user.name} ({log.user.userId}) · {log.user.role}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono shrink-0">
                          {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    {data.recentLogs.length === 0 && (
                      <div className="py-10 text-center text-xs text-slate-400">No activity yet</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400 text-sm">Failed to load dashboard data.</div>
          )}
        </main>
      </div>
    </div>
  );
};
