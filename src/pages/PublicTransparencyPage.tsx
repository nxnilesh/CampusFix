import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PublicDashboardData, PublicIssueItem } from '../types';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ThumbsUp,
  Loader2,
  Clock,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  Reported: 'text-blue-500',
  Acknowledged: 'text-purple-500',
  'Under Review': 'text-amber-500',
  'In Progress': 'text-orange-500',
  Resolved: 'text-emerald-500',
  Closed: 'text-slate-500',
};

const priorityColors: Record<string, string> = {
  High: 'text-rose-500',
  Medium: 'text-amber-500',
  Low: 'text-emerald-500',
};

function IssueCard({
  issue,
  onVote,
  myVotes,
  isAuthenticated,
}: {
  issue: PublicIssueItem;
  onVote?: (id: string) => void;
  myVotes?: Set<string>;
  isAuthenticated: boolean;
  key?: React.Key | null;
}) {
  const voted = myVotes?.has(issue.id);
  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/60 dark:bg-black/30 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all">
      {/* Vote button */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <button
          onClick={() => isAuthenticated && onVote?.(issue.id)}
          title={isAuthenticated ? (voted ? 'You voted' : 'Vote for this issue') : 'Sign in to vote'}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border transition-all ${
            voted
              ? 'border-[#ff3b00] text-[#ff3b00] bg-[#ff3b00]/10'
              : isAuthenticated
              ? 'border-black/10 dark:border-white/10 text-slate-500 dark:text-zinc-400 hover:border-[#ff3b00] hover:text-[#ff3b00]'
              : 'border-black/5 dark:border-white/5 text-slate-300 dark:text-zinc-600 cursor-default'
          }`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold">{issue.votes}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-bold text-black dark:text-white leading-tight truncate">{issue.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
          <span>{issue.category}</span>
          <span>{issue.location}</span>
          {issue.priority && <span className={`font-semibold ${priorityColors[issue.priority] || ''}`}>{issue.priority}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-semibold ${statusColors[issue.status] || 'text-slate-500'}`}>
            {issue.status}
          </span>
          {issue.createdAt && (
            <span className="text-[10px] text-slate-400 font-mono">
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        {issue.resolutionNote && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-0.5">
            ✓ {issue.resolutionNote}
          </p>
        )}
      </div>
    </div>
  );
}

export const PublicTransparencyPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { error, success } = useToast();
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'voted' | 'resolved' | 'high'>('voted');

  const loadDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setData(await api.getPublicDashboard());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load transparency dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const handleVote = async (issueId: string) => {
    if (!isAuthenticated) return;
    try {
      if (myVotes.has(issueId)) {
        await api.removeVote(issueId);
        setMyVotes((prev) => { const s = new Set(prev); s.delete(issueId); return s; });
        // Update vote count locally
        setData((prev) => {
          if (!prev) return prev;
          const updateVotes = (items: PublicIssueItem[]) =>
            items.map((i) => i.id === issueId ? { ...i, votes: Math.max(0, i.votes - 1) } : i);
          return {
            ...prev,
            topVoted: updateVotes(prev.topVoted),
            highPriorityOpen: updateVotes(prev.highPriorityOpen),
          };
        });
      } else {
        await api.castVote(issueId);
        setMyVotes((prev) => new Set([...prev, issueId]));
        setData((prev) => {
          if (!prev) return prev;
          const updateVotes = (items: PublicIssueItem[]) =>
            items.map((i) => i.id === issueId ? { ...i, votes: i.votes + 1 } : i);
          return {
            ...prev,
            topVoted: updateVotes(prev.topVoted),
            highPriorityOpen: updateVotes(prev.highPriorityOpen),
          };
        });
      }
    } catch (err: any) {
      error(err.message || 'Failed to cast vote.');
    }
  };

  const tabs = [
    { id: 'voted', label: 'Most Voted', icon: <ThumbsUp className="w-3.5 h-3.5" /> },
    { id: 'resolved', label: 'Recently Resolved', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { id: 'high', label: 'High Priority', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  ] as const;

  const activeIssues =
    activeTab === 'voted' ? data?.topVoted
    : activeTab === 'resolved' ? data?.recentlyResolved
    : data?.highPriorityOpen;

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Campus Transparency
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display text-black dark:text-white">
            Public Issue Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 max-w-xl">
            Live status of campus maintenance issues. No personal data is shown.
            {isAuthenticated
              ? ' Vote for issues that affect you most.'
              : <> <Link to="/student/login" className="text-[#ff3b00] hover:underline font-semibold">Sign in</Link> to vote for issues.</>
            }
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
          </div>
        ) : data ? (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Issues', value: data.stats.totalIssues, icon: <BarChart3 className="w-4 h-4" /> },
                { label: 'Resolved', value: data.stats.resolvedIssues, icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                { label: 'Open', value: data.stats.openIssues, icon: <Clock className="w-4 h-4 text-amber-500" /> },
                { label: 'Resolution Rate', value: `${data.stats.resolutionRate}%`, icon: <TrendingUp className="w-4 h-4 text-[#ff3b00]" /> },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-2xl bg-white/60 dark:bg-black/30 border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-zinc-400">{s.icon}</div>
                  <p className="text-xl font-extrabold text-black dark:text-white">{s.value}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Category distribution */}
            {data.categoryDistribution.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-bold text-black dark:text-white">Issues by Category</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {data.categoryDistribution.map((c) => (
                    <div key={c.category} className="p-3 rounded-xl bg-white/60 dark:bg-black/30 border border-black/10 dark:border-white/10 text-center">
                      <p className="text-lg font-extrabold text-black dark:text-white">{c.count}</p>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">{c.category}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabbed issues */}
            <div className="space-y-4">
              <div className="flex gap-2 border-b border-black/10 dark:border-white/10 pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-semibold transition-all ${
                      activeTab === tab.id
                        ? 'text-[#ff3b00] border-b-2 border-[#ff3b00] -mb-[2px]'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {activeIssues && activeIssues.length > 0 ? (
                  activeIssues.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onVote={handleVote}
                      myVotes={myVotes}
                      isAuthenticated={isAuthenticated}
                    />
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-400 text-sm">No issues in this category yet.</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-slate-400" aria-live="polite">
            <p>{loadError || 'Failed to load transparency dashboard.'}</p>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="mt-3 text-sm font-semibold text-[#ff3b00] hover:underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
