import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;

        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('; ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
        }

        if (typeof resObj.code === 'string') {
          code = resObj.code;
        } else {
          code = this.getErrorCodeFromStatus(status);
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.warn(
        `Prisma known request error [${exception.code}] on ${request.method} ${request.url}: ${exception.message}`,
      );

      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          code = 'CONFLICT';
          const target = exception.meta?.target;
          const field = Array.isArray(target)
            ? target.join(', ')
            : target
            ? String(target)
            : 'unique field';
          message = `A record with this ${field} already exists.`;
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          code = 'BAD_REQUEST';
          message = 'Referenced record does not exist or cannot be modified due to dependent records.';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          code = 'NOT_FOUND';
          message = 'The requested record was not found.';
          break;
        }
        case 'P2024': {
          status = HttpStatus.SERVICE_UNAVAILABLE;
          code = 'SERVICE_UNAVAILABLE';
          message = 'Database connection pool timed out. Please try again shortly.';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          code = 'BAD_REQUEST';
          message = 'A database constraint error occurred.';
          break;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(
        `Prisma validation error on ${request.method} ${request.url}: ${exception.message}`,
      );
      status = HttpStatus.BAD_REQUEST;
      code = 'BAD_REQUEST';
      message = 'Invalid data or query parameter provided for database operation.';
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(
        `Prisma initialization error on ${request.method} ${request.url}: ${exception.message}`,
      );
      status = HttpStatus.SERVICE_UNAVAILABLE;
      code = 'SERVICE_UNAVAILABLE';
      message = 'Database connection failed. Please ensure the database service is running.';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `Unknown exception on ${request.method} ${request.url}: ${String(exception)}`,
      );
    }

    if (code === 'INTERNAL_SERVER_ERROR' && status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      code = this.getErrorCodeFromStatus(status);
    }

    response.status(status).json({
      success: false,
      message,
      code,
    });
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
