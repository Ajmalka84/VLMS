import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Calendar,
  Search,
  Truck,
  Layers,
  MapPin,
  ArrowLeft,
  ArrowRight,
  UserCheck,
  Building2,
  RefreshCw,
  Clock,
  CheckCircle2,
  Wallet,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Coins,
  Receipt,
  BadgePercent,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { CustomSelect, CustomSelectOption } from '../components/common/CustomSelect';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Site, getSitesApi } from '../api/masterData';
import { getCustomersApi, CustomerUser } from '../api/admin';
import {
  ContractorSummaryItem,
  ContractorsSummaryResponse,
  SettlementReportResponse,
  CashflowReportResponse,
  PartnerSettlementResponse,
  MachinerySettlementResponse,
  getContractorsSummaryApi,
  getSettlementReportApi,
  getCashflowReportApi,
  getPartnerSettlementReportApi,
  getMachinerySettlementReportApi,
} from '../api/reports';
import { PaymentType } from '../api/loads';
import { useMasterCache } from '../context/MasterCacheContext';
import { useDebounce } from '../hooks/useDebounce';
import { exportToCsv } from '../utils/csvExporter';
import { numberToWordsINR } from '../utils/numberToWords';
import { groupTrips } from '../utils/tripGrouper';
import {
  PdfCustomHeaderOptions,
  exportSettlementPdf,
  exportCashflowPdf,
  exportPartnerSettlementPdf,
  exportMachinerySettlementPdf,
} from '../utils/pdfGenerator';
import { PdfCustomHeaderModal } from '../components/reports/PdfCustomHeaderModal';

