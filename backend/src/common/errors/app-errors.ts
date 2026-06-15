import { AppException } from './exception';
import { ErrorCode } from './error-codes';

/**
 * HTTP-layer errors — call from services, controllers, and validation helpers.
 *
 * Usage: `throw AppErrors.providerProfileNotFound()`
 */
export const AppErrors = {
  // ---------------------------------------------------------------------------
  // Authentication & authorization
  // ---------------------------------------------------------------------------

  /** Missing `Authorization: Bearer` header or malformed token. */
  unauthorized: (message = 'Unauthorized') =>
    AppException.unauthorized(ErrorCode.UNAUTHORIZED, message),

  /** Valid JWT but user lacks a route-required role. */
  insufficientRole: () =>
    AppException.forbidden(ErrorCode.INSUFFICIENT_ROLE, 'Insufficient permissions'),

  /** Provider portal route scoped to a different `profiles.user_id`. */
  providerAccessDenied: () =>
    AppException.forbidden(
      ErrorCode.PROVIDER_ACCESS_DENIED,
      'You may only access your own provider resources',
    ),

  // ---------------------------------------------------------------------------
  // Provider access
  // ---------------------------------------------------------------------------

  /** Provider `profiles.user_id` does not exist (admin resend-invite, portal context). */
  providerProfileNotFound: () =>
    AppException.notFound(ErrorCode.PROVIDER_PROFILE_NOT_FOUND, 'Provider profile not found'),

  /** Authenticated user lacks the `provider_user` role. */
  notProviderUser: () =>
    AppException.forbidden(ErrorCode.NOT_PROVIDER_USER, 'Not a provider user'),

  /** Provider exists but `schedule_type` is not `prn` (portal scheduling APIs). */
  providerNotPrn: () =>
    AppException.forbidden(ErrorCode.PROVIDER_NOT_PRN, 'Provider is not PRN schedule type'),

  /** Provider exists but `schedule_type` is not `set` (SET time-off APIs). */
  providerNotSet: () =>
    AppException.forbidden(ErrorCode.PROVIDER_NOT_SET, 'Provider is not set schedule type'),

  // ---------------------------------------------------------------------------
  // Onboarding — POST /admin/onboarding
  // ---------------------------------------------------------------------------

  /** `workSites` must contain exactly one entry with `isPrimary: true`. */
  primaryWorkSiteRequired: () =>
    AppException.badRequest(
      ErrorCode.PRIMARY_WORK_SITE_REQUIRED,
      'Exactly one work site must be marked isPrimary',
    ),

  /** `specialty` is not in the onboarding catalog (form-options). */
  invalidSpecialty: () =>
    AppException.badRequest(
      ErrorCode.INVALID_SPECIALTY,
      'Invalid specialty. Use GET /admin/onboarding/form-options for allowed values.',
    ),

  /** `company` is not in the allowed list (onboarding or admin scheduling filters). */
  invalidCompany: (allowed?: readonly string[]) =>
    AppException.badRequest(
      ErrorCode.INVALID_COMPANY,
      allowed
        ? `company must be one of: ${allowed.join(', ')}`
        : 'Invalid company. Use GET /admin/onboarding/form-options for allowed values.',
    ),

  /** Same `workSiteId` appears more than once in the onboarding payload. */
  duplicateWorkSiteId: () =>
    AppException.badRequest(
      ErrorCode.DUPLICATE_WORK_SITE_ID,
      'Duplicate workSiteId in workSites array',
    ),

  /** Site-level `region` is not in the onboarding regions catalog. */
  invalidRegion: (region: string) =>
    AppException.badRequest(
      ErrorCode.INVALID_REGION,
      `Invalid region "${region}". Use GET /admin/onboarding/form-options → regions.`,
    ),

  /** `workSiteId` does not exist in the work-sites catalog. */
  workSiteNotFound: (workSiteId: string) =>
    AppException.badRequest(ErrorCode.WORK_SITE_NOT_FOUND, `Work site not found: ${workSiteId}`),

  /** Submitted `facility` label does not match the catalog name for the given `workSiteId`. */
  facilityMismatch: (facility: string, workSiteId: string, expected: string) =>
    AppException.badRequest(
      ErrorCode.FACILITY_MISMATCH,
      `facility "${facility}" does not match catalog for workSiteId ${workSiteId} (expected "${expected}")`,
    ),

  /** Weekly schedule overlap or invalid shift times during onboarding validation. */
  scheduleValidation: (message: string) =>
    AppException.badRequest(ErrorCode.SCHEDULE_VALIDATION, message),

  /** Generic onboarding persistence failure surfaced to the admin API. */
  onboardingFailed: (message: string) =>
    AppException.badRequest(ErrorCode.ONBOARDING_FAILED, message),

  /** Admin resend-invite: provider exists but has no unused `provider_invites` row. */
  noPendingInvite: () =>
    AppException.notFound(ErrorCode.NO_PENDING_INVITE, 'No pending invite for this provider'),

  // ---------------------------------------------------------------------------
  // Accept invite — GET/POST /accept-invite
  // ---------------------------------------------------------------------------

  /** HTML form submitted without a token query/body field. */
  missingInviteToken: () =>
    AppException.badRequest(ErrorCode.MISSING_INVITE_TOKEN, 'Missing invite token'),

  /** Password does not meet the minimum length policy. */
  passwordTooShort: (minLength: number) =>
    AppException.badRequest(
      ErrorCode.PASSWORD_TOO_SHORT,
      `Password must be at least ${minLength} characters`,
    ),

  /** `password` and `confirmPassword` fields do not match. */
  passwordsMismatch: () =>
    AppException.badRequest(ErrorCode.PASSWORDS_MISMATCH, 'Passwords do not match'),

  /** `auth.users` password update or invite activation failed in the repository. */
  inviteActivationFailed: (message: string) =>
    AppException.badRequest(ErrorCode.INVITE_ACTIVATION_FAILED, message),

  /** Token does not match any row in `provider_invites`. */
  invalidInviteLink: () =>
    AppException.badRequest(ErrorCode.INVALID_INVITE_LINK, 'Invalid invite link'),

  /** Invite `used_at` is already set (single-use token). */
  inviteAlreadyUsed: () =>
    AppException.badRequest(ErrorCode.INVITE_ALREADY_USED, 'This invite has already been used'),

  /** Invite `expires_at` is in the past. */
  inviteExpired: () =>
    AppException.badRequest(ErrorCode.INVITE_EXPIRED, 'This invite has expired'),

  // ---------------------------------------------------------------------------
  // Provider scheduling — PRN availability calendar (ADR 0009)
  // ---------------------------------------------------------------------------

  /** `GET .../availability` called without the required `monthYear` query param. */
  monthYearRequired: () =>
    AppException.badRequest(ErrorCode.MONTH_YEAR_REQUIRED, 'monthYear query param is required'),

  /** Submit payload has neither `days` nor `noChanges: true`. */
  noDaysOrNoChanges: () =>
    AppException.badRequest(
      ErrorCode.NO_DAYS_OR_NO_CHANGES,
      'Provide at least one day or set noChanges to true',
    ),

  /** Past monthly deadline: `pacrDocumentId` is mandatory for late submissions. */
  pacrRequiredAfterDeadline: () =>
    AppException.badRequest(
      ErrorCode.PACR_REQUIRED_AFTER_DEADLINE,
      'pacrDocumentId is required when submitting after the monthly deadline',
    ),

  /** On-time submission must not include a PACR reference. */
  pacrNotAllowedOnTime: () =>
    AppException.badRequest(
      ErrorCode.PACR_NOT_ALLOWED_ON_TIME,
      'pacrDocumentId must not be sent for on-time monthly submissions',
    ),

  /** `pacrDocumentId` does not exist or does not belong to this provider. */
  pacrDocumentNotFound: () =>
    AppException.notFound(ErrorCode.PACR_DOCUMENT_NOT_FOUND, 'PACR document not found'),

  /** Two days in the same submit batch share the same `requestDate`. */
  duplicateRequestDate: (requestDate: string) =>
    AppException.badRequest(
      ErrorCode.DUPLICATE_REQUEST_DATE,
      `Duplicate requestDate: ${requestDate}`,
    ),

  /** Submitted `workSiteId` is not in the provider's assigned work sites. */
  workSiteNotAssigned: (workSiteId: string) =>
    AppException.badRequest(
      ErrorCode.WORK_SITE_NOT_ASSIGNED,
      `workSiteId not assigned to provider: ${workSiteId}`,
    ),

  /** Post-deadline add_day: target date is fewer than 14 calendar days from today. */
  insufficientAdvanceNotice: (requestDate: string) =>
    AppException.badRequest(
      ErrorCode.INSUFFICIENT_ADVANCE_NOTICE,
      `Changes on ${requestDate} require at least 14 days advance notice after the monthly deadline`,
    ),

  /** Post-deadline remove_day: target date is fewer than 7 calendar days from today. */
  insufficientRemoveNotice: (requestDate: string) =>
    AppException.badRequest(
      ErrorCode.INSUFFICIENT_REMOVE_NOTICE,
      `Removing a day on ${requestDate} requires at least 7 days advance notice after the monthly deadline`,
    ),

  /** modify_shift / swap requires startTime and endTime. */
  timeOffTimesRequired: (changeType: string) =>
    AppException.badRequest(
      ErrorCode.TIME_OFF_TIMES_REQUIRED,
      `startTime and endTime are required for changeType "${changeType}"`,
    ),

  /** SET time-off changeType not in remove_day | modify_shift | swap. */
  invalidTimeOffChangeType: (changeType: string) =>
    AppException.badRequest(
      ErrorCode.INVALID_TIME_OFF_CHANGE_TYPE,
      `Invalid changeType: ${changeType}`,
    ),

  /** Clock label from the UI is not a valid 12h or 24h time (e.g. `8:00 AM`). */
  invalidTimeFormat: (label: string) =>
    AppException.badRequest(ErrorCode.INVALID_TIME_FORMAT, `Invalid time format: "${label}"`),

  /** Availability day `endTime` is not strictly after `startTime`. */
  endTimeBeforeStart: () =>
    AppException.badRequest(ErrorCode.END_TIME_BEFORE_START, 'endTime must be after startTime'),

  /** `monthYear` must be `YYYY-MM-01` (first day of the target month). */
  monthYearNotFirst: () =>
    AppException.badRequest(
      ErrorCode.MONTH_YEAR_NOT_FIRST,
      'monthYear must be the first day of the month (YYYY-MM-01)',
    ),

  /** `requestDate` falls outside the bounds of the submitted `monthYear`. */
  requestDateOutOfMonth: (requestDate: string, monthYear: string) =>
    AppException.badRequest(
      ErrorCode.REQUEST_DATE_OUT_OF_MONTH,
      `requestDate ${requestDate} must fall within month ${monthYear}`,
    ),

  // ---------------------------------------------------------------------------
  // Provider documents — PACR upload
  // ---------------------------------------------------------------------------

  /** Multipart upload missing file buffer. */
  fileRequired: () => AppException.badRequest(ErrorCode.FILE_REQUIRED, 'file is required'),

  /** PACR PDF exceeds the 10 MB upload limit. */
  pacrFileTooLarge: () =>
    AppException.badRequest(ErrorCode.PACR_FILE_TOO_LARGE, 'PACR file must be 10 MB or smaller'),

  /** Uploaded file MIME type is not `application/pdf`. */
  pacrMustBePdf: () =>
    AppException.badRequest(ErrorCode.PACR_MUST_BE_PDF, 'PACR upload must be application/pdf'),

  /** `documents.bucket` is not the configured S3 `DOCUMENTS_BUCKET` (legacy Supabase upload). */
  documentLegacyStorage: () =>
    AppException.badRequest(
      ErrorCode.DOCUMENT_LEGACY_STORAGE,
      'Document is stored in legacy storage and cannot be downloaded via S3',
    ),

  // ---------------------------------------------------------------------------
  // Schedule change approvals — admin review queue
  // ---------------------------------------------------------------------------

  /** `time_off_requests.id` not found (any status). */
  scheduleChangeNotFound: () =>
    AppException.notFound(
      ErrorCode.SCHEDULE_CHANGE_NOT_FOUND,
      'Schedule change request not found',
    ),

  /** Request exists but has no linked `pacr_document_id`. */
  noPacrAttached: () =>
    AppException.notFound(
      ErrorCode.NO_PACR_ATTACHED,
      'No PACR document attached to this request',
    ),

  /** `pacr_document_id` is set but the `documents` row is missing. */
  pacrRecordNotFound: () =>
    AppException.notFound(ErrorCode.PACR_RECORD_NOT_FOUND, 'PACR document record not found'),

  /** Approve/deny target is not in `pending_review` status (or id invalid). */
  pendingScheduleChangeNotFound: () =>
    AppException.notFound(
      ErrorCode.PENDING_SCHEDULE_CHANGE_NOT_FOUND,
      'Pending schedule change request not found',
    ),

  /** `adjustHours: true` requires both `startTime` and `endTime` in the approve body. */
  adjustHoursTimesRequired: () =>
    AppException.badRequest(
      ErrorCode.ADJUST_HOURS_TIMES_REQUIRED,
      'startTime and endTime are required when adjustHours is true',
    ),

  /** Bulk deny requires non-empty `reviewNotes` for audit trail. */
  bulkDenyNotesRequired: () =>
    AppException.badRequest(
      ErrorCode.BULK_DENY_NOTES_REQUIRED,
      'reviewNotes is required when denying in bulk',
    ),
} as const;

// -----------------------------------------------------------------------------
// Throw helpers — optional shorthand for repository catch blocks
// -----------------------------------------------------------------------------

/** @see AppErrors.providerProfileNotFound */
export function throwProviderProfileNotFound(): never {
  throw AppErrors.providerProfileNotFound();
}

/** @see AppErrors.notProviderUser */
export function throwNotProviderUser(): never {
  throw AppErrors.notProviderUser();
}

/** @see AppErrors.providerNotPrn */
export function throwProviderNotPrn(): never {
  throw AppErrors.providerNotPrn();
}
