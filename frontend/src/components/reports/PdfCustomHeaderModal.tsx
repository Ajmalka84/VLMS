import React, { useState, useEffect } from 'react';
import { FileText, Phone, Building, Hash, X, RotateCcw, Download } from 'lucide-react';
import { Card } from '../common/Card';
import { useLanguage } from '../../context/LanguageContext';
import { PdfCustomHeaderOptions } from '../../utils/pdfGenerator';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <Card
        variant="highlight"
        className="w-full max-w-lg p-6 space-y-5 relative border-amber-500/30 shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors cursor-pointer p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1 pr-6">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {t('customize_bill_modal_title') || 'Customize Bill Header'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t('customize_bill_modal_sub') ||
                'Customize the business or joint-venture name and contact numbers displayed on the PDF bill.'}
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleDownload} className="space-y-4 pt-1">
          {/* Business / Collaboration Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              {t('bill_business_name_label') || 'Business / Collaboration Name'}
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. ABC & XYZ Joint Venture"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-500"
              required
            />
          </div>

          {/* Contact Numbers */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              {t('bill_contact_numbers_label') || 'Contact Phone Number(s)'}
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('bill_contact_numbers_ph') || 'e.g. +91 98470 12345 / +91 94470 67890'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-500"
            />
            <p className="text-[11px] text-slate-400">
              {t('bill_contact_numbers_hint') || 'Enter single or multiple numbers for joint partners / site managers.'}
            </p>
          </div>

          {/* Optional GSTIN / Reference */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-400" />
              {t('bill_gstin_label') || 'GSTIN / Project Reference (Optional)'}
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              placeholder="e.g. 32AAAAA0000A1Z5 or Project #104"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all placeholder:text-slate-500"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-amber-400 hover:bg-slate-900 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t('reset_defaults') || 'Reset'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-all cursor-pointer"
              >
                {t('cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {t('download_pdf_bill') || 'Download PDF'}
              </button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
