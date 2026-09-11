import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  BookOpen,
  PlusCircle,
  Scale,
  ArrowLeftRight,
  CheckCircle2,
  AlertCircle,
  Building2,
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
import { RecordPaymentModal } from '../components/contractors/RecordPaymentModal';
import { ContractorPassbookView } from '../components/contractors/ContractorPassbookView';
import {
  ContractorsSummaryResponse,
  SettlementReportResponse,
  CashflowReportResponse,
  PartnerSettlementResponse,
  PartnerRebalanceResponse,
  MachinerySettlementResponse,
  BalanceSheetResponse,
  getContractorsSummaryApi,
  getSettlementReportApi,
  getCashflowReportApi,
  getPartnerSettlementReportApi,
  getPartnerRebalanceReportApi,
  getMachinerySettlementReportApi,
  getBalanceSheetReportApi,
} from '../api/reports';
import { PaymentType } from '../api/loads';
import { useMasterCache } from '../context/MasterCacheContext';
import { useDebounce } from '../hooks/useDebounce';
import { exportToCsv } from '../utils/csvExporter';
import { formatINR } from '../utils/formatters';
import type { PdfCustomHeaderOptions } from '../utils/pdfGenerator';
import { PdfCustomHeaderModal } from '../components/reports/PdfCustomHeaderModal';
import { queryCache } from '../utils/queryCache';

