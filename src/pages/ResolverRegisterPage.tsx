import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  User,
  Mail,
  Building,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

export const ResolverRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [department, setDepartment] = useState('Campus Infrastructure & Maintenance');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { error, success } = useToast();
  const navigate = useNavigate();

  const resolverDepartments = [
    'Campus Infrastructure & Maintenance',
    'IT & Network Operations',
    'Electrical Services',
    'Civil Maintenance',
    'Laboratory Support',
    'Safety & Security',
    'General Administration',
  ];

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      error('Please fill in your name, email, and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error('Please enter a valid staff email address.');
      return;
    }

    if (password.length < 8) {
      error('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await api.registerResolver({
        name: name.trim(),
        email: email.trim(),
        userId: userId.trim() ? userId.trim().toUpperCase() : undefined,
        department,
        password,
      });
      success('Staff account registered successfully.');
      setIsSuccess(true);
    } catch (err: any) {
      error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c]">
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-black text-white border border-white/15 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 mb-2 shadow-md">
            <CheckCircle2 className="w-7 h-7 text-[#ff3b00]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white font-display">
            Staff Identity Registered.
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Staff account for <strong className="text-white font-bold">{email}</strong> is provisioned for campus facilities oversight.
          </p>
          <button
            type="button"
            onClick={() => navigate('/resolver/login')}
            className="w-full mt-4 py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <span>Continue to Resolver Sign In</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-black text-white border border-white/15 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Facilities Administration
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
              Register Staff ID
            </h1>
            <p className="text-xs text-zinc-400">
              Create an administrative resolver account to process campus maintenance dispatches.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Full Name <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Staff Email <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@campus.edu"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
                  Resolver / Staff ID
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">Optional</span>
              </div>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  placeholder="e.g. RES1001 (auto-generated if blank)"
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Department / Unit
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all appearance-none"
                >
                  {resolverDepartments.map((d) => (
                    <option key={d} value={d} className="bg-zinc-900 text-white">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Password <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  className="w-full pl-11 pr-11 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Confirm Password <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 rounded-full bg-[#ff3b00] hover:bg-[#e03400] text-white font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-[#ff3b00]/20"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Create Resolver Identity</span>
                  <ArrowRight className="w-3.5 h-3.5 text-white" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/10 text-center">
            <p className="text-xs text-zinc-400">
              Already have resolver access?{' '}
              <Link to="/resolver/login" className="font-bold text-white hover:text-[#ff3b00] underline">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