export type ReportTab = 'contractors' | 'cashflow' | 'partners' | 'machinery';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOwner = user?.role === 'OWNER';
  const isCoPartner = user?.role === 'CO_PARTNER';
  const isSiteBoy = user?.role === 'SITE_BOY';

  const { sites } = useMasterCache();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('contractors');

  // Super Admin Customer selection
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customersLoaded, setCustomersLoaded] = useState(!isSuperAdmin);

  // Filter State
  const [siteId, setSiteId] = useState('');
  const [presetRange, setPresetRange] = useState<
    'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Contractor Tab Specific State
  const [contractorSearch, setContractorSearch] = useState('');
  const debouncedContractorSearch = useDebounce(contractorSearch, 200);
  const [paymentType, setPaymentType] = useState<'' | PaymentType>('');
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<ContractorsSummaryResponse | null>(null);
  const [settlementData, setSettlementData] = useState<SettlementReportResponse | null>(null);

  // Cashflow Tab Specific State
  const [cashflowData, setCashflowData] = useState<CashflowReportResponse | null>(null);

  // Partner Settlement Tab Specific State
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerData, setPartnerData] = useState<PartnerSettlementResponse | null>(null);

  // Machinery Settlement Tab Specific State
  const [machineryId, setMachineryId] = useState<string>('');
  const [machineryData, setMachineryData] = useState<MachinerySettlementResponse | null>(null);

  // General Loading & Modal State
  const [loading, setLoading] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Load Customers if Super Admin
  useEffect(() => {
    if (isSuperAdmin) {
      let isMounted = true;
      getCustomersApi({ limit: 100 })
        .then((res) => {
          if (isMounted) {
            setCustomers(res.users);
            if (res.users.length > 0) {
              setSelectedCustomerId(res.users[0].id);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setCustomersLoaded(true);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [isSuperAdmin]);

  // Preset Date Handlers
  const applyPreset = (preset: 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom') => {
    setPresetRange(preset);
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const yest = new Date(now);
      yest.setDate(yest.getDate() - 1);
      const yestStr = yest.toISOString().split('T')[0];
      setStartDate(yestStr);
      setEndDate(yestStr);
    } else if (preset === 'week') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const todayStr = now.toISOString().split('T')[0];
      const firstDayStr = firstDay.toISOString().split('T')[0];
      setStartDate(firstDayStr);
      setEndDate(todayStr);
    }
  };

  // Filtered Quarry Sites based on Role
  const filteredSites = useMemo(() => {
    if (isSuperAdmin) return sites;
    if (isSiteBoy && user?.assignedSiteId) {
      return sites.filter((s) => s.id === user.assignedSiteId);
    }
    if (isCoPartner && user?.assignedSiteIds) {
      return sites.filter((s) => user.assignedSiteIds?.includes(s.id));
    }
    return sites;
  }, [sites, isSuperAdmin, isSiteBoy, isCoPartner, user]);

  // -------------------------------------------------------------
  // DATA FETCHING HOOKS
  // -------------------------------------------------------------

  // 1. Fetch Contractors Summary & Settlement
  const fetchContractorsData = useCallback(async () => {
    if (!customersLoaded) return;
    setLoading(true);
    try {
      if (selectedContractorId) {
        const res = await getSettlementReportApi({
          contractorId: selectedContractorId,
          siteId: siteId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          paymentType: paymentType || undefined,
          customerId: isSuperAdmin ? selectedCustomerId : undefined,
        });
        setSettlementData(res);
      } else {
        const res = await getContractorsSummaryApi({
          siteId: siteId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedContractorSearch || undefined,
          customerId: isSuperAdmin ? selectedCustomerId : undefined,
        });
        setSummaryData(res);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contractor reports');
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, selectedContractorId, siteId, startDate, endDate, paymentType, debouncedContractorSearch, isSuperAdmin, selectedCustomerId, toast]);

  // 2. Fetch Cashflow Report
  const fetchCashflowData = useCallback(async () => {
    if (!customersLoaded) return;
    setLoading(true);
    try {
      const res = await getCashflowReportApi({
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      });
      setCashflowData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load cashflow statement');
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // 3. Fetch Partner Settlement Report
  const fetchPartnerData = useCallback(async () => {
    if (!customersLoaded) return;
    setLoading(true);
    try {
      const res = await getPartnerSettlementReportApi({
        partnerId: partnerId || undefined,
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      });
      setPartnerData(res);
      if (!partnerId && res.selectedPartner?.id) {
        setPartnerId(res.selectedPartner.id);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load partner settlement statement');
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, partnerId, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // 4. Fetch Machinery Settlement Report
  const fetchMachineryData = useCallback(async () => {
    if (!customersLoaded) return;
    setLoading(true);
    try {
      const res = await getMachinerySettlementReportApi({
        machineryId: machineryId || undefined,
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      });
      setMachineryData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load machinery logbook report');
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, machineryId, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // Trigger appropriate fetch based on active tab
  useEffect(() => {
    if (activeTab === 'contractors') {
      fetchContractorsData();
    } else if (activeTab === 'cashflow') {
      fetchCashflowData();
    } else if (activeTab === 'partners') {
      fetchPartnerData();
    } else if (activeTab === 'machinery') {
      fetchMachineryData();
    }
  }, [activeTab, fetchContractorsData, fetchCashflowData, fetchPartnerData, fetchMachineryData]);

  // Format INR Currency
  const formatINR = (val: number | string | null | undefined) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(num);
  };

  // -------------------------------------------------------------
  // CSV EXPORTERS
  // -------------------------------------------------------------
  const handleExportCsv = () => {
    if (activeTab === 'contractors') {
      if (selectedContractorId && settlementData) {
        const headers = ['Date', 'Vehicle Number', 'Vehicle Type', 'Material Type', 'Quarry Site', 'Payment Mode', 'Amount (INR)'];
        const rows = settlementData.trips.map((t) => [
          t.date,
          t.vehicleNumber,
          t.vehicleType,
          t.materialName,
          t.siteName,
          t.paymentType,
          t.amount,
        ]);
        exportToCsv(`Settlement_${settlementData.contractor.name}_${new Date().toISOString().split('T')[0]}`, headers, rows);
      } else if (summaryData) {
        const headers = ['Contractor', 'Mobile', 'Total Trips', 'Cash Amount (INR)', 'Credit Amount (INR)', 'Total Revenue (INR)', 'Last Trip Date'];
        const rows = summaryData.contractors.map((c) => [
          c.contractor.name,
          c.contractor.mobile,
          c.stats.totalTrips,
          c.stats.cashAmount,
          c.stats.creditAmount,
          c.stats.totalAmount,
          c.stats.lastTripDate || 'N/A',
        ]);
        exportToCsv(`Contractors_Summary_${new Date().toISOString().split('T')[0]}`, headers, rows);
      }
    } else if (activeTab === 'cashflow' && cashflowData) {
      const headers = ['Date', 'Cash Loads Count', 'Cash Inflows (INR)', 'Cash Expenses Count', 'Cash Outflows (INR)', 'Net Cashflow (INR)'];
      const rows = cashflowData.timeline.map((t) => [
        t.date,
        t.loadsCount,
        t.inflows,
        t.expensesCount,
        t.outflows,
        t.netCashflow,
      ]);
      exportToCsv(`Cashflow_Statement_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else if (activeTab === 'partners' && partnerData) {
      const headers = ['Quarry Site', 'Equity %', 'Window Period', 'Site Revenue (INR)', 'Site Expenses (INR)', 'Net Margin (INR)', 'Partner Dividend (INR)'];
      const rows = partnerData.slices.map((s) => [
        s.siteName,
        `${s.sharePercentage}%`,
        `${s.windowStart} to ${s.windowEnd}`,
        s.revenue,
        s.expenses,
        s.netMargin,
        s.grossDividend,
      ]);
      exportToCsv(`Partner_Settlement_${partnerData.selectedPartner?.name || 'Partner'}_${new Date().toISOString().split('T')[0]}`, headers, rows);
    } else if (activeTab === 'machinery' && machineryData) {
      const headers = ['Date', 'Machinery', 'Code', 'Vendor', 'Start Time', 'Closing Time', 'Working Hours', 'Rent Per Hour (INR)', 'Gross Amount (INR)', 'Advance Paid (INR)', 'Operator / Paid To', 'Remarks'];
      const rows = machineryData.logs.map((l) => [
        l.date,
        l.machineryName,
        l.machineryCode || '',
        l.vendorName || '',
        l.startTime || '',
        l.closingTime || '',
        l.totalHours,
        l.rentPerHour,
        l.grossAmount,
        l.advanceAmount,
        l.operatorPaidTo || '',
        l.remarks || '',
      ]);
      exportToCsv(`Machinery_Rental_Logbook_${new Date().toISOString().split('T')[0]}`, headers, rows);
    }
  };

  // -------------------------------------------------------------
  // PDF EXPORTERS
  // -------------------------------------------------------------
  const handleExportPdf = (customOpts?: PdfCustomHeaderOptions) => {
    const fallbackBiz = isSuperAdmin ? 'VLMS SaaS Admin' : (user?.businessName || 'VLMS Quarry Management');
    if (activeTab === 'contractors' && settlementData) {
      exportSettlementPdf(settlementData, fallbackBiz, customOpts);
    } else if (activeTab === 'cashflow' && cashflowData) {
      exportCashflowPdf(cashflowData, fallbackBiz, customOpts);
    } else if (activeTab === 'partners' && partnerData) {
      exportPartnerSettlementPdf(partnerData, fallbackBiz, customOpts);
    } else if (activeTab === 'machinery' && machineryData) {
      exportMachinerySettlementPdf(machineryData, fallbackBiz, customOpts);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            Financial Intelligence & Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Contractor settlement statements, daily cash drawer flows, partner dividends, and machinery rental logbooks.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => handleExportPdf()}
            disabled={loading || (activeTab === 'contractors' && !selectedContractorId)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-lg shadow-amber-500/20 font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Export PDF
          </button>
          {activeTab === 'contractors' && selectedContractorId && (
            <button
              onClick={() => setIsPdfModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30 transition"
              title="Customize Business Header for PDF"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Custom Header
            </button>
          )}
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/60 pb-3">
        {(!isSiteBoy || isOwner || isSuperAdmin) && (
          <button
            onClick={() => {
              setActiveTab('contractors');
              setSelectedContractorId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'contractors'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Contractor Statements
          </button>
        )}

        <button
          onClick={() => setActiveTab('cashflow')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'cashflow'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Site Cashflow Statement
        </button>

        {(!isSiteBoy || isOwner || isSuperAdmin) && (
          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'partners'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Partner Profit-Sharing
          </button>
        )}

        {(isOwner || isSuperAdmin) && (
          <button
            onClick={() => setActiveTab('machinery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'machinery'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Machinery Rental Logbook
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <Card className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Super Admin Customer Filter */}
          {isSuperAdmin && (
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Customer Space</label>
              <CustomSelect
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                options={customers.map((c) => ({
                  value: c.id,
                  label: `${c.businessName || c.name || c.mobile} (${c.mobile})`,
                }))}
                placeholder="Select Customer Space"
              />
            </div>
          )}

          {/* Quarry Site Filter */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Quarry Site</label>
            <CustomSelect
              value={siteId}
              onChange={setSiteId}
              options={[
                { value: '', label: 'All Operational Sites' },
                ...filteredSites.map((s) => ({ value: s.id, label: `${s.siteName} (${s.location})` })),
              ]}
              placeholder="All Sites"
              disabled={isSiteBoy}
            />
          </div>

          {/* Date Range Presets */}
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-400 font-medium block mb-1">Date Interval</label>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {(['all', 'today', 'yesterday', 'week', 'month', 'custom'] as const).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                    presetRange === preset
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  {preset === 'all' ? 'All Time' : preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom Start / End Dates if Custom Preset Selected */}
        {presetRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* TAB 1: CONTRACTOR SETTLEMENT STATEMENTS */}
      {/* ========================================================= */}
      {activeTab === 'contractors' && (
        <div className="space-y-6">
          {selectedContractorId && settlementData ? (
            /* Detailed Contractor Statement View */
            <div className="space-y-6">
              {/* Back button & Title */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedContractorId(null)}
                  className="flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to All Contractors
                </button>
                <span className="text-xs text-slate-400">
                  Transporter Statement for <strong className="text-white">{settlementData.contractor.name}</strong>
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 block mb-1">Total Trips Recorded</span>
                  <span className="text-2xl font-bold text-white">{settlementData.summary.totalTrips}</span>
                </Card>
                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 block mb-1">Cash Purchases</span>
                  <span className="text-2xl font-bold text-emerald-400">{formatINR(settlementData.summary.cashAmount)}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">{settlementData.summary.cashTrips} cash trips</span>
                </Card>
                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 block mb-1">Credit Purchases (Receivable)</span>
                  <span className="text-2xl font-bold text-amber-400">{formatINR(settlementData.summary.creditAmount)}</span>
                  <span className="text-[10px] text-slate-500 block mt-1">{settlementData.summary.creditTrips} credit trips</span>
                </Card>
                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-xs text-slate-400 block mb-1">Grand Gross Billable</span>
                  <span className="text-2xl font-bold text-white">{formatINR(settlementData.summary.totalAmount)}</span>
                </Card>
              </div>

              {/* Breakdown by Material & Vehicle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Material Aggregate Breakdown
                  </h3>
                  <div className="space-y-2">
                    {settlementData.materialBreakdown.map((m) => (
                      <div key={m.materialTypeId} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-200 font-medium">{m.materialName} ({m.tripCount} trips)</span>
                        <span className="font-semibold text-amber-400">{formatINR(m.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    Fleet Vehicle Utilization
                  </h3>
                  <div className="space-y-2">
                    {settlementData.vehicleBreakdown.map((v) => (
                      <div key={v.vehicleId} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-200 font-medium">{v.vehicleNumber} ({v.vehicleType} • {v.tripCount} trips)</span>
                        <span className="font-semibold text-white">{formatINR(v.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Trip Logs Table */}
              <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-amber-500" />
                    Itemized Dispatch Trips ({settlementData.trips.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Vehicle</th>
                        <th className="p-3">Material</th>
                        <th className="p-3">Site</th>
                        <th className="p-3">Mode</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {settlementData.trips.map((trip) => (
                        <tr key={trip.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 whitespace-nowrap">{trip.date}</td>
                          <td className="p-3 font-semibold text-slate-100">{trip.vehicleNumber}</td>
                          <td className="p-3">{trip.materialName}</td>
                          <td className="p-3 text-slate-400">{trip.siteName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              trip.paymentType === 'CASH' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {trip.paymentType}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-white">{formatINR(trip.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            /* Contractors Overview Directory */
            <div className="space-y-6">
              {/* Grand Total Highlights */}
              {summaryData && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 block mb-1">Active Contractors</span>
                    <span className="text-2xl font-bold text-white">{summaryData.grandTotal.contractorCount}</span>
                  </Card>
                  <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 block mb-1">Total Dispatches</span>
                    <span className="text-2xl font-bold text-white">{summaryData.grandTotal.totalTrips}</span>
                  </Card>
                  <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 block mb-1">Spot Cash Sales</span>
                    <span className="text-2xl font-bold text-emerald-400">{formatINR(summaryData.grandTotal.cashAmount)}</span>
                  </Card>
                  <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                    <span className="text-xs text-slate-400 block mb-1">Credit Ledger (Receivable)</span>
                    <span className="text-2xl font-bold text-amber-400">{formatINR(summaryData.grandTotal.creditAmount)}</span>
                  </Card>
                </div>
              )}

              {/* Search filter for contractors */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search contractors by name or mobile..."
                  value={contractorSearch}
                  onChange={(e) => setContractorSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Contractors Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaryData?.contractors.map((c) => (
                  <Card
                    key={c.contractor.id}
                    onClick={() => setSelectedContractorId(c.contractor.id)}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl cursor-pointer transition shadow-md hover:shadow-xl group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-white group-hover:text-amber-400 transition">
                          {c.contractor.name}
                        </h4>
                        <span className="text-xs text-slate-400">{c.contractor.mobile}</span>
                      </div>
                      <span className="p-2 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Trips</span>
                        <span className="font-semibold text-slate-200">{c.stats.totalTrips}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Credit Billable</span>
                        <span className="font-semibold text-amber-400">{formatINR(c.stats.creditAmount)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SITE CASHFLOW STATEMENT */}
      {/* ========================================================= */}
      {activeTab === 'cashflow' && cashflowData && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Total Cash Inflows</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-2xl font-bold text-emerald-400">{formatINR(cashflowData.summary.totalInflows)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">{cashflowData.summary.cashLoadsCount} spot cash loads</span>
            </Card>

            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Total Cash Outflows</span>
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
              <span className="text-2xl font-bold text-rose-400">{formatINR(cashflowData.summary.totalOutflows)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">{cashflowData.summary.cashExpensesCount} cash expenses</span>
            </Card>

            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Net Cash Drawer Balance</span>
                <Wallet className="w-4 h-4 text-amber-500" />
              </div>
              <span className={`text-2xl font-bold ${cashflowData.summary.netCashflow >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {formatINR(cashflowData.summary.netCashflow)}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Inflows - Outflows</span>
            </Card>

            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">Machinery Cash Advances</span>
                <Coins className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-2xl font-bold text-indigo-300">{formatINR(cashflowData.summary.machineryAdvancesTotal)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Paid to operators on-site</span>
            </Card>
          </div>

          {/* Cash Expense Category Breakdown */}
          {cashflowData.categoryBreakdown.length > 0 && (
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <BadgePercent className="w-4 h-4 text-amber-500" />
                Cash Drawer Outflows by Category
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {cashflowData.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryId} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                    <span className="text-xs text-slate-400 block font-medium truncate">{cat.categoryName}</span>
                    <span className="text-base font-bold text-white block mt-1">{formatINR(cat.amount)}</span>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1.5">
                      <span>{cat.count} txns</span>
                      <span className="text-amber-400 font-semibold">{cat.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Daily Cashflow Timeline Table */}
          <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-500" />
                Daily Cashflow Timeline ({cashflowData.timeline.length} Days)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-center">Cash Loads</th>
                    <th className="p-3 text-right">Inflows (INR)</th>
                    <th className="p-3 text-center">Cash Expenses</th>
                    <th className="p-3 text-right">Outflows (INR)</th>
                    <th className="p-3 text-right">Net Daily Cashflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {cashflowData.timeline.map((day) => (
                    <tr key={day.date} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-medium text-slate-200">{day.date}</td>
                      <td className="p-3 text-center text-slate-400">{day.loadsCount}</td>
                      <td className="p-3 text-right font-semibold text-emerald-400">{formatINR(day.inflows)}</td>
                      <td className="p-3 text-center text-slate-400">{day.expensesCount}</td>
                      <td className="p-3 text-right font-semibold text-rose-400">{formatINR(day.outflows)}</td>
                      <td className={`p-3 text-right font-bold ${day.netCashflow >= 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {formatINR(day.netCashflow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CO-PARTNER TEMPORAL PROFIT-SHARING */}
      {/* ========================================================= */}
      {activeTab === 'partners' && partnerData && (
        <div className="space-y-6">
          {/* Partner Selector */}
          {!isCoPartner && partnerData.partnersList.length > 0 && (
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Users className="w-4 h-4 text-amber-500" />
                Select Co-Partner Statement:
              </div>
              <div className="w-full sm:w-72">
                <CustomSelect
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerData.partnersList.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.mobile})`,
                  }))}
                  placeholder="Select Partner"
                />
              </div>
            </Card>
          )}

          {/* Partner Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Gross Site Revenue</span>
              <span className="text-2xl font-bold text-emerald-400">{formatINR(partnerData.summary.totalRevenue)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Across assigned equity sites</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Operating & Machine Expenses</span>
              <span className="text-2xl font-bold text-rose-400">{formatINR(partnerData.summary.totalExpenses)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Deducted from gross revenue</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Net Operating Margin</span>
              <span className="text-2xl font-bold text-white">{formatINR(partnerData.summary.totalNetMargin)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Revenue - Expenses</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Net Dividend Payable</span>
              <span className="text-2xl font-bold text-amber-400">{formatINR(partnerData.summary.netDividendPayable)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Calculated via temporal slices</span>
            </Card>
          </div>

          {/* Temporal Slices Table */}
          <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Temporal Equity Slices & Dividend Calculation ({partnerData.slices.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Quarry Site</th>
                    <th className="p-3 text-center">Equity %</th>
                    <th className="p-3">Temporal Window</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Expenses</th>
                    <th className="p-3 text-right">Net Margin</th>
                    <th className="p-3 text-right font-bold text-amber-400">Partner Dividend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {partnerData.slices.map((slice, i) => (
                    <tr key={i} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-medium text-slate-200">{slice.siteName}</td>
                      <td className="p-3 text-center font-bold text-amber-400">{slice.sharePercentage}%</td>
                      <td className="p-3 text-slate-400 text-[11px]">{slice.windowStart} to {slice.windowEnd}</td>
                      <td className="p-3 text-right text-emerald-400">{formatINR(slice.revenue)}</td>
                      <td className="p-3 text-right text-rose-400">{formatINR(slice.expenses)}</td>
                      <td className="p-3 text-right font-semibold text-white">{formatINR(slice.netMargin)}</td>
                      <td className="p-3 text-right font-bold text-amber-400">{formatINR(slice.grossDividend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MACHINERY RENTAL LOGBOOK & SETTLEMENT */}
      {/* ========================================================= */}
      {activeTab === 'machinery' && machineryData && (
        <div className="space-y-6">
          {/* Equipment Selector Filter */}
          {machineryData.machineryList.length > 0 && (
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                <Wrench className="w-4 h-4 text-amber-500" />
                Filter by Heavy Machinery / Vendor:
              </div>
              <div className="w-full sm:w-72">
                <CustomSelect
                  value={machineryId}
                  onChange={setMachineryId}
                  options={[
                    { value: '', label: 'All Heavy Machinery & Excavators' },
                    ...machineryData.machineryList.map((m) => ({
                      value: m.id,
                      label: `${m.name} (${m.code || 'N/A'}${m.vendorName ? ` - ${m.vendorName}` : ''})`,
                    })),
                  ]}
                  placeholder="All Equipment"
                />
              </div>
            </Card>
          )}

          {/* Machinery Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Total Operating Hours</span>
              <span className="text-2xl font-bold text-white">{Number(machineryData.grandTotal.totalHours).toFixed(2)} hrs</span>
              <span className="text-[10px] text-slate-500 block mt-1">{machineryData.grandTotal.totalLogs} work shifts recorded</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Gross Rental Billable</span>
              <span className="text-2xl font-bold text-white">{formatINR(machineryData.grandTotal.totalGrossRent)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Calculated @ hourly rates</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Operator Cash Advances</span>
              <span className="text-2xl font-bold text-rose-400">{formatINR(machineryData.grandTotal.totalAdvancesPaid)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Disbursed from cash drawer</span>
            </Card>
            <Card className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">Net Balance Payable</span>
              <span className="text-2xl font-bold text-amber-400">{formatINR(machineryData.grandTotal.balancePayable)}</span>
              <span className="text-[10px] text-slate-500 block mt-1">Gross Rent - Advances</span>
            </Card>
          </div>

          {/* Detailed Machinery Work Logbook */}
          <Card className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Itemized Machinery Work Logbook ({machineryData.logs.length} Entries)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Machinery</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Working Shift</th>
                    <th className="p-3 text-center">Hours</th>
                    <th className="p-3 text-right">Rate/hr</th>
                    <th className="p-3 text-right">Gross Rent</th>
                    <th className="p-3 text-right">Advance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {machineryData.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-medium text-slate-200 whitespace-nowrap">{log.date}</td>
                      <td className="p-3 font-semibold text-white">{log.machineryName}</td>
                      <td className="p-3 text-slate-400">{log.vendorName || '-'}</td>
                      <td className="p-3 text-slate-400 text-[11px]">{log.startTime || '00:00'} to {log.closingTime || '00:00'}</td>
                      <td className="p-3 text-center font-bold text-amber-400">{Number(log.totalHours).toFixed(2)}</td>
                      <td className="p-3 text-right text-slate-300">{formatINR(log.rentPerHour)}</td>
                      <td className="p-3 text-right font-semibold text-white">{formatINR(log.grossAmount)}</td>
                      <td className="p-3 text-right text-rose-400 font-medium">{formatINR(log.advanceAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* PDF Custom Header Modal */}
      {isPdfModalOpen && (
        <PdfCustomHeaderModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onConfirm={(opts) => {
            handleExportPdf(opts);
            setIsPdfModalOpen(false);
          }}
          defaultBusinessName={user?.businessName || 'VLMS Operational Quarry'}
          defaultMobile={user?.mobile || ''}
          defaultGstin={user?.gstin || ''}
        />
      )}
    </div>
  );
};
