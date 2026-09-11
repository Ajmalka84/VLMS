import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Truck,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Wallet,
  TrendingUp,
  Coins,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  Card,
  PageHeader,
  MetricCard,
  EmptyState,
  Badge,
  CustomSelect,
  CustomSelectOption,
} from '../components/common';
import { HealthData } from '../api/health';
import { useAuth } from '../context/AuthContext';
import { useMasterCache } from '../context/MasterCacheContext';
import { Load } from '../api/loads';
import { CurrentDrawerResponse } from '../api/shifts';
import { ExpenseSummary } from '../api/expenses';
import { PartnerSettlementResponse } from '../api/reports';
import { fetchDashboardSummaryApi, DashboardSummaryResponse } from '../api/dashboard';
import { formatINR } from '../utils/formatters';
import { queryCache } from '../utils/queryCache';

interface LayoutContext {
  health: HealthData | null;
  loading: boolean;
  refreshHealth: () => Promise<void>;
}

type DatePreset = 'today' | 'yesterday' | 'last7days' | 'thismonth';

export const DashboardPage: React.FC = () => {
  const { health } = useOutletContext<LayoutContext>();
  const { user } = useAuth();
  const { sites } = useMasterCache();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isCoPartner = user?.role === 'CO_PARTNER';
  const isSiteBoy = user?.role === 'SITE_BOY';
  const isDbUp = health?.database?.status === 'up';

  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
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
  const [partnerReport, setPartnerReport] = useState<PartnerSettlementResponse | null>(null);

  // Available sites for this user
  const visibleSites = useMemo(() => {
    if (isSiteBoy && user?.assignedSiteId) {
      return sites.filter((s) => s.id === user.assignedSiteId);
    }
    if (user?.assignedSiteIds && user.assignedSiteIds.length > 0) {
      return sites.filter((s) => user.assignedSiteIds!.includes(s.id));
    }
    return sites;
  }, [sites, user, isSiteBoy]);

  // Set initial site selection
  useEffect(() => {
    if (isSiteBoy && user?.assignedSiteId) {
      setSelectedSiteId(user.assignedSiteId);
    }
  }, [isSiteBoy, user]);

  const siteOptions = useMemo<CustomSelectOption[]>(() => {
    const opts: CustomSelectOption[] = [
      {
        value: 'all',
        label: 'All Sites (Consolidated)',
        subLabel: `${visibleSites.length} quarries active`,
        icon: <Building2 className="w-4 h-4 text-amber-500" />,
      },
    ];
    visibleSites.forEach((s) => {
      opts.push({
        value: s.id,
        label: s.siteName,
        subLabel: s.location || 'Quarry site',
        icon: <Building2 className="w-4 h-4 text-muted" />,
      });
    });
    return opts;
  }, [visibleSites]);

  const effectiveSiteId = selectedSiteId === 'all' ? undefined : selectedSiteId;

  // Calculate current date bounds based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (datePreset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      return { startDate: yestStr, endDate: yestStr, label: 'Yesterday' };
    }
    if (datePreset === 'last7days') {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 6);
      const past7Str = past7.toISOString().split('T')[0];
      return { startDate: past7Str, endDate: todayStr, label: 'Last 7 Days' };
    }
    if (datePreset === 'thismonth') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthStartStr = monthStart.toISOString().split('T')[0];
      return { startDate: monthStartStr, endDate: todayStr, label: 'This Month' };
    }
    return { startDate: todayStr, endDate: todayStr, label: 'Today' };
  }, [datePreset]);

  // Single Consolidated High-Speed Dashboard Bundle Fetch
  const loadDashboardData = useCallback(async () => {
    if (isSuperAdmin) return;
    const siteKey = effectiveSiteId || 'all';
    const bundleKey = `dashboard_bundle_${siteKey}_${datePreset}_${dateRange.startDate}_${dateRange.endDate}`;

    // 0ms Cache First (SWR)
    const cachedData = queryCache.get<DashboardSummaryResponse>(bundleKey);

    if (cachedData) {
      setTodayLoads(cachedData.loads.recentLoads || []);
      setLoadsSummary({
        totalLoads: cachedData.loads.totalLoads || 0,
        totalTurnover: cachedData.loads.totalTurnover || 0,
        cashAmount: cachedData.loads.cashAmount || 0,
        creditAmount: cachedData.loads.creditAmount || 0,
      });
      setDrawerData(cachedData.drawer);
      setExpenseSummary(cachedData.expenses);
      setPartnerReport(cachedData.partnerReport);
    } else {
      setLoadingStats(true);
    }

    try {
      const data = await fetchDashboardSummaryApi({
        siteId: effectiveSiteId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      setTodayLoads(data.loads.recentLoads || []);
      setLoadsSummary({
        totalLoads: data.loads.totalLoads || 0,
        totalTurnover: data.loads.totalTurnover || 0,
        cashAmount: data.loads.cashAmount || 0,
        creditAmount: data.loads.creditAmount || 0,
      });
      setDrawerData(data.drawer);
      setExpenseSummary(data.expenses);
      setPartnerReport(data.partnerReport);

      queryCache.set(bundleKey, data);
    } catch (err) {
      console.error('Failed to load dashboard statistics bundle', err);
    } finally {
      setLoadingStats(false);
    }
  }, [effectiveSiteId, isSuperAdmin, datePreset, dateRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Financial aggregates
  const totalRevenue = loadsSummary.totalTurnover;
  const totalExpenses = expenseSummary.totalExpenses;
  const netOperatingProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? Math.round((netOperatingProfit / totalRevenue) * 100) : 0;

  // Co-Partner personal calculations
  const partnerSharePct = partnerReport?.slices?.[0]?.sharePercentage ?? 0;
  const partnerDividend =
    partnerReport?.summary?.netDividendPayable ??
    (netOperatingProfit > 0 && partnerSharePct > 0 ? (netOperatingProfit * partnerSharePct) / 100 : 0);

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
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Super Admin Top Header */}
      {isSuperAdmin && (
        <PageHeader
          title="Super Admin Platform Overview"
          subtitle="Multi-tenant quarry SaaS metrics, customer billing, and active licenses."
        />
      )}

      {/* Subscription Alert Pill for Trial or Expiring */}
      {!isSuperAdmin && user && (user.subscriptionStatus === 'TRIAL_ACTIVE' || user.subscriptionStatus === 'EXPIRING_SOON') && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>{user.subscriptionPlan === 'TRIAL' ? '7-Day Free Pilot Active' : 'Annual Package Active'}</strong> • {user.daysRemaining ?? 0} days remaining
            </span>
          </div>
          <span className="text-[11px] font-mono text-amber-500/80">Support: +91 96561 74088</span>
        </div>
      )}

      {/* Control Bar: Multi-Site Selector + Date Range Presets */}
      {!isSuperAdmin && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-subtle shadow-lg">
          {/* Left: Site Selector */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {visibleSites.length > 1 ? (
              <div className="w-full sm:w-64">
                <CustomSelect
                  options={siteOptions}
                  value={selectedSiteId}
                  onChange={setSelectedSiteId}
                  placeholder="Choose Quarry Site"
                  searchable={false}
                  fullWidth={true}
                />
              </div>
            ) : (
              <span className="text-xs font-semibold text-secondary truncate">
                {visibleSites[0]?.siteName || 'All Sites'} • {visibleSites[0]?.location || 'Active Quarry'}
              </span>
            )}
          </div>

          {/* Right: Date Range Presets */}
          <div className="flex items-center gap-1.5 bg-surface-solid p-1 rounded-xl border border-subtle shrink-0 self-start lg:self-auto overflow-x-auto max-w-full">
            <span className="text-[11px] font-bold text-muted px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-amber-500" /> Period:
            </span>
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7days', label: 'Last 7 Days' },
                { id: 'thismonth', label: 'This Month' },
              ] as const
            ).map((preset) => {
              const active = datePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id)}
                  type="button"
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer touch-manipulation min-h-[34px] ${
                    active
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                      : 'text-secondary hover:text-primary hover:bg-surface-elevated'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 4 Role-Adaptive Operational & Financial KPI Cards */}
      {!isSuperAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* CARD 1: REVENUE / LOADS */}
          <MetricCard
            label={
              isCoPartner
                ? `${dateRange.label} Gross Turnover`
                : isSiteBoy
                ? `${dateRange.label}'s Loads`
                : `${dateRange.label}'s Turnover`
            }
            value={isSiteBoy ? `${loadsSummary.totalLoads} trips` : formatINR(totalRevenue)}
            subtext={
              isSiteBoy
                ? `${formatINR(totalRevenue)} dispatched`
                : `${loadsSummary.totalLoads} trips • ${formatINR(loadsSummary.cashAmount)} Cash`
            }
            icon={<DollarSign className="w-5 h-5 text-emerald-500" />}
            variant="emerald"
          />

          {/* CARD 2: SITE EXPENSES / CASH COLLECTED */}
          <MetricCard
            label={isSiteBoy ? 'Cash Collected' : 'Operating Expenses'}
            value={isSiteBoy ? formatINR(loadsSummary.cashAmount) : formatINR(totalExpenses)}
            subtext={
              isSiteBoy
                ? `${formatINR(loadsSummary.creditAmount)} on Credit`
                : `${expenseSummary.count} entries • ${formatINR(expenseSummary.totalCashDrawerExpenses)} from drawer`
            }
            icon={isSiteBoy ? <Coins className="w-5 h-5 text-amber-500" /> : <Layers className="w-5 h-5 text-purple-500" />}
            variant={isSiteBoy ? 'amber' : 'default'}
          />

          {/* CARD 3: NET OPERATING PROFIT / LIVE CASH DRAWER */}
          <MetricCard
            label={isSiteBoy ? 'Live Cash Drawer' : isCoPartner ? 'Joint Net Profit' : 'Net Operating Profit'}
            value={
              isSiteBoy
                ? drawerData
                  ? formatINR(drawerData.expectedCash)
                  : formatINR(loadsSummary.cashAmount)
                : formatINR(netOperatingProfit)
            }
            subtext={
              isSiteBoy
                ? drawerData?.existingShift
                  ? 'Shift closed & recorded'
                  : 'Active shift drawer in hand'
                : `${profitMargin}% margin (Turnover − Expenses)`
            }
            icon={isSiteBoy ? <Wallet className="w-5 h-5 text-blue-500" /> : <TrendingUp className={`w-5 h-5 ${netOperatingProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />}
            variant={isSiteBoy ? 'blue' : netOperatingProfit >= 0 ? 'emerald' : 'rose'}
          />

          {/* CARD 4: CO-PARTNER EQUITY DIVIDEND / LIVE CASH DRAWER / MACHINE HOURS */}
          <MetricCard
            label={
              isCoPartner
                ? `Your Profit Share (${partnerSharePct}%)`
                : isSiteBoy
                ? 'Machinery Working Hours'
                : 'Live Cash in Hand'
            }
            value={
              isCoPartner
                ? formatINR(partnerDividend)
                : isSiteBoy
                ? `${expenseSummary.totalMachineHours} hrs`
                : drawerData
                ? formatINR(drawerData.expectedCash)
                : formatINR(loadsSummary.cashAmount)
            }
            subtext={
              isCoPartner
                ? `Your estimated personal dividend (${dateRange.label.toLowerCase()})`
                : isSiteBoy
                ? `${formatINR(expenseSummary.totalMachineRent)} machine rental`
                : selectedSiteId === 'all'
                ? `Physical cash across all quarry drawers`
                : `Physical cash in active site drawer`
            }
            icon={isCoPartner ? <Wallet className="w-5 h-5 text-amber-500" /> : isSiteBoy ? <Clock className="w-5 h-5 text-purple-500" /> : <Wallet className="w-5 h-5 text-amber-500" />}
            variant="amber"
          />
        </div>
      )}

      {/* Super Admin Module Overview Cards */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="glass" className="p-6 space-y-4 border border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Customer Accounts Management</h3>
                <p className="text-xs text-secondary">Onboard customer quarries, manage 7-day trials, and renew annual packages.</p>
              </div>
            </div>
            <Link
              to="/admin/users"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/20 transition cursor-pointer min-h-[42px] touch-manipulation"
            >
              Open Customers Console <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Card>

          <Card variant="glass" className="p-6 space-y-4 border border-subtle">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-primary">Tenant Financial Reports</h3>
                <p className="text-xs text-secondary">Query site cashflows, contractor settlements, and machine logbooks across all tenants.</p>
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
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                Latest Gate Dispatches ({dateRange.label})
              </h2>
              <Link
                to="/loads?tab=history"
                className="text-xs text-amber-500 hover:text-amber-400 font-bold transition flex items-center gap-1"
              >
                View All Loads ({loadsSummary.totalLoads}) <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="rounded-2xl border border-subtle bg-surface-solid overflow-hidden shadow-xl">
              {todayLoads.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Truck className="w-8 h-8 text-amber-500" />}
                    title={`No loads dispatched in ${dateRange.label.toLowerCase()}`}
                    description="Register gate exits for dumpers and lorries to track daily site turnover."
                    actionText="Record First Load"
                    onAction={() => (window.location.href = '/loads')}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-secondary">
                    <thead className="bg-surface-elevated text-[10px] uppercase font-bold text-secondary border-b border-subtle">
                      <tr>
                        <th className="px-4 py-3">Vehicle</th>
                        <th className="px-4 py-3">Material</th>
                        <th className="px-4 py-3">Contractor</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-subtle">
                      {todayLoads.map((load) => (
                        <tr key={load.id} className="hover:bg-surface-elevated transition">
                          <td className="px-4 py-3 font-mono font-bold text-primary whitespace-nowrap">
                            {load.vehicle?.vehicleNumber}
                          </td>
                          <td className="px-4 py-3 font-medium text-primary">
                            {load.materialType?.name}
                          </td>
                          <td className="px-4 py-3 text-secondary truncate max-w-[140px]">
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
                          <td className="px-4 py-3 font-mono font-bold text-primary text-right whitespace-nowrap">
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
            <h2 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-500" />
              Materials Dispatched
            </h2>

            <Card variant="glass" className="p-4 border border-subtle bg-surface-solid space-y-3">
              {materialStats.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No materials logged in this period</p>
              ) : (
                <div className="space-y-2.5">
                  {materialStats.map((item) => {
                    const pct =
                      loadsSummary.totalLoads > 0
                        ? Math.round((item.count / loadsSummary.totalLoads) * 100)
                        : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-primary">{item.name}</span>
                          <span className="text-muted font-mono">
                            {item.count} loads ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-subtle">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all"
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
            <Card variant="glass" className="p-4 border border-subtle bg-surface-solid space-y-2 text-xs">
              <span className="font-bold text-muted uppercase tracking-wider block">Operational Shortcuts</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/shift-drawer"
                  className="p-2.5 rounded-xl bg-surface border border-subtle hover:border-slate-400 dark:hover:border-slate-700 text-secondary hover:text-primary font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <Wallet className="w-3.5 h-3.5 text-cyan-500" /> Cash Drawer
                </Link>
                <Link
                  to="/expenses"
                  className="p-2.5 rounded-xl bg-surface border border-subtle hover:border-slate-400 dark:hover:border-slate-700 text-secondary hover:text-primary font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <DollarSign className="w-3.5 h-3.5 text-purple-500" /> Site Expenses
                </Link>
                <Link
                  to="/reports"
                  className="p-2.5 rounded-xl bg-surface border border-subtle hover:border-slate-400 dark:hover:border-slate-700 text-secondary hover:text-primary font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Statements
                </Link>
                <Link
                  to="/settings"
                  className="p-2.5 rounded-xl bg-surface border border-subtle hover:border-slate-400 dark:hover:border-slate-700 text-secondary hover:text-primary font-medium flex items-center gap-1.5 transition touch-manipulation min-h-[40px]"
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" /> Master Data
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* System Status Footer */}
      <div className="p-3.5 rounded-2xl bg-surface border border-subtle flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <CheckCircle2 className={`w-3.5 h-3.5 ${isDbUp ? 'text-emerald-500' : 'text-amber-500'}`} />
          <span>{isDbUp ? 'System Operational' : 'Connecting to Server...'}</span>
        </div>
        <span className="font-mono text-[10px]">VLMS v1.0 • Quarry Management</span>
      </div>
    </div>
  );
};
