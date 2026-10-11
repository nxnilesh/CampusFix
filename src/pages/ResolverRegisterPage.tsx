import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  ArrowRight,
  Building,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react';

const departments = [
  'Campus Infrastructure & Maintenance',
  'IT & Network Operations',
  'Electrical Services',
  'Civil Maintenance',
  'Laboratory Support',
  'Safety & Security',
  'General Administration',
  'Hostel Management',
  'Sports & Facilities',
  'Library Services',
];

export const ResolverRegisterPage: React.FC = () => {
  const { error, success } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !employeeId.trim() || !department) {
      error('Please complete all resolver registration fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      error('Please enter a valid official email address.');
      return;
    }
    try {
      setLoading(true);
      await api.registerResolver({
        name: name.trim(),
        email: email.trim(),
        employeeId: employeeId.trim(),
        department,
      });
      setVerificationSent(true);
      success('A verification code has been sent to your official email.');
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Resolver registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await api.verifyEmail({ email: email.trim(), otp });
      setEmailVerified(true);
      success('Email verified. Your resolver account is awaiting administrator approval.');
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Unable to verify your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      await api.resendVerificationCode(email.trim());
      success('A new verification code has been sent.');
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Unable to send a verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-lg">
        <div className="p-8 sm:p-10 rounded-3xl bg-black text-white border border-white/15 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                Facilities Administration & Operations
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-display">
              {emailVerified ? 'Registration Submitted' : verificationSent ? 'Verify Official Email' : 'Resolver Registration'}
            </h1>
            <p className="text-xs text-zinc-400">
              {emailVerified
                ? 'Your email is verified. Your resolver account will be activated after administrator approval.'
                : verificationSent
                  ? <>Enter the 6-digit verification code sent to <strong className="text-white">{email}</strong>.</>
                  : 'Register your campus staff account. Resolver access is granted only after administrator approval.'}
            </p>
          </div>

          {emailVerified ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10">
                <CheckCircle2 className="w-7 h-7 text-[#ff3b00]" />
              </div>
              <p className="text-sm font-bold">Email Verified — Approval Pending</p>
              <p className="text-xs text-zinc-400">
                Your application is pending administrator review. Resolver access will be granted only after approval.
              </p>
              <Link
                to="/resolver/login"
                className="w-full py-3.5 rounded-full bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase tracking-wide transition-all flex items-center justify-center gap-2"
              >
                <span>Return to Resolver Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
              </Link>
            </div>
          ) : verificationSent ? (
            <div className="space-y-4">
              <form onSubmit={handleVerifyEmail} className="space-y-4">
                <div>
                  <label htmlFor="resolver-otp" className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                    Verification Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      id="resolver-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      placeholder="Enter the 6-digit code"
                      autoComplete="one-time-code"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-full bg-[#ff3b00] hover:bg-[#e03400] text-white font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Email <ArrowRight className="w-3.5 h-3.5" /></>}
                </button>
              </form>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="w-full text-xs font-semibold text-[#ff3b00] hover:underline disabled:opacity-50"
              >
                Resend verification code
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} noValidate className="space-y-4">
              <div>
                <label htmlFor="resolver-name" className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                  Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="resolver-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="resolver-email" className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                  Official Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="resolver-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="staff@campus.edu"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="resolver-employee-id" className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                  Staff ID / Employee ID
                </label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="resolver-employee-id"
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    placeholder="Your campus staff ID"
                    autoComplete="off"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="resolver-department" className="block text-xs font-bold text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                  Department
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="resolver-department"
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl border border-white/15 bg-zinc-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-white transition-all appearance-none"
                  >
                    <option value="" disabled>Select department</option>
                    {departments.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                If approved, you will receive a temporary password by email and be required to change it after signing in.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-full bg-[#ff3b00] hover:bg-[#e03400] text-white font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-[#ff3b00]/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submit Application <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-white/10 text-center space-y-2">
            {!verificationSent && (
              <p className="text-xs text-zinc-500">
                Already registered?{' '}
                <Link to="/resolver/login" className="font-bold text-white hover:text-[#ff3b00] underline">
                  Resolver Sign In
                </Link>
              </p>
            )}
            <p className="text-xs text-zinc-500">
              Looking for student issue reporting?{' '}
              <Link to="/student/register" className="font-semibold text-zinc-300 hover:text-white underline">
                Student Registration
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
