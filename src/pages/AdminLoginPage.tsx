import React, { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const AdminLoginPage: React.FC = () => {
  const { user, loading: authLoading, login } = useAuth();
  const { error, success } = useToast();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin') navigate('/admin/dashboard', { replace: true });
  }, [user, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ececee] dark:bg-[#0a0a0c]">
        <Loader2 className="w-6 h-6 text-[#ff3b00] animate-spin" />
      </div>
    );
  }

  if (user && user.role !== 'admin') {
    return <Navigate to={user.role === 'resolver' ? '/resolver/dashboard' : '/student/dashboard'} replace />;
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier.trim() || !password) {
      error('Please enter your administrator email or ID, and password.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ identifier: identifier.trim(), password, expectedRole: 'admin' });
      success('Administrator signed in successfully.');
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Administrator sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] text-black dark:text-white">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-2xl space-y-6">
          <div className="space-y-2">
            <Link to="/" className="flex items-center gap-2 text-sm font-extrabold tracking-tight font-display hover:text-[#ff3b00] transition-colors">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              CampusFix Admin
            </Link>
            <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Private administration portal
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight font-display">Administrator Sign In</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Sign in with an administrator account to manage CampusFix.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label htmlFor="admin-identifier" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                Email or Administrator ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-identifier"
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="admin@campus.edu or ADM1001"
                  autoComplete="username"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Authenticating...</span></>
              ) : (
                <><span>Sign In</span><ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" /></>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-black/5 dark:border-white/5 text-center">
            <Link to="/" className="text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-[#ff3b00] transition-colors">
              Return to CampusFix
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
