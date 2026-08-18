import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let latencyMs: number | undefined;
    let dbError: string | undefined;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      latencyMs = Date.now() - startTime;
      dbStatus = 'up';
    } catch (error) {
      dbStatus = 'down';
      dbError = error instanceof Error ? error.message : 'Database ping failed';
    }

    const result: HealthCheckResult = {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined ? { latencyMs } : {}),
        ...(dbError ? { error: dbError } : {}),
      },
    };

    if (dbStatus === 'down') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }
}
