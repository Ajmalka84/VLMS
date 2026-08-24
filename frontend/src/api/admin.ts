import { apiClient } from './client';

export interface CustomerUser {
  id: string;
  businessName: string;
  mobile: string;
  gstin: string | null;
  isActive: boolean;
  subscriptionPlan?: string;
  subscriptionStartsAt?: string;
  subscriptionExpiresAt?: string | null;
  gracePeriodDays?: number;
  subscriptionStatus?:
    | 'ACTIVE_PAID'
    | 'EXPIRING_SOON'
    | 'IN_GRACE_PERIOD'
    | 'TRIAL_ACTIVE'
    | 'TRIAL_EXPIRED'
    | 'EXPIRED'
    | 'INACTIVE';
  daysRemaining?: number | null;
  isGraceActive?: boolean;
  isExpired?: boolean;
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
  subscriptionPlan?: 'TRIAL' | 'ANNUAL' | 'QUARTERLY' | 'CUSTOM';
  subscriptionExpiresAt?: string;
  gracePeriodDays?: number;
}

export interface UpdateCustomerDto {
  businessName?: string;
  gstin?: string;
}

export interface UpdateSubscriptionDto {
  subscriptionPlan?: 'TRIAL' | 'ANNUAL' | 'QUARTERLY' | 'CUSTOM';
  action?:
    | 'RENEW_ANNUAL_1Y'
    | 'RENEW_QUARTERLY_3M'
    | 'EXTEND_SHUTDOWN_30D'
    | 'EXTEND_TRIAL_7D'
    | 'SET_CUSTOM_DATE';
  subscriptionExpiresAt?: string;
  gracePeriodDays?: number;
}

export async function getCustomersApi(params?: {
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'trial' | 'active_paid' | 'expiring' | 'expired';
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

export async function updateCustomerSubscriptionApi(
  id: string,
  dto: UpdateSubscriptionDto,
): Promise<CustomerUser & { message: string }> {
  return apiClient<CustomerUser & { message: string }>(
    `/admin/users/${id}/subscription`,
    {
      method: 'PATCH',
      body: JSON.stringify(dto),
    },
  );
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
