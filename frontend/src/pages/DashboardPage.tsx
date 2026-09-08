import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Truck,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  MapPin,
  Clock,
  DollarSign,
  Wallet,
  Coins,
  RefreshCw,
} from 'lucide-react';
import {
  Card,
  PageHeader,
  MetricCard,
  EmptyState,
  Button,
  Badge,
} from '../components/common';
import { HealthData } from '../api/health';
import { useAuth } from '../context/AuthContext';
import { useMasterCache } from '../context/MasterCacheContext';
import { getLoadsApi, Load } from '../api/loads';
import { getCurrentDrawerApi, CurrentDrawerResponse } from '../api/shifts';
import { fetchExpensesApi, ExpenseSummary } from '../api/expenses';
import { formatINR } from '../utils/formatters';

import { queryCache } from '../utils/queryCache';

interface LayoutContext {
  health: HealthData | null;
  loading: boolean;
  refreshHealth: () => Promise<void>;
}

export const DashboardPage: React.FC = () => {
  const { health } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const { sites } = useMasterCache();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isDbUp = health?.database?.status === 'up';

  const [todayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [todayLoads, setTodayLoads] = useState<Load[]>([]);
  const [loadsSummary, setLoadsSummary] = useState({
    totalLoads: 0,
    totalTurnover: 0,
    cashAmount: 0,
    creditAmount: 0,
  });
  const [drawerData, setDrawerData] = useState<CurrentDrawerResponse | null>(null);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    totalCashDrawerExpenses: 0,
    totalMachineRent: 0,
    totalAdvancesPaid: 0,
    totalMachineHours: 0,
    count: 0,
  });

  const activeSite = useMemo(() => {
    if (user?.role === 'SITE_BOY' && user?.assignedSiteId) {
      return sites.find((s) => s.id === user.assignedSiteId) || sites[0];
    }
    return sites.find((s) => s.isActive !== false) || sites[0];
  }, [sites, user]);

  const loadDashboardData = useCallback(async () => {
    if (isSuperAdmin) return;
    const siteId = activeSite?.id;
    const loadsKey = `dashboard_loads_${siteId || 'all'}_${todayDate}`;
    const drawerKey = `dashboard_drawer_${siteId || 'all'}_${todayDate}`;
    const expKey = `dashboard_exp_${siteId || 'all'}_${todayDate}`;

    // 0ms Cache First (SWR)
    const cachedLoads = queryCache.get<{ loads: Load[]; summary: typeof loadsSummary }>(loadsKey);
    const cachedDrawer = queryCache.get<CurrentDrawerResponse>(drawerKey);
    const cachedExp = queryCache.get<ExpenseSummary>(expKey);

    let hasCached = false;
    if (cachedLoads) {
      setTodayLoads(cachedLoads.loads);
      setLoadsSummary(cachedLoads.summary);
      hasCached = true;
    }
    if (cachedDrawer) {
      setDrawerData(cachedDrawer);
      hasCached = true;
    }
    if (cachedExp) {
      setExpenseSummary(cachedExp);
      hasCached = true;
    }

    if (!hasCached) {
      setLoadingStats(true);
    }

    try {
      // Parallel Concurrent Fetching (Loads + Live Drawer + Site Expenses)
      const [loadsResult, drawerResult, expResult] = await Promise.allSettled([
        getLoadsApi({
          siteId: siteId || undefined,
          startDate: todayDate,
          endDate: todayDate,
          limit: 5,
        }),
        siteId ? getCurrentDrawerApi(siteId, todayDate) : Promise.resolve(null),
        fetchExpensesApi({
          siteId: siteId || undefined,
          startDate: todayDate,
          endDate: todayDate,
        }),
      ]);

      if (loadsResult.status === 'fulfilled' && loadsResult.value) {
        const loadsRes = loadsResult.value;
        const newLoads = loadsRes.loads || [];
        const newSummary = {
          totalLoads: loadsRes.summary?.totalLoads || 0,
          totalTurnover: loadsRes.summary?.totalAmount || 0,
          cashAmount: loadsRes.summary?.totalCashAmount || 0,
          creditAmount: loadsRes.summary?.totalCreditAmount || 0,
        };
        setTodayLoads(newLoads);
        setLoadsSummary(newSummary);
        queryCache.set(loadsKey, { loads: newLoads, summary: newSummary });
      }

      if (drawerResult.status === 'fulfilled' && drawerResult.value) {
        setDrawerData(drawerResult.value);
        queryCache.set(drawerKey, drawerResult.value);
      }

      if (expResult.status === 'fulfilled' && expResult.value) {
        const newSummary = expResult.value.summary || {
          totalExpenses: 0,
          totalCashDrawerExpenses: 0,
          totalMachineRent: 0,
          totalAdvancesPaid: 0,
          totalMachineHours: 0,
          count: 0,
        };
        setExpenseSummary(newSummary);
        queryCache.set(expKey, newSummary);
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoadingStats(false);
    }
  }, [activeSite, isSuperAdmin, todayDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Material distribution for today's loads
  const materialStats = useMemo(() => {
    const map = new Map<string, { name: string; count: number; amount: number }>();
    todayLoads.forEach((l) => {
      const matName = l.materialType?.name || 'Standard';
      const prev = map.get(matName) || { name: matName, count: 0, amount: 0 };
      map.set(matName, {
        name: matName,
        count: prev.count + 1,
        amount: prev.amount + Number(l.amount || 0),
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [todayLoads]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Top Header & Refresh */}
      <PageHeader
        title={
          isSuperAdmin
            ? 'Super Admin Platform Overview'
            : user?.businessName || 'Quarry Operations Dashboard'
        }
        subtitle={
          isSuperAdmin
            ? 'Multi-tenant quarry SaaS metrics, customer billing, and active licenses.'
            : `Gate dispatch pulse, live cash drawer balance, and machine working hours for ${new Date(todayDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}.`
        }
        badge={activeSite && !isSuperAdmin ? activeSite.siteName : undefined}
        actions={
          !isSuperAdmin ? (
            <div className="flex items-center gap-2">
              <button
                onClick={loadDashboardData}
                disabled={loadingStats}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer min-h-[42px] touch-manipulation"
                title="Refresh Dashboard"
              >
                <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <Link
                to="/loads"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer min-h-[42px] touch-manipulation"
              >
                <Truck className="w-4 h-4" />
                <span>Record Load</span>
              </Link>
            </div>
          ) : undefined
        }
      />

      {/* Subscription Alert Pill for Trial or Expiring */}
      {!isSuperAdmin && user && (user.subscriptionStatus === 'TRIAL_ACTIVE' || user.subscriptionStatus === 'EXPIRING_SOON') && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>{user.subscriptionPlan === 'TRIAL' ? '7-Day Free Pilot Active' : 'Annual Package Active'}</strong> • {user.daysRemaining ?? 0} days remaining
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-400/80">Support: +91 96561 74088</span>
        </div>
      )}

      {/* 4 Core Operational KPI Cards */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Today's Loads"
            value={`${loadsSummary.totalLoads} trips`}
            subtext={`${formatINR(loadsSummary.totalTurnover)} dispatched`}
            icon={<Truck className="w-5 h-5 text-amber-400" />}
            variant="amber"
          />
          <MetricCard
            label="Today's Revenue"
            value={formatINR(loadsSummary.totalTurnover)}
            subtext={`${formatINR(loadsSummary.cashAmount)} Cash • ${formatINR(loadsSummary.creditAmount)} Credit`}
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
            variant="emerald"
          />
          <MetricCard
            label="Live Cash Drawer"
            value={drawerData ? formatINR(drawerData.expectedCash) : formatINR(loadsSummary.cashAmount)}
            subtext={drawerData?.existingShift ? 'Shift recorded & pending handover' : 'Shift active & open'}
            icon={<Wallet className="w-5 h-5 text-blue-400" />}
            variant="blue"
          />
          <MetricCard
            label="Machinery Hours"
            value={`${expenseSummary.totalMachineHours} hrs`}
            subtext={`${formatINR(expenseSummary.totalMachineRent)} machine rental`}
            icon={<Clock className="w-5 h-5 text-purple-400" />}
            variant="default"
          />
        </div>
      )}

      {/* Super Admin Module Overview Cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="glass" className="p-6 space-y-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Customer Accounts Management</h3>
                <p className="text-xs text-slate-400">Onboard customer quarries, manage 7-day trials, and renew annual packages.</p>
              </div>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition cursor-pointer min-h-[42px] touch-manipulation"
            >
              Open Customers Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card variant="glass" className="p-6 space-y-4 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Tenant Financial Reports</h3>
                <p className="text-xs text-slate-400">Query site cashflows, contractor settlements, and machine logbooks across all tenants.</p>
              </div>
            </div>
            <Link
              to="/reports"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer min-h-[42px] touch-manipulation"
            >
              Open Financial Reports <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>
        </div>
      )}

      {/* Non-Admin Visual Breakdown & Recent 5 Trips */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Recent 5 Dispatches Stream */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                Latest Gate Dispatches (Today)
              </h2>
              <Link
                to="/loads"
                className="text-xs text-amber-400 hover:text-amber-300 font-bold transition flex items-center gap-1"
              >
                View All Loads ({loadsSummary.totalLoads}) <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
              {todayLoads.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Truck className="w-8 h-8 text-amber-400" />}
                    title="No loads dispatched yet today"
                    description="Register gate exits for dumpers and lorries to track daily site turnover."
                    actionText="Record First Load"
                    onAction={() => window.location.href = '/loads'}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Contractor</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {todayLoads.map((load) => (
                        <tr key={load.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-4 py-3 font-mono font-bold text-white whitespace-nowrap">
                            {load.vehicle?.vehicleNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-200">
                            {load.materialType?.name}
                          </td>
                          <td className="px-4 py-3 text-slate-400 truncate max-w-[140px]">
                            {load.contractor?.name || 'Direct / Spot Cash'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
                              variant={load.paymentType === 'CASH' ? 'emerald' : 'amber'}
                              size="sm"
                            >
                              {load.paymentType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-white text-right whitespace-nowrap">
                            {formatINR(load.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Col: Today's Material Distribution Summary */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Materials Dispatched
            </h2>

            <Card variant="glass" className="p-4 border border-slate-800 bg-slate-900/60 space-y-3">
              {materialStats.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No materials logged yet today</p>
              ) : (
                <div className="space-y-2.5">
                  {materialStats.map((item) => {
                    const pct = loadsSummary.totalLoads > 0 ? Math.round((item.count / loadsSummary.totalLoads) * 100) : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-200">{item.name}</span>
                          <span className="text-slate-400 font-mono">
                            {item.count} loads ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className="bg-amber-400 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Quick Links Card */}
            <Card variant="glass" className="p-4 border border-slate-800 bg-slate-900/60 space-y-2 text-xs">
              <span className="font-bold text-slate-400 uppercase tracking-wider block">Operational Shortcuts</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/shift-drawer"
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <Wallet className="w-3.5 h-3.5 text-cyan-400" /> Cash Drawer
                </Link>
                <Link
                  to="/expenses"
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <DollarSign className="w-3.5 h-3.5 text-purple-400" /> Site Expenses
                </Link>
                <Link
                  to="/reports"
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Statements
                </Link>
                <Link
                  to="/settings"
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-400" /> Master Data
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="p-3.5 rounded-2xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-3.5 h-3.5 ${isDbUp ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span>{isDbUp ? 'System Operational' : 'Connecting to Server...'}</span>
        </div>
        <span className="font-mono text-[10px]">VLMS v1.0 • Quarry Management</span>
      </div>
    </div>
  );
};