export type ReportTab = 'contractors' | 'cashflow' | 'partners' | 'machinery' | 'balancesheet';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isOwner = user?.role === 'OWNER';
  const isCoPartner = user?.role === 'CO_PARTNER';
  const isSiteBoy = user?.role === 'SITE_BOY';

  const { sites, contractors } = useMasterCache();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    const tab = searchParams.get('tab') as ReportTab | null;
    return tab || 'contractors';
  });

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
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(() => {
    return searchParams.get('contractorId') || null;
  });
  const [contractorSubView, setContractorSubView] = useState<'passbook' | 'dispatches'>('passbook');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentContractorId, setPaymentContractorId] = useState<string | undefined>(undefined);
  const [summaryData, setSummaryData] = useState<ContractorsSummaryResponse | null>(null);
  const [settlementData, setSettlementData] = useState<SettlementReportResponse | null>(null);

  // Cashflow Tab Specific State
  const [cashflowData, setCashflowData] = useState<CashflowReportResponse | null>(null);

  // Partner Settlement Tab Specific State
  const [partnerSubView, setPartnerSubView] = useState<'individual' | 'rebalance'>('individual');
  const [partnerId, setPartnerId] = useState<string>('');
  const [partnerData, setPartnerData] = useState<PartnerSettlementResponse | null>(null);
  const [rebalanceData, setRebalanceData] = useState<PartnerRebalanceResponse | null>(null);

  // Machinery Settlement Tab Specific State
  const [machineryId, setMachineryId] = useState<string>('');
  const [machineryData, setMachineryData] = useState<MachinerySettlementResponse | null>(null);

  // Balance Sheet Tab Specific State
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetResponse | null>(null);

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

  // 4. Fetch Multi-Partner Rebalance Matrix
  const fetchPartnerRebalanceData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = `rep_rebal_${siteId}_${startDate}_${endDate}_${selectedCustomerId}`;
    const cached = queryCache.get<PartnerRebalanceResponse>(cacheKey);
    if (cached) setRebalanceData(cached);
    else setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await getPartnerRebalanceReportApi({
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      }, { signal: controller.signal });
      setRebalanceData(res);
      queryCache.set(cacheKey, res);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load partner rebalance matrix');
      }
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // 5. Fetch Machinery Settlement Report
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

  // 6. Fetch Balance Sheet Report
  const fetchBalanceSheetData = useCallback(async () => {
    if (!customersLoaded) return;
    const cacheKey = `rep_bs_${siteId}_${startDate}_${endDate}_${selectedCustomerId}`;
    const cached = queryCache.get<BalanceSheetResponse>(cacheKey);
    if (cached) setBalanceSheetData(cached);
    else setLoading(true);

    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await getBalanceSheetReportApi({
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        customerId: isSuperAdmin ? selectedCustomerId : undefined,
      }, { signal: controller.signal });
      setBalanceSheetData(res);
      queryCache.set(cacheKey, res);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error(err.message || 'Failed to load balance sheet report');
      }
    } finally {
      setLoading(false);
    }
  }, [customersLoaded, siteId, startDate, endDate, isSuperAdmin, selectedCustomerId, toast]);

  // Trigger appropriate fetch based on active tab
  useEffect(() => {
    if (activeTab === 'contractors') {
      fetchContractorsData();
    } else if (activeTab === 'cashflow') {
      fetchCashflowData();
    } else if (activeTab === 'partners') {
      if (partnerSubView === 'rebalance') {
        fetchPartnerRebalanceData();
      } else {
        fetchPartnerData();
      }
    } else if (activeTab === 'machinery') {
      fetchMachineryData();
    } else if (activeTab === 'balancesheet') {
      fetchBalanceSheetData();
    }
  }, [activeTab, partnerSubView, fetchContractorsData, fetchCashflowData, fetchPartnerData, fetchPartnerRebalanceData, fetchMachineryData, fetchBalanceSheetData]);

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
    } else if (activeTab === 'partners') {
      if (partnerSubView === 'rebalance' && rebalanceData) {
        const headers = ['Partner Name', 'Role', 'Equity %', 'Equity Dividend (INR)', 'Direct Expenses Funded (INR)', 'Contractor Collections (INR)', 'Drawings (INR)', 'Net Balance (INR)', 'Status'];
        const rows = rebalanceData.partners.map((p) => [
          p.partner.name,
          p.partner.role,
          `${p.sharePercentage}%`,
          p.equityDividend,
          p.directExpensesFunded,
          p.contractorPaymentsCollected,
          p.drawingsDrawn,
          p.closingBalance,
          p.status,
        ]);
        exportToCsv(`Multi_Partner_Rebalance_${rebalanceData.site?.siteName || 'All_Sites'}_${new Date().toISOString().split('T')[0]}`, headers, rows);
      } else if (partnerData) {
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
      }
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

  const handleWhatsAppRebalanceShare = () => {
    if (!rebalanceData) return;
    const bizName = user?.businessName || 'VLMS Quarry Management';
    const siteName = rebalanceData.site?.siteName || 'All Quarry Sites';
    let text = `*${bizName} - Partner Equalisation & Settlement Plan*\n` +
      `Site: *${siteName}*\n` +
      `Site Revenue: *${formatINR(rebalanceData.siteSummary.totalRevenue)}*\n` +
      `Operating Expenses: *${formatINR(rebalanceData.siteSummary.totalExpenses)}*\n` +
      `Net Site Profit: *${formatINR(rebalanceData.siteSummary.netProfit)}*\n` +
      `Cash Drawer Pool: *${formatINR(rebalanceData.siteSummary.cashDrawerBalance)}*\n\n` +
      `*Partner Net Balances:*\n`;

    rebalanceData.partners.forEach((p) => {
      const statusText = p.closingBalance > 0.01 
        ? `Receives ${formatINR(p.closingBalance)} (Creditor)` 
        : p.closingBalance < -0.01 
        ? `Must Pay ${formatINR(Math.abs(p.closingBalance))} (Debtor)` 
        : `Settled (${formatINR(0)})`;
      text += `• *${p.partner.name}* (${p.sharePercentage}%): ${statusText}\n`;
    });

    if (rebalanceData.rebalanceTransfers.length > 0) {
      text += `\n*Settlement Transfer Instructions:*\n`;
      rebalanceData.rebalanceTransfers.forEach((t, i) => {
        text += `${i + 1}. *${t.fromPartner.name}* ➔ *${t.toPartner.name}*: *${formatINR(t.amount)}*\n`;
      });
    } else {
      text += `\n*All partner personal accounts are balanced & settled.*`;
    }

    text += `\n\nGenerated on ${new Date().toLocaleDateString('en-IN')}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
            {activeTab === 'partners' && partnerSubView === 'rebalance' && rebalanceData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWhatsAppRebalanceShare}
                title="Share Equalisation Plan via WhatsApp"
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
      {/* TAB 1: CONTRACTOR STATEMENTS & PASSBOOK (HURDLE 15) */}
      {/* ========================================================= */}
      {activeTab === 'contractors' && (
        <div className="space-y-6">
          {selectedContractorId ? (
            <div className="space-y-6">
              {/* Header Navigation & Sub-view Switcher */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedContractorId(null);
                    setSearchParams({ tab: 'contractors' });
                  }}
                  leftIcon={<ArrowLeft className="w-4 h-4 text-amber-400" />}
                  className="text-amber-400 hover:text-amber-300 font-bold"
                >
                  Back to All Contractors
                </Button>

                {/* Sub-view switcher */}
                <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setContractorSubView('passbook')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                      contractorSubView === 'passbook'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Running Passbook & Payments
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractorSubView('dispatches')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                      contractorSubView === 'dispatches'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    Dispatches Breakdown
                  </button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPaymentContractorId(selectedContractorId);
                    setPaymentModalOpen(true);
                  }}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Record Payment
                </Button>
              </div>

              {/* Sub-view 1: Chronological Passbook */}
              {contractorSubView === 'passbook' ? (
                (() => {
                  const currentContractor =
                    contractors.find((c) => c.id === selectedContractorId) ||
                    (settlementData?.contractor
                      ? {
                          id: settlementData.contractor.id,
                          name: settlementData.contractor.name,
                          mobile: settlementData.contractor.mobile,
                          userId: '',
                          createdAt: '',
                          updatedAt: '',
                        }
                      : {
                          id: selectedContractorId,
                          name: 'Selected Contractor',
                          mobile: '',
                          userId: '',
                          createdAt: '',
                          updatedAt: '',
                        });

                  return (
                    <ContractorPassbookView
                      contractor={currentContractor}
                      sites={sites}
                      currentSiteId={siteId}
                      onOpenRecordPayment={(cId) => {
                        setPaymentContractorId(cId);
                        setPaymentModalOpen(true);
                      }}
                      onRefreshSummary={fetchContractorsData}
                    />
                  );
                })()
              ) : (
                /* Sub-view 2: Dispatches Breakdown */
                settlementData && (
                  <div className="space-y-6">
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
                )
              )}
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

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-80">
                  <SearchBar
                    placeholder="Search contractors by name or mobile..."
                    value={contractorSearch}
                    onChange={setContractorSearch}
                  />
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPaymentContractorId(undefined);
                    setPaymentModalOpen(true);
                  }}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Record Payment Collection
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaryData?.contractors.map((c) => (
                  <Card
                    key={c.contractor.id}
                    onClick={() => {
                      setSelectedContractorId(c.contractor.id);
                      setSearchParams({ tab: 'contractors', contractorId: c.contractor.id });
                    }}
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
                        <span className="text-slate-500 block text-[10px]">Total Trips</span>
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
      {/* TAB 3: CO-PARTNER TEMPORAL PROFIT-SHARING & REBALANCING */}
      {/* ========================================================= */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          {/* Sub-view switcher */}
          {!isSiteBoy && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner">
                <button
                  type="button"
                  onClick={() => setPartnerSubView('individual')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    partnerSubView === 'individual'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Individual Partner Statement
                </button>
                {!isCoPartner && (
                  <button
                    type="button"
                    onClick={() => setPartnerSubView('rebalance')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      partnerSubView === 'rebalance'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    Multi-Partner Equalisation Matrix
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SUB-VIEW 1: INDIVIDUAL STATEMENT */}
          {partnerSubView === 'individual' && partnerData && (
            <div className="space-y-6 animate-fade-in">
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
                  label="Gross Dividend Share"
                  value={formatINR(partnerData.summary.grossDividendPayable)}
                  subtext="Calculated via temporal slices"
                  icon={<Coins className="w-5 h-5 text-blue-400" />}
                  variant="blue"
                />
                <MetricCard
                  label="Net Settlement Payable"
                  value={formatINR(partnerData.summary.netDividendPayable)}
                  subtext={
                    partnerData.summary.netDividendPayable >= 0
                      ? 'Payable to partner'
                      : 'Recoverable from partner'
                  }
                  icon={<Wallet className="w-5 h-5 text-amber-400" />}
                  variant={partnerData.summary.netDividendPayable >= 0 ? 'amber' : 'rose'}
                />
              </div>

              {/* Liquidity Rebalancing Flow Summary Card */}
              <Card variant="glass" className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Personal Account Funding & Liquidity Reconciliation
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-1">Gross Dividend Earned</span>
                    <span className="text-base font-bold text-white">{formatINR(partnerData.summary.grossDividendPayable)}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Operational site share</span>
                  </div>
                  <div className="p-3.5 bg-emerald-950/30 rounded-xl border border-emerald-800/50">
                    <span className="text-[11px] text-emerald-400 block mb-1 font-medium">+ Direct Expenses Funded</span>
                    <span className="text-base font-bold text-emerald-400">+{formatINR(partnerData.summary.directExpensesFunded || 0)}</span>
                    <span className="text-[10px] text-emerald-500/80 block mt-1">Paid from personal bank A/C</span>
                  </div>
                  <div className="p-3.5 bg-amber-950/30 rounded-xl border border-amber-800/50">
                    <span className="text-[11px] text-amber-400 block mb-1 font-medium">- Contractor Cash Retained</span>
                    <span className="text-base font-bold text-amber-400">-{formatINR(partnerData.summary.contractorPaymentsCollected || 0)}</span>
                    <span className="text-[10px] text-amber-500/80 block mt-1">Collected into personal A/C</span>
                  </div>
                  <div className="p-3.5 bg-rose-950/30 rounded-xl border border-rose-800/50">
                    <span className="text-[11px] text-rose-400 block mb-1 font-medium">- Partner Drawings / Advances</span>
                    <span className="text-base font-bold text-rose-400">-{formatINR(partnerData.summary.advancesDeducted || 0)}</span>
                    <span className="text-[10px] text-rose-500/80 block mt-1">Cash drawn from business</span>
                  </div>
                </div>
              </Card>

              {/* Temporal Slices Table */}
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

          {/* SUB-VIEW 2: MULTI-PARTNER REBALANCE MATRIX */}
          {partnerSubView === 'rebalance' && rebalanceData && (
            <div className="space-y-6 animate-fade-in">
              {/* Site Overview Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard
                  label="Total Site Revenue"
                  value={formatINR(rebalanceData.siteSummary.totalRevenue)}
                  subtext="Aggregated dispatch sales"
                  icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
                  variant="emerald"
                />
                <MetricCard
                  label="Total Site Expenses"
                  value={formatINR(rebalanceData.siteSummary.totalExpenses)}
                  subtext="Operational & direct overheads"
                  icon={<TrendingDown className="w-5 h-5 text-rose-400" />}
                  variant="rose"
                />
                <MetricCard
                  label="Net Site Profit"
                  value={formatINR(rebalanceData.siteSummary.netProfit)}
                  subtext="Distributable among partners"
                  icon={<Coins className="w-5 h-5 text-blue-400" />}
                  variant="blue"
                />
                <MetricCard
                  label="On-Site Cash Drawer"
                  value={formatINR(rebalanceData.siteSummary.cashDrawerBalance)}
                  subtext="Live physical drawer pool"
                  icon={<Wallet className="w-5 h-5 text-amber-400" />}
                  variant="amber"
                />
              </div>

              {/* Multi-Partner Balance Matrix Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-500" />
                    Partner Equity & Personal Liquidity Matrix ({rebalanceData.partners.length} Equity Holders)
                  </h3>
                  <Badge variant="slate" size="sm">
                    {rebalanceData.site?.siteName || 'All Quarry Sites'}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Partner Name</th>
                        <th className="p-3 text-center">Equity %</th>
                        <th className="p-3 text-right">Profit Share</th>
                        <th className="p-3 text-right text-emerald-400">Direct Funded (+)</th>
                        <th className="p-3 text-right text-amber-400">Collections (-)</th>
                        <th className="p-3 text-right text-rose-400">Drawings (-)</th>
                        <th className="p-3 text-right font-bold text-white">Net Balance</th>
                        <th className="p-3 text-center">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {rebalanceData.partners.map((p) => (
                        <tr key={p.partner.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3">
                            <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                              {p.partner.name}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                {p.partner.role}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{p.partner.mobile}</div>
                          </td>
                          <td className="p-3 text-center font-bold text-amber-400">{p.sharePercentage}%</td>
                          <td className="p-3 text-right text-white font-medium">{formatINR(p.equityDividend)}</td>
                          <td className="p-3 text-right text-emerald-400">+{formatINR(p.directExpensesFunded)}</td>
                          <td className="p-3 text-right text-amber-400">-{formatINR(p.contractorPaymentsCollected)}</td>
                          <td className="p-3 text-right text-rose-400">-{formatINR(p.drawingsDrawn)}</td>
                          <td className="p-3 text-right font-bold text-base">
                            <span className={p.closingBalance > 0 ? 'text-emerald-400' : p.closingBalance < 0 ? 'text-rose-400' : 'text-slate-400'}>
                              {formatINR(p.closingBalance)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {p.status === 'CREDITOR' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                <TrendingUp className="w-3 h-3" />
                                Receives {formatINR(p.closingBalance)}
                              </span>
                            )}
                            {p.status === 'DEBTOR' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                <TrendingDown className="w-3 h-3" />
                                Must Pay {formatINR(Math.abs(p.closingBalance))}
                              </span>
                            )}
                            {p.status === 'SETTLED' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                <CheckCircle2 className="w-3 h-3 text-slate-400" />
                                Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inter-Account Equalisation Settlement Transfer Plan */}
              <Card variant="glass" className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                      Inter-Account Settlement Transfer Plan
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Peer-to-peer minimal bank transfer instructions to reconcile personal accounts to zero-sum.
                    </p>
                  </div>
                  {rebalanceData.rebalanceTransfers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleWhatsAppRebalanceShare}
                      leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
                    >
                      Share Plan on WhatsApp
                    </Button>
                  )}
                </div>

                {rebalanceData.rebalanceTransfers.length === 0 ? (
                  <div className="p-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                    <h4 className="text-sm font-semibold text-white">All Partner Accounts Balanced</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      There are no outstanding inter-account debts. All dividends, direct payments, and contractor collections are fully equalised.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {rebalanceData.rebalanceTransfers.map((transfer, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-between hover:border-amber-500/30 transition shadow-lg"
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-mono text-slate-500">Step #{idx + 1}</span>
                          <span className="text-base font-extrabold text-amber-400 font-mono">
                            {formatINR(transfer.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-900/90 rounded-lg border border-slate-800/60 text-xs">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] text-rose-400 font-medium block">Payer (Debtor)</span>
                            <span className="font-semibold text-slate-200 truncate block">{transfer.fromPartner.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{transfer.fromPartner.mobile}</span>
                          </div>
                          <div className="p-2 bg-amber-500/10 rounded-full text-amber-400 shrink-0">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0 text-right">
                            <span className="text-[10px] text-emerald-400 font-medium block">Receiver (Creditor)</span>
                            <span className="font-semibold text-slate-200 truncate block">{transfer.toPartner.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{transfer.toPartner.mobile}</span>
                          </div>
                        </div>

                        <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between">
                          <span className="text-slate-500 italic truncate">{transfer.reason}</span>
                          <a
                            href={`https://wa.me/91${transfer.fromPartner.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hi ${transfer.fromPartner.name}, as per our quarry settlement equalisation, please transfer ${formatINR(
                                transfer.amount
                              )} to ${transfer.toPartner.name} (${transfer.toPartner.mobile}).`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 ml-2 shrink-0"
                          >
                            <Phone className="w-3 h-3" /> Remind Payer
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
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

      {/* ========================================================= */}
      {/* TAB 5: SITE BALANCE SHEET & COMPREHENSIVE FINANCIAL HEALTH */}
      {/* ========================================================= */}
      {activeTab === 'balancesheet' && balanceSheetData && (
        <div className="space-y-6 animate-fade-in">
          {/* Solvency & Liquidity Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard
              label="Net Working Capital"
              value={formatINR(balanceSheetData.financialHealth.netWorkingCapital)}
              subtext="Current Assets - Current Liabilities"
              icon={<Coins className="w-5 h-5 text-emerald-400" />}
              variant={balanceSheetData.financialHealth.netWorkingCapital >= 0 ? 'emerald' : 'rose'}
            />
            <MetricCard
              label="Current Ratio (Liquidity)"
              value={`${balanceSheetData.financialHealth.currentRatio}x`}
              subtext="Solvency health (Target > 1.5x)"
              icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
              variant="default"
            />
            <MetricCard
              label="Receivables Exposure"
              value={`${balanceSheetData.financialHealth.receivablesExposurePct}%`}
              subtext="Contractor credit / Total assets"
              icon={<BadgePercent className="w-5 h-5 text-amber-400" />}
              variant="amber"
            />
            <MetricCard
              label="Double-Entry Balance"
              value={balanceSheetData.balanceSheet.isBalanced ? 'Balanced' : 'Variance'}
              subtext={
                balanceSheetData.balanceSheet.isBalanced
                  ? 'Assets = Liabilities + Equity'
                  : `Diff: ${formatINR(balanceSheetData.balanceSheet.balanceVariance)}`
              }
              icon={
                balanceSheetData.balanceSheet.isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )
              }
              variant={balanceSheetData.balanceSheet.isBalanced ? 'emerald' : 'rose'}
            />
          </div>

          {/* Double-Entry T-Account Layout (2 Columns) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN: ASSETS */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-900/70 backdrop-blur-md shadow-2xl flex flex-col h-full justify-between">
                <div>
                  <div className="p-4 bg-emerald-950/40 border-b border-emerald-500/20 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-400" />
                      TOTAL ASSETS
                    </h3>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {formatINR(balanceSheetData.balanceSheet.assets.totalAssets)}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Current Assets */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>1. Current Assets</span>
                        <span className="text-slate-400 font-mono">
                          {formatINR(balanceSheetData.balanceSheet.assets.currentAssets.total)}
                        </span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Cash in Drawer Float</span>
                            <span className="text-[11px] text-slate-500">Spot cash revenue minus drawer outflows</span>
                          </div>
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            {formatINR(balanceSheetData.balanceSheet.assets.currentAssets.cashInHand)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Accounts Receivable (Contractor Credit)</span>
                            <span className="text-[11px] text-slate-500">
                              Outstanding credit balances across {balanceSheetData.financialHealth.activeContractorsCount} active contractors
                            </span>
                          </div>
                          <span className="font-bold text-blue-400 font-mono text-sm">
                            {formatINR(balanceSheetData.balanceSheet.assets.currentAssets.accountsReceivable)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Fixed / Capital Assets */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>2. Fixed & Plant Equipment</span>
                        <span className="text-slate-400 font-mono">
                          {formatINR(balanceSheetData.balanceSheet.assets.fixedAssets.total)}
                        </span>
                      </h4>
                      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-white block">Heavy Machinery & Site Infrastructure</span>
                          <span className="text-[11px] text-slate-500">
                            {balanceSheetData.financialHealth.activeMachineryCount} registered heavy machinery units
                          </span>
                        </div>
                        <span className="font-bold text-slate-400 font-mono text-sm">
                          {formatINR(balanceSheetData.balanceSheet.assets.fixedAssets.equipmentAndMachinery)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Left Column Bottom Banner */}
                <div className="p-4 bg-gradient-to-r from-emerald-950/60 to-slate-900 border-t border-emerald-500/30 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-emerald-200 uppercase tracking-wide">
                    Total Book Assets (A)
                  </span>
                  <span className="text-lg font-extrabold text-emerald-300 font-mono">
                    {formatINR(balanceSheetData.balanceSheet.assets.totalAssets)}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: LIABILITIES & PARTNER EQUITY */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-900/70 backdrop-blur-md shadow-2xl flex flex-col h-full justify-between">
                <div>
                  <div className="p-4 bg-amber-950/40 border-b border-amber-500/20 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-amber-400" />
                      TOTAL LIABILITIES & PARTNER EQUITY
                    </h3>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatINR(balanceSheetData.balanceSheet.totalLiabilitiesAndEquity)}
                    </span>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Current Liabilities */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>1. Current Liabilities</span>
                        <span className="text-rose-400 font-mono">
                          {formatINR(balanceSheetData.balanceSheet.liabilities.totalLiabilities)}
                        </span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Machinery Vendor Payables</span>
                            <span className="text-[11px] text-slate-500">Unsettled heavy equipment rental dues</span>
                          </div>
                          <span className="font-bold text-rose-400 font-mono text-sm">
                            {formatINR(balanceSheetData.balanceSheet.liabilities.currentLiabilities.vendorMachineryPayables)}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Accrued Operating Overheads</span>
                            <span className="text-[11px] text-slate-500">Pending supplier credit obligations</span>
                          </div>
                          <span className="font-bold text-slate-400 font-mono text-sm">
                            {formatINR(balanceSheetData.balanceSheet.liabilities.currentLiabilities.accruedOverheads)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Partner Equity & Capital Accounts */}
                    <div className="pt-2 border-t border-slate-800/60">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>2. Partner Equity & Retained Capital</span>
                        <span className="text-amber-400 font-mono">
                          {formatINR(balanceSheetData.balanceSheet.equity.totalPartnerEquity)}
                        </span>
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white block">Cumulative Operating Profit</span>
                            <span className="text-[11px] text-slate-500">Total quarry dispatch sales minus all expenses</span>
                          </div>
                          <span className="font-bold text-white font-mono text-sm">
                            {formatINR(balanceSheetData.balanceSheet.equity.cumulativeNetProfit)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 bg-emerald-950/20 rounded-lg border border-emerald-800/40 text-center">
                            <span className="text-[10px] text-emerald-400 block font-medium">+ Direct Funded</span>
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              +{formatINR(balanceSheetData.balanceSheet.equity.totalDirectExpensesFunded)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-amber-950/20 rounded-lg border border-amber-800/40 text-center">
                            <span className="text-[10px] text-amber-400 block font-medium">- Retained Cash</span>
                            <span className="text-xs font-bold text-amber-400 font-mono">
                              -{formatINR(balanceSheetData.balanceSheet.equity.totalDirectCollectionsRetained)}
                            </span>
                          </div>
                          <div className="p-2.5 bg-rose-950/20 rounded-lg border border-rose-800/40 text-center">
                            <span className="text-[10px] text-rose-400 block font-medium">- Drawings</span>
                            <span className="text-xs font-bold text-rose-400 font-mono">
                              -{formatINR(balanceSheetData.balanceSheet.equity.totalDrawingsDrawn)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column Bottom Banner */}
                <div className="p-4 bg-gradient-to-r from-amber-950/60 to-slate-900 border-t border-amber-500/30 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-200 uppercase tracking-wide">
                    Total Liabilities & Equity (L + E)
                  </span>
                  <span className="text-lg font-extrabold text-amber-300 font-mono">
                    {formatINR(balanceSheetData.balanceSheet.totalLiabilitiesAndEquity)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Revenue Mix & Commercial Health Card */}
          <Card variant="glass" className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Dispatch Revenue & Commercial Risk Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Spot Cash Inflow Mix</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {formatINR(balanceSheetData.financialHealth.revenueMix.spotCashRevenue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">
                  {balanceSheetData.financialHealth.revenueMix.cashLoadsCount} loads paid in immediate cash
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Contractor Credit Billed</span>
                  <span className="text-lg font-bold text-blue-400 font-mono">
                    {formatINR(balanceSheetData.financialHealth.revenueMix.creditRevenue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">
                  {balanceSheetData.financialHealth.revenueMix.creditLoadsCount} loads supplied on credit terms
                </span>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Total Gross Revenue</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatINR(balanceSheetData.financialHealth.revenueMix.totalRevenue)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-2 block">
                  {balanceSheetData.financialHealth.revenueMix.totalLoadsCount} total dispatches recorded
                </span>
              </div>
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

      {/* Record Contractor Payment Collection Modal */}
      {paymentModalOpen && (
        <RecordPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            void fetchContractorsData();
          }}
          initialContractorId={paymentContractorId || selectedContractorId || undefined}
          initialSiteId={siteId || undefined}
          sites={sites}
          contractors={contractors}
        />
      )}
    </div>
  );
};

