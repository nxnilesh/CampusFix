import React, { useState } from 'react';
import { KeyRound, Loader2, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ResolverPasswordChangePage: React.FC = () => {
  const { refreshUser } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      error('Complete all password fields to continue.');
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      error('Choose a password with at least 8 characters, including uppercase, lowercase, and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('The new passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      await api.changePassword({ currentPassword, newPassword });
      await refreshUser();
      success('Password changed. You can now access the resolver portal.');
      navigate('/resolver/dashboard', { replace: true });
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Unable to change your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center">
      <section className="w-full space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="space-y-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-[#ff3b00] dark:bg-orange-950/50">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#ff3b00]">Account security</p>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Change your temporary password</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Set a new password before continuing to resolver services. Your temporary password will stop working after this change.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="resolver-current-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Temporary Password
            </label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="resolver-current-password"
                type="password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ff3b00] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="resolver-new-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="resolver-new-password"
                type="password"
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ff3b00] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="resolver-confirm-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="resolver-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#ff3b00] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use at least 8 characters with uppercase, lowercase, and a number. Your new password must differ from the temporary password.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#ff3b00] py-3.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#e03400] disabled:opacity-50"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Updating Password...</> : 'Change Password & Continue'}
          </button>
        </form>
      </section>
    </div>
  );
};
