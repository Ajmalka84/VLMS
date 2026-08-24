import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  Building2,
  Phone,
  Calendar,
  AlertCircle,
  RefreshCw,
  X,
  ShieldAlert,
  Copy,
  Check,
  Clock,
  Sparkles,
  Zap,
  CreditCard,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  CustomerUser,
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
  updateCustomerStatusApi,
  resetCustomerPasswordApi,
  updateCustomerSubscriptionApi,
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateSubscriptionDto,
} from '../../api/admin';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { CustomSelect, CustomSelectOption } from '../../components/common/CustomSelect';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';

export const CustomersPage: React.FC = () => {
  const toast = useToast();
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const debouncedSearch = useDebounce(search, 250);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_paid' | 'trial' | 'expiring' | 'expired' | 'inactive'>('all');
  const isFetchingRef = useRef(false);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState<CreateCustomerDto>({
    businessName: '',
    mobile: '',
    password: '',
    gstin: '',
    subscriptionPlan: 'TRIAL',
    subscriptionExpiresAt: '',
  });
  const [editForm, setEditForm] = useState<UpdateCustomerDto>({
    businessName: '',
    gstin: '',
  });
  const [subForm, setSubForm] = useState<{
    subscriptionPlan: 'TRIAL' | 'ANNUAL' | 'QUARTERLY' | 'CUSTOM';
    subscriptionExpiresAt: string;
    gracePeriodDays: number;
  }>({
    subscriptionPlan: 'ANNUAL',
    subscriptionExpiresAt: '',
    gracePeriodDays: 7,
  });

  const subscriptionOptions: CustomSelectOption[] = [
    {
      value: 'TRIAL',
      label: '7-Day Free Pilot',
      subLabel: 'White-Glove Setup & Full Operational Access',
      icon: <Clock className="w-4 h-4 text-cyan-400" />,
    },
    {
      value: 'ANNUAL',
      label: 'Early Adopter Annual Package',
      subLabel: '₹9,999 / Year (Recommended)',
      icon: <Sparkles className="w-4 h-4 text-amber-400" />,
    },
    {
      value: 'QUARTERLY',
      label: 'Quarterly Package',
      subLabel: '₹3,999 / 3 Months',
      icon: <Zap className="w-4 h-4 text-purple-400" />,
    },
    {
      value: 'CUSTOM',
      label: 'Custom Plan & Expiry Date',
      subLabel: 'Set specific expiration date manually',
      icon: <Calendar className="w-4 h-4 text-emerald-400" />,
    },
  ];

  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomersApi({
        search: debouncedSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
      });
      setCustomers(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.businessName.trim()) {
      setFormError('Business name is required');
      return;
    }
    if (!/^[0-9]{10}$/.test(createForm.mobile.trim())) {
      setFormError('Mobile number must be exactly 10 digits');
      return;
    }
    if (createForm.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await createCustomerApi({
        businessName: createForm.businessName.trim(),
        mobile: createForm.mobile.trim(),
        password: createForm.password,
        gstin: createForm.gstin?.trim() || undefined,
        subscriptionPlan: createForm.subscriptionPlan,
        subscriptionExpiresAt: createForm.subscriptionExpiresAt || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({
        businessName: '',
        mobile: '',
        password: '',
        gstin: '',
        subscriptionPlan: 'TRIAL',
        subscriptionExpiresAt: '',
      });
      toast.success('Customer onboarded successfully!');
      void fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!editForm.businessName?.trim()) {
      setFormError('Business name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await updateCustomerApi(selectedCustomer.id, {
        businessName: editForm.businessName.trim(),
        gstin: editForm.gstin?.trim() || undefined,
      });
      setShowEditModal(false);
      setSelectedCustomer(null);
      toast.success('Customer details updated successfully!');
      void fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRenew = async (
    customer: CustomerUser,
    action: UpdateSubscriptionDto['action'],
    label: string,
  ) => {
    try {
      setLoading(true);
      const res = await updateCustomerSubscriptionApi(customer.id, { action });
      toast.success(`${customer.businessName}: ${res.message || label}`);
      void fetchCustomers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      setFormError(null);
      await updateCustomerSubscriptionApi(selectedCustomer.id, {
        subscriptionPlan: subForm.subscriptionPlan,
        action: subForm.subscriptionExpiresAt ? 'SET_CUSTOM_DATE' : undefined,
        subscriptionExpiresAt: subForm.subscriptionExpiresAt || undefined,
        gracePeriodDays: subForm.gracePeriodDays,
      });
      setShowSubModal(false);
      setSelectedCustomer(null);
      toast.success(`Subscription for ${selectedCustomer.businessName} updated successfully!`);
      void fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update subscription');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (customer: CustomerUser) => {
    const nextStatus = !customer.isActive;
    if (!nextStatus) {
      setConfirmState({
        isOpen: true,
        title: `Deactivate ${customer.businessName}?`,
        message: `This will immediately block access for ${customer.businessName}. Are you sure?`,
        onConfirm: async () => {
          try {
            setConfirmState(null);
            await updateCustomerStatusApi(customer.id, false);
            toast.success(`Customer ${customer.businessName} has been deactivated.`);
            void fetchCustomers();
          } catch (err: any) {
            toast.error(err?.message || 'Failed to deactivate status');
          }
        },
      });
    } else {
      void (async () => {
        try {
          await updateCustomerStatusApi(customer.id, true);
          toast.success(`Customer ${customer.businessName} has been activated!`);
          void fetchCustomers();
        } catch (err: any) {
          toast.error(err?.message || 'Failed to activate customer');
        }
      })();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (newPassword.length < 6) {
      setFormError('New password must be at least 6 characters');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      await resetCustomerPasswordApi(selectedCustomer.id, newPassword);
      setShowResetModal(false);
      setSelectedCustomer(null);
      toast.success('Password reset successfully!');
      setNewPassword('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = customers.filter((c) => c.isActive).length;
  const trialCount = customers.filter((c) => c.subscriptionPlan === 'TRIAL').length;
  const expiringCount = customers.filter(
    (c) => c.subscriptionStatus === 'EXPIRING_SOON' || c.subscriptionStatus === 'IN_GRACE_PERIOD',
  ).length;

  const renderSubscriptionBadge = (c: CustomerUser) => {
    const status = c.subscriptionStatus;
    const days = c.daysRemaining;

    if (!c.isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-slate-400 border border-slate-800">
          <XCircle className="w-3 h-3 text-slate-500" /> Inactive
        </span>
      );
    }

    if (status === 'TRIAL_ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-sm">
          <Clock className="w-3 h-3 text-cyan-400" /> 7-Day Trial ({days ?? 0}d left)
        </span>
      );
    }

    if (status === 'TRIAL_EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> Trial Expired
        </span>
      );
    }

    if (status === 'EXPIRING_SOON') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-950/80 text-amber-300 border border-amber-700/60 animate-pulse shadow-sm">
          <Clock className="w-3 h-3 text-amber-400" /> Expiring in {days}d
        </span>
      );
    }

    if (status === 'IN_GRACE_PERIOD') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-orange-950/80 text-orange-300 border border-orange-700/60 animate-pulse shadow-sm">
          <AlertTriangle className="w-3 h-3 text-orange-400" /> Grace Period Active
        </span>
      );
    }

    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-950/80 text-rose-300 border border-rose-700/60 shadow-sm">
          <XCircle className="w-3 h-3 text-rose-400" /> Plan Expired
        </span>
      );
    }

    // Default ACTIVE_PAID
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm">
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />{' '}
        {c.subscriptionPlan === 'ANNUAL' ? 'Annual (₹9,999)' : c.subscriptionPlan || 'Active'}
        {days !== null && days !== undefined ? ` • ${days}d left` : ''}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Customer Management
          </h1>
        </div>

        <button
          id="onboard-customer-btn"
          onClick={() => {
            setFormError(null);
            setCreateForm({
              businessName: '',
              mobile: '',
              password: generateRandomPassword(),
              gstin: '',
              subscriptionPlan: 'TRIAL',
              subscriptionExpiresAt: '',
            });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Onboard Customer
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400">Total Customers</div>
          <div className="text-xl sm:text-3xl font-extrabold text-white mt-1">{total}</div>
        </Card>
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-emerald-400">Active Paid Accounts</div>
          <div className="text-xl sm:text-3xl font-extrabold text-emerald-400 mt-1">{activeCount}</div>
        </Card>
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-cyan-400">7-Day Free Trials</div>
          <div className="text-xl sm:text-3xl font-extrabold text-cyan-400 mt-1">{trialCount}</div>
        </Card>
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-amber-400">Expiring / Grace Period</div>
          <div className="text-xl sm:text-3xl font-extrabold text-amber-400 mt-1">{expiringCount}</div>
        </Card>
      </div>

      {/* Search & Filter Tabs */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="search-customers-input"
              type="text"
              placeholder="Search by business name or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            {[
              { key: 'all', label: 'All' },
              { key: 'active_paid', label: 'Active Paid' },
              { key: 'trial', label: 'Trials' },
              { key: 'expiring', label: 'Expiring (<30d)' },
              { key: 'expired', label: 'Expired' },
              { key: 'inactive', label: 'Inactive' },
            ].map((f) => (
              <button
                key={f.key}
                id={`filter-${f.key}-btn`}
                onClick={() => setStatusFilter(f.key as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Customers List */}
      {loading && customers.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
          <p className="text-sm text-slate-400">Loading customers...</p>
        </div>
      ) : customers.length === 0 ? (
        <Card variant="glass" className="py-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Customers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'No customers match your current search and filter criteria.'
              : 'You have not onboarded any customer businesses yet.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {customers.map((customer) => (
            <Card
              key={customer.id}
              variant="glass"
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">{customer.businessName}</h3>
                  {renderSubscriptionBadge(customer)}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>{customer.mobile}</span>
                  </div>
                  {customer.gstin && (
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>GSTIN: {customer.gstin}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Joined: {new Date(customer.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>
                  {customer.subscriptionExpiresAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-semibold text-slate-300">
                        Expires: {new Date(customer.subscriptionExpiresAt).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 1-Click Renewal & Action Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                {/* 1-Click Renew +1 Year */}
                <button
                  type="button"
                  onClick={() => handleQuickRenew(customer, 'RENEW_ANNUAL_1Y', 'Renewed for 1 Year (+₹9,999)')}
                  title="Renew for 1 Year (365 Days)"
                  className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Renew 1-Yr (₹9,999)
                </button>

                {/* Extend Shutdown +30 Days */}
                <button
                  type="button"
                  onClick={() => handleQuickRenew(customer, 'EXTEND_SHUTDOWN_30D', 'Extended validity by +30 Days')}
                  title="Extend validity by 30 days for monsoon or government shutdown compensation"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                >
                  +30d Shutdown
                </button>

                {/* Manage Subscription Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setSubForm({
                      subscriptionPlan: (customer.subscriptionPlan as any) || 'ANNUAL',
                      subscriptionExpiresAt: customer.subscriptionExpiresAt
                        ? customer.subscriptionExpiresAt.split('T')[0]
                        : '',
                      gracePeriodDays: customer.gracePeriodDays ?? 7,
                    });
                    setFormError(null);
                    setShowSubModal(true);
                  }}
                  title="Configure Subscription Dates"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                </button>

                {/* Status Toggle */}
                <button
                  type="button"
                  onClick={() => void handleToggleStatus(customer)}
                  title={customer.isActive ? 'Deactivate Account' : 'Activate Account'}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    customer.isActive
                      ? 'border-rose-800/60 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60'
                      : 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                  }`}
                >
                  {customer.isActive ? 'Deactivate' : 'Activate'}
                </button>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setEditForm({
                      businessName: customer.businessName,
                      gstin: customer.gstin || '',
                    });
                    setFormError(null);
                    setShowEditModal(true);
                  }}
                  title="Edit Customer"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Reset Password Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setNewPassword(generateRandomPassword());
                    setFormError(null);
                    setShowResetModal(true);
                  }}
                  title="Reset Password"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE CUSTOMER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card
            variant="glass"
            className="max-w-md w-full p-4 sm:p-6 space-y-4 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto min-w-0"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Onboard New Customer</h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Business Name *
                </label>
                <input
                  id="create-business-name"
                  type="text"
                  placeholder="e.g. Perumbavoor Sands & Aggregates"
                  value={createForm.businessName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, businessName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  10-Digit Mobile Number *
                </label>
                <input
                  id="create-mobile"
                  type="text"
                  maxLength={10}
                  placeholder="e.g. 9876543210"
                  value={createForm.mobile}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      mobile: e.target.value.replace(/\D/g, ''),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none font-mono"
                  required
                />
              </div>

              {/* Subscription Plan Custom Picker */}
              <CustomSelect
                label="Initial Subscription Package"
                options={subscriptionOptions}
                value={createForm.subscriptionPlan || 'TRIAL'}
                onChange={(val) =>
                  setCreateForm({
                    ...createForm,
                    subscriptionPlan: val as any,
                  })
                }
                searchable={false}
                required
              />

              {createForm.subscriptionPlan === 'CUSTOM' && (
                <div className="space-y-1 w-full min-w-0">
                  <label className="text-xs font-semibold text-slate-300">
                    Custom Expiration Date
                  </label>
                  <input
                    type="date"
                    value={createForm.subscriptionExpiresAt}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        subscriptionExpiresAt: e.target.value,
                      })
                    }
                    className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none block appearance-none"
                    required
                  />
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({
                        ...createForm,
                        password: generateRandomPassword(),
                      })
                    }
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  id="create-password"
                  type="text"
                  placeholder="Minimum 6 characters"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  id="create-gstin"
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={createForm.gstin}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none uppercase font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-customer-btn"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Onboard Customer'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* MANAGE SUBSCRIPTION MODAL */}
      {showSubModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card
            variant="glass"
            className="max-w-md w-full p-4 sm:p-6 space-y-4 border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto min-w-0"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Manage Subscription</h2>
                  <p className="text-xs text-slate-400">{selectedCustomer.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSubscription} className="space-y-3.5">
              <CustomSelect
                label="Subscription Plan"
                options={subscriptionOptions}
                value={subForm.subscriptionPlan}
                onChange={(val) =>
                  setSubForm({
                    ...subForm,
                    subscriptionPlan: val as any,
                  })
                }
                searchable={false}
                required
              />

              <div className="space-y-1 w-full min-w-0">
                <label className="text-xs font-semibold text-slate-300">
                  Validity Expiration Date *
                </label>
                <input
                  type="date"
                  value={subForm.subscriptionExpiresAt}
                  onChange={(e) =>
                    setSubForm({
                      ...subForm,
                      subscriptionExpiresAt: e.target.value,
                    })
                  }
                  className="w-full min-w-0 max-w-full box-border px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none block appearance-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Grace Period (Days)
                </label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={subForm.gracePeriodDays}
                  onChange={(e) =>
                    setSubForm({
                      ...subForm,
                      gracePeriodDays: parseInt(e.target.value, 10) || 7,
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Update Validity'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card
            variant="glass"
            className="max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Edit2 className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Edit Customer</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={editForm.businessName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, businessName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.gstin}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      gstin: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none uppercase font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card
            variant="glass"
            className="max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Reset Password</h2>
                  <p className="text-xs text-slate-400">{selectedCustomer.businessName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(newPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-amber-400 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
