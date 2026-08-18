import { apiClient } from './client';
import { PaymentType } from './loads';

export interface ContractorSummaryItem {
  contractor: {
    id: string;
    name: string;
    mobile: string;
    createdAt: string;
  };
  stats: {
    totalTrips: number;
    totalAmount: number;
    cashTrips: number;
    cashAmount: number;
    creditTrips: number;
    creditAmount: number;
    lastTripDate: string | null;
  };
}

export interface ContractorsSummaryResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  grandTotal: {
    contractorCount: number;
    totalTrips: number;
    totalAmount: number;
    cashAmount: number;
    creditAmount: number;
  };
  contractors: ContractorSummaryItem[];
}

export interface MaterialBreakdownItem {
  materialTypeId: string;
  materialName: string;
  tripCount: number;
  totalAmount: number;
  percentage: number;
}

export interface VehicleBreakdownItem {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  tripCount: number;
  totalAmount: number;
}

export interface SiteBreakdownItem {
  siteId: string;
  siteName: string;
  location: string;
  tripCount: number;
  totalAmount: number;
}

export interface SettlementTripItem {
  id: string;
  date: string;
  createdAt: string;
  vehicleNumber: string;
  vehicleType: string;
  materialName: string;
  siteName: string;
  paymentType: PaymentType;
  amount: number;
}

export interface SettlementReportResponse {
  business?: {
    id: string;
    businessName: string;
    mobile: string;
    gstin: string | null;
  } | null;
  contractor: {
    id: string;
    name: string;
    mobile: string;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalTrips: number;
    totalAmount: number;
    cashTrips: number;
    cashAmount: number;
    creditTrips: number;
    creditAmount: number;
  };
  materialBreakdown: MaterialBreakdownItem[];
  vehicleBreakdown: VehicleBreakdownItem[];
  siteBreakdown: SiteBreakdownItem[];
  trips: SettlementTripItem[];
}

export interface QueryContractorsSummaryParams {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  search?: string;
  customerId?: string;
}

export interface QuerySettlementParams {
  contractorId: string;
  startDate?: string;
  endDate?: string;
  siteId?: string;
  paymentType?: PaymentType;
  customerId?: string;
}

export async function getContractorsSummaryApi(
  params: QueryContractorsSummaryParams = {}
): Promise<ContractorsSummaryResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.search) query.append('search', params.search);
  if (params.customerId) query.append('customerId', params.customerId);

  const qs = query.toString();
  return apiClient<ContractorsSummaryResponse>(
    `/reports/contractors-summary${qs ? `?${qs}` : ''}`
  );
}

export async function getSettlementReportApi(
  params: QuerySettlementParams
): Promise<SettlementReportResponse> {
  const query = new URLSearchParams();
  query.append('contractorId', params.contractorId);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.paymentType) query.append('paymentType', params.paymentType);
  if (params.customerId) query.append('customerId', params.customerId);

  return apiClient<SettlementReportResponse>(
    `/reports/settlement?${query.toString()}`
  );
}
