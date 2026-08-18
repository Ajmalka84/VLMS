import { apiClient } from './client';

export interface HealthData {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  };
}

export async function fetchHealth(): Promise<HealthData> {
  return apiClient<HealthData>('/health');
}
