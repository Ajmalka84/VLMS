import React, { useState, useEffect } from 'react';
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
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useMasterCache } from '../context/MasterCacheContext';
import {
  CurrentDrawerResponse,
  ShiftReconciliationRecord,
  getCurrentDrawerApi,
  closeShiftApi,
  approveShiftApi,
  getShiftsHistoryApi,
} from '../api/shifts';

export const ShiftDrawerPage: React.FC = () => {
  const { user } = useAuth();
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
  const [actualHandoverCash, setActualHandoverCash] = useState<string>('');
  const [shiftType, setShiftType] = useState<string>('DAY');
  const [remarks, setRemarks] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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
        setActualHandoverCash(String(res.existingShift.actualHandoverCash));
        setRemarks(res.existingShift.remarks || '');
        setShiftType(res.existingShift.shiftType || 'DAY');
      } else {
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

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Submit Shift Handover
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualHandoverCash || isNaN(Number(actualHandoverCash))) {
      showToast('error', 'Please enter a valid actual counted cash amount.');
      return;
    }

    try {
      setSubmitting(true);
      await closeShiftApi({
        siteId: selectedSiteId,
        date: selectedDate,
        shiftType,
        actualHandoverCash: Number(actualHandoverCash),
        remarks: remarks.trim() || undefined,
      });
      showToast('success', 'Shift cash drawer recorded and submitted for owner approval!');
      await fetchDrawer(selectedSiteId, selectedDate);
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to submit shift handover');
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
      showToast('success', `Shift on ${new Date(approvingShift.date).toLocaleDateString()} approved successfully`);
      setApprovingShift(null);
      setApproveRemarks('');
      await fetchDrawer(selectedSiteId, selectedDate);
      await fetchHistory();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to approve shift handover');
    } finally {
      setApproving(false);
    }
  };

  const countedNum = actualHandoverCash ? Number(actualHandoverCash) : null;
  const discrepancy =
    countedNum !== null && drawerData ? countedNum - drawerData.expectedCash : null;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-2xl text-sm font-semibold animate-fade-in shadow-xl ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Site/Date Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Wallet className="w-6 h-6 text-amber-400" />
              Daily Shift Cash Drawer
            </h1>
            {isSiteBoy && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Site Supervisor
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Reconcile daily cash collections, field disbursements, machine advances, and register handovers.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('drawer')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'drawer'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live Cash Drawer
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Reconciliation History
          </button>
        </div>
      </div>

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
                options={activeSites.map((s) => ({
                  value: s.id,
                  label: s.siteName,
                  subLabel: s.location || undefined,
                }))}
                placeholder="Select Quarry Site"
              />
            )}
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              Shift Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm font-bold focus:border-amber-500 focus:outline-none transition-all"
            />
          </div>

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
            {/* 1. Opening Cash */}
            <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Opening Cash
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-white">
                  ₹{Number(drawerData?.openingCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Carried forward from previous shift</p>
              </div>
            </Card>

            {/* 2. Spot Cash Loads Inflow */}
            <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" /> Spot Cash Inflow
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                  {drawerData?.cashLoadsCount || 0} Loads
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-emerald-400">
                  +₹{Number(drawerData?.cashInflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Cash collected from gate tippers</p>
              </div>
            </Card>

            {/* 3. Cash Disbursements Outflow */}
            <Card variant="glass" className="p-5 border border-slate-800 bg-slate-900/80 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" /> Cash Outflows
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                  {drawerData?.expensesCount || 0} Entries
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-rose-400">
                  -₹{Number(drawerData?.cashOutflows || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Expenses (₹{Number(drawerData?.generalExpensesOutflow || 0).toLocaleString('en-IN')}) + Machine Adv (₹{Number(drawerData?.machineryAdvanceOutflow || 0).toLocaleString('en-IN')})
                </p>
              </div>
            </Card>

            {/* 4. Net Expected In Drawer */}
            <Card variant="glass" className="p-5 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 relative overflow-hidden ring-1 ring-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Calculator className="w-4 h-4" /> Expected In Drawer
                </span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                  Net Formula
                </span>
              </div>
              <div className="mt-3">
                <div className="text-xl sm:text-2xl font-black text-amber-400">
                  ₹{Number(drawerData?.expectedCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-amber-300/60 mt-1 font-mono">
                  Opening + Inflow - Outflow
                </p>
              </div>
            </Card>
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
                      Enter the physically counted cash amount in hand to compute reconciliation discrepancy.
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
                    {/* Actual Counted Cash Input */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Actual Counted Cash In Hand *</span>
                        <span className="text-[11px] text-amber-400 lowercase font-mono">₹ in notes/coins</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        disabled={drawerData?.existingShift?.isApproved}
                        placeholder="e.g. 45000"
                        value={actualHandoverCash}
                        onChange={(e) => setActualHandoverCash(e.target.value)}
                        className="w-full h-12 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-white font-black text-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-all disabled:opacity-60"
                      />
                    </div>

                    {/* Shift Type */}
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Shift Window
                      </label>
                      <CustomSelect
                        value={shiftType}
                        onChange={setShiftType}
                        disabled={drawerData?.existingShift?.isApproved}
                        options={[
                          { value: 'DAY', label: 'Day Shift (06:00 AM – 06:00 PM)' },
                          { value: 'NIGHT', label: 'Night Shift (06:00 PM – 06:00 AM)' },
                          { value: 'GENERAL', label: 'Full Day / General Shift' },
                        ]}
                      />
                    </div>
                  </div>

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
                            Expected: ₹{Number(drawerData?.expectedCash || 0).toLocaleString('en-IN')} | Counted: ₹{Number(countedNum).toLocaleString('en-IN')}
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
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Handover Remarks / Explanations
                    </label>
                    <textarea
                      rows={2}
                      disabled={drawerData?.existingShift?.isApproved}
                      placeholder="e.g. Handed over ₹45,000 cash to Shamsu (Co-Partner) at gate close."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 focus:outline-none transition-all disabled:opacity-60 resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  {!drawerData?.existingShift?.isApproved && (
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="submit"
                        disabled={submitting || !actualHandoverCash}
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                      >
                        {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                        {drawerData?.existingShift ? 'Update Shift Handover' : 'Submit Shift Handover'}
                      </button>
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
              <div className="p-8 text-center text-slate-400">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="font-semibold text-slate-300">No Shift Records Found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Daily drawer handovers will appear here once gate supervisors record day-end reconciliations.
                </p>
              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Approve Shift Reconciliation
            </h3>

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

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Approval Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Verified by Shamsu, cash deposited into bank"
                value={approveRemarks}
                onChange={(e) => setApproveRemarks(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setApprovingShift(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={approving}
                onClick={handleApproveShift}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {approving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
