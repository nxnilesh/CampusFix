import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

export const StudentLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      error('Please enter your institutional email or Student ID, and password.');
      return;
    }

    try {
      setLoading(true);
      await login({ identifier: identifier.trim(), password, expectedRole: 'student' });
      success('Signed in successfully.');
      navigate('/student/dashboard');
    } catch (err: any) {
      error(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Student Intake Portal
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white font-display">
              Student Sign In
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Report campus concerns and monitor real-time facilities resolution.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                Email or Student ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="student@campus.edu or STU1001"
                  required
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  autoComplete="current-password"
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
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-black/5 dark:border-white/5 text-center space-y-2">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Don't have a registered account?{' '}
              <Link
                to="/student/register"
                className="font-bold text-black dark:text-white hover:text-[#ff3b00] dark:hover:text-[#ff3b00] underline"
              >
                Register here
              </Link>
            </p>
            <p className="text-xs text-slate-400">
              Campus Facilities Staff?{' '}
              <Link
                to="/resolver/login"
                className="font-semibold text-[#ff3b00] hover:underline"
              >
                Go to Resolver Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
