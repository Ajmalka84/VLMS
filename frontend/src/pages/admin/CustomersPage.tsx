import React, { useEffect, useState, useCallback } from 'react';
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
} from 'lucide-react';
import {
  CustomerUser,
  getCustomersApi,
  createCustomerApi,
  updateCustomerApi,
  updateCustomerStatusApi,
  resetCustomerPasswordApi,
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../../api/admin';
import { Card } from '../../components/common/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);

  // Form States
  const [createForm, setCreateForm] = useState<CreateCustomerDto>({
    businessName: '',
    mobile: '',
    password: '',
    gstin: '',
  });
  const [editForm, setEditForm] = useState<UpdateCustomerDto>({
    businessName: '',
    gstin: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCustomersApi({
        search: search.trim() || undefined,
        status: statusFilter,
      });
      setCustomers(res.users);
      setTotal(res.total);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
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
      });
      setShowCreateModal(false);
      setCreateForm({ businessName: '', mobile: '', password: '', gstin: '' });
      setActionSuccess('Customer onboarded successfully!');
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
      setActionSuccess('Customer details updated successfully!');
      void fetchCustomers();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to update customer');
    } finally {
      setSubmitting(false);
    }
  };

  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleToggleStatus = (customer: CustomerUser) => {
    const nextStatus = !customer.isActive;
    if (!nextStatus) {
      setConfirmState({
        isOpen: true,
        title: `Deactivate ${customer.businessName}?`,
        message: `This will immediately block all users from ${customer.businessName} from logging into the system. Are you sure?`,
        onConfirm: async () => {
          try {
            setConfirmState(null);
            await updateCustomerStatusApi(customer.id, false);
            setActionSuccess(`Customer ${customer.businessName} has been deactivated.`);
            void fetchCustomers();
          } catch (err: any) {
            setActionError(err?.message || 'Failed to deactivate status');
          }
        },
      });
    } else {
      void (async () => {
        try {
          await updateCustomerStatusApi(customer.id, true);
          setActionSuccess(`Customer ${customer.businessName} has been activated!`);
          void fetchCustomers();
        } catch (err: any) {
          setActionError(err?.message || 'Failed to activate customer');
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
      setActionSuccess('Password reset successfully!');
      setNewPassword('');
    } catch (err: any) {
      setFormError(err?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = customers.filter((c) => c.isActive).length;
  const inactiveCount = customers.filter((c) => !c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Super Admin Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
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
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-slate-400">Total Customers</div>
          <div className="text-xl sm:text-3xl font-extrabold text-white mt-1">
            {total}
          </div>
        </Card>
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-emerald-400">Active Accounts</div>
          <div className="text-xl sm:text-3xl font-extrabold text-emerald-400 mt-1">
            {activeCount}
          </div>
        </Card>
        <Card variant="glass" className="p-4 sm:p-5">
          <div className="text-xs font-semibold text-rose-400">Inactive Accounts</div>
          <div className="text-xl sm:text-3xl font-extrabold text-rose-400 mt-1">
            {inactiveCount}
          </div>
        </Card>
      </div>

      {/* Success Alert Banner */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 text-sm flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert Banner */}
      {actionError && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800/70 text-rose-300 text-sm flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <Card variant="glass" className="p-4">
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

          <div className="flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-800 self-start">
            {(['all', 'active', 'inactive'] as const).map((filter) => (
              <button
                key={filter}
                id={`filter-${filter}-btn`}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider capitalize transition-all cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
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
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-white">
                    {customer.businessName}
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      customer.isActive
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60'
                        : 'bg-rose-950/80 text-rose-400 border-rose-800/60'
                    }`}
                  >
                    {customer.isActive ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Inactive
                      </>
                    )}
                  </span>
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
                    <span>
                      Joined: {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                {/* Status Toggle */}
                <button
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <Card
            variant="glass"
            className="max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl"
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
                  placeholder="e.g. Titan Earthmovers"
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
                  {submitting ? 'Creating...' : 'Onboard'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card
            variant="glass"
            className="max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
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
                  id="edit-business-name"
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
                  Mobile Number (Read-only)
                </label>
                <input
                  type="text"
                  value={selectedCustomer.mobile}
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-500 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  GSTIN (Optional)
                </label>
                <input
                  id="edit-gstin"
                  type="text"
                  value={editForm.gstin || ''}
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
                  id="submit-edit-customer-btn"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <Card
            variant="glass"
            className="max-w-md w-full p-6 space-y-4 border border-slate-700 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-white">Reset Password</h2>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Set a new password for{' '}
              <strong className="text-white">
                {selectedCustomer.businessName}
              </strong>{' '}
              ({selectedCustomer.mobile}).
            </p>

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
                    id="reset-new-password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:border-amber-400 outline-none font-mono"
                    required
                  />
                  {newPassword && (
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(newPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Copy password to clipboard"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
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
                  id="submit-reset-password-btn"
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmState && (
        <ConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          confirmText="Deactivate"
          variant="danger"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
};
