import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Timeline } from '../components/common/Timeline';
import { ImageViewerModal } from '../components/common/ImageViewerModal';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  Maximize2,
  ShieldCheck,
  Wrench,
  Loader2,
  AlertCircle,
  FileEdit,
} from 'lucide-react';

export const ResolverIssueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<IssueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Status update states
  const [newStatus, setNewStatus] = useState<string>('');
  const [resolverNote, setResolverNote] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  const fetchIssue = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getIssueById(id);
      setIssue(data);
      setNewStatus(data.status);
    } catch (err: any) {
      error(err.message || 'Failed to load report.');
      navigate('/resolver/issues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssue();
  }, [id]);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue) return;

    if (newStatus === issue.status) {
      error('Please select a different status to update.');
      return;
    }

    // Validation: note is mandatory when selecting Resolved
    if (newStatus === 'Resolved' && !resolverNote.trim()) {
      error('A resolution note is required when marking an issue as Resolved.');
      return;
    }

    try {
      setUpdating(true);
      const updated = await api.updateIssueStatus(issue.id, {
        status: newStatus,
        note: resolverNote.trim() || undefined,
      });

      setIssue(updated);
      setNewStatus(updated.status);
      setResolverNote('');
      success(`Report status updated to ${newStatus}.`);
    } catch (err: any) {
      error(err.message || 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Report Not Found</h2>
        <Link
          to="/resolver/issues"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Issues</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/resolver/issues"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Campus Issues</span>
        </Link>
      </div>

      {/* Main Issue Header Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-900/60">
                {issue.id}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {issue.category}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white pt-1">
              {issue.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <PriorityBadge priority={issue.priority} showSubtext />
            <StatusBadge status={issue.status} size="lg" />
          </div>
        </div>

        {/* Student Reporter Card */}
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
              {issue.student?.name.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            <div>
              <span className="text-[11px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider block">
                Student Reporter
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {issue.student?.name}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">
                ({issue.student?.userId})
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
            <span>{issue.student?.department || 'Department N/A'}</span>
            <span>•</span>
            <span>{issue.student?.year || 'Year N/A'}</span>
          </div>
        </div>

        {/* Location & Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Location</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5 block">
              {issue.location}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Room / Spot</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5 block">
              {issue.room || 'General Area'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Reported On</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5 block">
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="text-slate-400 font-medium block">Last Updated</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold mt-0.5 block">
              {new Date(issue.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Description
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>

        {/* Evidence Photo */}
        {issue.imageUrl && (
          <div className="space-y-2 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Photographic Evidence
            </h2>
            <div className="relative inline-block group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img
                src={issue.imageUrl}
                alt={issue.title}
                className="max-h-72 w-auto object-cover rounded-2xl cursor-pointer"
                onClick={() => setIsPhotoModalOpen(true)}
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/70 text-white backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expand Photo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RESOLVER STATUS WORKSPACE CONTROL BOX (Instruction 35) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-blue-500/40 dark:border-blue-500/30 shadow-md space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Resolver Action Workspace
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Update the maintenance status and record official resolver logs visible to the student.
          </p>
        </div>

        <form onSubmit={handleStatusUpdate} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Update Maintenance Status <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['Reported', 'Acknowledged', 'Under Review', 'In Progress', 'Resolved', 'Closed', 'Rejected'] as const).map((st) => (
                <button
                  type="button"
                  key={st}
                  onClick={() => setNewStatus(st)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    newStatus === st
                      ? 'border-[#ff3b00] bg-[#ff3b00]/10 text-slate-900 dark:text-white ring-2 ring-[#ff3b00]'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <StatusBadge status={st} size="sm" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Resolver Resolution & Activity Note
                {newStatus === 'Resolved' && (
                  <span className="text-rose-500 font-bold"> * (Mandatory for Resolution)</span>
                )}
              </label>
              <span className="text-[11px] text-slate-400">
                {newStatus === 'Resolved' ? 'Describe repairs done' : 'Optional internal/public note'}
              </span>
            </div>
            <textarea
              value={resolverNote}
              onChange={(e) => setResolverNote(e.target.value)}
              placeholder={
                newStatus === 'Resolved'
                  ? 'e.g. Insulated exposed wiring, tested circuit breakers, and securely conduit-clamped all cables under bench 14.'
                  : 'e.g. Assigned to Electrical team lead; technicians dispatched for inspection.'
              }
              rows={3}
              required={newStatus === 'Resolved'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {updating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Commit Status Update</span>
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Status History Timeline (Instruction 35) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Complete Resolution Timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of resolver actions and timestamps
            </p>
          </div>
        </div>

        <Timeline history={issue.history || []} currentStatus={issue.status} />
      </div>

      {/* Expand Photo Modal */}
      {issue.imageUrl && (
        <ImageViewerModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          imageUrl={issue.imageUrl}
          title={`Evidence Photo - ${issue.id}`}
        />
      )}
    </div>
  );
};
