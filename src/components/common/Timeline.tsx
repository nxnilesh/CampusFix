import React from 'react';
import { IssueStatusHistoryItem } from '../../types';
import { CheckCircle2, Clock, AlertCircle, Wrench, UserCheck } from 'lucide-react';

interface TimelineProps {
  history: IssueStatusHistoryItem[];
  currentStatus: string;
}

export const Timeline: React.FC<TimelineProps> = ({ history, currentStatus }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Reported':
        return <AlertCircle className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'Under Review':
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'In Progress':
        return <Wrench className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'Resolved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4 italic">
        Status history will be updated as this report progresses.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {history.map((item, index) => {
        const isLatest = index === history.length - 1;
        return (
          <div key={item.id} className="relative group">
            {/* Step node */}
            <div
              className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white dark:bg-slate-900 transition-colors ${
                isLatest
                  ? 'border-blue-600 dark:border-blue-400 ring-4 ring-blue-50 dark:ring-blue-950/40'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {getStatusIcon(item.newStatus)}
            </div>

            <div className="flex flex-col">
              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-white">
                  {item.newStatus}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>

              {item.resolverName && (
                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Resolver: <strong className="text-slate-700 dark:text-slate-200 font-medium">{item.resolverName}</strong></span>
                </div>
              )}

              {item.note && (
                <div className="mt-1.5 p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed">
                  {item.note}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
