import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { EmptyState } from '../components/common/EmptyState';
import {
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  MapPin,
  Calendar,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

export const StudentIssuesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority' | 'updated'>('newest');

  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/student/login', { replace: true });
      return;
    }

    const fetchIssues = async () => {
      try {
        setLoading(true);
        const res = await api.getMyIssues();
        setIssues(res.issues || []);
      } catch (err: any) {
        if (err?.status === 401) {
          navigate('/student/login', { replace: true });
        } else {
          console.error('Failed to load student issues:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, [authLoading, user, navigate]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => set.add(i.category));
    return Array.from(set);
  }, [issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchId = item.id.toLowerCase().includes(q);
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchLoc = item.location.toLowerCase().includes(q);
        const matchRoom = item.room?.toLowerCase().includes(q);
        if (!matchId && !matchTitle && !matchLoc && !matchRoom) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

      // Category
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;

      // Priority
      if (priorityFilter !== 'ALL' && item.priority !== priorityFilter) return false;

      return true;
    });
  }, [issues, search, statusFilter, categoryFilter, priorityFilter]);

  const sortedIssues = useMemo(() => {
    return [...filteredIssues].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'priority') {
        const pMap: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
        return (pMap[b.priority] || 0) - (pMap[a.priority] || 0);
      }
      return 0;
    });
  }, [filteredIssues, sortBy]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setPriorityFilter('ALL');
    setSortBy('newest');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    priorityFilter !== 'ALL' ||
    sortBy !== 'newest';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            My Campus Reports
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Track and monitor issues you have submitted across campus.
          </p>
        </div>

        <Link
          to="/student/report"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report New Issue</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, title, or location..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          {/* Status filter */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Under Review">Under Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="md:col-span-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="md:col-span-2">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Sort order */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="priority">Highest Priority</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>
        </div>

        {/* Count and clear filters */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{sortedIssues.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{issues.length}</strong> reports
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Issues List */}
      {loading ? (
        <div className="flex items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        </div>
      ) : sortedIssues.length === 0 ? (
        <EmptyState
          title={issues.length === 0 ? 'No issues reported yet.' : 'No matching reports found.'}
          description={
            issues.length === 0
              ? 'See something that needs attention? Report it here.'
              : 'Try clearing your filters or changing your search criteria.'
          }
          action={
            issues.length === 0
              ? {
                  label: 'Report Your First Issue',
                  onClick: () => navigate('/student/report'),
                }
              : {
                  label: 'Clear Filters',
                  onClick: resetFilters,
                }
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {sortedIssues.map((issue) => (
            <div
              key={issue.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800/80 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/60">
                    {issue.id}
                  </span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {issue.category}
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {issue.location} {issue.room && `(${issue.room})`}
                    </span>
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {issue.title}
                </h2>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {issue.description}
                </p>

                <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Submitted: {new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                  {issue.updatedAt !== issue.createdAt && (
                    <span>Updated: {new Date(issue.updatedAt).toLocaleDateString()}</span>
                  )}
                  {issue.imageUrl && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      • Photo attached
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-1.5 items-start md:items-end">
                  <PriorityBadge priority={issue.priority} size="sm" />
                  <StatusBadge status={issue.status} size="sm" />
                </div>

                <Link
                  to={`/student/issues/${issue.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 dark:hover:text-white transition-all shadow-xs"
                >
                  <span>Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
