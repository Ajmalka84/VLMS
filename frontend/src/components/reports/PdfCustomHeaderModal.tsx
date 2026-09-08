import React, { useState, useEffect } from 'react';
import { FileText, Phone, Building, Hash, RotateCcw, Download } from 'lucide-react';
import { Modal, Input, Button } from '../common';
import { useLanguage } from '../../context/LanguageContext';
import type { PdfCustomHeaderOptions } from '../../utils/pdfGenerator';


interface PdfCustomHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: PdfCustomHeaderOptions) => void;
  defaultBusinessName: string;
  defaultMobile: string;
  defaultGstin?: string;
}

export const PdfCustomHeaderModal: React.FC<PdfCustomHeaderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultBusinessName,
  defaultMobile,
  defaultGstin = '',
}) => {
  const { t } = useLanguage();

  const formattedDefaultMobile = defaultMobile ? `+91 ${defaultMobile.replace(/^(\+91|91)/, '').trim()}` : '';

  const [businessName, setBusinessName] = useState(defaultBusinessName);
  const [contact, setContact] = useState(formattedDefaultMobile);
  const [gstin, setGstin] = useState(defaultGstin);

  // Sync state whenever modal opens or defaults change
  useEffect(() => {
    if (isOpen) {
      setBusinessName(defaultBusinessName);
      setContact(formattedDefaultMobile);
      setGstin(defaultGstin);
    }
  }, [isOpen, defaultBusinessName, formattedDefaultMobile, defaultGstin]);

  if (!isOpen) return null;

  const handleReset = () => {
    setBusinessName(defaultBusinessName);
    setContact(formattedDefaultMobile);
    setGstin(defaultGstin);
  };

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      customBusinessName: businessName.trim(),
      customContact: contact.trim(),
      customGstin: gstin.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('customize_bill_modal_title') || 'Customize Bill Header'}
      description={
        t('customize_bill_modal_sub') ||
        'Customize the business or joint-venture name and contact numbers displayed on the PDF bill.'
      }
      icon={<FileText className="w-6 h-6 text-amber-400" />}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {t('reset_defaults') || 'Reset'}
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              onClick={handleDownload}
              leftIcon={<Download className="w-4 h-4" />}
            >
              {t('download_pdf_bill') || 'Download PDF'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleDownload} className="space-y-4 pt-1">
        <Input
          label={t('bill_business_name_label') || 'Business / Collaboration Name'}
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. ABC & XYZ Joint Venture"
          leftIcon={<Building className="w-4 h-4 text-amber-400" />}
          required
        />

        <Input
          label={t('bill_contact_numbers_label') || 'Contact Phone Number(s)'}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder={t('bill_contact_numbers_ph') || 'e.g. +91 98470 12345 / +91 94470 67890'}
          helperText={t('bill_contact_numbers_hint') || 'Enter single or multiple numbers for joint partners / site managers.'}
          leftIcon={<Phone className="w-4 h-4 text-emerald-400" />}
        />

        <Input
          label={t('bill_gstin_label') || 'GSTIN / Project Reference (Optional)'}
          value={gstin}
          onChange={(e) => setGstin(e.target.value)}
          placeholder="e.g. 32AAAAA0000A1Z5 or Project #104"
          leftIcon={<Hash className="w-4 h-4 text-blue-400" />}
        />
      </form>
    </Modal>
  );
};
