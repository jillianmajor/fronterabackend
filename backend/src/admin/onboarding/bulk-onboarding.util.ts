import { HttpException } from '@nestjs/common';
import { AppException, DomainError } from '../../common/errors/exception';

export function bulkRowErrorMessage(err: unknown): string {
  if (err instanceof AppException || err instanceof HttpException) {
    const response = err.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && response && 'message' in response) {
      const message = (response as { message?: string | string[] }).message;
      if (Array.isArray(message)) return message.join('; ');
      if (typeof message === 'string') return message;
    }
  }
  if (err instanceof DomainError || err instanceof Error) {
    return err.message;
  }
  return 'Unknown error';
}

function splitProviderName(parts: {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  full_name?: string;
}): { firstName: string; lastName: string } {
  if (parts.firstName?.trim() && parts.lastName?.trim()) {
    return { firstName: parts.firstName.trim(), lastName: parts.lastName.trim() };
  }
  const full = parts.fullName?.trim() || parts.full_name?.trim();
  if (!full) {
    throw new Error('firstName/lastName or fullName is required');
  }
  const tokens = full.split(/\s+/);
  if (tokens.length === 1) {
    return { firstName: tokens[0], lastName: tokens[0] };
  }
  return { firstName: tokens[0], lastName: tokens.slice(1).join(' ') };
}

function normalizeCompany(value: string): string {
  const trimmed = value.trim();
  return trimmed.toLowerCase() === '4tress' ? '4tress' : trimmed;
}

export { splitProviderName, normalizeCompany };
