import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER } from './request-id.middleware';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const requestId = request.header(REQUEST_ID_HEADER) || 'unknown';
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : undefined;
    const message = this.messageFrom(exceptionResponse, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`${request.method} ${request.originalUrl} ${status} [${requestId}]`, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(`${request.method} ${request.originalUrl} ${status} [${requestId}]`);
    }

    response.status(status).json({
      statusCode: status,
      error: this.errorName(exceptionResponse, status),
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }

  private messageFrom(payload: unknown, status: number): string | string[] {
    if (typeof payload === 'string') return payload;
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' || Array.isArray(message)) return message as string | string[];
    }
    return status >= 500 ? 'Internal server error' : 'Request failed';
  }

  private errorName(payload: unknown, status: number): string {
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const error = (payload as { error?: unknown }).error;
      if (typeof error === 'string') return error;
    }
    return status >= 500 ? 'Internal Server Error' : 'Request Error';
  }
}
