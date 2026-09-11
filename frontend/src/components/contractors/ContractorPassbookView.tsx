import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { MetricCard } from '../common/MetricCard';
import { DateInput } from '../common/DateInput';
import { CustomSelect } from '../common/CustomSelect';
import { ConfirmModal } from '../common/ConfirmModal';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  getContractorLedgerApi,
  deleteContractorPaymentApi,
  ContractorLedgerResponse,
} from '../../api/contractors';
import { Site, Contractor } from '../../api/masterData';
import { formatINR } from '../../utils/formatters';
import {
  BookOpen,
  PlusCircle,
  Share2,
  Download,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
} from 'lucide-react';

interface ContractorPassbookViewProps {
  contractor: Contractor;
  sites: Site[];
  currentSiteId?: string;
  onOpenRecordPayment: (contractorId: string) => void;
  onRefreshSummary?: () => void;
}

export const ContractorPassbookView: React.FC<ContractorPassbookViewProps> = ({
  contractor,
  sites,
  currentSiteId,
  onOpenRecordPayment,
  onRefreshSummary,
}) => {
  const toast = useToast();
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN';

  const [siteId, setSiteId] = useState(currentSiteId || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [ledgerData, setLedgerData] = useState<ContractorLedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Deletion modal state
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContractorLedgerApi(contractor.id, {
        siteId: siteId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLedgerData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load contractor passbook');
    } finally {
      setLoading(false);
    }
  }, [contractor.id, siteId, startDate, endDate, toast]);

  useEffect(() => {
    void fetchLedger();
  }, [fetchLedger]);

  const handleDeletePayment = async () => {
    if (!deletePaymentId) return;
    setDeleting(true);
    try {
      await deleteContractorPaymentApi(deletePaymentId);
      toast.success('Payment record removed from ledger');
      setDeletePaymentId(null);
      void fetchLedger();
      if (onRefreshSummary) onRefreshSummary();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete payment');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    if (!ledgerData) return;
    const headers = ['Date', 'Type', 'Description', 'Debit (INR)', 'Credit (INR)', 'Running Balance (INR)', 'Received By / Ref', 'Remarks'];
    const rows = ledgerData.entries.map((e) => [
      e.date,
      e.type,
      `"${e.description.replace(/"/g, '""')}"`,
      e.debit ? e.debit.toFixed(2) : '0.00',
      e.credit ? e.credit.toFixed(2) : '0.00',
      e.runningBalance.toFixed(2),
      `"${(e.collectedBy?.name || e.transferMethod || '').replace(/"/g, '""')}"`,
      `"${(e.remarks || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Passbook_${contractor.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleWhatsAppShare = () => {
    if (!ledgerData) return;
    const cleanMobile = contractor.mobile.replace(/\D/g, '');
    const msg =
      `*🏛️ QUARRY DISPATCH & PAYMENT PASSBOOK*\n` +
      `Contractor: *${contractor.name}*\n` +
      `Phone: +91 ${contractor.mobile}\n` +
      `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
      `*Financial Summary:*\n` +
      `• Opening Balance: ${formatINR(ledgerData.openingBalance)}\n` +
      `• Total Credit Dispatches (+): ${formatINR(ledgerData.totalDebit)}\n` +
      `• Total Payments Received (-): ${formatINR(ledgerData.totalCredit)}\n` +
      `--------------------------------\n` +
      `*• Net Closing Balance Due: ${formatINR(ledgerData.closingBalance)}*\n\n` +
      `_Automated Statement via Quarry Flow VLMS_`;

    const url = `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Actions Header */}
      <Card variant="glass" className="p-4 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary flex items-center gap-2">
                {contractor.name}
                <span className="text-xs font-normal text-muted flex items-center gap-1">
                  <Phone className="w-3 h-3 text-muted" /> +91 {contractor.mobile}
                </span>
              </h2>
              <p className="text-xs text-secondary">Chronological credit billing & collection passbook</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenRecordPayment(contractor.id)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Record Payment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsAppShare}
              leftIcon={<Share2 className="w-4 h-4 text-emerald-500" />}
            >
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4" />}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Date & Site Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-subtle">
          <div>
            <label className="block text-[11px] font-semibold text-secondary mb-1">Filter Site</label>
            <CustomSelect
              options={[
                { value: '', label: 'All Quarry Sites' },
                ...sites.map((s) => ({ value: s.id, label: s.siteName })),
              ]}
              value={siteId}
              onChange={setSiteId}
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-secondary mb-1">From Date</label>
            <DateInput value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-secondary mb-1">To Date</label>
            <DateInput value={endDate} onChange={setEndDate} />
          </div>
        </div>
      </Card>

      {/* Financial Overview Metrics */}
      {ledgerData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Opening Balance"
            value={formatINR(ledgerData.openingBalance)}
            subtext="Prior period balance"
            icon={<Wallet className="w-5 h-5 text-muted" />}
            variant="default"
          />
          <MetricCard
            label="Credit Billed (Debits)"
            value={formatINR(ledgerData.totalDebit)}
            subtext="Loads taken on credit"
            icon={<TrendingDown className="w-5 h-5 text-rose-500" />}
            variant="rose"
          />
          <MetricCard
            label="Payments Paid (Credits)"
            value={formatINR(ledgerData.totalCredit)}
            subtext="Collections received"
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            variant="emerald"
          />
          <MetricCard
            label="Closing Balance Due"
            value={formatINR(ledgerData.closingBalance)}
            subtext={ledgerData.closingBalance === 0 ? 'Account Fully Settled' : 'Net Receivable'}
            icon={<BookOpen className="w-5 h-5 text-amber-500" />}
            variant={ledgerData.closingBalance > 0 ? 'amber' : 'emerald'}
          />
        </div>
      )}

      {/* Running Ledger Passbook Table */}
      <div className="overflow-hidden rounded-2xl border border-subtle bg-surface backdrop-blur-md shadow-xl">
        <div className="p-4 border-b border-subtle flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-500" />
            Passbook Entries ({ledgerData?.entries.length || 0})
          </h3>
          {loading && <span className="text-xs text-amber-500 animate-pulse">Refreshing ledger...</span>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-solid text-secondary font-semibold border-b border-subtle">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Description & Site</th>
                <th className="p-3">Collector / Medium</th>
                <th className="p-3 text-right">Debit (+)</th>
                <th className="p-3 text-right">Credit (-)</th>
                <th className="p-3 text-right">Running Balance</th>
                {isOwnerOrAdmin && <th className="p-3 text-center">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle text-secondary">
              {/* Opening Balance Row if date filtered */}
              {ledgerData && startDate && (
                <tr className="bg-surface-solid text-muted italic">
                  <td className="p-3">{startDate}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-hover text-secondary border border-subtle">
                      B/F
                    </span>
                  </td>
                  <td className="p-3" colSpan={2}>
                    Opening Balance Brought Forward
                  </td>
                  <td className="p-3 text-right">-</td>
                  <td className="p-3 text-right">-</td>
                  <td className="p-3 text-right font-semibold text-primary">
                    {formatINR(ledgerData.openingBalance)}
                  </td>
                  {isOwnerOrAdmin && <td></td>}
                </tr>
              )}

              {ledgerData && ledgerData.entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted">
                    No transactions or payments found for this contractor in the selected range.
                  </td>
                </tr>
              ) : (
                ledgerData?.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-hover transition">
                    <td className="p-3 whitespace-nowrap font-medium text-secondary">{entry.date}</td>
                    <td className="p-3">
                      {entry.type === 'LOAD' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/30">
                          <ArrowDownLeft className="w-3 h-3" /> Load (Credit)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                          <ArrowUpRight className="w-3 h-3" /> Payment
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="font-semibold text-primary">{entry.description}</div>
                      <div className="text-[11px] text-muted">
                        {entry.site?.name} {entry.remarks && `• ${entry.remarks}`}
                      </div>
                    </td>
                    <td className="p-3">
                      {entry.type === 'PAYMENT' ? (
                        <div>
                          <span className="text-primary font-medium">
                            {entry.collectedBy?.name || 'Site Cashier'}
                          </span>
                          <div className="text-[10px] text-muted">
                            {entry.paymentMode.replace(/_/g, ' ')}
                            {entry.transferMethod && ` (${entry.transferMethod})`}
                            {entry.referenceNumber && ` • Ref: ${entry.referenceNumber}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold text-rose-500">
                      {entry.debit > 0 ? formatINR(entry.debit) : '-'}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-500">
                      {entry.credit > 0 ? formatINR(entry.credit) : '-'}
                    </td>
                    <td className="p-3 text-right font-bold text-amber-500">
                      {formatINR(entry.runningBalance)}
                    </td>
                    {isOwnerOrAdmin && (
                      <td className="p-3 text-center">
                        {entry.type === 'PAYMENT' ? (
                          <button
                            type="button"
                            onClick={() => setDeletePaymentId(entry.id)}
                            className="p-1 rounded-lg text-muted hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-muted text-[10px]">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm Payment Delete Modal */}
      <ConfirmModal
        isOpen={!!deletePaymentId}
        onCancel={() => setDeletePaymentId(null)}
        onConfirm={handleDeletePayment}
        title="Delete Payment Collection Record"
        message="Are you sure you want to delete this payment record? The contractor's outstanding balance will increase accordingly."
        confirmText="Delete Payment"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
};
