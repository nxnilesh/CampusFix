import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/ToastContext';

type ResetStep = 'request' | 'verify' | 'reset' | 'complete';

export const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error, success } = useToast();
  const isResolver = searchParams.get('portal') === 'resolver';
  const loginPath = isResolver ? '/resolver/login' : '/student/login';
  const [step, setStep] = useState<ResetStep>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      await api.requestPasswordReset(email.trim());
      setStep('verify');
      success('If an account exists for that email, a reset code has been sent.');
    } catch (err: any) {
      error(err.message || 'Unable to send a reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setLoading(true);
      const result = await api.verifyPasswordResetCode({ email: email.trim(), otp });
      setResetToken(result.token);
      setStep('reset');
    } catch (err: any) {
      error(err.message || 'The reset code is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      await api.resetPassword({ token: resetToken, password });
      setStep('complete');
      success('Password reset successfully.');
    } catch (err: any) {
      error(err.message || 'Unable to reset your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      await api.requestPasswordReset(email.trim());
      success('If an account exists for that email, a new reset code has been sent.');
    } catch (err: any) {
      error(err.message || 'Unable to send a reset code.');
    } finally {
      setLoading(false);
    }
  };

  const title = step === 'request'
    ? 'Forgot Password'
    : step === 'verify'
    ? 'Verify Reset Code'
    : step === 'reset'
    ? 'Choose a New Password'
    : 'Password Updated';

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12 bg-[#ececee] dark:bg-[#0a0a0c] transition-colors">
      <div className="w-full max-w-md">
        <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 shadow-2xl space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ff3b00] shadow-[0_0_8px_#ff3b00]" />
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Account Recovery
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-black dark:text-white font-display">
              {title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {step === 'request' && 'Enter the email address associated with your CampusFix account.'}
              {step === 'verify' && `Enter the 6-digit code sent to ${email}.`}
              {step === 'reset' && 'Create a new password for your account.'}
              {step === 'complete' && 'Your password has been changed. Sign in with your new password.'}
            </p>
          </div>

          {step === 'complete' ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-[#ff3b00]" />
              <button
                type="button"
                onClick={() => navigate(loginPath)}
                className="w-full py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
              </button>
            </div>
          ) : (
            <form
              onSubmit={
                step === 'request'
                  ? handleRequestCode
                  : step === 'verify'
                  ? handleVerifyCode
                  : handleResetPassword
              }
              className="space-y-4"
            >
              {step === 'request' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="student@campus.edu"
                      required
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                    />
                  </div>
                </div>
              )}

              {step === 'verify' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                    6-Digit Code
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}
                      placeholder="Enter the code from your email"
                      required
                      autoComplete="one-time-code"
                      className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                    />
                  </div>
                </div>
              )}

              {step === 'reset' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        required
                        autoComplete="new-password"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 font-mono uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Re-enter new password"
                        required
                        autoComplete="new-password"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-black/10 dark:border-white/10 bg-[#f7f7f8] dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#ff3b00] text-black dark:text-white transition-all"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-full bg-black hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-bold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{step === 'request' ? 'Send Reset Code' : step === 'verify' ? 'Verify Code' : 'Reset Password'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#ff3b00]" />
                  </>
                )}
              </button>

              {step === 'verify' && (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="w-full text-xs font-semibold text-[#ff3b00] hover:underline disabled:opacity-50"
                >
                  Resend code
                </button>
              )}
            </form>
          )}

          {step !== 'complete' && (
            <div className="pt-4 border-t border-black/5 dark:border-white/5 text-center">
              <Link to={loginPath} className="text-xs font-bold text-black dark:text-white hover:text-[#ff3b00] underline">
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
