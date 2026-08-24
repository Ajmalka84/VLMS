import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';

export const LoginPage: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Forgot Password Support Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      setError('Please enter your mobile number or email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      const authUser = await login({ mobile: mobile.trim(), password });

      // Role-based landing:
      // Super Admin -> Always Customers Console ('/admin/users')
      // Customer User -> Always Loads Cockpit ('/loads')
      if (authUser.role === 'SUPER_ADMIN') {
        navigate('/admin/users', { replace: true });
      } else {
        navigate('/loads', { replace: true });
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <h1 className="text-4xl font-black tracking-tight text-white">
            VLMS<span className="text-amber-400">.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium tracking-wide">
            Vehicle Load Management System
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="p-6 sm:p-8 space-y-6 border border-slate-800/80 shadow-2xl rounded-3xl">
          <div className="border-b border-slate-800/80 pb-3">
            <h2 className="text-lg font-bold text-white">Sign In</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your mobile number or email and password to continue.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile / Username Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="mobile-input"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider block"
              >
                Mobile Number / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="mobile-input"
                  type="text"
                  placeholder="Enter mobile number or email"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password-input"
                  className="text-xs font-semibold text-slate-300 uppercase tracking-wider block"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline underline-offset-2 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          VLMS SaaS Platform • Quarry & Logistics Management
        </p>
      </div>

      {/* ========================================================================= */}
      {/*                       ACCOUNT RECOVERY SUPPORT MODAL                      */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <Card variant="highlight" className="w-full max-w-md p-6 space-y-4 relative border border-slate-800 shadow-2xl">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Account Password Recovery</h2>
                <p className="text-xs text-slate-400">Security notice for quarry customer accounts.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
              <p>
                To protect quarry dispatch and financial ledger security, password resets are controlled centrally.
              </p>
              <p>
                Please contact your <span className="text-amber-400 font-bold">Quarry Administrator</span> or <span className="text-white font-bold">VLMS Support (+91 99999 99999)</span> to reset your account password.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                Understood
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

