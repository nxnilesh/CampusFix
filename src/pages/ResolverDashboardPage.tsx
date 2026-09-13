import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { IssueItem, CategoryItem, ServiceItem } from '../types';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { Modal } from '../components/common/Modal';
import {
  FileText,
  AlertCircle,
  Clock,
  Wrench,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  BarChart3,
  ListTodo,
  MapPin,
  Calendar,
  Loader2,
  User,
  Layers,
  Settings,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export const ResolverDashboardPage: React.FC = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { success, error } = useToast();
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);

  // New category/service modal state for admins
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcDesc, setNewSvcDesc] = useState('');
  const [newSvcCatId, setNewSvcCatId] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const navigate = useNavigate();

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const res = await api.getResolverIssues({ limit: '100' });
      setIssues(res.issues || []);
    } catch (err: any) {
      if (err?.status === 401) {
        navigate('/resolver/login', { replace: true });
      } else {
        console.error('Error fetching resolver issues:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cats, svcs] = await Promise.all([
        api.getCategories(true).catch(() => []),
        api.getServices({ all: true }).catch(() => []),
      ]);
      setCategories(cats);
      setServices(svcs);
    } catch (err) {
      console.error('Error loading services/categories:', err);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/resolver/login', { replace: true });
      return;
    }
    fetchIssues();
    fetchMetadata();
  }, [authLoading, user, navigate]);

  const totalCount = issues.length;
  const reportedCount = issues.filter((i) => i.status === 'Reported').length;
  const acknowledgedCount = issues.filter((i) => i.status === 'Acknowledged').length;
  const inProgressCount = issues.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = issues.filter((i) => i.status === 'Resolved').length;
  const highPriorityCount = issues.filter((i) => i.priority === 'High' && i.status !== 'Resolved').length;

  // Attention queue: unresolved issues sorted by priority then recency
  const attentionQueue = issues
    .filter((i) => i.status !== 'Resolved' && i.status !== 'Closed')
    .sort((a, b) => {
      if (a.priority === 'High' && b.priority !== 'High') return -1;
      if (b.priority === 'High' && a.priority !== 'High') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 6);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      setSavingMeta(true);
      await api.createCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
      success('Category created successfully.');
      setNewCatName('');
      setNewCatDesc('');
      await fetchMetadata();
    } catch (err: any) {
      error(err.message || 'Failed to create category.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSvcName.trim()) return;
    try {
      setSavingMeta(true);
      await api.createService({
        name: newSvcName.trim(),
        description: newSvcDesc.trim(),
        categoryId: newSvcCatId || undefined,
      });
      success('Service created successfully.');
      setNewSvcName('');
      setNewSvcDesc('');
      await fetchMetadata();
    } catch (err: any) {
      error(err.message || 'Failed to create service.');
    } finally {
      setSavingMeta(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-12">
      {/* Resolver Header */}
      <div className="resolver-hero p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="resolver-eyebrow px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider">
                Facilities Administration
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Staff ID: {user?.userId}
              </span>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Admin Privileges
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Operations Console
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Live campus maintenance queue, dispatch routing, and verified issue closure.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setServicesModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#ff3b00]" />
              <span>Campus Services & Categories</span>
            </button>

            <Link
              to="/resolver/analytics"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
              <span>Analytics</span>
            </Link>

            <Link
              to="/resolver/issues"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#ff3b00] hover:bg-[#e03400] text-white shadow-xs transition-colors"
            >
              <ListTodo className="w-3.5 h-3.5" />
              <span>Issue Roster</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          label="Total Reports"
          value={totalCount}
          icon={<FileText className="w-4 h-4" />}
          subtext="Institutional records"
        />
        <StatCard
          label="New Reported"
          value={reportedCount}
          icon={<AlertCircle className="w-4 h-4" />}
          subtext="Awaiting staff review"
          variant="primary"
        />
        <StatCard
          label="Acknowledged"
          value={acknowledgedCount}
          icon={<Clock className="w-4 h-4" />}
          subtext="Accepted by unit"
          variant="warning"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={<Wrench className="w-4 h-4" />}
          subtext="Crews dispatched"
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={<CheckCircle2 className="w-4 h-4" />}
          subtext="Verified completed"
          variant="success"
        />
      </div>

      {/* High Priority Critical Alert Banner */}
      {highPriorityCount > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-950 dark:text-rose-200">
                {highPriorityCount} Urgent {highPriorityCount === 1 ? 'Issue' : 'Issues'} Requiring Dispatch
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Critical health, safety, or major utility outages active on campus.
              </p>
            </div>
          </div>
          <Link
            to="/resolver/issues?priority=High"
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Review Urgent
          </Link>
        </div>
      )}

      {/* Dispatch Priority Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Dispatch Queue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Unresolved student submissions prioritized for field action
            </p>
          </div>
          <Link
            to="/resolver/issues"
            className="text-xs font-semibold text-[#ff3b00] hover:underline flex items-center gap-1"
          >
            <span>View all issues ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#ff3b00] mb-2" />
            <p className="text-xs text-slate-500">Querying database records...</p>
          </div>
        ) : attentionQueue.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Queue is completely clear!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              No unresolved tickets currently pending dispatch. When students report issues, they will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attentionQueue.map((item) => (
              <Link
                key={item.id}
                to={`/resolver/issues/${item.id}`}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#ff3b00] dark:hover:border-[#ff3b00] transition-all shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {item.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <PriorityBadge priority={item.priority} size="sm" />
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#ff3b00] transition-colors line-clamp-1">
                    {item.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[130px] font-medium text-slate-600 dark:text-slate-300">
                      {item.location} ({item.room})
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Services & Categories Management Modal */}
      <Modal
        isOpen={servicesModalOpen}
        onClose={() => setServicesModalOpen(false)}
        title="Campus Services & Issue Categories"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Configured Categories ({categories.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                >
                  <p className="font-bold text-slate-900 dark:text-white">{c.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{c.description || 'General'}</p>
                </div>
              ))}
            </div>

            {isAdmin && (
              <form onSubmit={handleCreateCategory} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New Category Name"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={savingMeta || !newCatName.trim()}
                  className="px-3 py-1.5 rounded-xl bg-[#ff3b00] text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </form>
            )}
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
              Active Campus Services ({services.length})
            </h4>
            <div className="space-y-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                    <p className="text-[11px] text-slate-500">{s.description || 'Standard resolution'}</p>
                  </div>
                  {s.slaHours && (
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      SLA: {s.slaHours}h
                    </span>
                  )}
                </div>
              ))}
            </div>

            {isAdmin && (
              <form onSubmit={handleCreateService} className="mt-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSvcName}
                    onChange={(e) => setNewSvcName(e.target.value)}
                    placeholder="New Service Name"
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  />
                  <select
                    value={newSvcCatId}
                    onChange={(e) => setNewSvcCatId(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">Category (Optional)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingMeta || !newSvcName.trim()}
                  className="w-full py-2 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Campus Service
                </button>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
