import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Filter,
  DollarSign,
  Truck,
  CreditCard,
  Layers,
  Calendar,
  Search,
  Trash2,
  Edit2,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Gauge,
  User,
  FileText,
  Building2,
  Banknote,
  Sparkles,
  Lock,
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
import { Card } from '../components/common/Card';
import { ConfirmModal } from '../components/common/ConfirmModal';

export const PAYMENT_MODES: { label: string; value: PaymentMode; badgeClass: string }[] = [
  { label: 'Cash Drawer', value: 'CASH_DRAWER', badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER', badgeClass: 'bg-blue-500/10 text-blue-300 border-blue-500/30' },
  { label: 'UPI / Online', value: 'UPI_ONLINE', badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' },
  { label: 'Vendor Credit', value: 'VENDOR_CREDIT', badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  { label: 'Owner Direct', value: 'OWNER_DIRECT', badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/30' },
];

function formatCurrency(amount: number | string | undefined | null) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

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
  const { user } = useAuth();
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

  // Filters
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMachineryId, setSelectedMachineryId] = useState<string>('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Load Expenses
  const loadExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const effectiveSiteId = user?.role === 'SITE_BOY' ? user?.assignedSiteId || undefined : selectedSiteId || undefined;
      const data = await fetchExpensesApi({
        siteId: effectiveSiteId,
        categoryId: selectedCategoryId || undefined,
        machineryId: selectedMachineryId || undefined,
        paymentMode: (selectedPaymentMode as PaymentMode) || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setExpenses(data.expenses);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedSiteId, selectedCategoryId, selectedMachineryId, selectedPaymentMode, startDate, endDate]);

  useEffect(() => {
    loadMasterData();
  }, [loadMasterData]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  // Live Hours & Cost Calculation for Machinery form
  const liveMachineryCalculation = useMemo(() => {
    if (entryMode !== 'MACHINERY') return null;
    const calc = computeHours(formStartTime, formClosingTime);
    if (!calc) return null;

    const rentRate = parseFloat(formRentPerHour) || 0;
    const totalRent = Math.round(calc.hours * rentRate * 100) / 100;
    return {
      hours: calc.hours,
      isOvernight: calc.isOvernight,
      rentRate,
      totalRent,
    };
  }, [entryMode, formStartTime, formClosingTime, formRentPerHour]);

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
    setEditingExpense(null);
    setEntryMode(mode);
    setFormSiteId(sites[0]?.id || '');
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
    setFormStartMeter(exp.startMeterReading ? String(exp.startMeterReading) : '');
    setFormEndMeter(exp.endMeterReading ? String(exp.endMeterReading) : '');
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

        const calc = computeHours(formStartTime, formClosingTime);
        if (!calc) {
          throw new Error('Invalid start or closing time format (e.g. 08:00 AM, 05:30 PM).');
        }

        payload.machineryId = formMachineryId;
        payload.startTime = formStartTime;
        payload.closingTime = formClosingTime;
        payload.totalHours = calc.hours;
        payload.rentPerHour = rentRate;
        payload.amount = Math.round(calc.hours * rentRate * 100) / 100;
        payload.startMeterReading = formStartMeter ? parseFloat(formStartMeter) : undefined;
        payload.endMeterReading = formEndMeter ? parseFloat(formEndMeter) : undefined;
        payload.advanceAmount = formAdvanceAmount ? parseFloat(formAdvanceAmount) : 0;
      }

      if (editingExpense) {
        await updateExpenseApi(editingExpense.id, payload);
      } else {
        await createExpenseApi(payload);
      }

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
      setDeletingExpenseId(null);
      await loadExpenses();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense record.');
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-amber-400" />
            Site Expenses & Machine Rental
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track daily site operational costs, cash drawer disbursements, and heavy machinery hourly logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openCreateModal('GENERAL')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700/80 transition-all shadow-md cursor-pointer select-none touch-manipulation text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Add Expense
          </button>
          <button
            onClick={() => openCreateModal('MACHINERY')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none touch-manipulation text-xs sm:text-sm"
          >
            <Truck className="w-4 h-4" />
            Log Machine Hours
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-5 border border-slate-800/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Expenses</p>
              <h3 className="text-2xl font-black text-white mt-1">{formatCurrency(summary.totalExpenses)}</h3>
              <p className="text-xs text-slate-500 mt-1">{summary.count} entries recorded</p>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5 border border-slate-800/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Cash Drawer Paid</p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(summary.totalCashDrawerExpenses)}</h3>
              <p className="text-xs text-slate-500 mt-1">On-site cash box disbursements</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5 border border-slate-800/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Machinery Rental</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(summary.totalMachineRent)}</h3>
              <p className="text-xs text-slate-500 mt-1">{summary.totalMachineHours} machine hours logged</p>
            </div>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-5 border border-slate-800/80">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Advances Paid</p>
              <h3 className="text-2xl font-black text-cyan-400 mt-1">{formatCurrency(summary.totalAdvancesPaid)}</h3>
              <p className="text-xs text-slate-500 mt-1">Operator / diesel cash advances</p>
            </div>
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card variant="glass" className="p-4 border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-amber-400" />
            Filter Expenses Ledger
          </div>
          {(selectedSiteId || selectedCategoryId || selectedMachineryId || selectedPaymentMode || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedSiteId('');
                setSelectedCategoryId('');
                setSelectedMachineryId('');
                setSelectedPaymentMode('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold transition"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Quarry Site</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">All Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Machinery</label>
            <select
              value={selectedMachineryId}
              onChange={(e) => setSelectedMachineryId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">All Machines</option>
              {machinery.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Payment Mode</label>
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            >
              <option value="">All Payment Modes</option>
              {PAYMENT_MODES.map((pm) => (
                <option key={pm.value} value={pm.value}>
                  {pm.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Expenses Ledger Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading expenses ledger...</div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <DollarSign className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-base font-bold text-slate-200">No expenses recorded</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Start recording quarry expenses, diesel consumption, labour wages, or heavy machinery rental logs.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={() => openCreateModal('GENERAL')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
              >
                + Add General Expense
              </button>
              <button
                onClick={() => openCreateModal('MACHINERY')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer"
              >
                + Log Machine Hours
              </button>
            </div>
          </div>
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
                {expenses.map((exp) => {
                  const pmConfig = PAYMENT_MODES.find((p) => p.value === exp.paymentMode) || PAYMENT_MODES[0];
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition">
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
                              <span className="text-slate-400">@ {formatCurrency(exp.rentPerHour)}/hr</span>
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
                          <span className="font-bold text-amber-400">{formatCurrency(exp.advanceAmount)}</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-black text-white text-base">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit button with 2-hour window check for Site Boy */}
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
                              <button
                                onClick={() => openEditModal(exp)}
                                className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            );
                          })()}

                          {(user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') && (
                            <button
                              onClick={() => setDeletingExpenseId(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 my-8 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                {editingExpense ? 'Edit Expense Record' : 'Record New Expense'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            {!editingExpense && (
              <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setEntryMode('GENERAL')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    entryMode === 'GENERAL'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  General Site Expense
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('MACHINERY')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                    entryMode === 'MACHINERY'
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quarry Site <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={formSiteId}
                    onChange={(e) => setFormSiteId(e.target.value)}
                    required
                    disabled={user?.role === 'SITE_BOY'}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {entryMode === 'GENERAL' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Expense Category <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={formCategoryId}
                      onChange={(e) => setFormCategoryId(e.target.value)}
                      required
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Amount (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="e.g. 5000"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      required
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* Machinery / Hitachi Log Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Heavy Machinery <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={formMachineryId}
                        onChange={(e) => handleMachineChange(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      >
                        {machinery.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.code ? `(${m.code})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Rent Rate per Hour (₹) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="e.g. 2500"
                        value={formRentPerHour}
                        onChange={(e) => setFormRentPerHour(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Start Time <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 08:00 AM or 22:00"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Closing Time <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 05:30 PM or 04:30 AM"
                        value={formClosingTime}
                        onChange={(e) => setFormClosingTime(e.target.value)}
                        required
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Live Calculation Preview */}
                  {liveMachineryCalculation && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>
                            Working Duration: <strong className="text-amber-400">{liveMachineryCalculation.hours} hrs</strong>
                          </span>
                          {liveMachineryCalculation.isOvernight && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                              Overnight
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {liveMachineryCalculation.hours} hrs × {formatCurrency(liveMachineryCalculation.rentRate)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-slate-400 font-medium block">Total Rent</span>
                        <span className="text-base font-black text-amber-400">
                          {formatCurrency(liveMachineryCalculation.totalRent)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Start Meter Reading</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 1420.5"
                        value={formStartMeter}
                        onChange={(e) => setFormStartMeter(e.target.value)}
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">End Meter Reading</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="e.g. 1429.5"
                        value={formEndMeter}
                        onChange={(e) => setFormEndMeter(e.target.value)}
                        className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Operator / Diesel Cash Advance (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 2000"
                      value={formAdvanceAmount}
                      onChange={(e) => setFormAdvanceAmount(e.target.value)}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
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
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Paid To / Operator / Vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh (Driver)"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Remarks / Invoice Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Diesel 50L for generator"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
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
