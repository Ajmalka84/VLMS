import React from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Server,
  Database,
  Clock,
  Activity,
  Layers,
  ArrowRight,
  Truck,
  FileSpreadsheet,
  Zap,
  Users,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { StatusBadge } from '../components/common/StatusBadge';
import { HealthData } from '../api/health';
import { useAuth } from '../context/AuthContext';

interface LayoutContext {
  health: HealthData | null;
  loading: boolean;
  refreshHealth: () => Promise<void>;
}

export const DashboardPage: React.FC = () => {
  const { health, loading, refreshHealth } = useOutletContext<LayoutContext>();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDbUp = health?.database?.status === 'up';
  const uptimeSeconds = health?.uptime ?? 0;
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  const uptimeFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600/20 via-slate-900 to-slate-950 p-6 sm:p-8 border border-amber-500/20 shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            {isSuperAdmin ? 'Super Admin Console' : 'Customer Workspace'}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            {isSuperAdmin
              ? 'SaaS Administration & Operations'
              : user?.businessName || 'Vehicle Load Management System'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {isSuperAdmin
              ? 'Manage customer business onboarding, account status, security resets, and platform configuration.'
              : 'Record vehicle loads on-site and generate automated C/O settlement reports. Connected live to the NestJS backend and PostgreSQL database.'}
          </p>
        </div>
      </div>

      {/* Super Admin Quick Access Callouts */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="highlight" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Customer Accounts</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Onboard customer businesses, toggle active status, and reset passwords.
                </p>
              </div>
            </div>
            <Link
              to="/admin/users"
              id="go-to-customers-btn"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer"
            >
              Manage Customers <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card variant="highlight" className="p-5 flex flex-col justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Global Master Config</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage global vehicle categories (Dumper, Tipper) and material specifications.
                </p>
              </div>
            </div>
            <Link
              to="/settings"
              id="go-to-global-master-btn"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              Configure Master Data <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      )}

      {/* System Health Card */}
      <Card variant="glass" id="system-health-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Live System Connectivity
              </h2>
              <p className="text-xs text-slate-400">
                End-to-end communication status from Browser → Frontend → Backend → PostgreSQL
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              status={loading && !health ? 'loading' : isDbUp ? 'ok' : 'error'}
              label={
                loading && !health
                  ? 'Connecting...'
                  : isDbUp
                  ? 'System Operational'
                  : 'Service Degraded'
              }
            />
            <button
              onClick={() => void refreshHealth()}
              disabled={loading}
              className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-2 cursor-pointer"
            >
              Test Ping
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {/* Backend Service Status */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">NestJS API</div>
              <div className="text-sm font-semibold text-slate-100 mt-0.5">
                {health?.status === 'ok' ? 'Online (v1)' : 'Offline / Unreachable'}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Port 3000 • Prefix /api/v1
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">PostgreSQL Database</div>
              <div className="text-sm font-semibold text-slate-100 mt-0.5">
                {isDbUp ? (
                  <span className="text-emerald-400">
                    Connected ({health?.database.latencyMs ?? 0}ms)
                  </span>
                ) : (
                  <span className="text-rose-400">Disconnected</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Prisma 7.9 • PostgreSQL 16
              </div>
            </div>
          </div>

          {/* Uptime & Timestamp */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Backend Uptime</div>
              <div className="text-sm font-semibold text-slate-100 mt-0.5">
                {uptimeFormatted}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 truncate max-w-[180px]">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Action Preview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" className="space-y-3 hover:border-slate-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Load Entry (Hurdle 8)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Record vehicle loads on site with automatic rate resolution by Site, Vehicle Type, and Material.
          </p>
          <div className="pt-2 flex items-center text-xs font-semibold text-amber-400 gap-1">
            Coming in Hurdle 8 <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 hover:border-slate-700 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">C/O Settlement (Hurdle 9-10)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate contractor settlement reports and shareable PDFs with immutable load history totals.
          </p>
          <div className="pt-2 flex items-center text-xs font-semibold text-emerald-400 gap-1">
            Coming in Hurdle 9 <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>

        <Card variant="glass" className="space-y-3 hover:border-slate-700 transition-colors sm:col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Master Data (Hurdle 7)</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Configure Sites, Vehicles, Contractors, and dynamic rate matrix tables.
          </p>
          <div className="pt-2 flex items-center text-xs font-semibold text-indigo-400 gap-1">
            Coming in Hurdle 7 <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </Card>
      </div>
    </div>
  );
};
