import { DomainError } from './exception';
import { ErrorCode } from './error-codes';

/**
 * Repository and infrastructure errors — no HTTP coupling.
 *
 * Thrown from persistence and config layers; services catch and call
 * `rethrowAsHttp(err)` to convert to `AppException` via `to-http.exception.ts`.
 *
 * Usage: `throw DomainErrors.providerNotPrn()`
 */
export const DomainErrors = {
  // ---------------------------------------------------------------------------
  // Provider access — provider-scheduling.repository
  // ---------------------------------------------------------------------------

  /** `profiles.user_id` not found during PRN portal assert. */
  providerProfileNotFound: () =>
    new DomainError(ErrorCode.PROVIDER_PROFILE_NOT_FOUND, 'Provider profile not found'),

  /** User exists in `profiles` but has no `provider_user` role in `user_roles`. */
  notProviderUser: () => new DomainError(ErrorCode.NOT_PROVIDER_USER, 'Not a provider user'),

  /** Provider `schedule_type` is not `prn` — portal scheduling APIs are PRN-only. */
  providerNotPrn: () =>
    new DomainError(ErrorCode.PROVIDER_NOT_PRN, 'Provider is not PRN schedule type'),

  /** Provider `schedule_type` is not `set` — SET time-off APIs only. */
  providerNotSet: () =>
    new DomainError(ErrorCode.PROVIDER_NOT_SET, 'Provider is not set schedule type'),

  // ---------------------------------------------------------------------------
  // Onboarding persistence — onboarding.repository
  // ---------------------------------------------------------------------------

  /** No `organizations` row with `type = 'client'` (run `db:seed` before onboarding). */
  noClientOrganization: () =>
    new DomainError(
      ErrorCode.NO_CLIENT_ORGANIZATION,
      'No client organization found; run db:seed',
    ),

  /** `recruiterId` does not resolve to an internal-staff profile. */
  recruiterNotFound: () => new DomainError(ErrorCode.RECRUITER_NOT_FOUND, 'Recruiter not found'),

  /** `liaisonId` does not resolve to an internal-staff profile. */
  liaisonNotFound: () => new DomainError(ErrorCode.LIAISON_NOT_FOUND, 'Liaison not found'),

  /** `workSiteId` in the onboarding transaction is missing from `work_sites`. */
  workSiteNotFound: (workSiteId: string) =>
    new DomainError(ErrorCode.WORK_SITE_NOT_FOUND, `Work site not found: ${workSiteId}`),

  // ---------------------------------------------------------------------------
  // Infrastructure / bootstrap — module factories and gateways
  // ---------------------------------------------------------------------------

  /** `DATABASE_URL` env var missing when `RepositoryModule` creates the PG pool. */
  databaseUrlRequired: () =>
    new DomainError(ErrorCode.DATABASE_URL_REQUIRED, 'DATABASE_URL is required'),

  /** `SES_FROM_EMAIL` env var missing when `SesGateway` sends mail. */
  sesFromEmailRequired: () =>
    new DomainError(ErrorCode.SES_FROM_EMAIL_REQUIRED, 'SES_FROM_EMAIL is required to send email'),

  /** `FRONTERA_API_PUBLIC_URL` missing when building invite accept links. */
  inviteUrlConfigRequired: () =>
    new DomainError(
      ErrorCode.INVITE_URL_CONFIG_REQUIRED,
      'FRONTERA_API_PUBLIC_URL is required to build the invite link (API Gateway base URL, no trailing slash)',
    ),
} as const;
