import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Input, Button } from '../common';
import { Contractor, createContractorApi, updateContractorApi } from '../../api/masterData';
import { useMasterCache } from '../../context/MasterCacheContext';
import { useToast } from '../../context/ToastContext';

interface ContractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contractor: Contractor) => void;
  editItem?: Contractor | null;
}

export const ContractorModal: React.FC<ContractorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const toast = useToast();
  const { refreshMasterData } = useMasterCache();
  const [contractorForm, setContractorForm] = useState({
    name: '',
    mobile: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setContractorForm({
          name: editItem.name || '',
          mobile: editItem.mobile || '',
        });
      } else {
        setContractorForm({
          name: '',
          mobile: '',
        });
      }
      setFormError(null);
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorForm.name.trim()) {
      setFormError('Contractor Name is required');
      return;
    }
    const cleanMobile = contractorForm.mobile.trim();
    if (cleanMobile && cleanMobile.length !== 10) {
      setFormError('Mobile number must be a valid 10-digit number if provided');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      let savedContractor: Contractor;
      if (editItem) {
        savedContractor = await updateContractorApi(editItem.id, {
          name: contractorForm.name.trim(),
          mobile: cleanMobile,
        });
        toast.success('Contractor updated successfully');
      } else {
        savedContractor = await createContractorApi({
          name: contractorForm.name.trim(),
          mobile: cleanMobile,
        });
        toast.success('Contractor registered successfully');
      }
      await refreshMasterData(true);
      onSuccess?.(savedContractor);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save contractor.');
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
      title={editItem ? 'Edit Contractor' : 'Add C/O Contractor'}
      maxWidth="md"
    >
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Contractor Name"
          required
          placeholder="e.g. Sathar Pattimattom"
          value={contractorForm.name}
          onChange={(e) => {
            setContractorForm({ ...contractorForm, name: e.target.value });
            setFormError(null);
          }}
        />

        <div>
          <Input
            label="10-Digit Mobile Number (Optional)"
            maxLength={10}
            placeholder="e.g. 9845012345 (Optional)"
            value={contractorForm.mobile}
            onChange={(e) => {
              setContractorForm({
                ...contractorForm,
                mobile: e.target.value.replace(/\D/g, '').slice(0, 10),
              });
              setFormError(null);
            }}
          />
          <p className="text-[11px] text-muted mt-1">
            Optional 10-digit mobile number for WhatsApp statements and contact lookup.
          </p>
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
            Save Contractor
          </Button>
        </div>
      </form>
    </Modal>
  );
};
