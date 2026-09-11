import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Input, Button } from '../common';
import { Site, createSiteApi, updateSiteApi } from '../../api/masterData';
import { useMasterCache } from '../../context/MasterCacheContext';
import { useToast } from '../../context/ToastContext';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (site: Site) => void;
  editItem?: Site | null;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editItem,
}) => {
  const toast = useToast();
  const { refreshMasterData } = useMasterCache();
  const [siteForm, setSiteForm] = useState({
    siteName: '',
    location: '',
    pincode: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setSiteForm({
          siteName: editItem.siteName || '',
          location: editItem.location || '',
          pincode: editItem.pincode || '',
        });
      } else {
        setSiteForm({
          siteName: '',
          location: '',
          pincode: '',
        });
      }
      setFormError(null);
    }
  }, [isOpen, editItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteForm.siteName.trim()) {
      setFormError('Site Name is required');
      return;
    }
    if (!siteForm.location.trim()) {
      setFormError('Location / Area is required');
      return;
    }
    if (!siteForm.pincode.trim() || siteForm.pincode.length !== 6) {
      setFormError('A valid 6-digit Pincode is required');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      let savedSite: Site;
      if (editItem) {
        savedSite = await updateSiteApi(editItem.id, siteForm);
        toast.success('Site updated successfully');
      } else {
        savedSite = await createSiteApi(siteForm);
        toast.success('Site registered successfully');
      }
      await refreshMasterData(true);
      onSuccess?.(savedSite);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save site. Please verify inputs.');
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
      title={editItem ? 'Edit Site Details' : 'Add New Quarry / Yard Site'}
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
          label="Site Name"
          required
          placeholder="e.g. Kolenchery Crusher Unit"
          value={siteForm.siteName}
          onChange={(e) => {
            setSiteForm({ ...siteForm, siteName: e.target.value });
            setFormError(null);
          }}
        />

        <Input
          label="Location / Area"
          required
          placeholder="e.g. Kolenchery, Ernakulam"
          value={siteForm.location}
          onChange={(e) => {
            setSiteForm({ ...siteForm, location: e.target.value });
            setFormError(null);
          }}
        />

        <Input
          label="6-Digit Postal Pincode"
          required
          maxLength={6}
          placeholder="e.g. 682311"
          value={siteForm.pincode}
          onChange={(e) => {
            setSiteForm({
              ...siteForm,
              pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
            });
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
            Save Site
          </Button>
        </div>
      </form>
    </Modal>
  );
};
