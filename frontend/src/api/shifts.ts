import { apiClient } from './client';

export interface CurrentDrawerResponse {
  siteId: string;
  siteName: string;
  location?: string;
  date: string;
  openingCash: number;
  cashInflows: number;
  cashLoadsCount: number;
  cashOutflows: number;
  generalExpensesOutflow: number;
  machineryAdvanceOutflow: number;
  expensesCount: number;
  expectedCash: number;
  existingShift: {
    id: string;
    shiftType: string;
    openingCash: number;
    actualHandoverCash: number;
    discrepancy: number;
    remarks: string | null;
    isApproved: boolean;
    supervisorName: string;
    approvedByName: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface CreateShiftReconciliationDto {
  siteId?: string;
  date: string;
  shiftType?: string;
  openingCash?: number;
  actualHandoverCash: number;
  remarks?: string;
}

export interface ShiftReconciliationRecord {
  id: string;
  siteId: string;
  supervisorUserId: string;
  approvedByUserId: string | null;
  date: string;
  shiftType: string;
  openingCash: number | string;
  cashInflows: number | string;
  cashOutflows: number | string;
  expectedCash: number | string;
  actualHandoverCash: number | string;
  discrepancy: number | string;
  remarks: string | null;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  site: {
    id: string;
    siteName: string;
    location?: string;
  };
  supervisor: {
    id: string;
    name: string | null;
    mobile: string;
  };
  approvedBy: {
    id: string;
    name: string | null;
    mobile: string;
  } | null;
}

export interface QueryShiftsDto {
  siteId?: string;
  startDate?: string;
  endDate?: string;
  isApproved?: boolean;
}

export async function getCurrentDrawerApi(
  siteId?: string,
  date?: string,
): Promise<CurrentDrawerResponse> {
  const params = new URLSearchParams();
  if (siteId) params.append('siteId', siteId);
  if (date) params.append('date', date);
  const qs = params.toString();
  return apiClient<CurrentDrawerResponse>(`/shifts/current-drawer${qs ? `?${qs}` : ''}`);
}

export async function closeShiftApi(
  dto: CreateShiftReconciliationDto,
): Promise<ShiftReconciliationRecord> {
  return apiClient<ShiftReconciliationRecord>('/shifts/close', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function approveShiftApi(
  id: string,
  remarks?: string,
): Promise<ShiftReconciliationRecord> {
  return apiClient<ShiftReconciliationRecord>(`/shifts/${id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ remarks }),
  });
}

export async function getShiftsHistoryApi(
  query: QueryShiftsDto = {},
): Promise<ShiftReconciliationRecord[]> {
  const params = new URLSearchParams();
  if (query.siteId) params.append('siteId', query.siteId);
  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.isApproved !== undefined) params.append('isApproved', String(query.isApproved));
  const qs = params.toString();
  return apiClient<ShiftReconciliationRecord[]>(`/shifts/history${qs ? `?${qs}` : ''}`);
}
