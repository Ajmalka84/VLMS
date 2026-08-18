import { apiClient } from './client';

export interface CustomerUser {
  id: string;
  businessName: string;
  mobile: string;
  gstin: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    sites: number;
    vehicles: number;
    contractors: number;
    loads: number;
  };
}

export interface CustomerListResult {
  users: CustomerUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCustomerDto {
  businessName: string;
  mobile: string;
  password: string;
  gstin?: string;
}

export interface UpdateCustomerDto {
  businessName?: string;
  gstin?: string;
}

export async function getCustomersApi(params?: {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
}): Promise<CustomerListResult> {
  const query = new URLSearchParams();
  if (params?.search) query.append('search', params.search);
  if (params?.status && params.status !== 'all') query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString();
  return apiClient<CustomerListResult>(
    `/admin/users${queryString ? `?${queryString}` : ''}`,
  );
}

export async function createCustomerApi(
  dto: CreateCustomerDto,
): Promise<CustomerUser> {
  return apiClient<CustomerUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getCustomerByIdApi(id: string): Promise<CustomerUser> {
  return apiClient<CustomerUser>(`/admin/users/${id}`);
}

export async function updateCustomerApi(
  id: string,
  dto: UpdateCustomerDto,
): Promise<CustomerUser> {
  return apiClient<CustomerUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function updateCustomerStatusApi(
  id: string,
  isActive: boolean,
): Promise<{ id: string; isActive: boolean; message: string }> {
  return apiClient<{ id: string; isActive: boolean; message: string }>(
    `/admin/users/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    },
  );
}

export async function resetCustomerPasswordApi(
  id: string,
  newPassword: string,
): Promise<{ id: string; message: string }> {
  return apiClient<{ id: string; message: string }>(
    `/admin/users/${id}/reset-password`,
    {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    },
  );
}
