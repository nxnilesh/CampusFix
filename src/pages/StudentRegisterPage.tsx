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
  Calendar,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export const StudentRegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState('3rd Year');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { error, success } = useToast();
  const navigate = useNavigate();

  const departments = [
    'Computer Science',
    'Information Technology',
    'Electronics',
    'Mechanical',
    'Civil',
    'Electrical',
    'Management',
  ];

  const years = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    'Post Graduate',
  ];

  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500 text-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500 text-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500 text-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      error('Please fill in your name, email, and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      error('Please enter a valid institutional email address.');
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
      await api.registerStudent({
        name: name.trim(),
        email: email.trim(),
        userId: userId.trim() ? userId.trim().toUpperCase() : undefined,
        department,
        year,
        password,
      });
      success('Account created successfully.');
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
        <div className="w-full max-w-md p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white dark:bg-white dark:text-black mb-2 shadow-md">
            <CheckCircle2 className="w-7 h-7 text-[#ff3b00]" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-black dark:text-white font-display">
            Account Provisioned.
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
            Your student account for <strong className="text-black dark:text-white font-bold">{email}</strong> is now registered in the campus directory.
          </p>
          <button
            type="button"
            onClick={() => navigate('/student/login')}
            className="w-full mt-4 py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
          >
            <span>Proceed to Sign In</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Institutional Directory
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white font-display">
              Student Registration
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Join the institutional network to report and track infrastructure issues.
            </p>
          </div>

          <form onSubmit={handleRegister} noValidate className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Full Name <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Campus Email <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@campus.edu"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono uppercase tracking-wider">
                  Student ID / Roll No.
                </label>
                <span className="text-[10px] text-slate-400 font-mono">Optional</span>
              </div>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  placeholder="e.g. STU1001 (auto-generated if blank)"
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                  Department
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all appearance-none"
                  >
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                  Study Year
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all appearance-none"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 font-mono uppercase tracking-wider">
                  Password <span className="text-[#ff3b00]">*</span>
                </label>
                {password && (
                  <span className={`text-[10px] font-mono font-bold ${strength.color.split(' ')[1]}`}>
                    {strength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  required
                  className="w-full pl-11 pr-11 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
                  aria-label="Toggle password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 font-mono uppercase tracking-wider">
                Confirm Password <span className="text-[#ff3b00]">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-black/5 dark:border-white/5 text-center">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Already registered?{' '}
              <Link
                to="/student/login"
                className="font-bold text-black dark:text-white hover:text-[#ff3b00] dark:hover:text-[#ff3b00] underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
