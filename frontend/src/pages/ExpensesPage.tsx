import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  DollarSign,
  Truck,
  Layers,
  Clock,
  Trash2,
  Edit2,
  X,
  Gauge,
  User,
  Building2,
  Banknote,
  Sparkles,
  Lock,
  AlertCircle,
} from 'lucide-react';
import {
  fetchExpensesApi,
  createExpenseApi,
  updateExpenseApi,
  deleteExpenseApi,
  Expense,
  ExpenseCategory,
  Machinery,
  PaymentMode,
  ExpenseSummary,
} from '../api/expenses';
import { getMasterDataBundleApi } from '../api/masterData';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Button,
  Input,
  DateInput,
  CustomSelect,
  CustomSelectOption,
  Badge,
  Modal,
  PageHeader,
  MetricCard,
  FilterBar,
  ConfirmModal,
  EmptyState,
} from '../components/common';
import { useFilterState } from '../hooks/useFilterState';
import { formatINR } from '../utils/formatters';
import { queryCache } from '../utils/queryCache';

export const PAYMENT_MODES: { label: string; value: PaymentMode; badgeClass: string }[] = [
  { label: 'Cash Drawer', value: 'CASH_DRAWER', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  { label: 'UPI / Online', value: 'UPI_ONLINE', badgeClass: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' },
  { label: 'Vendor Credit', value: 'VENDOR_CREDIT', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { label: 'Owner Direct', value: 'OWNER_DIRECT', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
];

function parseTimeToMins(timeStr: string): number | null {
  if (!timeStr) return null;
  const trimmed = timeStr.trim().toLowerCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3];

  if (minutes < 0 || minutes > 59) return null;

  if (meridian) {
    if (hours < 1 || hours > 12) return null;
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
  } else {
    if (hours < 0 || hours > 23) return null;
  }

  return hours * 60 + minutes;
}

function computeHours(startTime: string, closingTime: string): { hours: number; isOvernight: boolean } | null {
  const startMins = parseTimeToMins(startTime);
  const closeMins = parseTimeToMins(closingTime);
  if (startMins === null || closeMins === null) return null;

  let durationMins: number;
  let isOvernight = false;
  if (closeMins >= startMins) {
    durationMins = closeMins - startMins;
  } else {
    durationMins = 1440 - startMins + closeMins;
    isOvernight = true;
  }

  const hours = Math.round((durationMins / 60) * 100) / 100;
  return { hours, isOvernight };
}

export const ExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary>({
    totalExpenses: 0,
    totalCashDrawerExpenses: 0,
    totalMachineRent: 0,
    totalAdvancesPaid: 0,
    totalMachineHours: 0,
    count: 0,
  });

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [machinery, setMachinery] = useState<Machinery[]>([]);
  const [sites, setSites] = useState<{ id: string; siteName: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const filter = useFilterState({ defaultPreset: 'all' });
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMachineryId, setSelectedMachineryId] = useState<string>('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showNoMachineryModal, setShowNoMachineryModal] = useState(false);
  const [entryMode, setEntryMode] = useState<'GENERAL' | 'MACHINERY'>('GENERAL');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formSiteId, setFormSiteId] = useState('');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState<PaymentMode>('CASH_DRAWER');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  // Memoized Select Options for 0-lag FilterBar & Modals
  const filterSiteOptions = useMemo(
    () => [{ value: '', label: 'All Sites' }, ...sites.map((s) => ({ value: s.id, label: s.siteName }))],
    [sites]
  );

  const filterCategoryOptions = useMemo(
    () => [{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories]
  );

  const filterMachineryOptions = useMemo(
    () => [
      { value: '', label: 'All Machines' },
      ...machinery.map((m) => ({ value: m.id, label: `${m.name}${m.code ? ` (${m.code})` : ''}` })),
    ],
    [machinery]
  );

  const filterPaymentModeOptions = useMemo(
    () => [
      { value: '', label: 'All Payment Modes' },
      ...PAYMENT_MODES.map((pm) => ({ value: pm.value, label: pm.label })),
    ],
    []
  );

  const modalSiteOptions = useMemo(
    () => sites.map((s) => ({ value: s.id, label: s.siteName })),
    [sites]
  );

  const modalCategoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );

  const modalMachineryOptions = useMemo(
    () => machinery.map((m) => ({ value: m.id, label: `${m.name}${m.code ? ` (${m.code})` : ''}` })),
    [machinery]
  );


  // Machinery Form Fields
  const [formMachineryId, setFormMachineryId] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00 AM');
  const [formClosingTime, setFormClosingTime] = useState('05:30 PM');
  const [formStartMeter, setFormStartMeter] = useState('');
  const [formEndMeter, setFormEndMeter] = useState('');
  const [formRentPerHour, setFormRentPerHour] = useState('');
  const [formAdvanceAmount, setFormAdvanceAmount] = useState('0');

  // Load Initial Master Data
  const loadMasterData = useCallback(async () => {
    try {
      const bundle = await getMasterDataBundleApi();
      const activeSitesList = bundle.sites || [];
      setSites(activeSitesList);
      setCategories(bundle.expenseCategories || []);
      setMachinery(bundle.machinery || []);

      if (user?.role === 'SITE_BOY' && user?.assignedSiteId) {
        setSelectedSiteId(user.assignedSiteId);
        setFormSiteId(user.assignedSiteId);
      } else if (activeSitesList.length > 0) {
        if (!selectedSiteId) setSelectedSiteId(activeSitesList[0].id);
        if (!formSiteId) setFormSiteId(activeSitesList[0].id);
      }

      if (bundle.expenseCategories && bundle.expenseCategories.length > 0) {
        setFormCategoryId(bundle.expenseCategories[0].id);
      }
      if (bundle.machinery && bundle.machinery.length > 0) {
        setFormMachineryId(bundle.machinery[0].id);
        if (bundle.machinery[0].defaultRentPerHour) {
          setFormRentPerHour(String(bundle.machinery[0].defaultRentPerHour));
        }
      }
    } catch (err: any) {
      console.error('Failed to load master data bundle', err);
    }
  }, [user, selectedSiteId, formSiteId]);

  const expensesAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      expensesAbortRef.current?.abort();
    };
  }, []);

  // Load Expenses
  const loadExpenses = useCallback(async () => {
    if (expensesAbortRef.current) {
      expensesAbortRef.current.abort();
    }
    const controller = new AbortController();
    expensesAbortRef.current = controller;

    setIsLoading(true);
    setError(null);
    try {
      const effectiveSiteId = user?.role === 'SITE_BOY' ? user?.assignedSiteId || undefined : selectedSiteId || undefined;
      const data = await fetchExpensesApi({
        siteId: effectiveSiteId,
        categoryId: selectedCategoryId || undefined,
        machineryId: selectedMachineryId || undefined,
        paymentMode: (selectedPaymentMode as PaymentMode) || undefined,
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
      }, { signal: controller.signal });
      setExpenses(data.expenses);
      setSummary(data.summary);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to fetch expenses');
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedSiteId, selectedCategoryId, selectedMachineryId, selectedPaymentMode, filter.startDate, filter.endDate]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Filtered expenses by debounced search
  const filteredExpenses = useMemo(() => {
    if (!filter.debouncedSearch) return expenses;
    const term = filter.debouncedSearch.toLowerCase();
    return expenses.filter(
      (e) =>
        e.paidTo?.toLowerCase().includes(term) ||
        e.remarks?.toLowerCase().includes(term) ||
        e.category?.name.toLowerCase().includes(term) ||
        e.machinery?.name.toLowerCase().includes(term) ||
        e.site?.siteName.toLowerCase().includes(term),
    );
  }, [expenses, filter.debouncedSearch]);

  // Live Hours & Cost Calculation for Machinery form
  const liveMachineryCalculation = useMemo(() => {
    if (entryMode !== 'MACHINERY') return null;
    const rentRate = parseFloat(formRentPerHour) || 0;
    const startM = parseFloat(formStartMeter);
    const endM = parseFloat(formEndMeter);

    let hours = 0;
    let calculationSource: 'METER' | 'TIME' = 'METER';

    if (!isNaN(startM) && !isNaN(endM) && endM >= startM) {
      hours = Math.round((endM - startM) * 100) / 100;
      calculationSource = 'METER';
    } else {
      const calc = computeHours(formStartTime, formClosingTime);
      if (calc) {
        hours = calc.hours;
        calculationSource = 'TIME';
      }
    }

    const totalRent = Math.round(hours * rentRate * 100) / 100;
    return {
      hours,
      calculationSource,
      rentRate,
      totalRent,
    };
  }, [entryMode, formStartMeter, formEndMeter, formStartTime, formClosingTime, formRentPerHour]);

  // Handle Machine Selection in Modal
  const handleMachineChange = (machId: string) => {
    setFormMachineryId(machId);
    const m = machinery.find((item) => item.id === machId);
    if (m && m.defaultRentPerHour) {
      setFormRentPerHour(String(m.defaultRentPerHour));
    }
    const maintenanceCat = categories.find((c) =>
      c.name.toLowerCase().includes('maintenance') || c.name.toLowerCase().includes('machinery'),
    );
    if (maintenanceCat && !formCategoryId) {
      setFormCategoryId(maintenanceCat.id);
    }
  };

  const openCreateModal = (mode: 'GENERAL' | 'MACHINERY' = 'GENERAL') => {
    if (mode === 'MACHINERY' && machinery.length === 0) {
      setShowNoMachineryModal(true);
      return;
    }

    setEditingExpense(null);
    setEntryMode(mode);
    setFormSiteId(user?.role === 'SITE_BOY' ? (user?.assignedSiteId || sites[0]?.id || '') : (sites[0]?.id || ''));
    setFormCategoryId(categories[0]?.id || '');
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormAmount('');
    setFormPaymentMode('CASH_DRAWER');
    setFormPaidTo('');
    setFormRemarks('');

    if (machinery.length > 0) {
      setFormMachineryId(machinery[0].id);
      setFormRentPerHour(String(machinery[0].defaultRentPerHour || '2500'));
    } else {
      setFormMachineryId('');
      setFormRentPerHour('2500');
    }
    setFormStartTime('08:00 AM');
    setFormClosingTime('05:30 PM');
    setFormStartMeter('');
    setFormEndMeter('');
    setFormAdvanceAmount('0');

    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setEntryMode(exp.machineryId ? 'MACHINERY' : 'GENERAL');
    setFormSiteId(exp.siteId);
    setFormCategoryId(exp.categoryId);
    setFormDate(exp.date.slice(0, 10));
    setFormAmount(String(exp.amount));
    setFormPaymentMode(exp.paymentMode);
    setFormPaidTo(exp.paidTo || '');
    setFormRemarks(exp.remarks || '');

    setFormMachineryId(exp.machineryId || '');
    setFormStartTime(exp.startTime || '08:00 AM');
    setFormClosingTime(exp.closingTime || '05:30 PM');
    setFormStartMeter(exp.startMeterReading !== undefined && exp.startMeterReading !== null ? String(exp.startMeterReading) : '');
    setFormEndMeter(exp.endMeterReading !== undefined && exp.endMeterReading !== null ? String(exp.endMeterReading) : '');
    setFormRentPerHour(exp.rentPerHour ? String(exp.rentPerHour) : '');
    setFormAdvanceAmount(exp.advanceAmount ? String(exp.advanceAmount) : '0');

    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      if (!formSiteId) throw new Error('Please select a quarry site.');
      if (!formCategoryId) throw new Error('Please select an expense category.');

      let payload: any = {
        siteId: formSiteId,
        categoryId: formCategoryId,
        date: formDate,
        paymentMode: formPaymentMode,
        paidTo: formPaidTo.trim() || undefined,
        remarks: formRemarks.trim() || undefined,
      };

      if (entryMode === 'GENERAL') {
        const amt = parseFloat(formAmount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error('Please enter a valid expense amount greater than 0.');
        }
        payload.amount = amt;
      } else {
        if (!formMachineryId) throw new Error('Please select a heavy machinery unit.');
        const rentRate = parseFloat(formRentPerHour);
        if (isNaN(rentRate) || rentRate < 0) {
          throw new Error('Please enter a valid rent per hour.');
        }

        const startM = parseFloat(formStartMeter);
        const endM = parseFloat(formEndMeter);
        let totalHours = 0;

        if (!isNaN(startM) && !isNaN(endM)) {
          if (endM < startM) {
            throw new Error('Closing meter reading cannot be less than start meter reading.');
          }
          totalHours = Math.round((endM - startM) * 100) / 100;
          payload.startMeterReading = startM;
          payload.endMeterReading = endM;
        } else {
          const calc = computeHours(formStartTime, formClosingTime);
          if (!calc) {
            throw new Error('Please enter valid Start & End Meter readings or time window.');
          }
          totalHours = calc.hours;
        }

        payload.machineryId = formMachineryId;
        payload.startTime = formStartTime || '08:00 AM';
        payload.closingTime = formClosingTime || '05:30 PM';
        payload.totalHours = totalHours;
        payload.rentPerHour = rentRate;
        payload.amount = Math.round(totalHours * rentRate * 100) / 100;
        payload.advanceAmount = formAdvanceAmount ? parseFloat(formAdvanceAmount) : 0;
      }

      if (editingExpense) {
        await updateExpenseApi(editingExpense.id, payload);
        toast.success('Expense record updated successfully');
      } else {
        await createExpenseApi(payload);
        toast.success('Expense recorded successfully');
      }
      queryCache.invalidate('dashboard_');
      queryCache.invalidate('rep_');

      setIsModalOpen(false);
      await loadExpenses();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    try {
      await deleteExpenseApi(deletingExpenseId);
      queryCache.invalidate('dashboard_');
      queryCache.invalidate('rep_');
      setDeletingExpenseId(null);
      toast.info('Expense record deleted');
      await loadExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete expense record');
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      toast.info('No expenses to export');
      return;
    }
    const headers = ['Date', 'Site', 'Category', 'Machinery', 'Total Hours', 'Rent/Hr', 'Payment Mode', 'Paid To', 'Advance', 'Amount', 'Remarks'];
    const rows = filteredExpenses.map((exp) => [
      exp.date.slice(0, 10),
      `"${exp.site?.siteName || ''}"`,
      `"${exp.category?.name || ''}"`,
      `"${exp.machinery?.name || ''}"`,
      exp.totalHours || '',
      exp.rentPerHour || '',
      exp.paymentMode,
      `"${exp.paidTo || ''}"`,
      exp.advanceAmount || 0,
      exp.amount,
      `"${exp.remarks || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Exported expenses to CSV');
  };

  const extraActiveFilters = (selectedCategoryId ? 1 : 0) + (selectedMachineryId ? 1 : 0) + (selectedPaymentMode ? 1 : 0) + (selectedSiteId && user?.role !== 'SITE_BOY' ? 1 : 0);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <PageHeader
        title="Site Expenses & Machine Rental"
        subtitle="Track daily site operational costs, cash drawer disbursements, and heavy machinery hourly logs."
        badge={`${summary.count} Records`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateModal('GENERAL')}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 transition shadow-sm cursor-pointer text-xs sm:text-sm min-h-[42px] touch-manipulation"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Add Expense
            </button>
            <button
              onClick={() => openCreateModal('MACHINERY')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer text-xs sm:text-sm min-h-[42px] touch-manipulation"
            >
              <Truck className="w-4 h-4" />
              Log Machine Hours
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Expenses"
          value={formatINR(summary.totalExpenses)}
          subtext={`${summary.count} entries recorded`}
          icon={<DollarSign className="w-5 h-5 text-rose-400" />}
          variant="rose"
        />
        <MetricCard
          label="Cash Drawer Paid"
          value={formatINR(summary.totalCashDrawerExpenses)}
          subtext="On-site cash box disbursements"
          icon={<Banknote className="w-5 h-5 text-emerald-400" />}
          variant="emerald"
        />
        <MetricCard
          label="Machinery Rental"
          value={formatINR(summary.totalMachineRent)}
          subtext={`${summary.totalMachineHours} hrs logged`}
          icon={<Truck className="w-5 h-5 text-amber-400" />}
          variant="amber"
        />
        <MetricCard
          label="Advances Paid"
          value={formatINR(summary.totalAdvancesPaid)}
          subtext="Operator / diesel cash advances"
          icon={<Layers className="w-5 h-5 text-blue-400" />}
          variant="blue"
        />
      </div>

      {/* Modern FilterBar */}
      <FilterBar
        activePreset={filter.preset}
        onPresetChange={filter.setPreset}
        startDate={filter.startDate}
        onStartDateChange={filter.setStartDate}
        endDate={filter.endDate}
        onEndDateChange={filter.setEndDate}
        search={filter.search}
        onSearchChange={filter.setSearch}
        searchPlaceholder="Search category, paid to, vehicle, remarks..."
        onExportCSV={handleExportCSV}
      >
        {user?.role !== 'SITE_BOY' && sites.length > 1 && (
          <CustomSelect
            value={selectedSiteId}
            onChange={setSelectedSiteId}
            placeholder="All Sites"
            options={filterSiteOptions}
          />
        )}

        <CustomSelect
          value={selectedCategoryId}
          onChange={setSelectedCategoryId}
          placeholder="All Categories"
          options={filterCategoryOptions}
        />

        <CustomSelect
          value={selectedMachineryId}
          onChange={setSelectedMachineryId}
          placeholder="All Machines"
          options={filterMachineryOptions}
        />

        <CustomSelect
          value={selectedPaymentMode}
          onChange={setSelectedPaymentMode}
          placeholder="All Payment Modes"
          options={filterPaymentModeOptions}
          searchable={false}
        />
      </FilterBar>



      {/* Expenses Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading expenses ledger...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
        ) : filteredExpenses.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-8 h-8 text-slate-500" />}
            title="No expenses recorded"
            description="Start recording quarry expenses, diesel consumption, labour wages, or heavy machinery rental logs."
            actionText="+ Add General Expense"
            onAction={() => openCreateModal('GENERAL')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Date & Site</th>
                  <th className="px-4 py-3.5">Category & Details</th>
                  <th className="px-4 py-3.5">Payment Mode</th>
                  <th className="px-4 py-3.5">Paid To / Worker</th>
                  <th className="px-4 py-3.5 text-right">Advance</th>
                  <th className="px-4 py-3.5 text-right">Total Amount</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredExpenses.map((exp) => {
                  const pmConfig = PAYMENT_MODES.find((p) => p.value === exp.paymentMode) || PAYMENT_MODES[0];
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition content-visibility-auto">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-bold text-white">{exp.date.slice(0, 10)}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-500/70" />
                          {exp.site?.siteName}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100">{exp.category?.name}</span>
                          {exp.machinery && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              <Truck className="w-3 h-3" />
                              {exp.machinery.name}
                            </span>
                          )}
                        </div>

                        {exp.machineryId && (
                          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-2 items-center">
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <Clock className="w-3 h-3 text-amber-400" />
                              {exp.startTime} - {exp.closingTime} ({exp.totalHours} hrs)
                            </span>
                            {exp.rentPerHour && (
                              <span className="text-slate-400">@ {formatINR(exp.rentPerHour)}/hr</span>
                            )}
                            {exp.startMeterReading && exp.endMeterReading && (
                              <span className="text-slate-500 font-mono">
                                Meter: {exp.startMeterReading} → {exp.endMeterReading}
                              </span>
                            )}
                          </div>
                        )}

                        {exp.remarks && <div className="text-xs text-slate-400 mt-0.5 italic">{exp.remarks}</div>}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2.5 py-0.5 text-xs font-bold rounded-full border ${pmConfig.badgeClass}`}>
                          {pmConfig.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-300">
                        {exp.paidTo ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium text-slate-200">{exp.paidTo}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        {exp.advanceAmount && Number(exp.advanceAmount) > 0 ? (
                          <span className="font-bold text-amber-400">{formatINR(exp.advanceAmount)}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-white text-base">
                        {formatINR(exp.amount)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {(() => {
                            const isSiteBoy = user?.role === 'SITE_BOY';
                            const isOlderThan2Hours =
                              isSiteBoy &&
                              (Date.now() - new Date(exp.createdAt).getTime()) / (1000 * 60 * 60) > 2;

                            if (isOlderThan2Hours) {
                              return (
                                <span
                                  className="p-1.5 text-slate-600 cursor-not-allowed"
                                  title="Locked: Edits only permitted within 2 hours of creation"
                                >
                                  <Lock className="w-4 h-4" />
                                </span>
                              );
                            }

                            return (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(exp)}
                                className="text-slate-400 hover:text-amber-400"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            );
                          })()}

                          {(user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingExpenseId(exp.id)}
                              className="text-slate-400 hover:text-rose-400"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record / Edit Expense Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
          icon={<Sparkles className="w-5 h-5 text-amber-400" />}
          maxWidth="xl"
        >
          {/* Mode Switcher */}
          {!editingExpense && (
            <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setEntryMode('GENERAL')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  entryMode === 'GENERAL'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                General Site Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  if (machinery.length === 0) {
                    setShowNoMachineryModal(true);
                  } else {
                    setEntryMode('MACHINERY');
                  }
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  entryMode === 'MACHINERY'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Heavy Machinery / Hitachi Log
              </button>
            </div>
          )}

          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CustomSelect
                label="Quarry Site"
                required
                disabled={user?.role === 'SITE_BOY'}
                value={formSiteId}
                onChange={setFormSiteId}
                options={modalSiteOptions}
              />

              <DateInput
                label="Date"
                value={formDate}
                onChange={setFormDate}
                clearable={false}
              />
            </div>

            {entryMode === 'GENERAL' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <CustomSelect
                  label="Expense Category"
                  required
                  value={formCategoryId}
                  onChange={setFormCategoryId}
                  options={modalCategoryOptions}
                />

                <Input
                  label="Amount (₹)"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5000"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  leftIcon={<span className="font-bold text-slate-500">₹</span>}
                  required
                  className="font-bold text-emerald-400"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CustomSelect
                    label="Heavy Machinery"
                    required
                    value={formMachineryId}
                    onChange={handleMachineChange}
                    options={modalMachineryOptions}
                  />


                  <Input
                    label="Rent Rate per Hour (₹)"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2500"
                    value={formRentPerHour}
                    onChange={(e) => setFormRentPerHour(e.target.value)}
                    leftIcon={<span className="font-bold text-slate-500">₹</span>}
                    required
                    className="font-bold text-emerald-400"
                  />
                </div>

                {/* Primary Hour Meter Reading Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Start Meter Reading"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1420.0"
                    value={formStartMeter}
                    onChange={(e) => setFormStartMeter(e.target.value)}
                    leftIcon={<Gauge className="w-3.5 h-3.5 text-amber-400" />}
                    required
                    className="font-mono font-bold"
                  />

                  <Input
                    label="End Meter Reading"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1428.5"
                    value={formEndMeter}
                    onChange={(e) => setFormEndMeter(e.target.value)}
                    leftIcon={<Gauge className="w-3.5 h-3.5 text-amber-400" />}
                    required
                    className="font-mono font-bold"
                  />
                </div>

                {/* Live Calculation Preview */}
                {liveMachineryCalculation && (
                  <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Total Machine Hours: <strong className="text-amber-400">{liveMachineryCalculation.hours} hrs</strong>
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-bold border border-slate-700">
                          {liveMachineryCalculation.calculationSource === 'METER' ? 'Meter Diff' : 'Time Diff'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {liveMachineryCalculation.hours} hrs × {formatINR(liveMachineryCalculation.rentRate)}/hr
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium block">Machine Rental Expense</span>
                      <span className="text-base font-black text-amber-400">
                        {formatINR(liveMachineryCalculation.totalRent)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Advance Amount */}
                <Input
                  label="Operator / Diesel Cash Advance (₹)"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2000"
                  value={formAdvanceAmount}
                  onChange={(e) => setFormAdvanceAmount(e.target.value)}
                  leftIcon={<span className="font-bold text-slate-500">₹</span>}
                  className="font-bold text-amber-400"
                />

                {/* Optional Time Window Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
                  <Input
                    label="Shift Start Time (Optional)"
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="text-xs"
                  />

                  <Input
                    label="Shift Closing Time (Optional)"
                    type="text"
                    placeholder="e.g. 05:30 PM"
                    value={formClosingTime}
                    onChange={(e) => setFormClosingTime(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* Payment Mode Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Payment Mode</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_MODES.map((pm) => (
                  <button
                    type="button"
                    key={pm.value}
                    onClick={() => setFormPaymentMode(pm.value)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                      formPaymentMode === pm.value
                        ? `${pm.badgeClass} ring-2 ring-amber-500 font-black shadow-md`
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Paid To / Operator / Vendor"
                type="text"
                placeholder="e.g. Suresh (Driver)"
                value={formPaidTo}
                onChange={(e) => setFormPaidTo(e.target.value)}
              />

              <Input
                label="Remarks / Invoice Notes"
                type="text"
                placeholder="e.g. Diesel 50L for generator"
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isSubmitting}
                loadingText="Saving..."
              >
                {editingExpense ? 'Update Expense' : 'Save Expense Record'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* No Machinery Available Prompt Modal */}
      {showNoMachineryModal && (
        <Modal
          isOpen={showNoMachineryModal}
          onClose={() => setShowNoMachineryModal(false)}
          title="No Machinery Registered"
          icon={<Truck className="w-5 h-5 text-amber-400" />}
          maxWidth="sm"
        >
          <div className="text-center space-y-3 py-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Truck className="w-6 h-6" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              You do not have any heavy machinery units (Excavator, JCB, Loader) configured in Master Data yet. Register your machinery first to start recording meter readings and hourly logs.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="md"
              fullWidth
              onClick={() => setShowNoMachineryModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setShowNoMachineryModal(false);
                navigate('/masters?tab=machinery');
              }}
            >
              Add Machinery
            </Button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingExpenseId && (
        <ConfirmModal
          isOpen={true}
          title="Delete Expense Record"
          message="Are you sure you want to delete this expense record? This action will remove it from the active ledger while preserving audit logs."
          confirmText="Delete Record"
          variant="danger"
          onConfirm={handleDeleteExpense}
          onCancel={() => setDeletingExpenseId(null)}
        />
      )}
    </div>
  );
};
