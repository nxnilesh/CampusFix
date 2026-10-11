import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { User, UserRole } from '../types';
import {
  Search,
  Users,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Activity,
  BarChart3,
  Loader2,
  UserX,
  UserCheck,
  RefreshCw,
  Trash2,
  ChevronDown,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  PENDING: 'text-amber-600 bg-amber-500/10 border-amber-400/20',
  ACTIVE: 'text-emerald-600 bg-emerald-500/10 border-emerald-400/20',
  SUSPENDED: 'text-amber-600 bg-amber-500/10 border-amber-400/20',
  BLOCKED: 'text-rose-600 bg-rose-500/10 border-rose-400/20',
  DELETED: 'text-zinc-500 bg-zinc-500/10 border-zinc-400/20',
};

interface ActionsMenuProps {
  user: User & { _count?: { issuesReported: number } };
  onRefresh: () => void;
}

const UserActionsMenu: React.FC<ActionsMenuProps> = ({ user, onRefresh }) => {
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const actionsButtonRef = React.useRef<HTMLButtonElement>(null);

  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }

    const button = actionsButtonRef.current;
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    setMenuPosition({
      top: bounds.bottom + 4,
      right: window.innerWidth - bounds.right,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnScroll = () => setOpen(false);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', closeOnScroll, true);
    window.addEventListener('resize', closeOnScroll);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const changeStatus = async (status: string) => {
    try {
      setLoading(true);
      await api.admin.updateUserStatus(user.id, { status });
      success(`Account ${status.toLowerCase()}.`);
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!confirm(`Delete account for ${user.name}? This action is irreversible.`)) return;
    try {
      setLoading(true);
      await api.admin.deleteUser(user.id);
      success('User deleted.');
      setOpen(false);
      onRefresh();
    } catch (err: any) {
      error(err.message || 'Failed to delete user.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword.length < 8) { error('Password must be at least 8 characters.'); return; }
    try {
      setLoading(true);
      await api.admin.resetUserPassword(user.id, newPassword);
      success('Password reset successfully.');
      setResetModal(false);
      setNewPassword('');
    } catch (err: any) {
      error(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        ref={actionsButtonRef}
        onClick={toggleMenu}
        className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
      >
        Actions <ChevronDown className="w-3 h-3" />
      </button>

      {open && menuPosition && createPortal(
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed w-44 rounded-xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-xl py-1 z-[101] animate-in fade-in zoom-in-95 duration-100"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            {user.status !== 'ACTIVE' && !(user.role === 'resolver' && user.status === 'PENDING') && (
              <button onClick={() => changeStatus('ACTIVE')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-emerald-600 hover:bg-slate-50 dark:hover:bg-zinc-800">
                <UserCheck className="w-3.5 h-3.5" /> Activate
              </button>
            )}
            {user.status !== 'SUSPENDED' && user.status !== 'DELETED' && (
              <button onClick={() => changeStatus('SUSPENDED')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-amber-600 hover:bg-slate-50 dark:hover:bg-zinc-800">
                <UserX className="w-3.5 h-3.5" /> Suspend
              </button>
            )}
            {user.status !== 'BLOCKED' && user.status !== 'DELETED' && (
              <button onClick={() => changeStatus('BLOCKED')} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-slate-50 dark:hover:bg-zinc-800">
                <AlertTriangle className="w-3.5 h-3.5" /> Block
              </button>
            )}
            <button onClick={() => { setOpen(false); setResetModal(true); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800">
              <RefreshCw className="w-3.5 h-3.5" /> Reset Password
            </button>
            <div className="border-t border-black/5 dark:border-white/5 my-1" />
            <button onClick={deleteUser} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
              <Trash2 className="w-3.5 h-3.5" /> Delete Account
            </button>
          </div>
        </>,
        document.body
      )}

      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-black dark:text-white">Reset Password for {user.name}</h3>
            <p className="text-xs text-slate-400">Admin-only reset. Password never shown in plain text.</p>
            <input
              type="password"
              placeholder="New password (min. 8 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff3b00]"
            />
            <div className="flex gap-3">
              <button onClick={() => setResetModal(false)} className="flex-1 py-2 rounded-full border border-black/10 dark:border-white/10 text-xs font-semibold text-slate-500">Cancel</button>
              <button onClick={resetPassword} disabled={loading} className="flex-1 py-2 rounded-full bg-[#ff3b00] text-white text-xs font-bold disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AdminUsersPageProps {
  roleFilter?: 'student' | 'resolver';
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ roleFilter }) => {
  const { error } = useToast();
  const [users, setUsers] = useState<(User & { _count?: { issuesReported: number } })[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const pageTitle = roleFilter === 'resolver' ? 'Resolver Management' : roleFilter === 'student' ? 'Student Management' : 'User Management';

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: String(page), limit: '25' };
      if (roleFilter) params.role = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      const res = await api.admin.getUsers(params);
      setUsers(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch {
      error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, search, page]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-6 sm:px-10 backdrop-blur-xl border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff3b00] shadow-[0_0_10px_#ff3b00]" />
          <Link to="/admin-panel" className="text-sm font-extrabold tracking-tight font-display text-black dark:text-white hover:text-[#ff3b00] transition-colors">
            CampusFix Admin
          </Link>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-semibold text-slate-600 dark:text-zinc-400">{pageTitle}</span>
        </div>
      </header>

      <div className="flex">
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
              <h1 className="text-2xl font-extrabold tracking-tight font-display">{pageTitle}</h1>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{total} total</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'ACTIVE', 'SUSPENDED', 'BLOCKED'].map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    statusFilter === s ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white' : 'border-black/10 dark:border-white/10 text-slate-600 dark:text-zinc-400 hover:border-black/30 dark:hover:border-white/30'
                  }`}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search by name, email, ID, department...`}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/30 text-sm text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#ff3b00] transition-all"
              />
            </div>
            <button type="submit" className="px-4 py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black text-xs font-bold transition-all hover:opacity-80">
              Search
            </button>
          </form>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
            </div>
          ) : (
            <div className="rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                      <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider hidden sm:table-cell">Role</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider hidden md:table-cell">Department</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                      <th className="text-left px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider hidden lg:table-cell">Issues</th>
                      <th className="text-right px-4 py-3 font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {users.map((u) => (
                      <tr key={u.id} className="bg-white/60 dark:bg-black/30 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-black dark:text-white">{u.name}</p>
                          <p className="text-slate-400 font-mono">{u.userId} · {u.email}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="capitalize text-slate-600 dark:text-zinc-400">{u.role}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-slate-500 dark:text-zinc-400 max-w-[150px] truncate">
                          {u.department || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[u.status || 'ACTIVE'] || ''}`}>
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-slate-500 dark:text-zinc-400">
                          {u._count?.issuesReported ?? 0}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <UserActionsMenu user={u} onRefresh={loadUsers} />
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {total > 25 && (
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <span>Page {page} of {Math.ceil(total / 25)}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Previous
                </button>
                <button onClick={() => setPage(page + 1)} disabled={page >= Math.ceil(total / 25)}
                  className="px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
