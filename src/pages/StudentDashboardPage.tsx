import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { EmptyState } from '../components/common/EmptyState';
import {
  FileText,
  AlertCircle,
  Clock,
  Wrench,
  CheckCircle2,
  PlusCircle,
  Search,
  ListTodo,
  ArrowRight,
  MapPin,
  Calendar,
  Loader2,
} from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/student/login', { replace: true });
      return;
    }

    const fetchMyIssues = async () => {
      try {
        setLoading(true);
        const res = await api.getMyIssues();
        setIssues(res.issues || []);
      } catch (err: any) {
        if (err?.status === 401) {
          navigate('/student/login', { replace: true });
        } else {
          console.error('Failed to load student dashboard issues:', err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchMyIssues();
  }, [authLoading, user, navigate]);

  const totalReports = issues.length;
  const reportedCount = issues.filter((i) => i.status === 'Reported').length;
  const underReviewCount = issues.filter((i) => i.status === 'Under Review').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;

  const recentIssues = issues.slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {getGreeting()}, {user?.name.split(' ')[0] || 'Student'}
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Welcome back to CampusFix. Together, we can make your campus safer, cleaner and better.
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">ID: {user?.userId}</span>
              <span>•</span>
              <span>{user?.department}</span>
              <span>•</span>
              <span>{user?.year}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/student/report"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
            <Link
              to="/student/track"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Track by ID</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Student Metrics Cards (Student-only, never campus-wide) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          label="My Reports"
          value={totalReports}
          icon={<FileText className="w-4 h-4 text-blue-600" />}
          subtext="Total submitted"
        />
        <StatCard
          label="Reported"
          value={reportedCount}
          icon={<AlertCircle className="w-4 h-4 text-sky-600" />}
          subtext="Awaiting review"
          variant="primary"
        />
        <StatCard
          label="Under Review"
          value={underReviewCount}
          icon={<Clock className="w-4 h-4 text-amber-600" />}
          subtext="Triaging issue"
          variant="warning"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<Wrench className="w-4 h-4 text-indigo-600" />}
          subtext="Repairs ongoing"
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          subtext="Completed"
          variant="success"
        />
      </div>

      {/* Recent Issues Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Recent Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your latest submitted campus infrastructure reports
            </p>
          </div>
          {issues.length > 0 && (
            <Link
              to="/student/issues"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <span>View All ({issues.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : issues.length === 0 ? (
          <EmptyState
            title="No issues reported yet."
            description="See something that needs attention? Report it here."
            action={{
              label: 'Report Your First Issue',
              onClick: () => navigate('/student/report'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {recentIssues.map((issue) => (
              <Link
                key={issue.id}
                to={`/student/issues/${issue.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-800/80 shadow-xs hover:shadow-md transition-all gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {issue.id}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {issue.category}
                    </span>
                  </div>

                  <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                    {issue.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{issue.location} {issue.room && `(${issue.room})`}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <PriorityBadge priority={issue.priority} size="sm" />
                  <StatusBadge status={issue.status} size="sm" />
                  <div className="p-1 rounded-lg text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
