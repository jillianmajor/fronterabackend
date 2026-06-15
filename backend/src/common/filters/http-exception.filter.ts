import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppException, DomainError, type AppErrorBody } from '../errors/exception';
import { ErrorCode } from '../errors/error-codes';
import { domainErrorToHttp } from '../errors/to-http.exception';

/**
 * Uniform JSON error body sent to API clients.
 *
 * Matches `AppErrorBody` — every uncaught exception is normalized to this shape.
 */
type ErrorResponseBody = {
  statusCode: number;
  code: ErrorCode;
  message: string;
};

/**
 * Global exception filter — registered in `main.ts` via `app.useGlobalFilters()`.
 *
 * Catches **all** unhandled errors from controllers and services and writes a
 * consistent `{ statusCode, code, message }` JSON response. Works alongside the
 * `common/errors/` module:
 *
 * - `AppException` — body already structured; pass through
 * - `DomainError` — map via `domainErrorToHttp()` (safety net if not caught in service)
 * - Nest `HttpException` — legacy / ValidationPipe; infer code from status
 * - Plain `Error` / unknown — 500 with `INTERNAL_ERROR`
 *
 * Logs full stack traces for 5xx only. HTML routes (e.g. accept-invite) that
 * catch errors locally are unaffected.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Nest entry point — invoked when any exception escapes the request pipeline.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const body = this.normalize(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception);
    }

    response.status(body.statusCode).json(body);
  }

  /**
   * Map any thrown value to the API error contract.
   *
   * Prefer throwing `AppException` from `AppErrors.*` so `code` is exact;
   * `inferCode()` is a coarse fallback for unmigrated `HttpException` throws.
   */
  private normalize(exception: unknown): ErrorResponseBody {
    // Primary path — centralized errors from services/controllers
    if (exception instanceof AppException) {
      return exception.getResponse() as AppErrorBody;
    }

    // Safety net — DomainError reached the filter without rethrowAsHttp() in a service
    if (exception instanceof DomainError) {
      const http = domainErrorToHttp(exception);
      return http.getResponse() as AppErrorBody;
    }

    // ValidationPipe, guards, or legacy Nest exceptions without a stable code
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      const message = this.extractMessage(raw);
      return {
        statusCode: status,
        code: this.inferCode(status),
        message,
      };
    }

    // Unhandled plain Error (DB driver, third-party lib, etc.)
    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message: exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    };
  }

  /**
   * Pull a single message string from Nest's varied `getResponse()` shapes.
   *
   * Handles string bodies and class-validator's `message: string[]`.
   */
  private extractMessage(response: string | object): string {
    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response && 'message' in response) {
      const msg = (response as { message: string | string[] }).message;
      return Array.isArray(msg) ? msg.join(', ') : String(msg);
    }

    return 'An error occurred';
  }

  /**
   * Best-effort code when the thrown exception is not an `AppException`.
   *
   * Intentionally coarse — migrate call sites to `AppErrors.*` for precise codes.
   */
  private inferCode(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.SCHEDULE_CHANGE_NOT_FOUND;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.NOT_PROVIDER_USER;
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.ONBOARDING_FAILED;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
