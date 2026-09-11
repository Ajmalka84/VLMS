import { apiClient } from './client';

export interface ContractorPayment {
  id: string;
  siteId: string;
  contractorId: string;
  collectedByUserId: string;
  date: string;
  amount: number | string;
  paymentMode: string;
  transferMethod?: string | null;
  referenceNumber?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; siteName: string };
  contractor?: { id: string; name: string; mobile: string };
  collectedBy?: { id: string; name: string | null; mobile: string; role: string };
}

export interface CreateContractorPaymentPayload {
  siteId: string;
  contractorId: string;
  date: string;
  amount: number;
  paymentMode?: string;
  collectedByUserId?: string;
  transferMethod?: string;
  referenceNumber?: string;
  remarks?: string;
}

export interface QueryContractorPaymentsParams {
  siteId?: string;
  contractorId?: string;
  collectedByUserId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: 'LOAD' | 'PAYMENT';
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  paymentMode: string;
  transferMethod: string | null;
  referenceNumber: string | null;
  collectedBy: { id: string; name: string | null; mobile: string; role: string } | null;
  remarks: string | null;
  site: { id: string; name: string };
  createdAt: string;
}

export interface ContractorLedgerResponse {
  contractor: {
    id: string;
    name: string;
    mobile: string;
  };
  siteId: string | null;
  startDate: string | null;
  endDate: string | null;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export interface ContractorSummaryItem {
  id: string;
  name: string;
  mobile: string;
  totalBilled: number;
  totalPaid: number;
  balanceDue: number;
  lastLoadDate: string | null;
  lastPaymentDate: string | null;
}

export interface ContractorBalanceSummaryResponse {
  totalCreditBilled: number;
  totalCollected: number;
  totalBalanceDue: number;
  contractors: ContractorSummaryItem[];
}

// ==========================================
// API CLIENT FUNCTIONS
// ==========================================

export async function createContractorPaymentApi(payload: CreateContractorPaymentPayload): Promise<ContractorPayment> {
  return apiClient<ContractorPayment>('/contractors/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listContractorPaymentsApi(params?: QueryContractorPaymentsParams): Promise<{
  data: ContractorPayment[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const q = new URLSearchParams();
  if (params?.siteId) q.set('siteId', params.siteId);
  if (params?.contractorId) q.set('contractorId', params.contractorId);
  if (params?.collectedByUserId) q.set('collectedByUserId', params.collectedByUserId);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));

  const queryStr = q.toString();
  const endpoint = queryStr ? `/contractors/payments?${queryStr}` : '/contractors/payments';
  return apiClient<{ data: ContractorPayment[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(endpoint);
}

export async function deleteContractorPaymentApi(id: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>(`/contractors/payments/${id}`, {
    method: 'DELETE',
  });
}

export async function getContractorLedgerApi(
  contractorId: string,
  params?: { siteId?: string; startDate?: string; endDate?: string },
): Promise<ContractorLedgerResponse> {
  const q = new URLSearchParams();
  if (params?.siteId) q.set('siteId', params.siteId);
  if (params?.startDate) q.set('startDate', params.startDate);
  if (params?.endDate) q.set('endDate', params.endDate);

  const queryStr = q.toString();
  const endpoint = queryStr ? `/contractors/${contractorId}/ledger?${queryStr}` : `/contractors/${contractorId}/ledger`;
  return apiClient<ContractorLedgerResponse>(endpoint);
}

export async function getContractorBalanceSummaryApi(params?: {
  siteId?: string;
}): Promise<ContractorBalanceSummaryResponse> {
  const q = new URLSearchParams();
  if (params?.siteId) q.set('siteId', params.siteId);

  const queryStr = q.toString();
  const endpoint = queryStr ? `/contractors/summary?${queryStr}` : '/contractors/summary';
  return apiClient<ContractorBalanceSummaryResponse>(endpoint);
}
