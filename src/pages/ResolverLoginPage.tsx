import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export const ResolverLoginPage: React.FC = () => {
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
      error('Please enter your staff email or Resolver ID, and password.');
      return;
    }

    try {
      setLoading(true);
      const user = await login({ identifier: identifier.trim(), password, expectedRole: 'resolver' });
      success('Signed in successfully to Facilities Administration.');
      navigate(user.mustChangePassword ? '/resolver/change-password' : '/resolver/dashboard');
    } catch (err: any) {
      error(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Facilities Administration & Operations
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">
              Resolver Sign In
            </h1>
            <p className="text-xs text-slate-500">
              Review institutional reports, dispatch crews, and record verified resolutions.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-mono uppercase tracking-wider">
                Staff Email or Resolver ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="staff@campus.edu or RES1001"
                  required
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 font-mono uppercase tracking-wider">
                Staff Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-11 pr-11 py-3 rounded-2xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-full bg-[#ff3b00] hover:bg-[#e03400] text-white font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-[#ff3b00]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Access Operations Console</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs">
              <Link to="/forgot-password?portal=resolver" className="font-semibold text-[#ff3b00] hover:underline">
                Forgot password?
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              New maintenance or operations staff?{' '}
              <Link
                to="/resolver/register"
                className="font-bold text-slate-900 hover:text-[#ff3b00] underline"
              >
                Register staff ID
              </Link>
            </p>
            <p className="text-xs text-slate-500">
              Looking for student issue reporting?{' '}
              <Link to="/student/login" className="text-slate-700 hover:underline">
                Go to Student Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
