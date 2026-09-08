import { apiClient } from './client';

export type PaymentMode = 'CASH_DRAWER' | 'BANK_TRANSFER' | 'UPI_ONLINE' | 'VENDOR_CREDIT' | 'OWNER_DIRECT';

export interface ExpenseCategory {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Machinery {
  id: string;
  name: string;
  code?: string | null;
  defaultRentPerHour?: number | string | null;
  vendorName?: string | null;
  vendorMobile?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  siteId: string;
  categoryId: string;
  recordedByUserId: string;
  date: string;
  amount: number | string;
  paymentMode: PaymentMode;
  paidTo?: string | null;
  remarks?: string | null;
  machineryId?: string | null;
  startTime?: string | null;
  closingTime?: string | null;
  startMeterReading?: number | string | null;
  endMeterReading?: number | string | null;
  totalHours?: number | string | null;
  rentPerHour?: number | string | null;
  advanceAmount?: number | string | null;
  createdAt: string;
  updatedAt: string;
  site?: { id: string; siteName: string; location: string };
  category?: { id: string; name: string };
  machinery?: { id: string; name: string; code?: string | null; defaultRentPerHour?: number | string | null } | null;
  recordedBy?: { id: string; name: string | null; role: string; mobile: string };
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalCashDrawerExpenses: number;
  totalMachineRent: number;
  totalAdvancesPaid: number;
  totalMachineHours: number;
  count: number;
}

export interface ExpensesResponse {
  expenses: Expense[];
  summary: ExpenseSummary;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateExpensePayload {
  siteId: string;
  categoryId: string;
  date: string;
  amount?: number;
  paymentMode?: PaymentMode;
  paidTo?: string;
  remarks?: string;
  machineryId?: string;
  startTime?: string;
  closingTime?: string;
  startMeterReading?: number;
  endMeterReading?: number;
  totalHours?: number;
  rentPerHour?: number;
  advanceAmount?: number;
}

export interface UpdateExpensePayload extends Partial<CreateExpensePayload> {}

// --- API Calls ---

export async function fetchExpensesApi(
  params: {
    siteId?: string;
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    machineryId?: string;
    paymentMode?: PaymentMode;
    page?: number;
    limit?: number;
  },
  options?: { signal?: AbortSignal }
): Promise<ExpensesResponse> {
  const query = new URLSearchParams();
  if (params.siteId) query.set('siteId', params.siteId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.machineryId) query.set('machineryId', params.machineryId);
  if (params.paymentMode) query.set('paymentMode', params.paymentMode);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  const qs = query.toString();
  const url = qs ? `/expenses?${qs}` : '/expenses';
  return apiClient<ExpensesResponse>(url, { signal: options?.signal });
}

export async function createExpenseApi(payload: CreateExpensePayload): Promise<Expense> {
  return apiClient<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateExpenseApi(id: string, payload: UpdateExpensePayload): Promise<Expense> {
  return apiClient<Expense>(`/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteExpenseApi(id: string): Promise<{ id: string; message: string }> {
  return apiClient<{ id: string; message: string }>(`/expenses/${id}`, {
    method: 'DELETE',
  });
}

// --- Expense Categories API ---

export async function fetchExpenseCategoriesApi(): Promise<ExpenseCategory[]> {
  return apiClient<ExpenseCategory[]>('/expense-categories');
}

export async function createExpenseCategoryApi(name: string): Promise<ExpenseCategory> {
  return apiClient<ExpenseCategory>('/expense-categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function updateExpenseCategoryApi(id: string, name: string): Promise<ExpenseCategory> {
  return apiClient<ExpenseCategory>(`/expense-categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteExpenseCategoryApi(id: string): Promise<{ id: string; message: string }> {
  return apiClient<{ id: string; message: string }>(`/expense-categories/${id}`, {
    method: 'DELETE',
  });
}

// --- Machinery API ---

export async function fetchMachineryApi(includeInactive = false): Promise<Machinery[]> {
  return apiClient<Machinery[]>(`/machinery?includeInactive=${includeInactive}`);
}

export async function createMachineryApi(payload: {
  name: string;
  code?: string;
  defaultRentPerHour?: number;
  vendorName?: string;
  vendorMobile?: string;
}): Promise<Machinery> {
  return apiClient<Machinery>('/machinery', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateMachineryApi(id: string, payload: {
  name?: string;
  code?: string;
  defaultRentPerHour?: number;
  vendorName?: string;
  vendorMobile?: string;
  isActive?: boolean;
}): Promise<Machinery> {
  return apiClient<Machinery>(`/machinery/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteMachineryApi(id: string): Promise<{ id: string; message: string }> {
  return apiClient<{ id: string; message: string }>(`/machinery/${id}`, {
    method: 'DELETE',
  });
}
