import React, { useState } from 'react';
import {
  Printer,
  Share2,
  X,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Phone,
  MessageCircle,
  Download,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Load } from '../../api/loads';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  formatSlipNumber,
  formatSlipDateTime,
  openWhatsAppTripSlip,
} from '../../utils/tripSlipFormatter';
import {
  downloadTripSlipPdf,
  printTripSlipDirectly,
} from '../../utils/tripSlipPdfGenerator';

interface TripSlipModalProps {
  isOpen: boolean;
  load: Load | null;
  onClose: () => void;
  customBusinessName?: string;
}

export const TripSlipModal: React.FC<TripSlipModalProps> = ({
  isOpen,
  load,
  onClose,
  customBusinessName,
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const toast = useToast();
  const [recipientPhone, setRecipientPhone] = useState('');
  const [printing, setPrinting] = useState(false);

  if (!isOpen || !load) return null;

  const businessName =
    customBusinessName || user?.businessName || 'Valiyaparambil Granites & Earthworks';
  const slipNo = formatSlipNumber(load);
  const { dateStr, timeStr } = formatSlipDateTime(load);
  const numAmount = Number(load.amount || 0);

  const defaultContractorPhone = load.contractor?.mobile || '';

  const handlePrint = () => {
    try {
      setPrinting(true);
      printTripSlipDirectly(load, businessName, user?.mobile);
      toast.success(language === 'ml' ? 'സ്ലിപ്പ് പ്രിന്റിംഗ് റെഡിയാണ്' : 'Preparing slip print dialog...');
    } catch (err: any) {
      toast.error(err.message || 'Print error');
    } finally {
      setTimeout(() => setPrinting(false), 1000);
    }
  };

  const handleDownloadPdf = () => {
    try {
      downloadTripSlipPdf(load, businessName, user?.mobile);
      toast.success(language === 'ml' ? 'സ്ലിപ്പ് PDF ഡൗൺലോഡ് ചെയ്തു' : 'Trip slip PDF downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Download error');
    }
  };

  const handleWhatsAppShare = () => {
    try {
      const targetPhone = recipientPhone.trim() || undefined;
      openWhatsAppTripSlip(load, businessName, user?.mobile, targetPhone);
      toast.success(language === 'ml' ? 'വാട്സ്ആപ്പ് തുറക്കുന്നു...' : 'Opening WhatsApp...');
    } catch (err: any) {
      toast.error(err.message || 'Failed to open WhatsApp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-amber-400">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {t('trip_slip')}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">{slipNo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Slip Preview Container */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[60vh] flex justify-center bg-slate-950/70">
          <div
            id="trip-slip-card"
            className="w-full max-w-[320px] rounded-2xl bg-white text-slate-900 p-5 shadow-2xl border border-slate-200 text-xs font-mono space-y-3"
          >
            {/* Business Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 space-y-0.5">
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-950">
                {businessName}
              </h2>
              <div className="text-[11px] text-slate-600 font-sans font-medium">
                {load.site?.siteName} • {load.site?.location || 'Ernakulam'}
              </div>
              {user?.mobile && (
                <div className="text-[10px] text-slate-500 font-mono">
                  Ph: {user.mobile}
                </div>
              )}
              <div className="pt-1.5 flex items-center justify-center">
                <span className="inline-block px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white rounded">
                  {t('gate_pass')}
                </span>
              </div>
            </div>

            {/* Slip Meta */}
            <div className="grid grid-cols-2 gap-1 text-[11px] pb-2 border-b border-dashed border-slate-300">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase font-sans">
                  {t('slip_no')}
                </span>
                <span className="font-bold text-slate-950 font-mono">{slipNo}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block text-[9px] uppercase font-sans">
                  {t('date_time')}
                </span>
                <span className="font-bold text-slate-950">
                  {dateStr} {timeStr ? `• ${timeStr}` : ''}
                </span>
              </div>
            </div>

            {/* Trip Details Table */}
            <div className="space-y-2 py-1 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans">{t('vehicle_no')}:</span>
                <span className="font-extrabold text-slate-950 text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                  {load.vehicle?.vehicleNumber}
                </span>
              </div>

              {load.vehicle?.vehicleType?.name && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-sans">{t('vehicle_type')}:</span>
                  <span className="font-semibold text-slate-800">
                    {load.vehicle.vehicleType.name}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans">{t('material')}:</span>
                <span className="font-bold text-slate-900">
                  {load.materialType?.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans">{t('billed_to')}:</span>
                <span className="font-bold text-slate-900 truncate max-w-[170px]">
                  {load.contractor?.name || 'Direct / Spot Sale'}
                </span>
              </div>

              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-600 font-sans">{t('filter_by_payment')}:</span>
                <span
                  className={`font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                    load.paymentType === 'CASH'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {load.paymentType === 'CASH' ? t('paid_cash') : t('credit_trip')}
                </span>
              </div>
            </div>

            {/* Total Amount Box */}
            <div className="border-t-2 border-b-2 border-slate-900 py-2.5 my-2 flex justify-between items-center bg-slate-50 px-2 rounded-lg">
              <span className="font-extrabold text-slate-950 text-xs uppercase tracking-wide font-sans">
                {language === 'ml' ? 'ആകെ തുക (TOTAL)' : 'TOTAL AMOUNT'}:
              </span>
              <span className="font-black text-sm text-slate-950 font-mono">
                ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Remarks if any */}
            {load.remarks && (
              <div className="text-[10px] text-slate-600 pt-0.5">
                <span className="font-bold text-slate-700">Remarks:</span> {load.remarks}
              </div>
            )}

            {/* Signatures & Footer */}
            <div className="pt-3 border-t border-dashed border-slate-300 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-center text-[9px] text-slate-600 font-sans">
                <div className="pt-5 border-t border-slate-300">
                  {t('driver_copy')}
                </div>
                <div className="pt-5 border-t border-slate-300">
                  {t('authorized_signature')}
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 font-mono">
                VLMS Software • {new Date().toLocaleDateString('en-IN')}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 space-y-3">
          {/* Optional Direct WhatsApp Phone Input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                placeholder={
                  language === 'ml'
                    ? 'മൊബൈൽ നമ്പർ (കോൺടാക്ട് ലിസ്റ്റിൽ നിന്ന് തിരഞ്ഞെടുക്കാൻ ഒഴിച്ചിടുക)'
                    : 'Recipient Mobile (Leave blank for Contact Picker)'
                }
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t('share_whatsapp')}</span>
            </button>
          </div>

          {defaultContractorPhone && !recipientPhone && (
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>{language === 'ml' ? 'കോൺട്രാക്ടർ നമ്പർ:' : 'Contractor phone:'}</span>
              <button
                type="button"
                onClick={() => setRecipientPhone(defaultContractorPhone)}
                className="text-amber-400 hover:text-amber-300 font-mono font-bold cursor-pointer underline"
              >
                + {defaultContractorPhone}
              </button>
            </div>
          )}

          {/* Primary Action Buttons: Print Slip, Download PDF, and Close */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={printing}
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{t('print_trip_slip')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer select-none"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-white font-bold text-xs border border-slate-800 transition-all cursor-pointer"
            >
              {language === 'ml' ? 'ക്ലോസ്' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
