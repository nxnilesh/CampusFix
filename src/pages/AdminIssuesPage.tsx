import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Issue } from '../types';
import {
  Search,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  BarChart3,
  Loader2,
  Trash2,
  Edit3,
  ChevronDown,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  Reported: 'text-blue-600 bg-blue-500/10',
  Acknowledged: 'text-purple-600 bg-purple-500/10',
  'Under Review': 'text-amber-600 bg-amber-500/10',
  'In Progress': 'text-orange-600 bg-orange-500/10',
  Resolved: 'text-emerald-600 bg-emerald-500/10',
  Closed: 'text-slate-600 bg-slate-500/10',
  Rejected: 'text-rose-600 bg-rose-500/10',
};

const priorityColors: Record<string, string> = {
  High: 'text-rose-600',
  Medium: 'text-amber-600',
  Low: 'text-emerald-600',
};

export const AdminIssuesPage: React.FC = () => {
  const { success, error } = useToast();
  const [issues, setIssues] = useState<(Issue & { _count?: { votes: number; comments: number } })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);

  const loadIssues = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '25' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.admin.getIssues(params);
      setIssues(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      error('Failed to load issues.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, search, page]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  const deleteIssue = async (id: string, title: string) => {
    if (!confirm(`Delete issue "${title}"? This cannot be undone.`)) return;
    try {
      await api.admin.deleteIssue(id);
      success('Issue deleted.');
      loadIssues();
    } catch (err: any) {
      error(err.message || 'Failed to delete issue.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 sm:px-10 backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_10px_#ff3b00]" />
          <Link to="/admin-panel" className="text-sm font-extrabold tracking-tight font-display text-black dark:text-white hover:text-[#ff3b00] transition-colors">
            CampusFix Admin
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Issue Management</span>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight font-display">Issue Management</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{total} total issues</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 text-xs text-black dark:text-white focus:outline-none"
              >
                <option value="all">All Statuses</option>
                {['Reported', 'Acknowledged', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 text-xs text-black dark:text-white focus:outline-none"
              >
                <option value="all">All Priorities</option>
                {['High', 'Medium', 'Low'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ID, title, location, student name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff3b00] transition-all"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition-all hover:opacity-80">
              Search
            </button>
          </form>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div key={issue.id} className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-black/30 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{issue.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[issue.status] || ''}`}>
                          {issue.status}
                        </span>
                        <span className={`text-[10px] font-bold ${priorityColors[issue.priority] || ''}`}>
                          {issue.priority}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-black dark:text-white truncate">{issue.title}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>{issue.categoryName || issue.category}</span>
                        <span>{issue.location} · {issue.room}</span>
                        {issue.student && <span>By: {issue.student.name} ({issue.student.userId})</span>}
                        {issue._count && <span>↑ {issue._count.votes} votes · {issue._count.comments} comments</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => deleteIssue(issue.id, issue.title)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete issue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {issues.length === 0 && (
                <div className="text-center py-20 text-slate-400 text-sm">No issues found.</div>
              )}
            </div>
          )}

          {total > 25 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Page {page} of {Math.ceil(total / 25)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Previous
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 25)}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
