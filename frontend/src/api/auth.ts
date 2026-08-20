import { apiClient } from './client';

export type UserRole = 'SUPER_ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  mobile: string;
  role: UserRole;
  businessName?: string;
  gstin?: string | null;
  isActive?: boolean;
}

export interface LoginCredentials {
  mobile: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export async function loginApi(credentials: LoginCredentials): Promise<LoginResult> {
  return apiClient<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function getMeApi(): Promise<AuthUser> {
  return apiClient<AuthUser>('/auth/me');
}

export async function changePasswordApi(data: { oldPassword: string; newPassword: string }): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
