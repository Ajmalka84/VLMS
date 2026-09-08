import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  Search,
  Truck,
  Layers,
  ArrowLeft,
  ArrowRight,
  Wallet,
  Users,
  Wrench,
  TrendingUp,
  TrendingDown,
  Coins,
  Receipt,
  BadgePercent,
  SlidersHorizontal,
  Share2,
  Phone,
} from 'lucide-react';
import {
  Card,
  PageHeader,
  MetricCard,
  CustomSelect,
  Button,
  TabBar,
  DateInput,
  SearchBar,
  EmptyState,
  Badge,
} from '../components/common';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { getCustomersApi, CustomerUser } from '../api/admin';
import {
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
import { formatINR } from '../utils/formatters';
import type { PdfCustomHeaderOptions } from '../utils/pdfGenerator';
import { PdfCustomHeaderModal } from '../components/reports/PdfCustomHeaderModal';
import { queryCache } from '../utils/queryCache';

export type ReportTab = 'contractors' | 'cashflow' | 'partners' | 'machinery';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

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
  const [siteId, setSiteId] = useState<string>(() => {
    if (user?.role === 'SITE_BOY' && user?.assignedSiteId) {
      return user.assignedSiteId;
    }
    return '';
  });
  const [presetRange, setPresetRange] = useState<
    'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Auto-bind assigned site for Site Boy
  useEffect(() => {
    if (isSiteBoy && user?.assignedSiteId && siteId !== user.assignedSiteId) {
      setSiteId(user.assignedSiteId);
    }
  }, [isSiteBoy, user?.assignedSiteId, siteId]);

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

  // Clean up any pending requests on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
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

  // Memoized Select Options for 0-lag Rendering
  const customerSelectOptions = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: `${c.businessName || c.mobile} (${c.mobile})`,
      })),
    [customers]
  );

  const siteSelectOptions = useMemo(
    () =>
      isSiteBoy
        ? filteredSites.map((s) => ({ value: s.id, label: `${s.siteName} (${s.location})` }))
        : [
            { value: '', label: 'All Operational Sites' },
            ...filteredSites.map((s) => ({ value: s.id, label: `${s.siteName} (${s.location})` })),
          ],
    [filteredSites, isSiteBoy]
  );

  const partnerSelectOptions = useMemo(
    () =>
      partnerData?.partnersList.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.mobile})`,
      })) || [],
    [partnerData?.partnersList]
  );

  const machinerySelectOptions = useMemo(
    () =>
      machineryData?.machineryList
        ? [
            { value: '', label: 'All Heavy Machinery & Excavators' },
            ...machineryData.machineryList.map((m) => ({
              value: m.id,
              label: `${m.name} (${m.code || 'N/A'}${m.vendorName ? ` - ${m.vendorName}` : ''})`,
            })),
          ]
        : [],
    [machineryData?.machineryList]
  );


  // 1. Fetch Contractors Ledger / Settlement
  const fetchContractorsData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = selectedContractorId
      ? `rep_stmt_${selectedContractorId}_${siteId}_${startDate}_${endDate}_${paymentType}_${selectedCustomerId}`
      : `rep_sum_${siteId}_${startDate}_${endDate}_${debouncedContractorSearch}_${selectedCustomerId}`;

    if (selectedContractorId) {
      const cached = queryCache.get<SettlementReportResponse>(cacheKey);
      if (cached) setSettlementData(cached);
      else setLoading(true);
    } else {
      const cached = queryCache.get<ContractorsSummaryResponse>(cacheKey);
      if (cached) setSummaryData(cached);
      else setLoading(true);
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (selectedContractorId) {
        // Detailed Statement
        const res = await getSettlementReportApi({
          contractorId: selectedContractorId,
          siteId: siteId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          paymentType: paymentType || undefined,
          customerId: isSuperAdmin ? selectedCustomerId : undefined,
        }, { signal: controller.signal });
        setSettlementData(res);
        queryCache.set(cacheKey, res);
      } else {
        // Summary Table
        const res = await getContractorsSummaryApi({
          siteId: siteId || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedContractorSearch || undefined,
          customerId: isSuperAdmin ? selectedCustomerId : undefined,
        }, { signal: controller.signal });
        setSummaryData(res);
        queryCache.set(cacheKey, res);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load contractor reports');
      }
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, selectedContractorId, siteId, startDate, endDate, paymentType, debouncedContractorSearch, isSuperAdmin, selectedCustomerId, toast]);

  // 2. Fetch Cashflow Report
  const fetchCashflowData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = `rep_cf_${siteId}_${startDate}_${endDate}_${selectedCustomerId}`;
    const cached = queryCache.get<CashflowReportResponse>(cacheKey);
    if (cached) setCashflowData(cached);
    else setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await getCashflowReportApi({
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      }, { signal: controller.signal });
      setCashflowData(res);
      queryCache.set(cacheKey, res);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load cashflow statement');
      }
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // 3. Fetch Partner Settlement Report
  const fetchPartnerData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = `rep_part_${partnerId}_${siteId}_${startDate}_${endDate}_${selectedCustomerId}`;
    const cached = queryCache.get<PartnerSettlementResponse>(cacheKey);
    if (cached) setPartnerData(cached);
    else setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await getPartnerSettlementReportApi({
        partnerId: partnerId || undefined,
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      }, { signal: controller.signal });
      setPartnerData(res);
      queryCache.set(cacheKey, res);
      if (!partnerId && res.selectedPartner?.id) {
        setPartnerId(res.selectedPartner.id);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load partner settlement statement');
      }
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, partnerId, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // 4. Fetch Machinery Settlement Report
  const fetchMachineryData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = `rep_mach_${machineryId}_${siteId}_${startDate}_${endDate}_${selectedCustomerId}`;
    const cached = queryCache.get<MachinerySettlementResponse>(cacheKey);
    if (cached) setMachineryData(cached);
    else setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await getMachinerySettlementReportApi({
        machineryId: machineryId || undefined,
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      }, { signal: controller.signal });
      setMachineryData(res);
      queryCache.set(cacheKey, res);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load machinery logbook report');
      }
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

  // CSV EXPORTERS
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

  // PDF EXPORTERS (Lazy dynamic import on demand for optimal bundle size)
  const handleExportPdf = async (customOpts?: PdfCustomHeaderOptions) => {
    const fallbackBiz = isSuperAdmin ? 'VLMS SaaS Admin' : (user?.businessName || 'VLMS Quarry Management');
    try {
      const {
        exportSettlementPdf,
        exportCashflowPdf,
        exportPartnerSettlementPdf,
        exportMachinerySettlementPdf,
      } = await import('../utils/pdfGenerator');

      if (activeTab === 'contractors' && settlementData) {
        exportSettlementPdf(settlementData, fallbackBiz, customOpts);
      } else if (activeTab === 'cashflow' && cashflowData) {
        exportCashflowPdf(cashflowData, fallbackBiz, customOpts);
      } else if (activeTab === 'partners' && partnerData) {
        exportPartnerSettlementPdf(partnerData, fallbackBiz, customOpts);
      } else if (activeTab === 'machinery' && machineryData) {
        exportMachinerySettlementPdf(machineryData, fallbackBiz, customOpts);
      }
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast.error('Failed to generate PDF document');
    }
  };


  // WhatsApp Share statement helper
  const handleWhatsAppShare = () => {
    if (!settlementData) return;
    const cleanMobile = settlementData.contractor.mobile.replace(/\D/g, '');
    const bizName = user?.businessName || 'VLMS Quarry';
    const text = `*${bizName} - Settlement Statement*\n` +
      `Contractor: *${settlementData.contractor.name}*\n` +
      `Total Trips: *${settlementData.summary.totalTrips}*\n` +
      `Total Amount: *${formatINR(settlementData.summary.totalAmount)}*\n` +
      `Cash Paid: *${formatINR(settlementData.summary.cashAmount)}*\n` +
      `Credit Balance Due: *${formatINR(settlementData.summary.creditAmount)}*\n\n` +
      `Generated on ${new Date().toLocaleDateString('en-IN')}`;
    const url = cleanMobile && cleanMobile.length === 10
      ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const reportTabs = useMemo(() => {
    const list: { id: ReportTab; label: string; icon: React.ElementType }[] = [
      { id: 'contractors', label: 'Contractor Statements', icon: FileSpreadsheet },
      { id: 'cashflow', label: 'Site Cashflow Statement', icon: Wallet },
    ];
    if (!isSiteBoy) {
      list.push({ id: 'partners', label: 'Partner Profit-Sharing', icon: Users });
    }
    if (isOwner || isSuperAdmin || isSiteBoy) {
      list.push({ id: 'machinery', label: 'Machinery Rental Logbook', icon: Wrench });
    }
    return list;
  }, [isSiteBoy, isOwner, isSuperAdmin]);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header & Tab Navigation */}
      <PageHeader
        title="Financial Intelligence & Reports"
        subtitle="Contractor settlement statements, daily cash drawer flows, partner dividends, and machinery rental logbooks."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'contractors' && selectedContractorId && settlementData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppShare}
                title="Share Statement via WhatsApp"
                leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              >
                WhatsApp
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              disabled={loading}
              leftIcon={<Download className="w-3.5 h-3.5 text-emerald-400" />}
            >
              CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleExportPdf()}
              disabled={loading || (activeTab === 'contractors' && !selectedContractorId)}
              leftIcon={<Printer className="w-3.5 h-3.5" />}
            >
              PDF
            </Button>
            {activeTab === 'contractors' && selectedContractorId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsPdfModalOpen(true)}
                title="Customize Business Header for PDF"
                leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />}
              >
                Header
              </Button>
            )}
          </div>
        }
      />

      {/* Tabs Header */}
      <TabBar
        tabs={reportTabs}
        activeTab={activeTab}
        onChange={(tabId) => {
          setActiveTab(tabId as ReportTab);
          if (tabId === 'contractors') {
            setSelectedContractorId(null);
          }
        }}
      />

      {/* Filter Bar */}
      <Card variant="glass" className="p-4 rounded-2xl shadow-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {isSuperAdmin && (
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Customer Space</label>
              <CustomSelect
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                options={customerSelectOptions}
                placeholder="Select Customer Space"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Quarry Site</label>
            <CustomSelect
              value={siteId}
              onChange={setSiteId}
              options={siteSelectOptions}
              placeholder={isSiteBoy ? 'Assigned Site' : 'All Sites'}
              disabled={isSiteBoy}
            />
          </div>


          <div className="lg:col-span-2">
            <label className="text-xs text-slate-400 font-medium block mb-1">Date Interval</label>
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              {(['all', 'today', 'yesterday', 'week', 'month', 'custom'] as const).map((preset) => (
                <Button
                  key={preset}
                  variant={presetRange === preset ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className={`min-h-[32px] capitalize ${
                    presetRange === preset ? 'font-black' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset === 'all' ? 'All Time' : preset}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {presetRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/60">
            <DateInput
              label="From Date"
              value={startDate}
              onChange={setStartDate}
              clearable={false}
            />
            <DateInput
              label="To Date"
              value={endDate}
              onChange={setEndDate}
              clearable={false}
            />
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* TAB 1: CONTRACTOR SETTLEMENT STATEMENTS */}
      {/* ========================================================= */}
      {activeTab === 'contractors' && (
        <div className="space-y-6">
          {selectedContractorId && settlementData ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedContractorId(null)}
                  leftIcon={<ArrowLeft className="w-4 h-4 text-amber-400" />}
                  className="text-amber-400 hover:text-amber-300 font-bold"
                >
                  Back to All Contractors
                </Button>
                <span className="text-xs text-slate-400">
                  Transporter Statement for <strong className="text-white">{settlementData.contractor.name}</strong>
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard
                  label="Total Trips Recorded"
                  value={settlementData.summary.totalTrips}
                  subtext="Verified load dispatches"
                  icon={<Truck className="w-5 h-5 text-blue-400" />}
                  variant="blue"
                />
                <MetricCard
                  label="Cash Purchases"
                  value={formatINR(settlementData.summary.cashAmount)}
                  subtext={`${settlementData.summary.cashTrips} cash trips`}
                  icon={<Receipt className="w-5 h-5 text-emerald-400" />}
                  variant="emerald"
                />
                <MetricCard
                  label="Credit Due (Receivable)"
                  value={formatINR(settlementData.summary.creditAmount)}
                  subtext={`${settlementData.summary.creditTrips} credit trips`}
                  icon={<Wallet className="w-5 h-5 text-amber-400" />}
                  variant="amber"
                />
                <MetricCard
                  label="Grand Gross Billable"
                  value={formatINR(settlementData.summary.totalAmount)}
                  subtext="Combined billing volume"
                  icon={<Coins className="w-5 h-5 text-purple-400" />}
                  variant="default"
                />
              </div>

              {/* Breakdown by Material & Vehicle */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="glass" className="p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Material Aggregate Breakdown
                  </h3>
                  <div className="space-y-2">
                    {settlementData.materialBreakdown.map((m) => (
                      <div key={m.materialTypeId} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-200 font-medium">{m.materialName} ({m.tripCount} trips)</span>
                        <span className="font-semibold text-amber-400">{formatINR(m.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card variant="glass" className="p-4 rounded-2xl">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-400" />
                    Fleet Vehicle Utilization
                  </h3>
                  <div className="space-y-2">
                    {settlementData.vehicleBreakdown.map((v) => (
                      <div key={v.vehicleId} className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-200 font-medium">{v.vehicleNumber} ({v.vehicleType} • {v.tripCount} trips)</span>
                        <span className="font-semibold text-white">{formatINR(v.totalAmount)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Trip Logs Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
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
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {summaryData && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <MetricCard
                    label="Active Contractors"
                    value={summaryData.grandTotal.contractorCount}
                    subtext="Transport partners"
                    icon={<Users className="w-5 h-5 text-blue-400" />}
                    variant="blue"
                  />
                  <MetricCard
                    label="Total Dispatches"
                    value={summaryData.grandTotal.totalTrips}
                    subtext="Trips logged"
                    icon={<Truck className="w-5 h-5 text-purple-400" />}
                    variant="default"
                  />
                  <MetricCard
                    label="Spot Cash Sales"
                    value={formatINR(summaryData.grandTotal.cashAmount)}
                    subtext="Direct on-site revenue"
                    icon={<Receipt className="w-5 h-5 text-emerald-400" />}
                    variant="emerald"
                  />
                  <MetricCard
                    label="Credit Ledger (Due)"
                    value={formatINR(summaryData.grandTotal.creditAmount)}
                    subtext="Receivable settlement"
                    icon={<Wallet className="w-5 h-5 text-amber-400" />}
                    variant="amber"
                  />
                </div>
              )}

              <SearchBar
                placeholder="Search contractors by name or mobile..."
                value={contractorSearch}
                onChange={setContractorSearch}
              />

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
                        <span className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {c.contractor.mobile}
                        </span>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Total Cash Inflows"
              value={formatINR(cashflowData.summary.totalInflows)}
              subtext={`${cashflowData.summary.cashLoadsCount} spot cash loads`}
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              variant="emerald"
            />
            <MetricCard
              label="Total Cash Outflows"
              value={formatINR(cashflowData.summary.totalOutflows)}
              subtext={`${cashflowData.summary.cashExpensesCount} cash expenses`}
              icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
              variant="rose"
            />
            <MetricCard
              label="Net Cash Drawer Balance"
              value={formatINR(cashflowData.summary.netCashflow)}
              subtext="Inflows - Outflows"
              icon={<Wallet className="w-5 h-5 text-amber-400" />}
              variant={cashflowData.summary.netCashflow >= 0 ? 'amber' : 'rose'}
            />
            <MetricCard
              label="Machinery Advances"
              value={formatINR(cashflowData.summary.machineryAdvancesTotal)}
              subtext="Paid to operators on-site"
              icon={<Coins className="w-5 h-5 text-blue-400" />}
              variant="blue"
            />
          </div>

          {cashflowData.categoryBreakdown.length > 0 && (
            <Card variant="glass" className="p-4 rounded-2xl">
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

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CO-PARTNER TEMPORAL PROFIT-SHARING */}
      {/* ========================================================= */}
      {activeTab === 'partners' && partnerData && (
        <div className="space-y-6">
          {!isCoPartner && partnerData.partnersList.length > 0 && (
            <Card variant="glass" className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium shrink-0">
                <Users className="w-4 h-4 text-amber-500" />
                Select Co-Partner Statement:
              </div>
              <div className="w-full sm:flex-1 sm:max-w-md">
                <CustomSelect
                  value={partnerId}
                  onChange={setPartnerId}
                  options={partnerSelectOptions}
                  placeholder="Select Partner"
                />
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Gross Site Revenue"
              value={formatINR(partnerData.summary.totalRevenue)}
              subtext="Assigned equity sites"
              icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
              variant="emerald"
            />
            <MetricCard
              label="Operating Expenses"
              value={formatINR(partnerData.summary.totalExpenses)}
              subtext="Deducted operating costs"
              icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
              variant="rose"
            />
            <MetricCard
              label="Net Operating Margin"
              value={formatINR(partnerData.summary.totalNetMargin)}
              subtext="Revenue - Expenses"
              icon={<Coins className="w-5 h-5 text-blue-400" />}
              variant="blue"
            />
            <MetricCard
              label="Net Dividend Payable"
              value={formatINR(partnerData.summary.netDividendPayable)}
              subtext="Calculated via temporal slices"
              icon={<Wallet className="w-5 h-5 text-amber-400" />}
              variant="amber"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
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
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: MACHINERY RENTAL LOGBOOK & SETTLEMENT */}
      {/* ========================================================= */}
      {activeTab === 'machinery' && machineryData && (
        <div className="space-y-6">
          {machineryData.machineryList.length > 0 && (
            <Card variant="glass" className="p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium shrink-0">
                <Wrench className="w-4 h-4 text-amber-500" />
                Filter by Heavy Machinery / Vendor:
              </div>
              <div className="w-full sm:flex-1 sm:max-w-md">
                <CustomSelect
                  value={machineryId}
                  onChange={setMachineryId}
                  options={machinerySelectOptions}
                  placeholder="All Equipment"
                />
              </div>
            </Card>
          )}



          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Total Operating Hours"
              value={`${Number(machineryData.grandTotal.totalHours).toFixed(2)} hrs`}
              subtext={`${machineryData.grandTotal.totalLogs} work shifts recorded`}
              icon={<Wrench className="w-5 h-5 text-blue-400" />}
              variant="blue"
            />
            <MetricCard
              label="Gross Rental Billable"
              value={formatINR(machineryData.grandTotal.totalGrossRent)}
              subtext="Calculated @ hourly rates"
              icon={<Coins className="w-5 h-5 text-purple-400" />}
              variant="default"
            />
            <MetricCard
              label="Operator Advances"
              value={formatINR(machineryData.grandTotal.totalAdvancesPaid)}
              subtext="Disbursed from cash drawer"
              icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
              variant="rose"
            />
            <MetricCard
              label="Net Balance Payable"
              value={formatINR(machineryData.grandTotal.balancePayable)}
              subtext="Gross Rent - Advances"
              icon={<Wallet className="w-5 h-5 text-amber-400" />}
              variant="amber"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
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
          </div>
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
