import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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
    return next.handle().pipe(
      map((data) => {
        // If data already has a standard response envelope, return as-is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          typeof data.success === 'boolean'
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
