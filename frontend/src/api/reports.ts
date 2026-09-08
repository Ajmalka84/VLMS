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
  params: QueryContractorsSummaryParams = {},
  options?: { signal?: AbortSignal }
): Promise<ContractorsSummaryResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.search) query.append('search', params.search);
  if (params.customerId) query.append('customerId', params.customerId);

  const qs = query.toString();
  return apiClient<ContractorsSummaryResponse>(
    `/reports/contractors-summary${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );
}

export async function getSettlementReportApi(
  params: QuerySettlementParams,
  options?: { signal?: AbortSignal }
): Promise<SettlementReportResponse> {
  const query = new URLSearchParams();
  query.append('contractorId', params.contractorId);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.paymentType) query.append('paymentType', params.paymentType);
  if (params.customerId) query.append('customerId', params.customerId);

  return apiClient<SettlementReportResponse>(
    `/reports/settlement?${query.toString()}`,
    { signal: options?.signal }
  );
}

// -------------------------------------------------------------
// SITE CASHFLOW STATEMENT
// -------------------------------------------------------------

export interface CashflowCategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface CashflowSiteBreakdown {
  siteId: string;
  siteName: string;
  location: string;
  inflows: number;
  outflows: number;
  netCashflow: number;
}

export interface CashflowTimelineItem {
  date: string;
  inflows: number;
  outflows: number;
  netCashflow: number;
  loadsCount: number;
  expensesCount: number;
}

export interface CashflowReportResponse {
  business: {
    id: string;
    businessName: string;
    mobile: string;
    gstin: string | null;
  };
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalInflows: number;
    totalOutflows: number;
    netCashflow: number;
    cashLoadsCount: number;
    cashExpensesCount: number;
    machineryAdvancesTotal: number;
  };
  categoryBreakdown: CashflowCategoryBreakdown[];
  siteBreakdown: CashflowSiteBreakdown[];
  timeline: CashflowTimelineItem[];
}

export interface QueryCashflowParams {
  startDate?: string;
  endDate?: string;
  siteId?: string;
  customerId?: string;
}

export async function getCashflowReportApi(
  params: QueryCashflowParams = {},
  options?: { signal?: AbortSignal }
): Promise<CashflowReportResponse> {
  const query = new URLSearchParams();
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.customerId) query.append('customerId', params.customerId);

  const qs = query.toString();
  return apiClient<CashflowReportResponse>(
    `/reports/cashflow${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );
}

// -------------------------------------------------------------
// CO-PARTNER TEMPORAL PROFIT-SHARING SETTLEMENT
// -------------------------------------------------------------

export interface PartnerSliceItem {
  siteId: string;
  siteName: string;
  location: string;
  sharePercentage: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  windowStart: string;
  windowEnd: string;
  revenue: number;
  expenses: number;
  netMargin: number;
  grossDividend: number;
  loadsCount: number;
  expensesCount: number;
  isActive: boolean;
}

export interface PartnerSettlementResponse {
  business: {
    id: string;
    businessName: string;
    mobile: string;
    gstin: string | null;
  };
  partnersList: Array<{
    id: string;
    name: string;
    mobile: string;
    sites: string[];
  }>;
  selectedPartner: {
    id: string;
    name: string;
    mobile: string;
  } | null;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalNetMargin: number;
    grossDividendPayable: number;
    advancesDeducted: number;
    netDividendPayable: number;
  };
  slices: PartnerSliceItem[];
}

export interface QueryPartnerSettlementParams {
  partnerId?: string;
  siteId?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export async function getPartnerSettlementReportApi(
  params: QueryPartnerSettlementParams = {},
  options?: { signal?: AbortSignal }
): Promise<PartnerSettlementResponse> {
  const query = new URLSearchParams();
  if (params.partnerId) query.append('partnerId', params.partnerId);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.customerId) query.append('customerId', params.customerId);

  const qs = query.toString();
  return apiClient<PartnerSettlementResponse>(
    `/reports/partner-settlement${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );
}

// -------------------------------------------------------------
// HEAVY MACHINERY RENTAL LOGBOOK & VENDOR SETTLEMENT
// -------------------------------------------------------------

export interface MachinerySummaryItem {
  machineryId: string;
  name: string;
  code: string | null;
  vendorName: string | null;
  vendorMobile: string | null;
  defaultRentPerHour: number;
  totalHours: number;
  totalGrossRent: number;
  totalAdvancesPaid: number;
  balancePayable: number;
  logsCount: number;
}

export interface MachineryLogEntry {
  id: string;
  date: string;
  machineryName: string;
  machineryCode: string | null;
  vendorName: string | null;
  siteName: string;
  startTime: string | null;
  closingTime: string | null;
  totalHours: number;
  rentPerHour: number;
  grossAmount: number;
  paymentMode: string;
  advanceAmount: number;
  operatorPaidTo: string | null;
  remarks: string | null;
}

export interface MachinerySettlementResponse {
  business: {
    id: string;
    businessName: string;
    mobile: string;
    gstin: string | null;
  };
  machineryList: Array<{
    id: string;
    name: string;
    code: string | null;
    vendorName: string | null;
  }>;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  grandTotal: {
    totalMachines: number;
    totalLogs: number;
    totalHours: number;
    totalGrossRent: number;
    totalAdvancesPaid: number;
    balancePayable: number;
  };
  machinesSummary: MachinerySummaryItem[];
  logs: MachineryLogEntry[];
}

export interface QueryMachinerySettlementParams {
  machineryId?: string;
  siteId?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export async function getMachinerySettlementReportApi(
  params: QueryMachinerySettlementParams = {},
  options?: { signal?: AbortSignal }
): Promise<MachinerySettlementResponse> {
  const query = new URLSearchParams();
  if (params.machineryId) query.append('machineryId', params.machineryId);
  if (params.siteId) query.append('siteId', params.siteId);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.customerId) query.append('customerId', params.customerId);

  const qs = query.toString();
  return apiClient<MachinerySettlementResponse>(
    `/reports/machinery-settlement${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );
}

