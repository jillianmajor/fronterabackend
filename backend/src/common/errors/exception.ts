import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode } from './error-codes';

// =============================================================================
// HTTP layer — services, controllers, validation helpers
// =============================================================================

/**
 * JSON body shape returned by `AllExceptionsFilter` for every `AppException`.
 *
 * Clients should key off `code` (stable) rather than `message` (may change copy).
 */
export type AppErrorBody = {
  /** HTTP status echoed in the response (400, 403, 404, 500, …). */
  statusCode: number;

  /** Machine-readable identifier from `ErrorCode` — safe for client branching. */
  code: ErrorCode;

  /** Human-readable explanation shown in the UI or API error toast. */
  message: string;
};

/**
 * Typed HTTP exception used across services and controllers.
 *
 * Extends Nest's `HttpException` so it flows through guards, pipes, and the global
 * exception filter. Prefer creating instances via `AppErrors.*` factories in
 * `app-errors.ts` rather than calling this class directly.
 *
 * @example
 * throw AppException.notFound(ErrorCode.PROVIDER_PROFILE_NOT_FOUND, 'Provider profile not found');
 */
export class AppException extends HttpException {
  /** Same value as `AppErrorBody.code` — convenient for logging without parsing the response. */
  readonly code: ErrorCode;

  /**
   * @param code    Stable error code from `error-codes.ts`
   * @param message User-facing description
   * @param status  HTTP status (use static factories when possible)
   */
  constructor(code: ErrorCode, message: string, status: HttpStatus) {
    const body: AppErrorBody = { statusCode: status, code, message };
    super(body, status);
    this.code = code;
  }

  // ---------------------------------------------------------------------------
  // Static factories — map domain errors to the correct HTTP status
  // ---------------------------------------------------------------------------

  /** 400 — invalid input, failed validation, or business-rule rejection. */
  static badRequest(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.BAD_REQUEST);
  }

  /** 404 — requested resource does not exist. */
  static notFound(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.NOT_FOUND);
  }

  /** 401 — missing or invalid authentication. */
  static unauthorized(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.UNAUTHORIZED);
  }

  /** 403 — caller is authenticated but not allowed (wrong role, wrong schedule type). */
  static forbidden(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.FORBIDDEN);
  }

  /** 500 — unexpected or infrastructure failure (missing env, DB bootstrap). */
  static internal(code: ErrorCode, message: string): AppException {
    return new AppException(code, message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// =============================================================================
// Domain layer — repositories, gateways, module factories (no HTTP coupling)
// =============================================================================

/**
 * Non-HTTP error for persistence and infrastructure layers.
 *
 * Thrown from repositories and config/bootstrap code. Services catch and pass
 * through `rethrowAsHttp(err)` (`to-http.exception.ts`) to produce an
 * `AppException`. Prefer `DomainErrors.*` factories in `domain-errors.ts`.
 *
 * @example
 * throw DomainErrors.providerNotPrn();
 */
export class DomainError extends Error {
  /** Stable code — mapped to HTTP status in `to-http.exception.ts`. */
  readonly code: ErrorCode;

  /**
   * @param code    Stable error code from `error-codes.ts`
   * @param message Description for logs and the mapped HTTP response
   */
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}
