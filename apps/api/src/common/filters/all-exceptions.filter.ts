import type { ApiErrorBody } from '@district-viii/shared';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { isDuplicateKeyError } from '../database/mongo-errors';

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

/** Every error leaves the API in the same shape (ApiErrorBody). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { statusCode, message, details } = this.describe(exception);
    if (statusCode >= 500) {
      // Never log request bodies or params: they can contain phone numbers.
      this.logger.error(
        `${request.method} ${request.route ? String((request.route as { path: string }).path) : 'unknown route'} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiErrorBody = {
      statusCode,
      error: STATUS_TEXT[statusCode] ?? 'Error',
      message,
      ...(details && details.length > 0 ? { details } : {}),
      path: request.path,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }

  private describe(exception: unknown): {
    statusCode: number;
    message: string;
    details?: string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') return { statusCode, message: payload };
      const raw = (payload as { message?: unknown }).message;
      if (Array.isArray(raw)) {
        return {
          statusCode,
          message: 'Validation failed',
          details: raw.map(String),
        };
      }
      return {
        statusCode,
        message: typeof raw === 'string' ? raw : exception.message,
      };
    }
    if (isDuplicateKeyError(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'This record already exists',
      };
    }
    if (exception instanceof MongooseError.CastError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid identifier',
      };
    }
    if (exception instanceof MongooseError.ValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Validation failed',
        details: Object.values(exception.errors).map((error) => error.message),
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Something went wrong',
    };
  }
}
