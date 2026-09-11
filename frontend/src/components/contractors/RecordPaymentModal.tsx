import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CustomSelect } from '../common/CustomSelect';
import { DateInput } from '../common/DateInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { createContractorPaymentApi } from '../../api/contractors';
import { getSubAccountsApi, CoPartner } from '../../api/subAccounts';
import { Site, Contractor } from '../../api/masterData';
import { Wallet, IndianRupee, ShieldCheck, UserCheck, CreditCard } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialContractorId?: string;
  initialSiteId?: string;
  sites: Site[];
  contractors: Contractor[];
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialContractorId,
  initialSiteId,
  sites,
  contractors,
}) => {
  const toast = useToast();
  const { user } = useAuth();

  const [siteId, setSiteId] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH_DRAWER' | 'OWNER_DIRECT' | 'CO_PARTNER_DIRECT'>('CASH_DRAWER');
  const [collectedByUserId, setCollectedByUserId] = useState('');
  const [transferMethod, setTransferMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [coPartners, setCoPartners] = useState<Array<{ id: string; name: string | null; mobile: string; role: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults
  useEffect(() => {
    if (isOpen) {
      setSiteId(initialSiteId || (sites.length > 0 ? sites[0].id : ''));
      setContractorId(initialContractorId || (contractors.length > 0 ? contractors[0].id : ''));
      setDate(new Date().toISOString().split('T')[0]);
      setAmount('');
      setPaymentMode('CASH_DRAWER');
      setCollectedByUserId(user?.id || '');
      setTransferMethod('');
      setReferenceNumber('');
      setRemarks('');
      setError(null);

      // Load co-partners
      if (user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN') {
        getSubAccountsApi()
          .then((res) => {
            if (res.coPartners) {
              setCoPartners(res.coPartners.map((cp: CoPartner) => ({
                id: cp.id,
                name: cp.name,
                mobile: cp.mobile,
                role: 'CO_PARTNER',
              })));
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialSiteId, initialContractorId, sites, contractors, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!contractorId) {
      setError('Please select a contractor');
      return;
    }
    if (!siteId) {
      setError('Please select a quarry site');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive payment amount');
      return;
    }

    setSubmitting(true);
    try {
      await createContractorPaymentApi({
        siteId,
        contractorId,
        date,
        amount: numAmount,
        paymentMode,
        collectedByUserId: collectedByUserId || undefined,
        transferMethod: transferMethod || undefined,
        referenceNumber: referenceNumber || undefined,
        remarks: remarks || undefined,
      });

      toast.success('Contractor payment collected and logged to party ledger');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment');
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const collectorOptions = [
    ...(user ? [{ value: user.id, label: `${user.name || user.mobile} (${user.role.replace('_', ' ')})` }] : []),
    ...coPartners
      .filter((cp) => cp.id !== user?.id)
      .map((cp) => ({
        value: cp.id,
        label: `${cp.name || cp.mobile} (Co-Partner)`,
      })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Contractor Payment Collection"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            {error}
          </div>
        )}

        {/* Site & Contractor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Quarry Site *</label>
            <CustomSelect
              options={sites.map((s) => ({ value: s.id, label: s.siteName }))}
              value={siteId}
              onChange={setSiteId}
              placeholder="Select Site"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Contractor *</label>
            <CustomSelect
              options={contractors.map((c) => ({ value: c.id, label: c.name, subLabel: c.mobile ? `+91 ${c.mobile}` : undefined }))}
              value={contractorId}
              onChange={setContractorId}
              placeholder="Select Contractor"
            />
          </div>
        </div>

        {/* Date & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Collection Date *</label>
            <DateInput
              value={date}
              onChange={setDate}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Amount Collected (₹) *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              leftIcon={<IndianRupee className="w-4 h-4 text-emerald-400" />}
              className="text-emerald-400 font-bold"
              required
            />
          </div>
        </div>

        {/* Payment Mode / Destination Channel */}
        <div>
          <label className="block text-xs font-semibold text-secondary mb-1.5">
            Received Into / Account Destination *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMode('CASH_DRAWER')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                paymentMode === 'CASH_DRAWER'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                  : 'bg-surface-solid border-subtle text-secondary hover:text-primary hover:border-emerald-500/50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Cash Drawer</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('OWNER_DIRECT')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                paymentMode === 'OWNER_DIRECT'
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-md'
                  : 'bg-surface-solid border-subtle text-secondary hover:text-primary hover:border-purple-500/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Owner Direct</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('CO_PARTNER_DIRECT')}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition ${
                paymentMode === 'CO_PARTNER_DIRECT'
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md'
                  : 'bg-surface-solid border-subtle text-secondary hover:text-primary hover:border-cyan-500/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Partner Direct</span>
            </button>
          </div>
        </div>

        {/* Collector User & Transfer Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Collected By</label>
            <CustomSelect
              options={collectorOptions}
              value={collectedByUserId}
              onChange={setCollectedByUserId}
              placeholder="Select Collector"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Transfer Medium</label>
            <CustomSelect
              options={[
                { value: '', label: 'Default (Direct)' },
                { value: 'CASH', label: 'Cash in Hand' },
                { value: 'UPI', label: 'UPI / GPay / PhonePe' },
                { value: 'BANK_TRANSFER', label: 'NEFT / RTGS / IMPS' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
              value={transferMethod}
              onChange={setTransferMethod}
              placeholder="Select Medium"
            />
          </div>
        </div>

        {/* Reference Number & Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Ref / UTR / Cheque No</label>
            <Input
              type="text"
              placeholder="e.g. UTR-998822"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              leftIcon={<CreditCard className="w-4 h-4 text-muted" />}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary mb-1.5">Remarks / Note</label>
            <Input
              type="text"
              placeholder="e.g. Part payment on bill #204"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-subtle">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Confirm Payment Collection
          </Button>
        </div>
      </form>
    </Modal>
  );
};
