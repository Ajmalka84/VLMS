import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    const startTime = Date.now();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;
        if (response && typeof response.setHeader === 'function') {
          response.setHeader('X-Response-Time', `${duration}ms`);
        }

        // If data already has a standard response envelope, return as-is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          typeof (data as Record<string, unknown>).success === 'boolean'
        ) {
          return data;
        }

        return {
          success: true,
          data: data ?? null,
        };
      }),
    );
  }
}
