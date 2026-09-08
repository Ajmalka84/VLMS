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
  updateCustomerQuotasApi,
} from '../../api/admin';
import {
  Button,
  Input,
  DateInput,
  SearchBar,
  CustomSelect,
  CustomSelectOption,
  Badge,
  Modal,
  Card,
  PageHeader,
  MetricCard,
  StatusBadge,
  ConfirmModal,
  EmptyState,
} from '../../components/common';
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
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);

  const [quotaForm, setQuotaForm] = useState({
    coPartnerQuota: 3,
    siteBoyQuota: 2,
    amountPaid: 0,
    paymentRef: '',
    notes: '',
  });

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

  const handleSaveQuotas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setSubmitting(true);
      setFormError(null);
      await updateCustomerQuotasApi(selectedCustomer.id, {
        coPartnerQuota: Number(quotaForm.coPartnerQuota),
        siteBoyQuota: Number(quotaForm.siteBoyQuota),
        amountPaid: Number(quotaForm.amountPaid) || 0,
        paymentRef: quotaForm.paymentRef.trim() || undefined,
        notes: quotaForm.notes.trim() || undefined,
      });
      setShowQuotaModal(false);
      setSelectedCustomer(null);
      toast.success(`Quotas updated for ${selectedCustomer.businessName}`);
      void fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update quotas');
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
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <PageHeader
        title="Customer Accounts Management"
        subtitle="Onboard customer quarries, manage 7-day trials, configure quotas, and renew annual packages."
        badge={`${total} Tenants`}
        actions={
          <Button
            id="onboard-customer-btn"
            variant="primary"
            size="md"
            leftIcon={<UserPlus className="w-4 h-4" />}
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
          >
            Onboard Customer
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Total Customers"
          value={total}
          icon={<Users className="w-5 h-5 text-slate-400" />}
          variant="default"
        />
        <MetricCard
          label="Active Paid Accounts"
          value={activeCount}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          variant="emerald"
        />
        <MetricCard
          label="7-Day Free Trials"
          value={trialCount}
          icon={<Clock className="w-5 h-5 text-cyan-400" />}
          variant="blue"
        />
        <MetricCard
          label="Expiring / Grace Period"
          value={expiringCount}
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          variant="amber"
        />
      </div>

      {/* Search & Filter Tabs */}
      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar
              id="search-customers-input"
              placeholder="Search by business name or mobile..."
              value={search}
              onChange={setSearch}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-2xl bg-slate-900/90 p-1.5 border border-slate-800">
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
                  statusFilter === f.key
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
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
        <EmptyState
          icon={<Users className="w-8 h-8 text-slate-500" />}
          title="No Customers Found"
          description={
            search || statusFilter !== 'all'
              ? 'No customers match your current search and filter criteria.'
              : 'You have not onboarded any customer businesses yet.'
          }
          actionText="Onboard Customer"
          onAction={() => {
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
        />
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
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span>CP: {customer.quotaUsage?.coPartner.active ?? 0}/{customer.coPartnerQuota ?? 3}</span>
                    <span className="text-slate-600">•</span>
                    <span>SB: {customer.quotaUsage?.siteBoy.active ?? 0}/{customer.siteBoyQuota ?? 2}</span>
                  </div>
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

                {/* Manage Quotas Modal Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setQuotaForm({
                      coPartnerQuota: customer.coPartnerQuota ?? 3,
                      siteBoyQuota: customer.siteBoyQuota ?? 2,
                      amountPaid: 0,
                      paymentRef: '',
                      notes: '',
                    });
                    setFormError(null);
                    setShowQuotaModal(true);
                  }}
                  title="Expand Team Quotas (+₹2,000 / slot)"
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-amber-400" />
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
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Onboard New Customer"
          icon={<UserPlus className="w-5 h-5 text-amber-400" />}
          maxWidth="md"
        >
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3.5">
            <Input
              id="create-business-name"
              label="Business Name *"
              placeholder="e.g. Perumbavoor Sands & Aggregates"
              value={createForm.businessName}
              onChange={(e) =>
                setCreateForm({ ...createForm, businessName: e.target.value })
              }
              required
            />

            <Input
              id="create-mobile"
              label="10-Digit Mobile Number *"
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
              required
              className="font-mono"
            />

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
              <DateInput
                label="Custom Expiration Date"
                value={createForm.subscriptionExpiresAt || ''}
                onChange={(val) =>
                  setCreateForm({
                    ...createForm,
                    subscriptionExpiresAt: val,
                  })
                }
                clearable={false}
              />
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
              <Input
                id="create-password"
                type="text"
                placeholder="Minimum 6 characters"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                required
                className="font-mono"
              />
            </div>

            <Input
              id="create-gstin"
              label="GSTIN (Optional)"
              type="text"
              placeholder="e.g. 29ABCDE1234F1Z5"
              value={createForm.gstin}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  gstin: e.target.value.toUpperCase(),
                })
              }
              className="uppercase font-mono"
            />

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                id="submit-create-customer-btn"
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                loadingText="Creating..."
              >
                Onboard Customer
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MANAGE SUBSCRIPTION MODAL */}
      {showSubModal && selectedCustomer && (
        <Modal
          isOpen={showSubModal}
          onClose={() => setShowSubModal(false)}
          title="Manage Subscription"
          description={selectedCustomer.businessName}
          icon={<CreditCard className="w-5 h-5 text-amber-400" />}
          maxWidth="md"
        >
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

            <DateInput
              label="Validity Expiration Date *"
              value={subForm.subscriptionExpiresAt}
              onChange={(val) =>
                setSubForm({
                  ...subForm,
                  subscriptionExpiresAt: val,
                })
              }
              clearable={false}
            />

            <Input
              label="Grace Period (Days)"
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
            />

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowSubModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                loadingText="Saving..."
              >
                Update Validity
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MANAGE QUOTAS MODAL */}
      {showQuotaModal && selectedCustomer && (
        <Modal
          isOpen={showQuotaModal}
          onClose={() => setShowQuotaModal(false)}
          title="Expand Team Quotas"
          description={selectedCustomer.businessName}
          icon={<Users className="w-5 h-5 text-amber-400" />}
          maxWidth="md"
        >
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSaveQuotas} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Co-Partner Quota *"
                type="number"
                min={selectedCustomer.quotaUsage?.coPartner.active || 0}
                max={50}
                value={quotaForm.coPartnerQuota}
                onChange={(e) =>
                  setQuotaForm({
                    ...quotaForm,
                    coPartnerQuota: parseInt(e.target.value, 10) || 0,
                  })
                }
                helperText={`Currently: ${selectedCustomer.coPartnerQuota ?? 3}`}
                required
              />

              <Input
                label="Site Boy Quota *"
                type="number"
                min={selectedCustomer.quotaUsage?.siteBoy.active || 0}
                max={50}
                value={quotaForm.siteBoyQuota}
                onChange={(e) =>
                  setQuotaForm({
                    ...quotaForm,
                    siteBoyQuota: parseInt(e.target.value, 10) || 0,
                  })
                }
                helperText={`Currently: ${selectedCustomer.siteBoyQuota ?? 2}`}
                required
              />
            </div>

            <Input
              label="Expansion Amount Paid (₹)"
              type="number"
              min={0}
              step="100"
              placeholder="e.g. 2000"
              value={quotaForm.amountPaid || ''}
              onChange={(e) =>
                setQuotaForm({
                  ...quotaForm,
                  amountPaid: parseFloat(e.target.value) || 0,
                })
              }
              leftIcon={<span className="font-bold text-slate-500">₹</span>}
            />

            <Input
              label="Payment Reference / Transaction ID"
              type="text"
              placeholder="e.g. UPI-9988772211"
              value={quotaForm.paymentRef}
              onChange={(e) =>
                setQuotaForm({
                  ...quotaForm,
                  paymentRef: e.target.value,
                })
              }
            />

            <Input
              label="Notes / Expansion Reason"
              type="text"
              placeholder="e.g. Added 1 extra Co-partner for new crusher unit"
              value={quotaForm.notes}
              onChange={(e) =>
                setQuotaForm({
                  ...quotaForm,
                  notes: e.target.value,
                })
              }
            />

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowQuotaModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                loadingText="Saving..."
              >
                Update Quotas
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && selectedCustomer && (
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Customer"
          icon={<Edit2 className="w-5 h-5 text-amber-400" />}
          maxWidth="md"
        >
          {formError && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleEdit} className="space-y-3.5">
            <Input
              label="Business Name *"
              type="text"
              value={editForm.businessName}
              onChange={(e) =>
                setEditForm({ ...editForm, businessName: e.target.value })
              }
              required
            />

            <Input
              label="GSTIN (Optional)"
              type="text"
              value={editForm.gstin}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  gstin: e.target.value.toUpperCase(),
                })
              }
              className="uppercase font-mono"
            />

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {showResetModal && selectedCustomer && (
        <Modal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          title="Reset Password"
          description={selectedCustomer.businessName}
          icon={<KeyRound className="w-5 h-5 text-amber-400" />}
          maxWidth="md"
        >
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
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="font-mono"
                rightSlot={
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(newPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 text-slate-400 hover:text-amber-400 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex gap-2">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={submitting}
                loadingText="Updating..."
              >
                Set New Password
              </Button>
            </div>
          </form>
        </Modal>
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
