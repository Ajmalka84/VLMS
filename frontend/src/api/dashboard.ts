import { apiClient } from './client';
import { Load } from './loads';
import { CurrentDrawerResponse } from './shifts';
import { ExpenseSummary } from './expenses';
import { PartnerSettlementResponse } from './reports';

export interface DashboardSummaryResponse {
  loads: {
    totalLoads: number;
    totalTurnover: number;
    cashAmount: number;
    creditAmount: number;
    recentLoads: Load[];
  };
  expenses: ExpenseSummary;
  drawer: CurrentDrawerResponse | null;
  partnerReport: PartnerSettlementResponse | null;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export interface DashboardQueryParams {
  siteId?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

export const fetchDashboardSummaryApi = async (
  params?: DashboardQueryParams,
): Promise<DashboardSummaryResponse> => {
  const query = new URLSearchParams();
  if (params?.siteId) query.append('siteId', params.siteId);
  if (params?.startDate) query.append('startDate', params.startDate);
  if (params?.endDate) query.append('endDate', params.endDate);
  if (params?.customerId) query.append('customerId', params.customerId);
  const qs = query.toString();
  return apiClient<DashboardSummaryResponse>(`/dashboard/summary${qs ? `?${qs}` : ''}`);
};
