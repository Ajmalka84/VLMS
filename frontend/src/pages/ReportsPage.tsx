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
  getContractorsSummaryApi,
  getSettlementReportApi,
} from '../api/reports';
import { PaymentType } from '../api/loads';
import { useMasterCache } from '../context/MasterCacheContext';
import { useDebounce } from '../hooks/useDebounce';
import { exportToCsv } from '../utils/csvExporter';
import { numberToWordsINR } from '../utils/numberToWords';
import { groupTrips } from '../utils/tripGrouper';
import { PdfCustomHeaderOptions } from '../utils/pdfGenerator';
import { PdfCustomHeaderModal } from '../components/reports/PdfCustomHeaderModal';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { sites } = useMasterCache();

  // Super Admin Customer selection
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customersLoaded, setCustomersLoaded] = useState(!isSuperAdmin);

  // State
  const [selectedContractorId, setSelectedContractorId] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<ContractorsSummaryResponse | null>(null);
  const [settlementData, setSettlementData] = useState<SettlementReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filter State
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);
  const [siteId, setSiteId] = useState('');
  const [paymentType, setPaymentType] = useState<'' | PaymentType>('');
  const [presetRange, setPresetRange] = useState<
    'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const overviewFetchingRef = useRef(false);
  const settlementFetchingRef = useRef(false);

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
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Fetch Contractors Overview
  const fetchContractorsOverview = useCallback(async () => {
    if (overviewFetchingRef.current) return;
    overviewFetchingRef.current = true;
    setLoading(true);
    try {
      const res = await getContractorsSummaryApi({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        siteId: siteId || undefined,
        search: debouncedSearch.trim() || undefined,
        customerId: isSuperAdmin && selectedCustomerId ? selectedCustomerId : undefined,
      });
      setSummaryData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contractor summaries');
    } finally {
      setLoading(false);
      overviewFetchingRef.current = false;
    }
  }, [startDate, endDate, siteId, debouncedSearch, isSuperAdmin, selectedCustomerId]);

  // Fetch Detailed Statement
  const fetchSettlementStatement = useCallback(
    async (contractorId: string) => {
      if (settlementFetchingRef.current) return;
      settlementFetchingRef.current = true;
      setLoading(true);
      try {
        const res = await getSettlementReportApi({
          contractorId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          siteId: siteId || undefined,
          paymentType: paymentType || undefined,
          customerId: isSuperAdmin && selectedCustomerId ? selectedCustomerId : undefined,
        });
        setSettlementData(res);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load settlement report');
      } finally {
        setLoading(false);
        settlementFetchingRef.current = false;
      }
    },
    [startDate, endDate, siteId, paymentType, isSuperAdmin, selectedCustomerId]
  );

  useEffect(() => {
    if (!customersLoaded) return;
    if (selectedContractorId) {
      void fetchSettlementStatement(selectedContractorId);
    } else {
      void fetchContractorsOverview();
    }
  }, [customersLoaded, selectedContractorId, fetchSettlementStatement, fetchContractorsOverview]);

  // Print Handler
  const handlePrint = () => {
    window.print();
  };

  // Professional Multi-Section Settlement Ledger CSV Export Handler
  const handleExportCSV = () => {
    if (!settlementData || settlementData.trips.length === 0) {
      toast.warning('No trip data to export');
      return;
    }

    const businessName = settlementData.business?.businessName || user?.businessName || 'VLMS OPERATIONAL QUARRY';
    const businessContact = settlementData.business?.mobile || user?.mobile || 'N/A';
    const businessGstin = settlementData.business?.gstin || 'N/A';
    const contractorName = settlementData.contractor.name;
    const contractorMobile = settlementData.contractor.mobile;
    const periodText = settlementData.period.startDate && settlementData.period.endDate
      ? `${new Date(settlementData.period.startDate).toLocaleDateString('en-IN')} to ${new Date(settlementData.period.endDate).toLocaleDateString('en-IN')}`
      : 'All Time Records';
    
    const prefix = contractorName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CASH';
    const monthStr = String(new Date().getMonth() + 1).padStart(2, '0');
    const stmtRef = `STMT-${new Date().getFullYear()}${monthStr}-${prefix}-${String(settlementData.summary.totalTrips).padStart(3, '0')}`;
    const amountInWords = numberToWordsINR(settlementData.summary.creditAmount);

    const headers = [
      '#',
      'Date',
      'Vehicle Number',
      'Vehicle Type',
      'Material Loaded',
      'Quarry Site',
      'Trips (Qty)',
      'Trip Rate (INR)',
      'Total Amount (INR)',
      'Payment Mode',
    ];

    const rows: (string | number)[][] = [
      ['COMMERCIAL QUARRY SETTLEMENT BILL & STATEMENT'],
      ['Quarry Operator', businessName, 'Statement Ref', stmtRef],
      ['Quarry Mobile', `+91 ${businessContact}`, 'Issue Date', new Date().toLocaleDateString('en-IN')],
      ['Quarry GSTIN', businessGstin, 'Billing Period', periodText],
      ['Contractor Name', contractorName, 'Contractor Mobile', `+91 ${contractorMobile}`],
      [],
      ['=== EXECUTIVE FINANCIAL SUMMARY ==='],
      ['Total Dispatches', `${settlementData.summary.totalTrips} Loads`, 'Gross Billed (INR)', Math.round(settlementData.summary.totalAmount)],
      ['Cash Settled (INR)', Math.round(settlementData.summary.cashAmount), 'Net Credit Balance (INR)', Math.round(settlementData.summary.creditAmount)],
      ['Net Balance in Words', amountInWords],
      [],
    ];

    if (settlementData.materialBreakdown.length > 0) {
      rows.push(['=== MATERIAL VOLUME BREAKDOWN ===']);
      rows.push(['Material Name', 'Trips Count', 'Share %', 'Subtotal Amount (INR)']);
      settlementData.materialBreakdown.forEach((m) => {
        rows.push([m.materialName, m.tripCount, `${m.percentage}%`, Math.round(m.totalAmount)]);
      });
      rows.push([]);
    }

    rows.push(['=== CONSOLIDATED DISPATCH REGISTER ===']);
    rows.push(headers);

    const grouped = groupTrips(settlementData.trips);
    grouped.forEach((g, idx) => {
      rows.push([
        idx + 1,
        new Date(g.date).toLocaleDateString('en-IN'),
        g.vehicleNumber,
        g.vehicleType || 'N/A',
        g.materialName,
        g.siteName,
        g.tripCount,
        g.rate,
        g.totalAmount,
        g.paymentType,
      ]);
    });

    rows.push([]);
    rows.push([
      '',
      '',
      '',
      '',
      '',
      'TOTAL TRIPS:',
      settlementData.summary.totalTrips,
      'NET SETTLEMENT DUE:',
      Math.round(settlementData.summary.creditAmount),
      '',
    ]);

    const sanitizedName = settlementData.contractor.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    exportToCsv(
      `Settlement_Bill_${sanitizedName}_${new Date().toISOString().split('T')[0]}`,
      [],
      rows
    );
    toast.success('Professional settlement CSV exported successfully!');
  };

  // Export Overview All Contractors Ledger
  const handleExportAllLedgerCSV = () => {
    if (!summaryData || summaryData.contractors.length === 0) {
      toast.warning('No contractor summary data to export');
      return;
    }

    const headers = [
      '#',
      'Contractor Name',
      'Mobile Number',
      'Total Trips',
      'Gross Billed (INR)',
      'Cash Paid (INR)',
      'Net Credit Balance (INR)',
    ];

    const rows: (string | number)[][] = summaryData.contractors.map(({ contractor, stats }, idx) => [
      idx + 1,
      contractor.name,
      contractor.mobile,
      stats.totalTrips,
      Math.round(stats.totalAmount),
      Math.round(stats.cashAmount),
      Math.round(stats.creditAmount),
    ]);

    rows.push([]);
    rows.push([
      'GRAND TOTAL',
      `${summaryData.grandTotal.contractorCount} Accounts`,
      '',
      summaryData.grandTotal.totalTrips,
      Math.round(summaryData.grandTotal.totalAmount),
      Math.round(summaryData.grandTotal.cashAmount),
      Math.round(summaryData.grandTotal.creditAmount),
    ]);

    exportToCsv(
      `Contractors_Ledger_Summary_${new Date().toISOString().split('T')[0]}`,
      headers,
      rows
    );
    toast.success('Contractor ledger summary exported successfully!');
  };

  // PDF Export Trigger (Opens custom header configuration modal)
  const handleOpenPdfModal = () => {
    if (!settlementData || settlementData.trips.length === 0) {
      toast.warning('No trip data to export');
      return;
    }
    setIsPdfModalOpen(true);
  };

  // PDF Export Execution with Custom Options
  const handleExportPdfWithOptions = async (options: PdfCustomHeaderOptions) => {
    if (!settlementData || settlementData.trips.length === 0) {
      toast.warning('No trip data to export');
      return;
    }
    try {
      const { exportSettlementPdf } = await import('../utils/pdfGenerator');
      exportSettlementPdf(settlementData, user?.businessName, options);
      setIsPdfModalOpen(false);
      toast.success(
        language === 'ml'
          ? 'PDF വിജയകരമായി ഡൗൺലോഡ് ചെയ്തു!'
          : 'Settlement PDF downloaded successfully!'
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate PDF');
    }
  };

  // Customer options for Super Admin
  const customerSelectOptions: CustomSelectOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.businessName,
      subLabel: `+91 ${c.mobile}`,
    }));
  }, [customers]);

  // Filter Site options
  const siteFilterOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_sites') },
      ...sites.map((s) => ({ value: s.id, label: s.siteName, subLabel: s.location })),
    ];
  }, [sites, t]);

  // Filter Payment options
  const paymentFilterOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: '', label: t('all_payments') },
      { value: 'CREDIT', label: t('credit_only') },
      { value: 'CASH', label: t('cash_only') },
    ];
  }, [t]);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/*                       PRINT-ONLY STYLES                       */}
      {/* ------------------------------------------------------------- */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
            font-size: 11pt !important;
          }
          header, nav, .no-print, button, #logout-btn {
            display: none !important;
          }
          .print-clean {
            background: #ffffff !important;
            color: #000000 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-border {
            border: 1px solid #333333 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #cccccc !important;
            padding: 6px 8px !important;
            color: #000000 !important;
          }
          th {
            background-color: #f3f4f6 !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {t('settlement_reports_title')}
          </h1>
        </div>

        {/* Super Admin Quarry Switcher / Back Button */}
        <div className="flex items-center gap-3">
          {isSuperAdmin && !selectedContractorId && (
            <div className="w-64 relative z-40">
              <CustomSelect
                options={customerSelectOptions}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                placeholder="Select Customer Quarry..."
              />
            </div>
          )}

          {selectedContractorId && (
            <button
              onClick={() => {
                setSelectedContractorId(null);
                setSettlementData(null);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs sm:text-sm font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> {t('back_to_contractors')}
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/*                   VIEW 1: ALL CONTRACTORS SUMMARY HUB                    */}
      {/* ========================================================================= */}
      {!selectedContractorId && (
        <div className="space-y-6">
          {/* Simple Clean Financial Metric Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">{t('active_contractors')}</span>
              <div className="text-lg sm:text-2xl font-extrabold text-white mt-1 truncate">
                {summaryData?.grandTotal.contractorCount ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">{t('total_loads')}</span>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-200 mt-1 truncate">
                {summaryData?.grandTotal.totalTrips ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-slate-400 font-medium">{t('total_billed')}</span>
              <div className="text-lg sm:text-2xl font-extrabold text-slate-200 mt-1 truncate">
                ₹{Math.round(summaryData?.grandTotal.totalAmount ?? 0).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-xs text-amber-400 font-bold uppercase">{t('net_payable')}</span>
              <div className="text-lg sm:text-2xl font-extrabold text-amber-300 mt-1 truncate">
                ₹{Math.round(summaryData?.grandTotal.creditAmount ?? 0).toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Simple Clean Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative z-30 overflow-visible">
            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> {t('period')}:
              </span>
              {[
                { key: 'all', label: t('all_time') },
                { key: 'today', label: t('today') },
                { key: 'yesterday', label: t('yesterday') },
                { key: 'week', label: t('last_7_days') },
                { key: 'month', label: t('this_month') },
                { key: 'custom', label: t('custom_range') },
              ].map((p) => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    presetRange === p.key
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search contractor name or mobile..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="relative">
                <CustomSelect
                  options={siteFilterOptions}
                  value={siteId}
                  onChange={setSiteId}
                  placeholder={t('all_sites')}
                />
              </div>

              <button
                onClick={handleExportAllLedgerCSV}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer select-none touch-manipulation"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Export Ledger (CSV)
              </button>

              {presetRange === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white cursor-pointer font-mono focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-slate-500 text-xs font-bold">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onClick={(e) => (e.target as any).showPicker?.()}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white cursor-pointer font-mono focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Simple Clean Contractors Ledger Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
                <span>Loading contractor ledgers...</span>
              </div>
            ) : summaryData?.contractors.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                {t('no_contractors_found')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Contractor (C/O)</th>
                      <th className="py-3 px-4 text-center">Total Trips</th>
                      <th className="py-3 px-4 text-right">Gross Billed</th>
                      <th className="py-3 px-4 text-right">Cash Paid</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {summaryData?.contractors.map(({ contractor, stats }, idx) => (
                      <tr
                        key={contractor.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{contractor.name}</div>
                          <div className="text-xs font-mono text-slate-400 mt-0.5">
                            {contractor.mobile && contractor.mobile !== 'N/A'
                              ? `+91 ${contractor.mobile}`
                              : 'Spot Cash / Direct Sales'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {stats.totalTrips}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium">
                          ₹{Math.round(stats.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right text-emerald-400 font-medium">
                          ₹{Math.round(stats.cashAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedContractorId(contractor.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm cursor-pointer select-none touch-manipulation"
                          >
                            <span>{t('generate_statement')}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/*             VIEW 2: SIMPLE CLEAN SETTLEMENT STATEMENT & PDF               */}
      {/* ========================================================================= */}
      {selectedContractorId && settlementData && (
        <div className="space-y-6">
          {/* Action & Filter Toolbar (Print Hidden) */}
          <div className="no-print p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 relative z-30 overflow-visible">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" /> {t('period')}:
                </span>
                {[
                  { key: 'all', label: t('all_time') },
                  { key: 'today', label: t('today') },
                  { key: 'yesterday', label: t('yesterday') },
                  { key: 'week', label: t('last_7_days') },
                  { key: 'month', label: t('this_month') },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => applyPreset(p.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      presetRange === p.key
                        ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  {t('export_csv')}
                </button>
                <button
                  onClick={handleOpenPdfModal}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  {t('download_pdf')}
                </button>
              </div>
            </div>

            {/* Secondary Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
              <div className="relative">
                <CustomSelect
                  options={siteFilterOptions}
                  value={siteId}
                  onChange={setSiteId}
                  placeholder={t('all_sites')}
                />
              </div>
              <div className="relative">
                <CustomSelect
                  options={paymentFilterOptions}
                  value={paymentType}
                  onChange={(v) => setPaymentType(v as any)}
                  placeholder={t('all_payments')}
                  searchable={false}
                />
              </div>
            </div>
          </div>

          {/* Professional Printable Settlement Statement Voucher */}
          <div
            id="settlement-voucher"
            className="print-clean bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl print:bg-white print:border-none print:p-0 print:shadow-none"
          >
            {/* Clean Corporate Invoice Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800 print:border-gray-400">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white print:text-black uppercase tracking-tight">
                  {settlementData.business?.businessName || user?.businessName || 'VLMS OPERATIONAL QUARRY'}
                </h2>
                <div className="text-xs text-slate-400 print:text-gray-600 mt-1">
                  Mobile: +91 {settlementData.business?.mobile || user?.mobile || 'N/A'}
                  {settlementData.business?.gstin && ` • GSTIN: ${settlementData.business.gstin}`}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-xs font-mono font-extrabold uppercase px-3 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 print:border-black print:text-black inline-block">
                  SETTLEMENT STATEMENT / BILL
                </div>
                <div className="text-xs font-mono text-slate-400 print:text-gray-600 mt-1.5">
                  Ref: STMT-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-{(settlementData.contractor.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CASH')}-{String(settlementData.summary.totalTrips).padStart(3, '0')}
                </div>
                <div className="text-xs text-slate-400 print:text-gray-600 mt-0.5">
                  Issue Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Billed-To & Period Info Dual Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 print:bg-transparent print:border-gray-300 text-xs">
              <div>
                <span className="text-slate-400 print:text-gray-600 uppercase font-bold tracking-wider block">
                  {t('billed_to')}:
                </span>
                <div className="text-base font-extrabold text-white print:text-black mt-0.5">
                  {settlementData.contractor.name}
                </div>
                <div className="font-mono text-slate-400 print:text-gray-700 mt-0.5">
                  {settlementData.contractor.mobile && settlementData.contractor.mobile !== 'N/A'
                    ? `Mobile: +91 ${settlementData.contractor.mobile}`
                    : 'Spot Cash / Direct Account'}
                </div>
                <div className="text-[11px] text-slate-500 print:text-gray-600 mt-0.5">
                  Account: {!settlementData.contractor.id || settlementData.contractor.name.toLowerCase().includes('direct') ? 'Spot Cash / Counter Sales' : 'Transport C/O Contractor Ledger'}
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-slate-400 print:text-gray-600 uppercase font-bold tracking-wider block">
                  {t('period')}:
                </span>
                <div className="text-sm font-extrabold text-white print:text-black mt-0.5">
                  {settlementData.period.startDate && settlementData.period.endDate
                    ? `${new Date(settlementData.period.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} — ${new Date(settlementData.period.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                    : t('all_time')}
                </div>
                <div className="text-slate-400 print:text-gray-700 mt-0.5">
                  Total Dispatches: {settlementData.summary.totalTrips}
                </div>
              </div>
            </div>

            {/* Compact Material Summary (if multiple materials) */}
            {settlementData.materialBreakdown.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider block">
                  {t('material_volume_breakdown')}:
                </span>
                <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-400">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 print:bg-gray-100 print:text-black print:border-gray-400 font-bold">
                        <th className="py-2 px-3">Material Specification</th>
                        <th className="py-2 px-3 text-center">Dispatch Trips & Share</th>
                        <th className="py-2 px-3 text-right">Subtotal Volume (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 print:divide-gray-300 text-slate-300 print:text-black">
                      {settlementData.materialBreakdown.map((m) => (
                        <tr key={m.materialTypeId}>
                          <td className="py-2 px-3 font-semibold">{m.materialName}</td>
                          <td className="py-2 px-3 text-center">{m.tripCount} Trips ({m.percentage}%)</td>
                          <td className="py-2 px-3 text-right font-medium">₹{Math.round(m.totalAmount).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Consolidated Dispatch Ledger Table */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider block">
                {t('itemized_trip_log')} (Consolidated by Date & Vehicle):
              </span>
              <div className="overflow-x-auto rounded-xl border border-slate-800 print:border-gray-400">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 print:bg-gray-100 print:text-black print:border-gray-400 font-bold">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">{t('date_time')}</th>
                      <th className="py-2.5 px-3">{t('vehicle_no')}</th>
                      <th className="py-2.5 px-3">{t('material')}</th>
                      <th className="py-2.5 px-3">{t('site')}</th>
                      <th className="py-2.5 px-3 text-center">Trips</th>
                      <th className="py-2.5 px-3 text-right">Trip Rate</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                      <th className="py-2.5 px-3 text-center">{t('filter_by_payment')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 print:divide-gray-300 text-slate-200 print:text-black">
                    {settlementData.trips.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-500">
                          {t('no_settlement_trips')}
                        </td>
                      </tr>
                    ) : (
                      groupTrips(settlementData.trips).map((g, idx) => (
                        <tr
                          key={`${g.date}_${g.vehicleNumber}_${g.materialName}_${g.siteName}_${idx}`}
                          className="hover:bg-slate-800/30 print:hover:bg-transparent"
                        >
                          <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-mono">
                            {new Date(g.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-white print:text-black tracking-wide">
                            {g.vehicleNumber.replace(/[\s-]+/g, ' ')}
                          </td>
                          <td className="py-2 px-3">{g.materialName}</td>
                          <td className="py-2 px-3 text-slate-400 print:text-gray-700">
                            {g.siteName}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-amber-400 print:text-black">
                            <span className="px-2 py-0.5 rounded bg-slate-800 print:bg-transparent">
                              {g.tripCount}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300 print:text-black">
                            ₹{Math.round(g.rate).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 font-bold text-right text-emerald-400 print:text-black">
                            ₹{Math.round(g.totalAmount).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                g.paymentType === 'CASH'
                                  ? 'bg-emerald-500/20 text-emerald-300 print:border print:border-emerald-700 print:text-emerald-700'
                                  : 'bg-amber-500/20 text-amber-300 print:border print:border-amber-700 print:text-amber-700'
                              }`}
                            >
                              {g.paymentType}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {settlementData.trips.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-950 border-t-2 border-slate-700 print:bg-gray-100 print:border-black font-extrabold text-white print:text-black">
                        <td colSpan={5} className="py-2.5 px-3 uppercase text-right">
                          GROSS TOTALS:
                        </td>
                        <td className="py-2.5 px-3 text-center text-amber-400 print:text-black font-extrabold">
                          {settlementData.summary.totalTrips}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 print:text-black">
                          {/* Blank for rate */}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 print:text-black text-sm font-extrabold">
                          ₹{Math.round(settlementData.summary.totalAmount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Executive 4-Column Financial Settlement Summary Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-400">
                <span className="text-[11px] text-slate-400 print:text-gray-600 uppercase font-semibold">
                  {t('total_loads')}
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-white print:text-black mt-0.5 truncate">
                  {settlementData.summary.totalTrips}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-400">
                <span className="text-[11px] text-slate-400 print:text-gray-600 uppercase font-semibold">
                  {t('total_billed')}
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-slate-200 print:text-black mt-0.5 truncate">
                  ₹{Math.round(settlementData.summary.totalAmount).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 print:border-gray-400">
                <span className="text-[11px] text-emerald-400 print:text-black uppercase font-semibold">
                  {t('cash_settled')}
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-400 print:text-black mt-0.5 truncate">
                  ₹{Math.round(settlementData.summary.cashAmount).toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 print:border-black">
                <span className="text-[11px] text-amber-400 print:text-black uppercase font-extrabold">
                  {t('net_payable')}
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-amber-300 print:text-black mt-0.5 truncate">
                  ₹{Math.round(settlementData.summary.creditAmount).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Amount in Words Banner */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 print:border-gray-300 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
              <span className="text-slate-400 print:text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                Net Balance in Words:
              </span>
              <span className="font-bold text-amber-300 print:text-black">
                {numberToWordsINR(settlementData.summary.creditAmount)}
              </span>
            </div>

            {/* Terms & Notes */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px] text-slate-500 print:text-gray-600 space-y-0.5">
              <div className="font-bold text-slate-400 print:text-black">Terms & Acknowledgement:</div>
              <div>1. All dispatches recorded from automated weighbridge and site register entries.</div>
              <div>2. Dues must be settled according to agreed contractor credit cycles.</div>
            </div>

            {/* Dual Signature Lines with Seal Placeholder for Physical Billing Printouts */}
            <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800 print:border-gray-400 text-xs text-slate-400 print:text-black items-end">
              <div>
                <div className="w-36 sm:w-48 border-b border-slate-700 print:border-black mb-1.5" />
                <div className="font-bold">{t('authorized_signature')}</div>
                <div className="text-[11px] text-slate-500 print:text-gray-600">
                  {settlementData.business?.businessName || user?.businessName || 'Quarry Management'}
                </div>
              </div>

              <div className="text-center flex flex-col items-center justify-center">
                <div className="w-24 h-14 border border-dashed border-slate-700 print:border-gray-400 rounded-lg flex items-center justify-center text-[10px] text-slate-500 uppercase">
                  [ SEAL / STAMP ]
                </div>
              </div>

              <div className="text-right flex flex-col items-end">
                <div className="w-36 sm:w-48 border-b border-slate-700 print:border-black mb-1.5" />
                <div className="font-bold">
                  {!settlementData.contractor.id || settlementData.contractor.name.toLowerCase().includes('direct')
                    ? 'Customer / Receiver Signature'
                    : t('contractor_signature')}
                </div>
                <div className="text-[11px] text-slate-500 print:text-gray-600">
                  {settlementData.contractor.name}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Custom Header / Collaboration Modal */}
      {selectedContractorId && settlementData && (
        <PdfCustomHeaderModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          onConfirm={handleExportPdfWithOptions}
          defaultBusinessName={
            settlementData.business?.businessName ||
            user?.businessName ||
            'VLMS Quarry Management'
          }
          defaultMobile={
            settlementData.business?.mobile ||
            user?.mobile ||
            ''
          }
          defaultGstin={
            settlementData.business?.gstin ||
            user?.gstin ||
            ''
          }
        />
      )}
    </div>
  );
};
