import { HttpException, HttpStatus } from '@nestjs/common';
import { AppException, DomainError } from './exception';
import { ErrorCode } from './error-codes';

/**
 * Maps `DomainError.code` → HTTP status when repositories throw without HTTP knowledge.
 *
 * Codes not listed here default to 400 in `domainErrorToHttp`.
 * Add new entries when introducing `DomainErrors.*` factories.
 */
const DOMAIN_STATUS: Partial<Record<ErrorCode, HttpStatus>> = {
  // 404 — resource lookup failed
  [ErrorCode.PROVIDER_PROFILE_NOT_FOUND]: HttpStatus.NOT_FOUND,

  // 403 — user exists but portal access is denied
  [ErrorCode.NOT_PROVIDER_USER]: HttpStatus.FORBIDDEN,
  [ErrorCode.PROVIDER_NOT_PRN]: HttpStatus.FORBIDDEN,
  [ErrorCode.PROVIDER_NOT_SET]: HttpStatus.FORBIDDEN,

  // 400 — invalid onboarding / validation input from persistence checks
  [ErrorCode.RECRUITER_NOT_FOUND]: HttpStatus.BAD_REQUEST,
  [ErrorCode.LIAISON_NOT_FOUND]: HttpStatus.BAD_REQUEST,
  [ErrorCode.WORK_SITE_NOT_FOUND]: HttpStatus.BAD_REQUEST,
  [ErrorCode.NO_CLIENT_ORGANIZATION]: HttpStatus.BAD_REQUEST,
  [ErrorCode.SCHEDULE_VALIDATION]: HttpStatus.BAD_REQUEST,

  // 500 — missing env / bootstrap misconfiguration
  [ErrorCode.DATABASE_URL_REQUIRED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.SES_FROM_EMAIL_REQUIRED]: HttpStatus.INTERNAL_SERVER_ERROR,
  [ErrorCode.INVITE_URL_CONFIG_REQUIRED]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Convert a single `DomainError` to an `AppException` with the correct HTTP status.
 *
 * @param err  Error thrown from a repository, gateway, or module factory
 * @returns    `AppException` ready for the global exception filter
 */
export function domainErrorToHttp(err: DomainError): AppException {
  const status = DOMAIN_STATUS[err.code] ?? HttpStatus.BAD_REQUEST;
  return new AppException(err.code, err.message, status);
}

/**
 * Normalize any caught value into an `HttpException`.
 *
 * Resolution order:
 * 1. `AppException` / `HttpException` — returned unchanged
 * 2. `DomainError` — mapped via `DOMAIN_STATUS`
 * 3. Plain `Error` — wrapped as 500 `INTERNAL_ERROR`
 * 4. Unknown — generic 500 `INTERNAL_ERROR`
 *
 * @param err  Value from a `catch` block
 * @returns    Exception the global filter can serialize to JSON
 */
export function toHttpException(err: unknown): HttpException {
  // Already HTTP-layer — pass through
  if (err instanceof AppException || err instanceof HttpException) {
    return err;
  }

  // Repository / infrastructure — apply status map
  if (err instanceof DomainError) {
    return domainErrorToHttp(err);
  }

  // Unexpected plain Error (legacy throw new Error, DB driver, etc.)
  if (err instanceof Error) {
    return AppException.internal(ErrorCode.INTERNAL_ERROR, err.message);
  }

  return AppException.internal(ErrorCode.INTERNAL_ERROR, 'Internal server error');
}

/**
 * Map `err` to HTTP and rethrow — use in service `catch` blocks.
 *
 * Replaces string-matching on `err.message` (e.g. old `mapProviderAccessError`).
 *
 * @example
 * try {
 *   await this.repo.assertPrnProvider(providerUserId);
 * } catch (err) {
 *   rethrowAsHttp(err);
 * }
 */
export function rethrowAsHttp(err: unknown): never {
  throw toHttpException(err);
}
