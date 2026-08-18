import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HardHat,
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';

export const LoginPage: React.FC = () => {
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.trim()) {
      setError('Please enter your mobile number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    try {
      setError(null);
      setSubmitting(true);
      await login({ mobile: mobile.trim(), password });
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please verify your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillSuperAdmin = () => {
    setMobile('9999999999');
    setPassword('Admin@12345');
    setError(null);
  };

  const fillCustomerUser = () => {
    setMobile('9876543210');
    setPassword('CustomerPass@123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 bg-slate-950 text-slate-100 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/20">
            <HardHat className="w-9 h-9 text-slate-950" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 via-amber-200 to-slate-100 bg-clip-text text-transparent">
            VLMS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Vehicle Load Management System
          </p>
        </div>

        {/* Login Card */}
        <Card variant="glass" className="p-6 sm:p-8 space-y-6 border border-slate-800/80 shadow-2xl">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-white">Sign In</h2>
            <p className="text-xs text-slate-400">
              Enter your mobile number and password to continue.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2.5 shadow-sm">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mobile Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="mobile-input"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider block"
              >
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="mobile-input"
                  type="text"
                  placeholder="Enter 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  disabled={submitting}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-sm text-white placeholder-slate-500 transition-all outline-none"
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-input"
                className="text-xs font-semibold text-slate-300 uppercase tracking-wider block"
              >
                Password
              </label>
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Fill Testing Helper */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
              Quick Test Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="fill-admin-btn"
                onClick={fillSuperAdmin}
                className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-amber-400 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Super Admin
              </button>
              <button
                type="button"
                id="fill-customer-btn"
                onClick={fillCustomerUser}
                className="py-2 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs text-emerald-400 font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5" />
                Customer User
              </button>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          VLMS SaaS Platform • Hurdle 5 Authenticated
        </p>
      </div>
    </div>
  );
};
