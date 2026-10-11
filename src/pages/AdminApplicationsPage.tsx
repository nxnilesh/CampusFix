import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { ResolverRequest } from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Building,
  FileText,
  AlertTriangle,
  BarChart3,
  Users,
  Activity,
  CalendarDays,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'text-amber-500 bg-amber-500/10 border-amber-400/30',
  APPROVED: 'text-emerald-500 bg-emerald-500/10 border-emerald-400/30',
  REJECTED: 'text-rose-500 bg-rose-500/10 border-rose-400/30',
  SUSPENDED: 'text-orange-500 bg-orange-500/10 border-orange-400/30',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3 h-3" />,
  APPROVED: <CheckCircle2 className="w-3 h-3" />,
  REJECTED: <XCircle className="w-3 h-3" />,
  SUSPENDED: <AlertTriangle className="w-3 h-3" />,
};

interface ReviewModalProps {
  application: ResolverRequest;
  onClose: () => void;
  onRefresh: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ application, onClose, onRefresh }) => {
  const { success, error } = useToast();
  const [action, setAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async () => {
    if (action === 'REJECT' && !adminNote.trim()) {
      error('Please provide a rejection reason.');
      return;
    }

    try {
      setLoading(true);
      await api.admin.reviewResolverRequest(
        application.id,
        action === 'REJECT'
          ? { action, rejectionReason: adminNote.trim() }
          : { action, adminNote: adminNote.trim() || undefined }
      );
      success(`Application ${action.toLowerCase()}d successfully.`);
      onRefresh();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to review application.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resolver-review-title"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150"
      >
        <div className="space-y-1">
          <h3 id="resolver-review-title" className="text-lg font-extrabold text-black dark:text-white font-display">Review Application</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {application.fullName} — {application.department}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Personal Information</h4>
            <p className="flex items-center gap-2 text-xs"><User className="h-3.5 w-3.5 text-slate-400" />{application.fullName}</p>
            {application.user && <p className="text-xs text-slate-500 dark:text-zinc-400">Campus account: {application.user.name} · {application.user.userId}</p>}
          </section>
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Contact Details</h4>
            <p className="flex items-center gap-2 break-all text-xs"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{application.email}</p>
            <p className="flex items-center gap-2 text-xs"><Phone className="h-3.5 w-3.5 text-slate-400" />{application.phone || 'No phone number provided'}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Account status: {application.user?.status || 'Unavailable'}</p>
          </section>
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Department / Designation</h4>
            <p className="flex items-center gap-2 text-xs"><Building className="h-3.5 w-3.5 text-slate-400" />{application.department}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Designation: {application.designation || 'Not provided'}</p>
          </section>
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Verification Details</h4>
            <p className="flex items-center gap-2 text-xs"><ShieldCheck className="h-3.5 w-3.5 text-slate-400" />Staff / Employee ID: {application.employeeId || 'Not provided'}</p>
            <p className="text-xs">Email verification: {application.user?.emailVerified ? 'Verified' : 'Not verified'}</p>
            {application.documentUrl ? (
              <a href={application.documentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 break-all text-xs text-blue-600 hover:underline dark:text-blue-400">
                <FileText className="h-3.5 w-3.5 shrink-0" />View verification document
              </a>
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400">No verification document attached.</p>
            )}
          </section>
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4 sm:col-span-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Reason for Applying</h4>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700 dark:text-zinc-300">{application.reason}</p>
          </section>
          <section className="space-y-2 rounded-xl bg-black/5 dark:bg-white/5 p-4 sm:col-span-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Application Status</h4>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-bold ${statusColors[application.status] || ''}`}>
                {statusIcons[application.status]}{application.status}
              </span>
              <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400"><CalendarDays className="h-3.5 w-3.5" />Submitted {new Date(application.createdAt).toLocaleString()}</span>
              {application.reviewedAt && <span className="text-slate-500 dark:text-zinc-400">Reviewed {new Date(application.reviewedAt).toLocaleString()}{application.reviewedBy ? ` by ${application.reviewedBy.name}` : ''}</span>}
            </div>
            {application.adminNote && <p className="text-xs text-slate-500 dark:text-zinc-400">Administrator note: {application.adminNote}</p>}
            {application.rejectionReason && <p className="text-xs text-rose-600 dark:text-rose-400">Rejection reason: {application.rejectionReason}</p>}
          </section>
        </div>

        {/* Action selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">Decision</label>
          <div className="flex gap-2">
            {(['APPROVE', 'REJECT'] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                  action === a
                    ? a === 'APPROVE'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-rose-500 text-white border-rose-500'
                    : 'bg-transparent border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-black/30 dark:hover:border-white/30'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-zinc-400">
          {action === 'APPROVE'
            ? 'Approval creates the resolver account and emails a temporary password. The applicant must change it before accessing resolver services.'
            : 'The rejection reason is recorded with the application and shown to the applicant.'}
        </p>

        {/* Admin note */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-black dark:text-white uppercase tracking-wider font-mono">
            {action === 'REJECT' ? 'Rejection Reason' : 'Admin Note'}{' '}
            {action === 'REJECT'
              ? <span className="text-rose-500 font-normal">(required)</span>
              : <span className="text-slate-400 font-normal">(optional)</span>}
          </label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder={action === 'REJECT' ? 'Explain why this application was rejected...' : 'Leave a note visible to the applicant...'}
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff3b00] resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleReview}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-full text-xs font-bold text-white transition-all disabled:opacity-50 ${
              action === 'APPROVE' ? 'bg-emerald-500 hover:bg-emerald-600' :
              'bg-rose-500 hover:bg-rose-600'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Confirm ${action}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export const AdminApplicationsPage: React.FC = () => {
  const { error } = useToast();
  const [applications, setApplications] = useState<ResolverRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApp, setSelectedApp] = useState<ResolverRequest | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { limit: '50' };
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await api.admin.getResolverRequests(params);
      setApplications(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      error('Failed to load resolver applications.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  return (
    <div className="min-h-screen bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      {/* Admin top bar */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 sm:px-10 backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_10px_#ff3b00]" />
          <Link to="/admin-panel" className="text-sm font-extrabold tracking-tight font-display text-black dark:text-white hover:text-[#ff3b00] transition-colors">
            CampusFix Admin
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">Resolver Applications</span>
        </div>
      </header>

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
              <h1 className="text-2xl font-extrabold tracking-tight font-display">Resolver Applications</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{total} total applications</p>
            </div>
            {/* Filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {['all', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === s
                      ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white'
                      : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <div key={app.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white/60 dark:bg-black/30 border border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-black dark:text-white">{app.fullName}</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[app.status] || ''}`}>
                          {statusIcons[app.status]}
                          {app.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-zinc-400">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{app.email}</span>
                        <span className="flex items-center gap-1"><Building className="w-3 h-3" />{app.department}</span>
                        {app.designation && <span className="flex items-center gap-1"><User className="w-3 h-3" />{app.designation}</span>}
                        {app.employeeId && <span className="font-mono">ID: {app.employeeId}</span>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 line-clamp-2 mt-1">{app.reason}</p>
                      {(app.rejectionReason || app.adminNote) && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic">
                          {app.rejectionReason ? `Rejection reason: ${app.rejectionReason}` : `Admin note: ${app.adminNote}`}
                        </p>
                      )}
                      {app.reviewedAt && (
                        <p className="text-[10px] text-slate-400">
                          Reviewed {new Date(app.reviewedAt).toLocaleString()}
                          {app.reviewedBy && ` by ${app.reviewedBy.name} (${app.reviewedBy.userId})`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                      {app.status === 'PENDING' && (
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-4 py-2 rounded-full bg-[#ff3b00] hover:bg-[#e03400] text-white text-xs font-bold transition-all"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {applications.length === 0 && (
                <div className="text-center py-20 text-slate-400 text-sm">No applications found.</div>
              )}
            </div>
          )}
        </main>
      </div>

      {selectedApp && (
        <ReviewModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onRefresh={loadApplications}
        />
      )}
    </div>
  );
};
