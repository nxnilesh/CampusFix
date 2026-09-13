import React, { useState } from 'react';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Timeline } from '../components/common/Timeline';
import { ImageViewerModal } from '../components/common/ImageViewerModal';
import {
  Search,
  AlertCircle,
  CheckCircle2,
  Calendar,
  MapPin,
  Maximize2,
  Sparkles,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentTrackPage: React.FC = () => {
  const [trackingId, setTrackingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [issue, setIssue] = useState<IssueItem | null>(null);
  const [searchedId, setSearchedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = trackingId.trim();
    if (!query) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      setIssue(null);
      setSearchedId(query);

      const res = await api.trackIssue(query);
      setIssue(res);
    } catch (err: any) {
      setErrorMsg(`No report associated with your account was found with ID: ${query}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
          Track Issue by ID
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Enter your unique campus tracking reference to check immediate progress and resolution updates.
        </p>
      </div>

      {/* Input Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <form onSubmit={handleTrack} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Issue Tracking ID
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  placeholder="e.g. CF-2026-1047"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !trackingId.trim()}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Track Issue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 pt-1">
            Enter the tracking ID received when your issue was submitted (e.g. CF-{new Date().getFullYear()}-XXXX).
          </p>
        </form>
      </div>

      {/* Error / Not found message (Instruction 24) */}
      {errorMsg && (
        <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 animate-in fade-in duration-150">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
              No Matching Report Found
            </h3>
            <p className="mt-1 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {errorMsg}
            </p>
            <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              Make sure you entered the complete ID correctly, and that this issue was created under your account.
            </p>
          </div>
        </div>
      )}

      {/* Tracked Result View */}
      {issue && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-200">
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/60">
                    {issue.id}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">{issue.category}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {issue.title}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <PriorityBadge priority={issue.priority} showSubtext />
                <StatusBadge status={issue.status} size="lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block">Location</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {issue.location}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Room</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {issue.room || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Reported On</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Last Status Update</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {new Date(issue.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Description
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {issue.description}
              </p>
            </div>

            {issue.status === 'Resolved' && issue.resolutionNote && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Resolution Completed</span>
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200 mt-1 pl-6">
                  "{issue.resolutionNote}"
                </p>
              </div>
            )}

            {issue.imageUrl && (
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Evidence Photo
                </span>
                <div className="relative inline-block group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                  <img
                    src={issue.imageUrl}
                    alt={issue.title}
                    className="max-h-60 w-auto object-cover rounded-xl cursor-pointer"
                    onClick={() => setIsPhotoOpen(true)}
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPhotoOpen(true)}
                    className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white text-[11px] font-medium flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" />
                    <span>Expand</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Resolution Progression Timeline
            </h3>
            <Timeline history={issue.history || []} currentStatus={issue.status} />
          </div>

          {issue.imageUrl && (
            <ImageViewerModal
              isOpen={isPhotoOpen}
              onClose={() => setIsPhotoOpen(false)}
              imageUrl={issue.imageUrl}
              title={`Evidence for ${issue.id}`}
            />
          )}
        </div>
      )}
    </div>
  );
};
