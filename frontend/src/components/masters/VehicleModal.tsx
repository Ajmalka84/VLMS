import React, { useState, useEffect } from 'react';
import { AlertTriangle, Truck, Plus } from 'lucide-react';
import { Modal, Input, Button, CustomSelect } from '../common';
import { Vehicle, VehicleType, createVehicleApi, updateVehicleApi } from '../../api/masterData';
import { useMasterCache } from '../../context/MasterCacheContext';
import { useToast } from '../../context/ToastContext';
import { VehicleTypeModal } from './VehicleTypeModal';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vehicle: Vehicle) => void;
  editItem?: Vehicle | null;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const toast = useToast();
  const { vehicleTypes, refreshMasterData } = useMasterCache();
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    vehicleTypeId: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setVehicleForm({
          vehicleNumber: editItem.vehicleNumber || '',
          vehicleTypeId: editItem.vehicleTypeId || '',
        });
      } else {
        setVehicleForm((prev) => ({
          vehicleNumber: prev.vehicleNumber || '',
          vehicleTypeId: prev.vehicleTypeId || (vehicleTypes.length > 0 ? vehicleTypes[0].id : ''),
        }));
      }
      setFormError(null);
    } else {
      setShowAddTypeModal(false);
      setVehicleForm({
        vehicleNumber: '',
        vehicleTypeId: '',
      });
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleForm.vehicleNumber.trim()) {
      setFormError('Vehicle registration number is required');
      return;
    }
    const finalTypeId = vehicleForm.vehicleTypeId || (vehicleTypes.length > 0 ? vehicleTypes[0].id : '');
    if (!finalTypeId) {
      setFormError('Vehicle category is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      let savedVehicle: Vehicle;
      if (editItem) {
        savedVehicle = await updateVehicleApi(editItem.id, {
          vehicleNumber: vehicleForm.vehicleNumber,
          vehicleTypeId: finalTypeId,
        });
        toast.success('Vehicle updated successfully');
      } else {
        savedVehicle = await createVehicleApi({
          vehicleNumber: vehicleForm.vehicleNumber,
          vehicleTypeId: finalTypeId,
        });
        toast.success('Vehicle registered successfully');
      }
      await refreshMasterData(true);
      onSuccess?.(savedVehicle);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeCreated = (createdType: VehicleType) => {
    if (createdType?.id) {
      setVehicleForm((prev) => ({ ...prev, vehicleTypeId: createdType.id }));
    }
    setFormError(null);
    setShowAddTypeModal(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setFormError(null);
        }}
        title={editItem ? 'Edit Vehicle' : 'Register Fleet Vehicle'}
        maxWidth="md"
      >
        {formError && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="leading-snug">{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="Vehicle Registration Number"
              required
              maxLength={15}
              placeholder="e.g. KL41A5621"
              value={vehicleForm.vehicleNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                setVehicleForm({ ...vehicleForm, vehicleNumber: val });
                setFormError(null);
              }}
            />
            <p className="text-[11px] text-muted mt-1">
              Letters & numbers only (e.g. <span className="text-amber-500 font-mono font-semibold">KL41A5621</span>). Spaces and symbols are automatically stripped.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-secondary">
                Vehicle Category / Type <span className="text-amber-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowAddTypeModal(true)}
                className="text-xs font-bold text-amber-500 hover:text-amber-600 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Vehicle Type
              </button>
            </div>

            <CustomSelect
              options={vehicleTypes.map((vt) => ({
                value: vt.id,
                label: vt.name,
                icon: <Truck className="w-4 h-4" />,
              }))}
              value={vehicleForm.vehicleTypeId}
              onChange={(val) => {
                setVehicleForm({ ...vehicleForm, vehicleTypeId: val });
                setFormError(null);
              }}
              placeholder="Select Vehicle Category"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                setFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              Save Vehicle
            </Button>
          </div>
        </form>
      </Modal>

      {/* Nested Vehicle Type Modal */}
      <VehicleTypeModal
        isOpen={showAddTypeModal}
        onClose={() => setShowAddTypeModal(false)}
        onSuccess={handleTypeCreated}
      />
    </>
  );
};
