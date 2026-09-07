import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Truck, AlertCircle, Phone, User, CheckCircle2, Power, X } from 'lucide-react';
import {
  fetchMachineryApi,
  createMachineryApi,
  updateMachineryApi,
  deleteMachineryApi,
  Machinery,
} from '../../api/expenses';
import { Card } from '../common/Card';
import { ConfirmModal } from '../common/ConfirmModal';

function formatCurrency(amount: number | string | undefined | null) {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num);
}

export const MachineryManagement: React.FC = () => {
  const [machineryList, setMachineryList] = useState<Machinery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machinery | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [defaultRentPerHour, setDefaultRentPerHour] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorMobile, setVendorMobile] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Deletion Modal
  const [deletingMachine, setDeletingMachine] = useState<Machinery | null>(null);

  const loadMachinery = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMachineryApi(true);
      setMachineryList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load heavy machinery');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMachinery();
  }, []);

  const openCreateModal = () => {
    setEditingMachine(null);
    setName('');
    setCode('');
    setDefaultRentPerHour('2500');
    setVendorName('');
    setVendorMobile('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (m: Machinery) => {
    setEditingMachine(m);
    setName(m.name);
    setCode(m.code || '');
    setDefaultRentPerHour(m.defaultRentPerHour ? String(m.defaultRentPerHour) : '');
    setVendorName(m.vendorName || '');
    setVendorMobile(m.vendorMobile || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Machinery name is required.');
      return;
    }

    const rent = defaultRentPerHour ? parseFloat(defaultRentPerHour) : undefined;
    if (rent !== undefined && (isNaN(rent) || rent < 0)) {
      setFormError('Please enter a valid rent per hour.');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);
    try {
      if (editingMachine) {
        await updateMachineryApi(editingMachine.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          defaultRentPerHour: rent,
          vendorName: vendorName.trim() || undefined,
          vendorMobile: vendorMobile.trim() || undefined,
        });
      } else {
        await createMachineryApi({
          name: name.trim(),
          code: code.trim() || undefined,
          defaultRentPerHour: rent,
          vendorName: vendorName.trim() || undefined,
          vendorMobile: vendorMobile.trim() || undefined,
        });
      }
      setIsModalOpen(false);
      await loadMachinery();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save machinery');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleActive = async (m: Machinery) => {
    try {
      await updateMachineryApi(m.id, { isActive: !m.isActive });
      await loadMachinery();
    } catch (err: any) {
      alert(err.message || 'Failed to update machine status');
    }
  };

  const handleDelete = async () => {
    if (!deletingMachine) return;
    try {
      await deleteMachineryApi(deletingMachine.id);
      setDeletingMachine(null);
      await loadMachinery();
    } catch (err: any) {
      alert(err.message || 'Failed to delete machinery.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Heavy Machinery Registry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Register Excavators, JCBs, Breakers, and Cranes with default hourly rental rates.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer select-none touch-manipulation"
        >
          <Plus className="w-4 h-4" />
          Add Machinery
        </button>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse">Loading machinery fleet...</div>
      ) : error ? (
        <div className="p-8 text-center text-rose-400 font-semibold">{error}</div>
      ) : machineryList.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 shadow-xl space-y-3">
          <Truck className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-base font-bold text-slate-200">No heavy machinery registered</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Register your Hitachi, CAT, JCB excavators and breakers to track hourly operating costs.
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
          >
            + Add First Machine
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Machine Name & Code</th>
                <th className="px-4 py-3.5 text-right">Default Rent / Hr</th>
                <th className="px-4 py-3.5">Vendor / Owner</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {machineryList.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3.5 font-bold text-white">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Truck className="w-4 h-4" />
                      </div>
                      <div>
                        <span>{m.name}</span>
                        {m.code && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono border border-slate-700">
                            {m.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right font-black text-amber-400 text-base">
                    {m.defaultRentPerHour ? formatCurrency(m.defaultRentPerHour) : '—'}
                  </td>

                  <td className="px-4 py-3.5 text-xs text-slate-300">
                    {m.vendorName ? (
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          {m.vendorName}
                        </div>
                        {m.vendorMobile && (
                          <div className="text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {m.vendorMobile}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500 font-medium">Own Machinery</span>
                    )}
                  </td>

                  <td className="px-4 py-3.5">
                    <button
                      onClick={() => toggleActive(m)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border transition cursor-pointer ${
                        m.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {m.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(m)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
                        title="Edit Machine"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingMachine(m)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Machine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingMachine ? 'Edit Heavy Machinery' : 'Register Heavy Machinery'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Machine Name / Model <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hitachi EX 210 Excavator"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Machine Code / Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. HIT-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Rent / Hr (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 2500"
                    value={defaultRentPerHour}
                    onChange={(e) => setDefaultRentPerHour(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor / Owner Name</label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Earthmovers"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vendor Mobile</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9847000000"
                    value={vendorMobile}
                    onChange={(e) => setVendorMobile(e.target.value)}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
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
                  className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Machinery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingMachine && (
        <ConfirmModal
          isOpen={true}
          title="Delete Heavy Machinery"
          message={`Are you sure you want to delete "${deletingMachine.name}"? Active expense records linked to this machine will block deletion. You can deactivate it instead.`}
          confirmText="Delete Machine"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeletingMachine(null)}
        />
      )}
    </div>
  );
};
