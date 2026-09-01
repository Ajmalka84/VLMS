import { apiClient } from './client';
import { Site, Vehicle, MaterialType, Contractor, Rate } from './masterData';

export type PaymentType = 'CASH' | 'CREDIT';

export interface Load {
  id: string;
  siteId: string;
  date: string;
  vehicleId: string;
  materialTypeId: string;
  contractorId?: string | null;
  rateId: string;
  amount: string | number;
  paymentType: PaymentType;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  site: Site;
  vehicle: Vehicle;
  materialType: MaterialType;
  contractor?: Contractor | null;
  rate: Rate;
}

export interface CreateLoadDto {
  siteId: string;
  date?: string;
  vehicleId: string;
  materialTypeId: string;
  contractorId?: string | null;
  amount?: number;
  paymentType: PaymentType;
  remarks?: string;
}

export interface UpdateLoadDto {
  siteId?: string;
  date?: string;
  vehicleId?: string;
  materialTypeId?: string;
  contractorId?: string | null;
  amount?: number;
  paymentType?: PaymentType;
  remarks?: string;
}

export interface QueryLoadsDto {
  siteId?: string;
  vehicleId?: string;
  contractorId?: string;
  materialTypeId?: string;
  paymentType?: PaymentType;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LoadsSummary {
  totalLoads: number;
  totalAmount: number;
  totalCashAmount: number;
  totalCreditAmount: number;
  cashCount: number;
  creditCount: number;
}

export interface LoadsResponse {
  loads: Load[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: LoadsSummary;
}

export async function createLoadApi(dto: CreateLoadDto): Promise<Load> {
  return apiClient<Load>('/loads', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getLoadsApi(query: QueryLoadsDto = {}): Promise<LoadsResponse> {
  const params = new URLSearchParams();
  if (query.siteId) params.append('siteId', query.siteId);
  if (query.vehicleId) params.append('vehicleId', query.vehicleId);
  if (query.contractorId) params.append('contractorId', query.contractorId);
  if (query.materialTypeId) params.append('materialTypeId', query.materialTypeId);
  if (query.paymentType) params.append('paymentType', query.paymentType);
  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.search) params.append('search', query.search);
  if (query.page) params.append('page', String(query.page));
  if (query.limit) params.append('limit', String(query.limit));

  const qs = params.toString();
  return apiClient<LoadsResponse>(`/loads${qs ? `?${qs}` : ''}`);
}

export async function getLoadByIdApi(id: string): Promise<Load> {
  return apiClient<Load>(`/loads/${id}`);
}

export async function updateLoadApi(id: string, dto: UpdateLoadDto): Promise<Load> {
  return apiClient<Load>(`/loads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function deleteLoadApi(id: string): Promise<Load> {
  return apiClient<Load>(`/loads/${id}`, { method: 'DELETE' });
}

export async function getPublicLoadApi(id: string): Promise<Load> {
  return apiClient<Load>(`/loads/public/${id}`);
}
