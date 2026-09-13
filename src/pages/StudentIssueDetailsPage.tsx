import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { IssueItem } from '../types';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Timeline } from '../components/common/Timeline';
import { ImageViewerModal } from '../components/common/ImageViewerModal';
import { Modal } from '../components/common/Modal';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Trash2,
  Maximize2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from 'lucide-react';

export const StudentIssueDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [issue, setIssue] = useState<IssueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await api.getIssueById(id);
        setIssue(data);
      } catch (err: any) {
        error(err.message || 'Failed to load issue details.');
        navigate('/student/issues');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!issue) return;
    try {
      setDeleting(true);
      await api.deleteIssue(issue.id);
      success('Report cancelled and deleted successfully.');
      setIsDeleteModalOpen(false);
      navigate('/student/issues');
    } catch (err: any) {
      error(err.message || 'Failed to delete report.');
    } finally {
      setDeleting(false);
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
        <p className="text-sm text-slate-500">The requested campus report does not exist or you do not have permission to view it.</p>
        <Link
          to="/student/issues"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Reports</span>
        </Link>
      </div>
    );
  }

  const canDelete = issue.status === 'Reported';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200 pb-12">
      {/* Back button and Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/issues"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Reports</span>
        </Link>

        {canDelete && (
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Cancel Report</span>
          </button>
        )}
      </div>

      {/* Main Issue Card */}
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

        {/* Location and Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Campus Location</span>
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
            <span className="text-slate-400 font-medium block">Submitted Date</span>
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
            Issue Description
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>

        {/* Resolution Note (Instruction 20) */}
        {issue.status === 'Resolved' && issue.resolutionNote && (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Official Resolver Resolution Note</span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed pl-6">
              "{issue.resolutionNote}"
            </p>
          </div>
        )}

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
                className="max-h-80 w-auto object-cover rounded-2xl cursor-pointer group-hover:scale-102 transition-transform"
                onClick={() => setIsPhotoModalOpen(true)}
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/70 text-white backdrop-blur-xs text-xs font-semibold flex items-center gap-1.5 opacity-90 hover:opacity-100 transition-opacity"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Click to Expand</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Real-time Status History Timeline (Instruction 26 & 27) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Status Progression Timeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete historical trail from initial reporting to resolution verification
            </p>
          </div>
        </div>

        <Timeline history={issue.history || []} currentStatus={issue.status} />
      </div>

      {/* Image Viewer Modal */}
      {issue.imageUrl && (
        <ImageViewerModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          imageUrl={issue.imageUrl}
          title={`Evidence for ${issue.id}`}
        />
      )}

      {/* Cancel/Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Cancel Campus Report?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to cancel report <strong>{issue.id}</strong>? Since this report is still in <em>Reported</em> status and has not yet been assigned, it can be safely removed.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Keep Report
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 disabled:opacity-50"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Yes, Cancel Report</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
