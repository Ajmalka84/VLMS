import React, { useState, useEffect, useMemo } from 'react';

import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  Calendar,
  MapPin,
  Clock,
  Shield,
  FileSpreadsheet,
  Check,
  Building2,
  HelpCircle,
  Coins,
} from 'lucide-react';
import {
  Button,
  Input,
  Textarea,
  DateInput,
  CustomSelect,
  Badge,
  Modal,
  TabBar,
  Card,
  PageHeader,
  MetricCard,
  EmptyState,
} from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMasterCache } from '../context/MasterCacheContext';
import { formatINR } from '../utils/formatters';
import {
  CurrentDrawerResponse,
  ShiftReconciliationRecord,
  getCurrentDrawerApi,
  closeShiftApi,
  approveShiftApi,
  getShiftsHistoryApi,
} from '../api/shifts';
import { queryCache } from '../utils/queryCache';

export const ShiftDrawerPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const cache = useMasterCache();
  const isSiteBoy = user?.role === 'SITE_BOY';
  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  const activeSites = (cache.sites || []).filter((s) => s.isActive);
  const initialSiteId = isSiteBoy
    ? user?.assignedSiteId || activeSites[0]?.id || ''
    : activeSites[0]?.id || '';

  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Drawer Live Data State
  const [drawerData, setDrawerData] = useState<CurrentDrawerResponse | null>(null);
  const [loadingDrawer, setLoadingDrawer] = useState(true);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // History State
  const [history, setHistory] = useState<ShiftReconciliationRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<'drawer' | 'history'>('drawer');

  // Shift Close Form State
  const [openingCashInput, setOpeningCashInput] = useState<string>('');
  const [actualHandoverCash, setActualHandoverCash] = useState<string>('');
  const [shiftType, setShiftType] = useState<string>('DAY');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Memoized Select Options for 0ms Rendering
  const activeSiteOptions = useMemo(
    () =>
      activeSites.map((s) => ({
        value: s.id,
        label: s.siteName,
        subLabel: s.location || undefined,
      })),
    [activeSites]
  );

  const shiftWindowOptions = useMemo(
    () => [
      { value: 'DAY', label: 'Day Shift (06:00 AM – 06:00 PM)' },
      { value: 'NIGHT', label: 'Night Shift (06:00 PM – 06:00 AM)' },
      { value: 'GENERAL', label: 'Full Day / General Shift' },
    ],
    []
  );

  // Approve Modal

  const [approvingShift, setApprovingShift] = useState<ShiftReconciliationRecord | null>(null);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [approving, setApproving] = useState(false);

  // Load Current Drawer
  const fetchDrawer = async (siteId: string, date: string) => {
    if (!siteId) return;
    try {
      setLoadingDrawer(true);
      setDrawerError(null);
      const res = await getCurrentDrawerApi(siteId, date);
      setDrawerData(res);
      if (res.existingShift) {
        setOpeningCashInput(String(res.existingShift.openingCash));
        setActualHandoverCash(String(res.existingShift.actualHandoverCash));
        setRemarks(res.existingShift.remarks || '');
        setShiftType(res.existingShift.shiftType || 'DAY');
      } else {
        setOpeningCashInput(String(res.openingCash || 0));
        setActualHandoverCash('');
        setRemarks('');
      }
    } catch (err: any) {
      setDrawerError(err.message || 'Failed to calculate cash drawer status');
    } finally {
      setLoadingDrawer(false);
    }
  };

  // Load History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await getShiftsHistoryApi({
        siteId: isSiteBoy ? user?.assignedSiteId || undefined : undefined,
      });
      setHistory(res);
    } catch (err: any) {
      console.error('Failed to load shift history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (selectedSiteId) {
      fetchDrawer(selectedSiteId, selectedDate);
    }
  }, [selectedSiteId, selectedDate]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);
  const effectiveOpeningCash = openingCashInput !== '' && !isNaN(Number(openingCashInput))
    ? Number(openingCashInput)
    : Number(drawerData?.openingCash || 0);

  const liveCashInflows = Number(drawerData?.cashInflows || 0);
  const liveCashOutflows = Number(drawerData?.cashOutflows || 0);
  const liveExpectedCash = effectiveOpeningCash + liveCashInflows - liveCashOutflows;

  const countedNum = actualHandoverCash ? Number(actualHandoverCash) : null;
  const discrepancy =
    countedNum !== null ? countedNum - liveExpectedCash : null;

  // Submit Shift Handover
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualHandoverCash || isNaN(Number(actualHandoverCash))) {
      toast.error('Please enter a valid actual counted cash amount.');
      return;
    }

    try {
      setSubmitting(true);
      await closeShiftApi({
        siteId: selectedSiteId,
        date: selectedDate,
        shiftType,
        openingCash: effectiveOpeningCash,
        actualHandoverCash: Number(actualHandoverCash),
        remarks: remarks.trim() || undefined,
      });
      queryCache.invalidate('dashboard_');
      toast.success('Shift cash drawer recorded and submitted for owner approval!');
      await fetchDrawer(selectedSiteId, selectedDate);
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit shift handover');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve Shift Handover
  const handleApproveShift = async () => {
    if (!approvingShift) return;
    try {
      setApproving(true);
      await approveShiftApi(approvingShift.id, approveRemarks.trim() || undefined);
      queryCache.invalidate('dashboard_');
      toast.success(`Shift on ${new Date(approvingShift.date).toLocaleDateString()} approved successfully`);
      setApprovingShift(null);
      setApproveRemarks('');
      await fetchDrawer(selectedSiteId, selectedDate);
      await fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve shift handover');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Site/Date Controls */}
      <PageHeader
        title="Daily Shift Cash Drawer"
        subtitle="Reconcile daily cash collections, field disbursements, machine advances, and register handovers."
        icon={<Wallet className="w-6 h-6 text-amber-400" />}
        siteBadge={isSiteBoy ? 'Gate Supervisor' : undefined}
        actions={
          <TabBar
            activeTab={activeTab}
            onChange={(tab) => setActiveTab(tab as 'drawer' | 'history')}
            tabs={[
              { id: 'drawer', label: 'Live Cash Drawer', icon: Wallet },
              { id: 'history', label: 'Reconciliation History', icon: FileSpreadsheet },
            ]}
          />
        }
      />

      {/* Filter Bar */}
      <Card variant="glass" className="p-4 border border-slate-800 bg-slate-900/80">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Site Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              Quarry Site {isSiteBoy && <span className="text-blue-400">(Locked)</span>}
            </label>
            {isSiteBoy ? (
              <div className="w-full h-11 px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-bold flex items-center justify-between">
                <span className="truncate">
                  {activeSites.find((s) => s.id === selectedSiteId)?.siteName || 'Assigned Site'}
                </span>
                <Lock className="w-4 h-4 text-blue-400 shrink-0" />
              </div>
            ) : (
              <CustomSelect
                value={selectedSiteId}
                onChange={setSelectedSiteId}
                options={activeSiteOptions}
                placeholder="Select Quarry Site"
              />
            )}

          </div>

          {/* Date Selector */}
          <DateInput
            label="Shift Date"
            value={selectedDate}
            onChange={setSelectedDate}
            clearable={false}
          />

          {/* Quick Stats Banner */}
          <div className="sm:col-span-2 lg:col-span-1 flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Status on this Date</span>
              <span className="text-xs sm:text-sm font-bold text-white">
                {drawerData?.existingShift ? (
                  drawerData.existingShift.isApproved ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved & Locked
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Pending Owner Approval
                    </span>
                  )
                ) : (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Calculator className="w-3.5 h-3.5" /> Shift Active (Open)
                  </span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchDrawer(selectedSiteId, selectedDate)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh Balance"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDrawer ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </Card>

      {/* TAB 1: LIVE CASH DRAWER */}
      {activeTab === 'drawer' && (
        <div className="space-y-6">
          {drawerError && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-2 font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{drawerError}</span>
            </div>
          )}

          {/* 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Opening Cash"
              value={formatINR(effectiveOpeningCash, { decimals: 2 })}
              subLabel="Carried forward / start float"
              icon={<Coins className="w-5 h-5 text-slate-300" />}
              variant="default"
            />
            <MetricCard
              label="Spot Cash Inflow"
              value={`+${formatINR(drawerData?.cashInflows || 0, { decimals: 2 })}`}
              subLabel={`${drawerData?.cashLoadsCount || 0} Cash Loads`}
              icon={<ArrowDownRight className="w-5 h-5 text-emerald-400" />}
              variant="emerald"
            />
            <MetricCard
              label="Cash Outflows"
              value={`-${formatINR(drawerData?.cashOutflows || 0, { decimals: 2 })}`}
              subLabel={`${drawerData?.expensesCount || 0} Expense Entries`}
              icon={<ArrowUpRight className="w-5 h-5 text-rose-400" />}
              variant="rose"
            />
            <MetricCard
              label="Expected in Drawer"
              value={formatINR(liveExpectedCash, { decimals: 2 })}
              subLabel="Opening + Inflow - Outflow"
              icon={<Calculator className="w-5 h-5 text-amber-400" />}
              variant="amber"
            />
          </div>

          {/* Visual Cash Flow Equation Strip */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800/90 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3 text-xs sm:text-sm font-bold">
              {/* Float */}
              <div className="px-3.5 py-2 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Opening Float</span>
                <span className="text-white font-black font-mono">₹{effectiveOpeningCash.toLocaleString('en-IN')}</span>
              </div>

              <span className="text-emerald-400 font-extrabold text-base">＋</span>

              {/* Inflow */}
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 block">Gate Cash Inflows</span>
                <span className="text-emerald-300 font-black font-mono">₹{liveCashInflows.toLocaleString('en-IN')}</span>
              </div>

              <span className="text-rose-400 font-extrabold text-base">－</span>

              {/* Outflow */}
              <div className="px-3.5 py-2 rounded-2xl bg-rose-950/40 border border-rose-500/30">
                <span className="text-[10px] uppercase tracking-wider text-rose-400 block">Field Expenses</span>
                <span className="text-rose-300 font-black font-mono">₹{liveCashOutflows.toLocaleString('en-IN')}</span>
              </div>

              <span className="text-amber-400 font-extrabold text-base">＝</span>

              {/* Expected */}
              <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/40 ring-1 ring-amber-500/30">
                <span className="text-[10px] uppercase tracking-wider text-amber-300 block font-extrabold">Expected in Hand</span>
                <span className="text-amber-400 font-black font-mono text-sm sm:text-base">₹{liveExpectedCash.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 md:text-right">
              <span className="font-semibold text-slate-300">Daily Balance Equation</span>
              <p className="text-slate-500">Auto-updated with live gate dispatches & expense receipts</p>
            </div>
          </div>

          {/* Shift Handover Action Box */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2">
              <Card variant="glass" className="p-6 border border-slate-800 bg-slate-900/90 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-400" />
                      {drawerData?.existingShift ? 'Shift Handover Record' : 'Close Shift & Handover Cash'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verify opening float and enter physically counted cash in hand to compute reconciliation discrepancy.
                    </p>
                  </div>
                  {drawerData?.existingShift && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        drawerData.existingShift.isApproved
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {drawerData.existingShift.isApproved ? 'Approved & Locked' : 'Submitted (Pending Approval)'}
                    </span>
                  )}
                </div>

                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Opening Cash Balance Float Input */}
                    <Input
                      label="Opening Cash Balance (₹) *"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={drawerData?.existingShift?.isApproved}
                      placeholder="e.g. 5000"
                      value={openingCashInput}
                      onChange={(e) => setOpeningCashInput(e.target.value)}
                      leftIcon={<Coins className="w-3.5 h-3.5 text-amber-400" />}
                      className="font-black text-lg"
                    />

                    {/* Actual Counted Cash Input */}
                    <Input
                      label="Actual Counted Cash In Hand *"
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={drawerData?.existingShift?.isApproved}
                      placeholder="e.g. 45000"
                      value={actualHandoverCash}
                      onChange={(e) => setActualHandoverCash(e.target.value)}
                      leftIcon={<Wallet className="w-3.5 h-3.5 text-emerald-400" />}
                      className="font-black text-lg"
                    />
                  </div>

                  {/* Shift Type */}
                  <CustomSelect
                    label="Shift Window"
                    value={shiftType}
                    onChange={setShiftType}
                    disabled={drawerData?.existingShift?.isApproved}
                    options={shiftWindowOptions}
                  />


                  {/* Discrepancy Live Metric Callout */}
                  {discrepancy !== null && (
                    <div
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        discrepancy === 0
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : discrepancy < 0
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {discrepancy === 0 ? (
                          <CheckCircle2 className="w-6 h-6 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-6 h-6 shrink-0" />
                        )}
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider">
                            {discrepancy === 0
                              ? 'Perfect Balance (Zero Discrepancy)'
                              : discrepancy < 0
                              ? 'Cash Shortage Detected'
                              : 'Cash Surplus / Excess Detected'}
                          </div>
                          <div className="text-[11px] opacity-80 mt-0.5">
                            Expected: ₹{liveExpectedCash.toLocaleString('en-IN')} | Counted: ₹{Number(countedNum).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black font-mono">
                          {discrepancy > 0 ? `+₹${discrepancy.toLocaleString('en-IN')}` : discrepancy < 0 ? `-₹${Math.abs(discrepancy).toLocaleString('en-IN')}` : '₹0.00'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Remarks */}
                  <Textarea
                    label="Handover Remarks / Explanations"
                    rows={2}
                    disabled={drawerData?.existingShift?.isApproved}
                    placeholder="e.g. Handed over ₹45,000 cash to Shamsu (Co-Partner) at gate close."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />

                  {/* Submit Button */}
                  {!drawerData?.existingShift?.isApproved && (
                    <div className="pt-2 flex items-center justify-end">
                      <Button
                        type="submit"
                        disabled={submitting || !actualHandoverCash}
                        variant="primary"
                        size="lg"
                        loading={submitting}
                        loadingText="Submitting..."
                      >
                        {drawerData?.existingShift ? 'Update Shift Handover' : 'Submit Shift Handover'}
                      </Button>
                    </div>
                  )}
                </form>
              </Card>
            </div>

            {/* Shift Summary & Approval Column */}
            <div className="space-y-4">
              <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80 space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Quarry Site Details
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Site Name</span>
                    <span className="font-bold text-white">{drawerData?.siteName || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Location</span>
                    <span className="text-slate-200">{drawerData?.location || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                    <span className="text-slate-400">Recorded By</span>
                    <span className="text-slate-200">
                      {drawerData?.existingShift?.supervisorName || user?.name || user?.mobile}
                    </span>
                  </div>
                  {drawerData?.existingShift?.approvedByName && (
                    <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                      <span className="text-slate-400">Approved By</span>
                      <span className="text-emerald-400 font-bold">
                        {drawerData.existingShift.approvedByName}
                      </span>
                    </div>
                  )}
                </div>

                {/* Owner Approve Action if pending */}
                {isOwner && drawerData?.existingShift && !drawerData.existingShift.isApproved && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (drawerData.existingShift) {
                          setApprovingShift({
                            id: drawerData.existingShift.id,
                            siteId: selectedSiteId,
                            supervisorUserId: user?.id || '',
                            approvedByUserId: null,
                            date: selectedDate,
                            shiftType: drawerData.existingShift.shiftType,
                            openingCash: drawerData.openingCash,
                            cashInflows: drawerData.cashInflows,
                            cashOutflows: drawerData.cashOutflows,
                            expectedCash: drawerData.expectedCash,
                            actualHandoverCash: drawerData.existingShift.actualHandoverCash,
                            discrepancy: drawerData.existingShift.discrepancy,
                            remarks: drawerData.existingShift.remarks,
                            isApproved: false,
                            createdAt: drawerData.existingShift.createdAt,
                            updatedAt: drawerData.existingShift.updatedAt,
                            site: { id: selectedSiteId, siteName: drawerData.siteName },
                            supervisor: { id: '', name: drawerData.existingShift.supervisorName, mobile: '' },
                            approvedBy: null,
                          });
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Approve & Lock Shift
                    </button>
                  </div>
                )}
              </Card>

              {/* Guidelines Info Card */}
              <Card variant="glass" className="p-4 border border-slate-800 bg-slate-900/60 text-xs text-slate-400 space-y-2">
                <div className="font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  Field Reconciliation Protocol
                </div>
                <p>
                  1. Count the physical cash drawer at gate closing.
                </p>
                <p>
                  2. Spot cash collected from tippers automatically sums up from the Loads ledger.
                </p>
                <p>
                  3. Field cash expenses (diesel, food bata, JCB advances) are subtracted.
                </p>
                <p>
                  4. Once approved by the Owner, the closing cash automatically becomes the opening balance for the next morning.
                </p>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECONCILIATION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card variant="glass" className="overflow-hidden border border-slate-800 bg-slate-900/60 p-0">
            {loadingHistory ? (
              <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
                <span>Loading shift audit history...</span>
              </div>
            ) : history.length === 0 ? (
              <EmptyState
                icon={<Wallet className="w-8 h-8 text-slate-600" />}
                title="No Shift Records Found"
                description="Daily drawer handovers will appear here once gate supervisors record day-end reconciliations."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950/80 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4 font-semibold">Date & Site</th>
                      <th className="p-4 font-semibold">Supervisor</th>
                      <th className="p-4 font-semibold text-right">Opening</th>
                      <th className="p-4 font-semibold text-right">Inflows</th>
                      <th className="p-4 font-semibold text-right">Outflows</th>
                      <th className="p-4 font-semibold text-right">Expected</th>
                      <th className="p-4 font-semibold text-right">Actual Handover</th>
                      <th className="p-4 font-semibold text-right">Discrepancy</th>
                      <th className="p-4 font-semibold">Status</th>
                      {isOwner && <th className="p-4 font-semibold text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((record) => {
                      const disc = Number(record.discrepancy);
                      return (
                        <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-4 font-medium text-slate-200">
                            <div>
                              <div className="font-bold text-white text-sm">
                                {new Date(record.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {record.site?.siteName || 'Quarry Site'}
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-slate-300 text-xs">
                            <span className="font-semibold text-white">
                              {record.supervisor?.name || record.supervisor?.mobile || 'Supervisor'}
                            </span>
                          </td>

                          <td className="p-4 text-right font-mono text-xs text-slate-400">
                            ₹{Number(record.openingCash).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 text-right font-mono text-xs text-emerald-400 font-bold">
                            +₹{Number(record.cashInflows).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 text-right font-mono text-xs text-rose-400 font-bold">
                            -₹{Number(record.cashOutflows).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 text-right font-mono text-xs text-slate-200 font-bold">
                            ₹{Number(record.expectedCash).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 text-right font-mono text-xs text-white font-black">
                            ₹{Number(record.actualHandoverCash).toLocaleString('en-IN')}
                          </td>

                          <td className="p-4 text-right font-mono text-xs">
                            <span
                              className={`px-2 py-0.5 rounded font-bold ${
                                disc === 0
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : disc < 0
                                  ? 'text-rose-400 bg-rose-500/10'
                                  : 'text-amber-400 bg-amber-500/10'
                              }`}
                            >
                              {disc > 0 ? `+₹${disc.toLocaleString('en-IN')}` : disc < 0 ? `-₹${Math.abs(disc).toLocaleString('en-IN')}` : '₹0.00'}
                            </span>
                          </td>

                          <td className="p-4">
                            <span
                              className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                record.isApproved
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              }`}
                            >
                              {record.isApproved ? 'Approved' : 'Pending'}
                            </span>
                          </td>

                          {isOwner && (
                            <td className="p-4 text-right">
                              {!record.isApproved ? (
                                <button
                                  type="button"
                                  onClick={() => setApprovingShift(record)}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/10 transition-all cursor-pointer"
                                >
                                  Approve
                                </button>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Locked</span>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Approve Modal */}
      {approvingShift && (
        <Modal
          isOpen={!!approvingShift}
          onClose={() => setApprovingShift(null)}
          title="Approve Shift Reconciliation"
          icon={<Check className="w-5 h-5 text-emerald-400" />}
          maxWidth="md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-300">
              Confirm approval for shift on{' '}
              <strong className="text-white">
                {new Date(approvingShift.date).toLocaleDateString('en-IN')}
              </strong>{' '}
              at <strong className="text-amber-400">{approvingShift.site?.siteName}</strong>.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Expected:</span>
                <span>₹{Number(approvingShift.expectedCash).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-white font-bold">
                <span>Actual Counted Handover:</span>
                <span>₹{Number(approvingShift.actualHandoverCash).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-900 font-bold">
                <span>Discrepancy:</span>
                <span
                  className={
                    Number(approvingShift.discrepancy) === 0
                      ? 'text-emerald-400'
                      : Number(approvingShift.discrepancy) < 0
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }
                >
                  ₹{Number(approvingShift.discrepancy).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <Input
              label="Approval Note (Optional)"
              placeholder="e.g. Verified by Shamsu, cash deposited into bank"
              value={approveRemarks}
              onChange={(e) => setApproveRemarks(e.target.value)}
            />

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setApprovingShift(null)}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                size="md"
                loading={approving}
                loadingText="Approving..."
                leftIcon={<Check className="w-4 h-4" />}
                onClick={handleApproveShift}
              >
                Confirm Approval
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
