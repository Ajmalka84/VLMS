import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Truck, Layers } from 'lucide-react';
import { Modal, Input, Button, CustomSelect } from '../common';
import { Rate, createRateApi, updateRateApi } from '../../api/masterData';
import { useMasterCache } from '../../context/MasterCacheContext';
import { useToast } from '../../context/ToastContext';

interface RateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (rate: Rate) => void;
  editItem?: Rate | null;
  initialSiteId?: string;
  initialVehicleTypeId?: string;
  initialMaterialTypeId?: string;
  initialAmount?: string | number;
}

export const RateModal: React.FC<RateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
  initialSiteId,
  initialVehicleTypeId,
  initialMaterialTypeId,
  initialAmount,
}) => {
  const toast = useToast();
  const { sites, vehicleTypes, materialTypes, refreshMasterData } = useMasterCache();
  const [rateForm, setRateForm] = useState({
    siteId: '',
    vehicleTypeId: '',
    materialTypeId: '',
    amount: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setRateForm({
          siteId: editItem.siteId || '',
          vehicleTypeId: editItem.vehicleTypeId || '',
          materialTypeId: editItem.materialTypeId || '',
          amount: editItem.amount ? String(editItem.amount) : '',
        });
      } else {
        setRateForm({
          siteId: initialSiteId || (sites.length > 0 ? sites[0].id : ''),
          vehicleTypeId: initialVehicleTypeId || (vehicleTypes.length > 0 ? vehicleTypes[0].id : ''),
          materialTypeId: initialMaterialTypeId || (materialTypes.length > 0 ? materialTypes[0].id : ''),
          amount: initialAmount ? String(initialAmount) : '',
        });
      }
      setFormError(null);
    }
  }, [
    isOpen,
    editItem,
    initialSiteId,
    initialVehicleTypeId,
    initialMaterialTypeId,
    initialAmount,
    sites,
    vehicleTypes,
    materialTypes,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateForm.siteId) {
      setFormError('Site is required');
      return;
    }
    if (!rateForm.vehicleTypeId) {
      setFormError('Vehicle category is required');
      return;
    }
    if (!rateForm.materialTypeId) {
      setFormError('Material type is required');
      return;
    }
    const amt = parseFloat(rateForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid rate amount greater than 0');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      let savedRate: Rate;
      if (editItem) {
        savedRate = await updateRateApi(editItem.id, { amount: amt });
        toast.success('Rate updated successfully');
      } else {
        savedRate = await createRateApi({
          siteId: rateForm.siteId,
          vehicleTypeId: rateForm.vehicleTypeId,
          materialTypeId: rateForm.materialTypeId,
          amount: amt,
        });
        toast.success('Rate configured successfully');
      }
      await refreshMasterData(true);
      onSuccess?.(savedRate);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save rate configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPreFilled = Boolean(!editItem && initialSiteId && initialVehicleTypeId && initialMaterialTypeId);
  const siteObj = sites.find((s) => s.id === rateForm.siteId);
  const vtypeObj = vehicleTypes.find((vt) => vt.id === rateForm.vehicleTypeId);
  const mtypeObj = materialTypes.find((mt) => mt.id === rateForm.materialTypeId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setFormError(null);
      }}
      title={editItem ? 'Update Rate Price' : isPreFilled ? 'Set Rate for Selection' : 'Configure Rate Matrix'}
      maxWidth="md"
    >
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2.5 mb-4 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="leading-snug">{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {editItem ? (
          <div className="p-3 rounded-xl bg-surface-solid border border-subtle space-y-1 text-xs text-secondary">
            <div>Site: <strong className="text-primary">{editItem.site?.siteName || siteObj?.siteName}</strong></div>
            <div>Vehicle Category: <strong className="text-primary">{editItem.vehicleType?.name || vtypeObj?.name}</strong></div>
            <div>Material: <strong className="text-primary">{editItem.materialType?.name || mtypeObj?.name}</strong></div>
          </div>
        ) : isPreFilled ? (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">
              Configuring Rate for Selected Load Parameters:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-2 rounded-xl bg-surface-solid border border-subtle text-xs">
                <div className="text-[10px] text-muted font-bold uppercase">Site</div>
                <div className="font-bold text-primary truncate">{siteObj?.siteName || 'Site'}</div>
              </div>
              <div className="p-2 rounded-xl bg-surface-solid border border-subtle text-xs">
                <div className="text-[10px] text-muted font-bold uppercase">Vehicle Type</div>
                <div className="font-bold text-primary truncate">{vtypeObj?.name || 'Type'}</div>
              </div>
              <div className="p-2 rounded-xl bg-surface-solid border border-subtle text-xs">
                <div className="text-[10px] text-muted font-bold uppercase">Material</div>
                <div className="font-bold text-primary truncate">{mtypeObj?.name || 'Material'}</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <CustomSelect
              label="Site"
              required
              options={sites.map((s) => ({
                value: s.id,
                label: s.siteName,
                subLabel: s.location,
                icon: <MapPin className="w-4 h-4" />,
              }))}
              value={rateForm.siteId}
              onChange={(val) => {
                setRateForm({ ...rateForm, siteId: val });
                setFormError(null);
              }}
              placeholder="Select Operational Site"
            />

            <CustomSelect
              label="Vehicle Category"
              required
              options={vehicleTypes.map((vt) => ({
                value: vt.id,
                label: vt.name,
                icon: <Truck className="w-4 h-4" />,
              }))}
              value={rateForm.vehicleTypeId}
              onChange={(val) => {
                setRateForm({ ...rateForm, vehicleTypeId: val });
                setFormError(null);
              }}
              placeholder="Select Vehicle Category"
            />

            <CustomSelect
              label="Material Type"
              required
              options={materialTypes.map((mt) => ({
                value: mt.id,
                label: mt.name,
                icon: <Layers className="w-4 h-4" />,
              }))}
              value={rateForm.materialTypeId}
              onChange={(val) => {
                setRateForm({ ...rateForm, materialTypeId: val });
                setFormError(null);
              }}
              placeholder="Select Material Type"
            />
          </>
        )}

        <Input
          label="Rate Amount (₹ per load)"
          required
          type="number"
          inputMode="numeric"
          step="any"
          min="1"
          placeholder="3500.00"
          value={rateForm.amount}
          onChange={(e) => {
            setRateForm({ ...rateForm, amount: e.target.value });
            setFormError(null);
          }}
          autoFocus={isPreFilled}
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
            Save Rate
          </Button>
        </div>
      </form>
    </Modal>
  );
};
