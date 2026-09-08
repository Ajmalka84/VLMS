import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Truck, Phone, User, CheckCircle2, Power } from 'lucide-react';
import {
  fetchMachineryApi,
  createMachineryApi,
  updateMachineryApi,
  deleteMachineryApi,
  Machinery,
} from '../../api/expenses';
import { Card, ConfirmModal, Modal, Input, Button, EmptyState, Badge } from '../common';
import { formatINR } from '../../utils/formatters';

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

  const handleToggleActive = async (m: Machinery) => {
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
      alert(err.message || 'Failed to delete machine');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Heavy Machinery Fleet (Excavators / Loaders)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Register on-site equipment, standard hourly rental tariffs, and vendor contacts.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Machinery
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 font-semibold animate-pulse">
          Loading heavy machinery...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-2xl flex items-center gap-2">
          <span>{error}</span>
        </div>
      ) : machineryList.length === 0 ? (
        <EmptyState
          icon={<Truck className="w-8 h-8 text-amber-400" />}
          title="No Heavy Machinery Configured"
          description="Register excavators, JCBs, and loaders to enable hourly working logs and vendor billing."
          actionText="Add Heavy Machine"
          onAction={openCreateModal}
          actionIcon={<Plus className="w-4 h-4" />}
        />
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Machine Name</th>
                <th className="px-4 py-3">Code / Tag</th>
                <th className="px-4 py-3">Standard Hourly Rate</th>
                <th className="px-4 py-3">Vendor / Owner</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {machineryList.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3 font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{m.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-300">
                    {m.code ? (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-300">
                        {m.code}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                    {m.defaultRentPerHour ? `${formatINR(m.defaultRentPerHour)} / hr` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {m.vendorName || m.vendorMobile ? (
                      <div className="space-y-0.5">
                        <div className="text-white font-medium flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{m.vendorName || 'Vendor'}</span>
                        </div>
                        {m.vendorMobile && (
                          <div className="text-slate-400 text-[10px] flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-slate-500" />
                            <span>{m.vendorMobile}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">In-house / Direct</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(m)}
                      className="cursor-pointer group"
                      title={m.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {m.isActive ? (
                        <Badge variant="emerald" size="sm" dot>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="slate" size="sm">
                          Inactive
                        </Badge>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(m)}
                        title="Edit Machine"
                        className="p-1.5 text-slate-400 hover:text-amber-400 min-h-[32px] min-w-[32px]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingMachine(m)}
                        title="Delete Machine"
                        className="p-1.5 text-slate-400 hover:text-rose-400 min-h-[32px] min-w-[32px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMachine ? 'Edit Heavy Machinery' : 'Register Heavy Machinery'}
        description="Configure unit details and standard rental charges."
        icon={<Truck className="w-5 h-5 text-amber-400" />}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              onClick={handleSave}
              loading={isSubmitting}
              loadingText="Saving..."
            >
              {editingMachine ? 'Update Machine' : 'Save Machinery'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-3">
          <Input
            label="Machine Name / Model"
            placeholder="e.g. Hitachi EX 210 Excavator"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={formError || undefined}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Machine Code / Tag"
              placeholder="e.g. HIT-01"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <Input
              label="Default Rent / Hr (₹)"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 2500"
              value={defaultRentPerHour}
              onChange={(e) => setDefaultRentPerHour(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Owner Name"
              placeholder="e.g. ABC Earthmovers"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />

            <Input
              label="Vendor Mobile"
              type="tel"
              placeholder="e.g. 9847000000"
              value={vendorMobile}
              onChange={(e) => setVendorMobile(e.target.value)}
            />
          </div>
        </form>
      </Modal>

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
