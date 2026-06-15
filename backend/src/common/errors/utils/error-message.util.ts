import { HttpException } from '@nestjs/common';
import { AppException, type AppErrorBody } from '../exception';

/**
 * Helpers for reading human-readable text from thrown errors.
 *
 * Used where the response is not JSON — e.g. the HTML accept-invite form re-renders
 * with an inline error instead of returning `{ statusCode, code, message }`.
 */

/**
 * Extract a user-facing message from a caught exception.
 *
 * Resolution order:
 * 1. `AppException` — read `message` from the structured `AppErrorBody`
 * 2. Nest `HttpException` — string body, or `message` field (handles class-validator arrays)
 * 3. Plain `Error` — use `error.message`
 * 4. Anything else — return `fallback`
 *
 * @param err      Value caught in a `try/catch` (typically from a service throw)
 * @param fallback Text when `err` is not an `Error` or `HttpException` (default: "An error occurred")
 * @returns        Single string safe to show in HTML or a toast
 *
 * @example
 * // invites.controller.ts — re-render form with validation error
 * const message = extractErrorMessage(err, 'Could not activate account. Please try again.');
 */
export function extractErrorMessage(err: unknown, fallback = 'An error occurred'): string {
  // Centralized errors — body already has { statusCode, code, message }
  if (err instanceof AppException) {
    const body = err.getResponse() as AppErrorBody;
    return body.message;
  }

  // Legacy or framework exceptions (ValidationPipe, guards, etc.)
  if (err instanceof HttpException) {
    const response = err.getResponse();

    if (typeof response === 'string') return response;

    if (typeof response === 'object' && response && 'message' in response) {
      const msg = (response as { message: string | string[] }).message;
      // class-validator returns message as string[]
      return Array.isArray(msg) ? msg.join(', ') : String(msg);
    }
  }

  // DomainError and other plain Error subclasses before HTTP mapping
  if (err instanceof Error) return err.message;

  return fallback;
}
