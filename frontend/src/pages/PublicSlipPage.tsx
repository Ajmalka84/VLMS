import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  Printer,
  Download,
  Share2,
  AlertCircle,
  MapPin,
  Calendar,
  Layers,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Load, getPublicLoadApi } from '../api/loads';
import { formatSlipNumber, formatSlipDateTime, openWhatsAppTripSlip } from '../utils/tripSlipFormatter';
import { downloadTripSlipPdf, printTripSlipDirectly } from '../utils/tripSlipPdfGenerator';

export const PublicSlipPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid or missing slip reference.');
      setLoading(false);
      return;
    }

    getPublicLoadApi(id)
      .then((data) => {
        setLoad(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || 'Dispatch slip not found or link has expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center animate-spin">
          <Truck className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-400 mt-4">
          Loading digital dispatch pass...
        </p>
      </div>
    );
  }

  if (error || !load) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-14 h-14 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Slip Not Found</h1>
        <p className="text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || 'This digital gate slip could not be found or has been removed.'}
        </p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 hover:text-white transition-colors"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  const businessName =
    (load.site as any)?.user?.businessName || 'Valiyaparambil Granites & Earthworks';
  const businessMobile = (load.site as any)?.user?.mobile;
  const slipNo = formatSlipNumber(load);
  const { dateStr, timeStr } = formatSlipDateTime(load);
  const numAmount = Number(load.amount || 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Container */}
      <div className="w-full max-w-md space-y-6">
        {/* Verification Status Badge */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Verified Digital Dispatch Pass
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-300 font-bold">
            {slipNo}
          </span>
        </div>

        {/* Printable Physical-Style Receipt Card */}
        <div className="rounded-3xl bg-white text-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200 text-xs font-mono space-y-4">
          {/* Header */}
          <div className="text-center border-b border-dashed border-slate-400 pb-3.5 space-y-1">
            <h1 className="text-base font-black uppercase tracking-tight text-slate-950">
              {businessName}
            </h1>
            <div className="text-xs text-slate-600 font-sans font-medium">
              {load.site?.siteName} • {load.site?.location || 'Ernakulam'}
            </div>
            {businessMobile && (
              <div className="text-[11px] text-slate-500 font-mono">
                Ph: {businessMobile}
              </div>
            )}
            <div className="pt-2 flex items-center justify-center">
              <span className="inline-block px-3 py-0.5 text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white rounded">
                GATE DISPATCH PASS
              </span>
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-300">
            <div>
              <span className="text-slate-500 block text-[9px] uppercase font-sans">
                Slip Number
              </span>
              <span className="font-bold text-slate-950 font-mono text-xs">{slipNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 block text-[9px] uppercase font-sans">
                Date & Time
              </span>
              <span className="font-bold text-slate-950">
                {dateStr} {timeStr ? `• ${timeStr}` : ''}
              </span>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 py-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-sans">Vehicle Number:</span>
              <span className="font-black text-slate-950 font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">
                {load.vehicle?.vehicleNumber}
              </span>
            </div>

            {load.vehicle?.vehicleType?.name && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-sans">Vehicle Type:</span>
                <span className="font-semibold text-slate-800">
                  {load.vehicle.vehicleType.name}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-sans">Material Loaded:</span>
              <span className="font-bold text-slate-900">
                {load.materialType?.name}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-600 font-sans">Billed To (C/O):</span>
              <span className="font-bold text-slate-900 truncate max-w-[190px]">
                {load.contractor?.name || 'Direct / Walk-in Sale'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-sans">Payment Mode:</span>
              <span
                className={`font-black text-[10px] px-2.5 py-0.5 rounded uppercase tracking-wider ${
                  load.paymentType === 'CASH'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {load.paymentType === 'CASH' ? 'PAID CASH' : 'CREDIT (ACCOUNT)'}
              </span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="border-t-2 border-b-2 border-slate-900 py-3 my-2 flex justify-between items-center bg-slate-50 px-3 rounded-xl">
            <span className="font-extrabold text-slate-950 text-xs uppercase tracking-wide font-sans">
              TOTAL AMOUNT:
            </span>
            <span className="font-black text-base text-slate-950 font-mono">
              ₹{numAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Remarks */}
          {load.remarks && (
            <div className="text-[11px] text-slate-600 pt-0.5">
              <span className="font-bold text-slate-700">Remarks:</span> {load.remarks}
            </div>
          )}

          {/* Signatures & Footer */}
          <div className="pt-4 border-t border-dashed border-slate-300 space-y-3">
            <div className="grid grid-cols-2 gap-4 text-center text-[9px] text-slate-600 font-sans">
              <div className="pt-6 border-t border-slate-300">
                Driver / Site Copy
              </div>
              <div className="pt-6 border-t border-slate-300">
                Authorized Signatory
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-400 font-mono pt-1">
              VLMS System • {dateStr}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => printTripSlipDirectly(load, businessName, businessMobile)}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer select-none"
          >
            <Printer className="w-4 h-4" />
            <span>Print Slip</span>
          </button>

          <button
            type="button"
            onClick={() => downloadTripSlipPdf(load, businessName, businessMobile)}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs border border-slate-800 transition-all cursor-pointer select-none"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Get PDF</span>
          </button>

          <button
            type="button"
            onClick={() => openWhatsAppTripSlip(load, businessName, businessMobile)}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer select-none"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* Viral Footer */}
        <div className="text-center pt-4 space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Powered by <strong className="text-white font-extrabold">VLMS</strong></span>
          </div>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
            Vehicle Load Management System for Kerala Quarries, Crushers & Earthmoving Sites.
          </p>
        </div>
      </div>
    </div>
  );
};
