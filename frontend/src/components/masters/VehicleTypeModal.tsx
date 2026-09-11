import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Input, Button } from '../common';
import { VehicleType, createVehicleTypeApi, updateVehicleTypeApi } from '../../api/masterData';
import { useMasterCache } from '../../context/MasterCacheContext';
import { useToast } from '../../context/ToastContext';

interface VehicleTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (type: VehicleType) => void;
  editItem?: VehicleType | null;
}

export const VehicleTypeModal: React.FC<VehicleTypeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const toast = useToast();
  const { refreshMasterData } = useMasterCache();
  const [vtypeForm, setVtypeForm] = useState({ name: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setVtypeForm({ name: editItem.name || '' });
      } else {
        setVtypeForm({ name: '' });
      }
      setFormError(null);
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vtypeForm.name.trim()) {
      setFormError('Category / Type Name is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      let savedType: VehicleType;
      if (editItem) {
        savedType = await updateVehicleTypeApi(editItem.id, vtypeForm);
        toast.success('Vehicle category updated successfully');
      } else {
        savedType = await createVehicleTypeApi(vtypeForm);
        toast.success('Vehicle category created successfully');
      }
      await refreshMasterData(true);
      onSuccess?.(savedType);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save vehicle category.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setFormError(null);
      }}
      title={editItem ? 'Edit Vehicle Category' : 'Add Vehicle Category'}
      maxWidth="sm"
    >
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Category Name"
          required
          placeholder="e.g. Tipper, Lorry, 10-Wheeler, Tractor"
          value={vtypeForm.name}
          onChange={(e) => {
            setVtypeForm({ name: e.target.value });
            setFormError(null);
          }}
        />

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
            Save Category
          </Button>
        </div>
      </form>
    </Modal>
  );
};
