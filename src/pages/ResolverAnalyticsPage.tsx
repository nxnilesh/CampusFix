import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  Building,
  Loader2,
  Activity,
} from 'lucide-react';

export const ResolverAnalyticsPage: React.FC = () => {
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const res = await api.getResolverIssues({ limit: '500' });
        setIssues(res.issues || []);
      } catch (err) {
        console.error('Failed to load issues for analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const total = issues.length;
  const resolved = issues.filter((i) => i.status === 'Resolved').length;
  const unresolved = total - resolved;
  const highPriority = issues.filter((i) => i.priority === 'High' && i.status !== 'Resolved').length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Most reported category
  const categoryCounts: Record<string, number> = {};
  issues.forEach((i) => {
    categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  const mostReportedCategory = sortedCategories[0]?.[0] || 'None';

  // Most affected location
  const locationCounts: Record<string, number> = {};
  issues.forEach((i) => {
    locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
  });

  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  const mostAffectedLocation = sortedLocations[0]?.[0] || 'None';

  // Status breakdown
  const statusCounts = {
    Reported: issues.filter((i) => i.status === 'Reported').length,
    'Under Review': issues.filter((i) => i.status === 'Under Review').length,
    'In Progress': issues.filter((i) => i.status === 'In Progress').length,
    Resolved: resolved,
  };

  // Priority breakdown
  const priorityCounts = {
    High: issues.filter((i) => i.priority === 'High').length,
    Medium: issues.filter((i) => i.priority === 'Medium').length,
    Low: issues.filter((i) => i.priority === 'Low').length,
  };

  // Recent activity feed extracted from all histories
  const allActivities: Array<{
    id: string;
    issueId: string;
    issueTitle: string;
    newStatus: string;
    note?: string;
    changedBy?: string;
    createdAt: string;
  }> = [];

  issues.forEach((issue) => {
    if (issue.history) {
      issue.history.forEach((h) => {
        allActivities.push({
          id: h.id,
          issueId: issue.id,
          issueTitle: issue.title,
          newStatus: h.newStatus,
          note: h.note,
          changedBy: h.changedBy,
          createdAt: h.createdAt,
        });
      });
    }
  });

  const sortedActivities = allActivities
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Campus Infrastructure Analytics
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Live real-time calculation derived from all logged student reports and facilities resolutions.
        </p>
      </div>

      {/* Top High-level KPI cards (Instruction 38) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="Total Issues"
          value={total}
          icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
          subtext="Logged campus-wide"
        />
        <StatCard
          label="Resolved"
          value={resolved}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subtext="Finished repairs"
          variant="success"
        />
        <StatCard
          label="Unresolved"
          value={unresolved}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          subtext="In active pipeline"
          variant="warning"
        />
        <StatCard
          label="Resolution Rate"
          value={`${resolutionRate}%`}
          icon={<TrendingUp className="w-4 h-4 text-indigo-600" />}
          subtext="Overall efficiency"
        />
        <StatCard
          label="High Priority Hazards"
          value={highPriority}
          icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
          subtext="Requires immediate fix"
          variant="danger"
        />
      </div>

      {/* Key Insights Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
            <Tag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Most Reported Category
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {mostReportedCategory}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {categoryCounts[mostReportedCategory] || 0} issues reported ({total > 0 ? Math.round(((categoryCounts[mostReportedCategory] || 0) / total) * 100) : 0}% of all)
            </p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Most Affected Campus Location
            </span>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {mostAffectedLocation}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {locationCounts[mostAffectedLocation] || 0} maintenance complaints logged
            </p>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown Bars */}
        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Category Distribution
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Percentage share of complaints across campus departments
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {sortedCategories.length === 0 ? (
              <p className="text-xs text-slate-400">No category data recorded yet.</p>
            ) : (
              sortedCategories.map(([cat, count]) => {
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {cat}
                      </span>
                      <span className="text-slate-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Status and Priority Summary */}
        <div className="space-y-6">
          {/* Status Breakdown */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Status Breakdown
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current progress distribution in the maintenance queue
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(statusCounts).map(([st, count]) => (
                <div
                  key={st}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                >
                  <StatusBadge status={st} size="sm" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Priority Breakdown */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Priority Distribution
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Breakdown of urgency levels across campus
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(priorityCounts).map(([pr, count]) => (
                <div
                  key={pr}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center"
                >
                  <PriorityBadge priority={pr} size="sm" />
                  <div className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                    {count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Resolution Activity Feed (Instruction 38) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Recent Resolution Activity Feed</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live updates recorded by campus facilities resolvers
            </p>
          </div>
        </div>

        {sortedActivities.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No recent status activity recorded.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {act.issueId}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {act.issueTitle}
                    </span>
                  </div>
                  {act.note && (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      "{act.note}"
                    </p>
                  )}
                  <div className="text-[11px] text-slate-400">
                    Updated by {act.changedBy || 'Campus Resolver'}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusBadge status={act.newStatus} size="sm" />
                  <span className="text-[11px] text-slate-400">
                    {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
