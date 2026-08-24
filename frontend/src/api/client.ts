export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const AUTH_TOKEN_KEY = 'vlms_auth_token';

// Base backend URL resolution:
const getBaseUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL.replace(/\/+$/, '');
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  // When served behind Nginx reverse proxy, automatically use current window origin
  if (typeof window !== 'undefined' && window.location?.origin) {
    // If running on Vite dev server port 5173, connect to local backend port 3000
    if (window.location.port === '5173') {
      return `${window.location.protocol}//${window.location.hostname}:3000`;
    }
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export const API_BASE_URL = `${getBaseUrl()}/api/v1`;

// In-flight GET request deduplication cache (shares single promise for concurrent identical GETs)
const inFlightGetRequests = new Map<string, Promise<any>>();

async function executeFetch<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    if (response.status === 401) {
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/reset-password');
      if (!isAuthEndpoint) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vlms:unauthorized'));
        }
      }
    }

    const errorMessage =
      data && typeof data === 'object' && 'message' in data
        ? data.message
        : `Request failed with status ${response.status}`;
    const errorCode =
      data && typeof data === 'object' && 'code' in data ? data.code : undefined;

    throw new ApiError(errorMessage, response.status, errorCode);
  }

  // If response is wrapped in standard { success: true, data: ... }, extract data
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  return data as T;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  // In-flight deduplication for concurrent identical GET requests
  if (method === 'GET' && !options.body) {
    const existing = inFlightGetRequests.get(url);
    if (existing) {
      return existing as Promise<T>;
    }

    const requestPromise = (async () => {
      try {
        return await executeFetch<T>(url, options);
      } finally {
        inFlightGetRequests.delete(url);
      }
    })();

    inFlightGetRequests.set(url, requestPromise);
    return requestPromise;
  }

  return executeFetch<T>(url, options);
}
